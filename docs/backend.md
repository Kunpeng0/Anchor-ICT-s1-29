# Backend Documentation

This document describes the backend modules, public functions, and expected behavior.

## backend/config/event_config.py

### Constants
- `EVENTS` — Dictionary of configured event scenarios.
- `DEFAULT_EVENT` — Default event name used by the API when no event is provided.

### Functions
- `get_event(name: str) -> dict`
  - Returns configuration for a named event.
  - Raises `KeyError` if the event name is not present in `EVENTS`.

- `list_events() -> list`
  - Returns a list of all configured event names.

---

## backend/db/init_db.py

### Functions
- `init_db(db_path: str = DB_PATH) -> None`
  - Creates the SQLite database and all required tables if they do not exist.
  - Tables created:
    - `events`
    - `signals_event_volume`
    - `signals_event_type`
    - `signals_actor_frequency`
    - `signals_location_frequency`
    - `signals_tone_over_time`
    - `signals_actor_location_graph`
    - `saved_graphs`
    - `graph_ratings`
    - `ingestion_log`

---

## backend/db/db.py

### Helper functions
- `_connect(db_path: str = DB_PATH) -> sqlite3.Connection`
  - Returns a SQLite connection with `row_factory` set to `sqlite3.Row`.

### Signal query functions
- `get_event_volume(event_name: str, period_type: str = "daily", db_path: str = DB_PATH) -> list[dict]`
  - Returns event counts over time from `signals_event_volume`.
  - `period_type` may be `daily` or `weekly`.

- `get_event_type(event_name: str, db_path: str = DB_PATH) -> list[dict]`
  - Returns event counts grouped by CAMEO root code from `signals_event_type`.

- `get_actor_frequency(event_name: str, limit: int = 10, db_path: str = DB_PATH) -> list[dict]`
  - Returns the most frequent actors from `signals_actor_frequency`.

- `get_location_frequency(event_name: str, limit: int = 10, db_path: str = DB_PATH) -> list[dict]`
  - Returns the most frequent locations from `signals_location_frequency`.

- `get_tone_over_time(event_name: str, period_type: str = "weekly", db_path: str = DB_PATH) -> list[dict]`
  - Returns average Goldstein scale for daily or weekly periods.

- `get_media_attention(event_name: str, period_type: str = "daily", db_path: str = DB_PATH) -> list[dict]`
  - Returns total media mentions over time for the given event.
  - Queries the raw `events` table directly and aggregates `num_mentions`.

- `get_actor_location_graph(event_name: str, min_edge_weight: int = 1, db_path: str = DB_PATH) -> dict`
  - Returns actor-location graph nodes and edges.
  - Filters edges with `edge_weight >= min_edge_weight`.

### Dashboard summary functions
- `get_event_count(event_name: str, db_path: str = DB_PATH) -> int`
  - Returns the total number of raw events ingested.

- `get_recent_events(event_name: str, limit: int = 20, db_path: str = DB_PATH) -> list[dict]`
  - Returns the most recent raw events ordered by `event_date` descending.

### Saved graph functions
- `get_saved_graphs(event_name: str, include_hidden: bool = False, db_path: str = DB_PATH) -> list[dict]`
  - Returns saved graphs and optionally hidden graphs.

- `save_graph(event_name: str, query_text: str, intent_json: dict, label: str | None = None, db_path: str = DB_PATH) -> int | None`
  - Persists a new saved graph and returns its row ID.

- `update_graph_visibility(graph_id: int, visible: bool, db_path: str = DB_PATH) -> bool`
  - Sets visibility for a saved graph.

- `delete_graph(graph_id: int, db_path: str = DB_PATH) -> bool`
  - Deletes a saved graph and its rating history.

- `rate_graph(graph_id: int, rating: int, db_path: str = DB_PATH) -> int`
  - Adds a thumbs-up or thumbs-down entry to `graph_ratings`.

- `get_graph_ratings(graph_id: int, db_path: str = DB_PATH) -> dict`
  - Returns the rating summary for a saved graph.

---

## backend/ingestion/fetcher.py

### Internal helpers
- `_get_export_url() -> str`
  - Reads the GDELT `lastupdate.txt` stream and returns the current export URL.

- `_download_export(url: str) -> pd.DataFrame`
  - Downloads and extracts the zipped GDELT CSV export into a pandas DataFrame.

- `_filter_events(df: pd.DataFrame, cameo_codes: list, countries: list) -> pd.DataFrame`
  - Filters raw GDELT rows by configured CAMEO root codes and country codes.

- `_safe(value)`
  - Returns `None` for missing or invalid values.

- `_parse_date(raw) -> str | None`
  - Converts a GDELT `SQLDATE` value into `YYYY-MM-DD`.

- `_insert_events(conn: sqlite3.Connection, df: pd.DataFrame) -> int`
  - Inserts filtered events into `events` using `INSERT OR IGNORE`.

- `_log_run(conn: sqlite3.Connection, event_config: str, records_fetched: int, records_inserted: int, status: str, notes: str | None = None) -> None`
  - Writes ingestion metadata into `ingestion_log`.

### Public functions
- `run_fetch(event_name: str, db_path: str = DB_PATH) -> dict`
  - Fetches the latest GDELT export and inserts new records for the configured event.

- `run_backfill(event_name: str, start_date: str, end_date: str | None = None, db_path: str = DB_PATH) -> dict`
  - Backfills raw GDELT events day-by-day from `start_date` to `end_date`.

---

## backend/ingestion/signal_builder.py

### Internal helpers
- `_load_events(conn: sqlite3.Connection) -> pd.DataFrame`
  - Loads all rows from `events` and parses `event_date` values.

- `_week_label(date: pd.Timestamp) -> str`
  - Returns an ISO week label like `2026-W14`.

### Signal builder functions
- `build_event_volume(conn: sqlite3.Connection, df: pd.DataFrame, event_config: str) -> int`
  - Aggregates daily and weekly event counts into `signals_event_volume`.

- `build_event_type(conn: sqlite3.Connection, df: pd.DataFrame, event_config: str) -> int`
  - Aggregates counts by CAMEO root code into `signals_event_type`.

- `build_actor_frequency(conn: sqlite3.Connection, df: pd.DataFrame, event_config: str) -> int`
  - Aggregates actor counts into `signals_actor_frequency`.

- `build_location_frequency(conn: sqlite3.Connection, df: pd.DataFrame, event_config: str) -> int`
  - Aggregates location counts and country metadata into `signals_location_frequency`.

- `build_tone_over_time(conn: sqlite3.Connection, df: pd.DataFrame, event_config: str) -> int`
  - Aggregates average Goldstein scale values into `signals_tone_over_time`.

- `build_actor_location_graph(conn: sqlite3.Connection, df: pd.DataFrame, event_config: str) -> int`
  - Builds an actor-location network edge table into `signals_actor_location_graph`.

- `build_all_signals(event_name: str, db_path: str = DB_PATH) -> dict`
  - Rebuilds all six signal tables from the raw `events` table.
