# main.py
# FastAPI application — exposes all signal queries and LLM routing as REST endpoints.
# APScheduler runs the GDELT fetch every 15 minutes inside this process.
# Created, reviewed, tested, and commented by Jesse Ly.

import logging
import os
import sys
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Resolve project root so backend packages import regardless of invocation path
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.config.event_config import DEFAULT_EVENT, list_events
from backend.db.db import (
    delete_graph,
    get_actor_frequency,
    get_actor_location_graph,
    get_event_count,
    get_event_type,
    get_event_volume,
    get_graph_ratings,
    get_location_frequency,
    get_media_attention,
    get_recent_events,
    get_saved_graphs,
    get_tone_over_time,
    rate_graph,
    save_graph,
    update_graph_visibility,
)
from backend.ingestion.fetcher import run_fetch
from backend.llm.llm import call_llm

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Scheduler — runs GDELT fetch every 15 minutes inside the FastAPI process
# ---------------------------------------------------------------------------

scheduler = BackgroundScheduler()


def _scheduled_fetch() -> None:
    """Triggered by APScheduler every 15 minutes."""
    logger.info("[scheduler] Running scheduled GDELT fetch")
    result = run_fetch(DEFAULT_EVENT)
    logger.info(f"[scheduler] Fetch complete: {result}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start the scheduler on startup and shut it down on exit."""
    scheduler.add_job(_scheduled_fetch, "interval", minutes=15, id="gdelt_fetch")
    scheduler.start()
    logger.info("[scheduler] APScheduler started — GDELT fetch every 15 minutes")
    yield
    scheduler.shutdown(wait=False)
    logger.info("[scheduler] APScheduler stopped")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Project Anchor API",
    description="Signal query and LLM routing API for the Project Anchor dashboard.",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow the React dev server (port 3000) and any local origin during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class SaveGraphRequest(BaseModel):
    query_text: str
    intent_json: dict
    label: str | None = None


class RateGraphRequest(BaseModel):
    rating: int  # 1 or -1


class LLMQueryRequest(BaseModel):
    query: str
    event_name: str | None = None  # defaults to DEFAULT_EVENT if not provided


class VisibilityRequest(BaseModel):
    visible: bool


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Health"])
def health() -> dict:
    """Returns 200 if the API is running."""
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Events config
# ---------------------------------------------------------------------------

@app.get("/events", tags=["Config"])
def get_events() -> dict:
    """Return all configured event names and the current default."""
    return {
        "events": list_events(),
        "default": DEFAULT_EVENT,
    }


# ---------------------------------------------------------------------------
# Signal endpoints
# ---------------------------------------------------------------------------

@app.get("/signals/{event_name}/event-volume", tags=["Signals"])
def event_volume(
    event_name: str,
    period_type: str = Query(default="daily", pattern="^(daily|weekly)$"),
) -> list[dict]:
    """
    Return event counts over time.
    period_type: "daily" (default) or "weekly".
    """
    _validate_event(event_name)
    return get_event_volume(event_name, period_type=period_type)


@app.get("/signals/{event_name}/event-type", tags=["Signals"])
def event_type(event_name: str) -> list[dict]:
    """Return event counts grouped by CAMEO root code."""
    _validate_event(event_name)
    return get_event_type(event_name)


@app.get("/signals/{event_name}/actor-frequency", tags=["Signals"])
def actor_frequency(
    event_name: str,
    limit: int = Query(default=10, ge=1, le=100),
) -> list[dict]:
    """Return the most frequent actors. limit: 1–100, default 10."""
    _validate_event(event_name)
    return get_actor_frequency(event_name, limit=limit)


@app.get("/signals/{event_name}/location-frequency", tags=["Signals"])
def location_frequency(
    event_name: str,
    limit: int = Query(default=10, ge=1, le=100),
) -> list[dict]:
    """Return the most frequent locations. limit: 1–100, default 10."""
    _validate_event(event_name)
    return get_location_frequency(event_name, limit=limit)


@app.get("/signals/{event_name}/tone-over-time", tags=["Signals"])
def tone_over_time(
    event_name: str,
    period_type: str = Query(default="weekly", pattern="^(daily|weekly)$"),
) -> list[dict]:
    """
    Return average Goldstein scale over time.
    period_type: "weekly" (default) or "daily".
    """
    _validate_event(event_name)
    return get_tone_over_time(event_name, period_type=period_type)


@app.get("/signals/{event_name}/media-attention", tags=["Signals"])
def media_attention(
    event_name: str,
    period_type: str = Query(default="daily", pattern="^(daily|weekly)$"),
) -> list[dict]:
    """
    Return total media mentions over time.
    Queries the raw events table directly — no signal table required.
    period_type: "daily" (default) or "weekly".
    """
    _validate_event(event_name)
    return get_media_attention(event_name, period_type=period_type)


@app.get("/signals/{event_name}/actor-location-graph", tags=["Signals"])
def actor_location_graph(
    event_name: str,
    min_edge_weight: int = Query(default=1, ge=1),
) -> dict:
    """
    Return actor-location graph nodes and edges.
    min_edge_weight filters out low-frequency connections (default 1 = all edges).
    """
    _validate_event(event_name)
    return get_actor_location_graph(event_name, min_edge_weight=min_edge_weight)


# ---------------------------------------------------------------------------
# Dashboard summary endpoints
# ---------------------------------------------------------------------------

@app.get("/dashboard/{event_name}/summary", tags=["Dashboard"])
def dashboard_summary(event_name: str) -> dict:
    """
    Return all predefined dashboard data in a single call.
    Reduces round-trips for the initial dashboard load.
    """
    _validate_event(event_name)
    return {
        "event_count":    get_event_count(event_name),
        "event_volume":   get_event_volume(event_name, period_type="daily"),
        "event_type":     get_event_type(event_name),
        "top_actors":     get_actor_frequency(event_name, limit=10),
        "top_locations":  get_location_frequency(event_name, limit=10),
        "tone_over_time": get_tone_over_time(event_name, period_type="weekly"),
        "recent_events":  get_recent_events(event_name, limit=20),
    }


@app.get("/dashboard/{event_name}/recent-events", tags=["Dashboard"])
def recent_events(
    event_name: str,
    limit: int = Query(default=20, ge=1, le=100),
) -> list[dict]:
    """Return the most recent raw events. limit: 1–100, default 20."""
    _validate_event(event_name)
    return get_recent_events(event_name, limit=limit)


# ---------------------------------------------------------------------------
# Saved graphs
# ---------------------------------------------------------------------------

@app.get("/graphs/{event_name}", tags=["Saved Graphs"])
def list_saved_graphs(
    event_name: str,
    include_hidden: bool = Query(default=False),
) -> list[dict]:
    """Return saved LLM-generated graphs for the given event."""
    _validate_event(event_name)
    return get_saved_graphs(event_name, include_hidden=include_hidden)


@app.post("/graphs/{event_name}", tags=["Saved Graphs"])
def create_saved_graph(event_name: str, body: SaveGraphRequest) -> dict:
    """Save a new LLM-generated graph."""
    _validate_event(event_name)
    graph_id = save_graph(
        event_name,
        query_text=body.query_text,
        intent_json=body.intent_json,
        label=body.label,
    )
    return {"id": graph_id, "status": "saved"}


@app.patch("/graphs/{graph_id}/visibility", tags=["Saved Graphs"])
def set_graph_visibility(graph_id: int, body: VisibilityRequest) -> dict:
    """Show or hide a saved graph."""
    updated = update_graph_visibility(graph_id, visible=body.visible)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Graph {graph_id} not found")
    return {"id": graph_id, "visible": body.visible}


@app.delete("/graphs/{graph_id}", tags=["Saved Graphs"])
def remove_saved_graph(graph_id: int) -> dict:
    """Permanently delete a saved graph and its ratings."""
    deleted = delete_graph(graph_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Graph {graph_id} not found")
    return {"id": graph_id, "status": "deleted"}


# ---------------------------------------------------------------------------
# Graph ratings (dev-facing)
# ---------------------------------------------------------------------------

@app.post("/graphs/{graph_id}/rate", tags=["Ratings"])
def submit_rating(graph_id: int, body: RateGraphRequest) -> dict:
    """
    Submit a thumbs up (+1) or thumbs down (-1) rating for a saved graph.
    Dev-facing only — hidden from end users in the UI.
    """
    try:
        rating_id = rate_graph(graph_id, body.rating)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"rating_id": rating_id, "graph_id": graph_id, "rating": body.rating}


@app.get("/graphs/{graph_id}/ratings", tags=["Ratings"])
def graph_ratings(graph_id: int) -> dict:
    """Return rating summary for a saved graph. Dev-facing only."""
    return get_graph_ratings(graph_id)


# ---------------------------------------------------------------------------
# LLM query endpoint
# ---------------------------------------------------------------------------

@app.post("/query", tags=["LLM"])
def llm_query(body: LLMQueryRequest) -> dict:
    """
    Accept a plain-English query, forward it to the local Ollama LLM,
    and return a structured JSON intent object plus the resolved signal data.

    The LLM returns:
        { "chart_type": "line", "signal": "event_volume", "params": { "period_type": "daily" } }

    The routing layer reads the intent and fetches the matching signal.
    Returns an error message if the LLM is unavailable or the query is empty.
    """
    query = body.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query must not be empty")

    event_name = body.event_name or DEFAULT_EVENT
    _validate_event(event_name)

    # LLM call — Tze Shen Ng's responsibility; placeholder returns an error
    # until the Ollama integration is wired in.
    try:
        intent = _call_llm(query)
    except Exception as e:
        logger.error(f"[llm] LLM call failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="LLM service unavailable. Please try again shortly.",
        )

    try:
        data = _resolve_intent(intent, event_name)
    except KeyError as e:
        raise HTTPException(status_code=400, detail=f"Unknown signal in LLM intent: {e}")

    return {
        "query":      query,
        "event_name": event_name,
        "intent":     intent,
        "data":       data,
    }


def _call_llm(query: str) -> dict:
    """
    Delegate to backend.llm.llm.call_llm().
    All LLM logic lives in backend/llm/llm.py — edit that file, not this one.
    """
    return call_llm(query)


def _resolve_intent(intent: dict, event_name: str) -> list | dict:
    """
    Read the LLM intent object and return the matching signal data from db.py.
    Raises KeyError if the signal name is unrecognised.
    """
    signal = intent.get("signal", "")
    params = intent.get("params", {})

    signal_map = {
        "event_volume":         lambda: get_event_volume(event_name, **params),
        "event_type":           lambda: get_event_type(event_name),
        "actor_frequency":      lambda: get_actor_frequency(event_name, **params),
        "location_frequency":   lambda: get_location_frequency(event_name, **params),
        "tone_over_time":       lambda: get_tone_over_time(event_name, **params),
        "media_attention":      lambda: get_media_attention(event_name, **params),
        "actor_location_graph": lambda: get_actor_location_graph(event_name, **params),
        "recent_events":        lambda: get_recent_events(event_name, **params),
    }

    if signal not in signal_map:
        raise KeyError(signal)

    return signal_map[signal]()


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _validate_event(event_name: str) -> None:
    """Raise HTTP 404 if the event name is not in event_config."""
    if event_name not in list_events():
        raise HTTPException(
            status_code=404,
            detail=f"Event '{event_name}' not found. Available events: {list_events()}",
        )


# ---------------------------------------------------------------------------
# Run directly
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)