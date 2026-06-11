# signal_builder.py
# Aggregates raw events into the 6 predefined signal tables.
# Called after each successful fetch, or manually to rebuild all signals.
# Created, reviewed, tested, and commented by Jesse Ly.

import logging
import sqlite3

import pandas as pd

DB_PATH = "anchor.db"

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _load_events(conn: sqlite3.Connection) -> pd.DataFrame:
    """
    Load all events from the events table and return as a typed DataFrame.
    The events table is event-agnostic; signal tables carry the event_config label.
    """
    df = pd.read_sql_query("SELECT * FROM events", conn)
    df["event_date"] = pd.to_datetime(df["event_date"], errors="coerce")
    return df


def _week_label(date: pd.Timestamp) -> str:
    """Return ISO week label string e.g. '2026-W14'."""
    return f"{date.isocalendar().year}-W{date.isocalendar().week:02d}"


# ---------------------------------------------------------------------------
# Signal builders
# ---------------------------------------------------------------------------

def build_event_volume(conn: sqlite3.Connection, df: pd.DataFrame, event_config: str) -> int:
    """
    Aggregate daily and weekly event counts into signals_event_volume.
    Returns total rows upserted.
    """
    df_valid = df.dropna(subset=["event_date"])

    # Daily counts
    daily = df_valid.groupby(df_valid["event_date"].dt.date).size().reset_index()
    daily.columns = ["period", "event_count"]
    daily["period"] = daily["period"].astype(str)
    daily["period_type"] = "daily"

    # Weekly counts
    df_copy = df_valid.copy()
    df_copy["week"] = df_copy["event_date"].apply(_week_label)
    weekly = df_copy.groupby("week").size().reset_index()
    weekly.columns = ["period", "event_count"]
    weekly["period_type"] = "weekly"

    upserted = 0
    for _, row in pd.concat([daily, weekly], ignore_index=True).iterrows():
        conn.execute(
            """
            INSERT INTO signals_event_volume (event_config, period, period_type, event_count, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            ON CONFLICT(event_config, period, period_type)
            DO UPDATE SET event_count = excluded.event_count, updated_at = excluded.updated_at
            """,
            (event_config, row["period"], row["period_type"], int(row["event_count"])),
        )
        upserted += 1

    conn.commit()
    logger.info(f"[signal_builder] event_volume: {upserted} rows upserted")
    return upserted


def build_event_type(conn: sqlite3.Connection, df: pd.DataFrame, event_config: str) -> int:
    """
    Aggregate event counts by CAMEO root code (first 2 chars of cameo_code).
    Returns total rows upserted.
    """
    df_valid = df.dropna(subset=["cameo_code"]).copy()
    df_valid["cameo_root"] = df_valid["cameo_code"].astype(str).str[:2]

    grouped = df_valid.groupby("cameo_root").size().reset_index()
    grouped.columns = ["cameo_root", "event_count"]

    CAMEO_LABELS = {
        "01": "Make Public Statement",
        "02": "Appeal",
        "03": "Express Intent to Cooperate",
        "04": "Consult",
        "05": "Engage in Diplomatic Cooperation",
        "06": "Engage in Material Cooperation",
        "07": "Provide Aid",
        "08": "Yield",
        "09": "Investigate",
        "10": "Demand",
        "11": "Disapprove",
        "12": "Reject",
        "13": "Threaten",
        "14": "Protest",
        "15": "Exhibit Force Posture",
        "16": "Reduce Relations",
        "17": "Coerce",
        "18": "Assault",
        "19": "Fight",
        "20": "Use Unconventional Mass Violence",
    }

    upserted = 0
    for _, row in grouped.iterrows():
        conn.execute(
            """
            INSERT INTO signals_event_type (event_config, cameo_root, cameo_description, event_count, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            ON CONFLICT(event_config, cameo_root)
            DO UPDATE SET
                cameo_description = excluded.cameo_description,
                event_count = excluded.event_count,
                updated_at = excluded.updated_at
            """,
            (
                event_config,
                row["cameo_root"],
                CAMEO_LABELS.get(row["cameo_root"], ""),
                int(row["event_count"]),
            ),
        )
        upserted += 1

    conn.commit()
    logger.info(f"[signal_builder] event_type: {upserted} rows upserted")
    return upserted


def build_actor_frequency(conn: sqlite3.Connection, df: pd.DataFrame, event_config: str) -> int:
    """
    Aggregate event counts across both actor1 and actor2.
    Null actors are skipped. Each non-null actor appearance counts separately.
    Returns total rows upserted.
    """
    actors1 = df.dropna(subset=["actor1"])[["actor1"]].rename(columns={"actor1": "actor"})
    actors2 = df.dropna(subset=["actor2"])[["actor2"]].rename(columns={"actor2": "actor"})
    combined = pd.concat([actors1, actors2], ignore_index=True)

    grouped = combined.groupby("actor").size().reset_index()
    grouped.columns = ["actor", "event_count"]

    upserted = 0
    for _, row in grouped.iterrows():
        conn.execute(
            """
            INSERT INTO signals_actor_frequency (event_config, actor, event_count, updated_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT(event_config, actor)
            DO UPDATE SET event_count = excluded.event_count, updated_at = excluded.updated_at
            """,
            (event_config, row["actor"], int(row["event_count"])),
        )
        upserted += 1

    conn.commit()
    logger.info(f"[signal_builder] actor_frequency: {upserted} rows upserted")
    return upserted


def build_location_frequency(conn: sqlite3.Connection, df: pd.DataFrame, event_config: str) -> int:
    """
    Aggregate event counts per location. Null locations are skipped.
    Returns total rows upserted.
    """
    df_valid = df.dropna(subset=["location"])

    grouped = df_valid.groupby("location").agg(
        event_count=("location", "size"),
        country=("country", lambda x: x.mode()[0] if not x.mode().empty else None)
    ).reset_index()

    upserted = 0
    for _, row in grouped.iterrows():
        conn.execute(
            """
            INSERT INTO signals_location_frequency (event_config, location, country, event_count, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            ON CONFLICT(event_config, location)
            DO UPDATE SET event_count = excluded.event_count,
                          country = excluded.country,
                          updated_at = excluded.updated_at
            """,
            (event_config, row["location"], row["country"], int(row["event_count"])),
        )
        upserted += 1

    conn.commit()
    logger.info(f"[signal_builder] location_frequency: {upserted} rows upserted")
    return upserted


def build_tone_over_time(conn: sqlite3.Connection, df: pd.DataFrame, event_config: str) -> int:
    """
    Aggregate average Goldstein scale per daily and weekly period.
    Rows with null goldstein_scale or event_date are skipped.
    Returns total rows upserted.
    """
    df_valid = df.dropna(subset=["event_date", "goldstein_scale"])

    # Daily averages
    daily = (
        df_valid.groupby(df_valid["event_date"].dt.date)["goldstein_scale"]
        .mean()
        .reset_index()
    )
    daily.columns = ["period", "avg_goldstein"]
    daily["period"] = daily["period"].astype(str)
    daily["period_type"] = "daily"

    # Weekly averages
    df_copy = df_valid.copy()
    df_copy["week"] = df_copy["event_date"].apply(_week_label)
    weekly = df_copy.groupby("week")["goldstein_scale"].mean().reset_index()
    weekly.columns = ["period", "avg_goldstein"]
    weekly["period_type"] = "weekly"

    upserted = 0
    for _, row in pd.concat([daily, weekly], ignore_index=True).iterrows():
        conn.execute(
            """
            INSERT INTO signals_tone_over_time (event_config, period, period_type, avg_goldstein, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            ON CONFLICT(event_config, period, period_type)
            DO UPDATE SET avg_goldstein = excluded.avg_goldstein, updated_at = excluded.updated_at
            """,
            (event_config, row["period"], row["period_type"], float(row["avg_goldstein"])),
        )
        upserted += 1

    conn.commit()
    logger.info(f"[signal_builder] tone_over_time: {upserted} rows upserted")
    return upserted


def build_conflict_phase(conn: sqlite3.Connection, df: pd.DataFrame, event_config: str) -> int:
    """
    Compute the composite conflict phase signal and write weekly rows to
    `signals_conflict_phase`.

    The phase label is derived from recent trends in volume, Goldstein and
    violent share. It is computed on ISO week buckets and is intentionally
    defensive: weeks with fewer than 12 prior weeks get
    `insufficient_history` so the dashboard does not overreact to early data.
    """
    df_valid = df.dropna(subset=["event_date"]).copy()
    df_valid["period"] = df_valid["event_date"].apply(_week_label)

    # Compute weekly aggregates. Violent share counts only CAMEO roots 18/19/20.
    df_valid["cameo_root"] = df_valid["cameo_code"].astype(str).str[:2]
    df_valid["violent_event"] = df_valid["cameo_root"].isin(["18", "19", "20"]).astype(int)

    grouped = df_valid.groupby("period").agg(
        event_count=("period", "size"),
        avg_goldstein=("goldstein_scale", "mean"),
        violent_share=("violent_event", "mean"),
    ).reset_index()

    grouped = grouped.sort_values("period", ascending=True).reset_index(drop=True)

    all_time_weekly_mean = grouped["event_count"].mean() if not grouped.empty else 0.0

    upserted = 0
    for idx in range(len(grouped)):
        row = grouped.iloc[idx]
        phase = "insufficient_history"

        if idx >= 12:
            recent = grouped.iloc[idx - 3 : idx + 1]
            prior = grouped.iloc[idx - 11 : idx - 3]

            recent_volume_mean = recent["event_count"].mean()
            prior_volume_mean = prior["event_count"].mean()
            recent_goldstein_mean = recent["avg_goldstein"].mean()
            prior_goldstein_mean = prior["avg_goldstein"].mean()
            recent_violent_share_mean = recent["violent_share"].mean()
            prior_violent_share_mean = prior["violent_share"].mean()

            volume_rising = recent_volume_mean >= 1.15 * prior_volume_mean
            volume_falling = recent_volume_mean <= 0.85 * prior_volume_mean
            goldstein_falling = recent_goldstein_mean <= prior_goldstein_mean - 0.5
            goldstein_rising = recent_goldstein_mean >= prior_goldstein_mean + 0.5
            violence_rising = recent_violent_share_mean >= prior_violent_share_mean + 0.05

            if volume_rising and (goldstein_falling or violence_rising):
                phase = "escalation"
            elif volume_falling and goldstein_rising:
                phase = "de_escalation"
            elif recent_volume_mean < 0.25 * all_time_weekly_mean:
                phase = "low_intensity"
            else:
                phase = "sustained"

        conn.execute(
            """
            INSERT INTO signals_conflict_phase (
                event_config, period, event_count, avg_goldstein,
                violent_share, phase, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(event_config, period)
            DO UPDATE SET
                event_count = excluded.event_count,
                avg_goldstein = excluded.avg_goldstein,
                violent_share = excluded.violent_share,
                phase = excluded.phase,
                updated_at = excluded.updated_at
            """,
            (
                event_config,
                row["period"],
                int(row["event_count"]),
                float(row["avg_goldstein"]) if pd.notna(row["avg_goldstein"]) else None,
                float(row["violent_share"]),
                phase,
            ),
        )
        upserted += 1

    conn.commit()
    logger.info(f"[signal_builder] conflict_phase: {upserted} rows upserted")
    return upserted


def build_actor_location_graph(conn: sqlite3.Connection, df: pd.DataFrame, event_config: str) -> int:
    """
    Build actor-location edge weights for the network graph signal.
    Generates edges from both actor1 and actor2 against location.
    Rows missing actor or location are skipped.
    Returns total rows upserted.
    """
    actor_location_pairs = pd.concat([
        df[["actor1", "location"]].rename(columns={"actor1": "actor"}),
        df[["actor2", "location"]].rename(columns={"actor2": "actor"}),
    ], ignore_index=True)

    df_valid = actor_location_pairs.dropna(subset=["actor", "location"])
    grouped = df_valid.groupby(["actor", "location"]).size().reset_index(name="edge_weight")

    upserted = 0
    for _, row in grouped.iterrows():
        conn.execute(
            """
            INSERT INTO signals_actor_location_graph (event_config, actor, location, edge_weight, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            ON CONFLICT(event_config, actor, location)
            DO UPDATE SET edge_weight = excluded.edge_weight, updated_at = excluded.updated_at
            """,
            (event_config, row["actor"], row["location"], int(row["edge_weight"])),
        )
        upserted += 1

    conn.commit()
    logger.info(f"[signal_builder] actor_location_graph: {upserted} rows upserted")
    return upserted


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def build_all_signals(event_name: str, db_path: str = DB_PATH) -> dict:
    """
    Load all events and rebuild all 6 signal tables for the given event.

    Parameters
    ----------
    event_name : str
        Key from event_config.EVENTS (e.g. "sudan_2023").
    db_path : str
        Path to the SQLite database file.

    Returns
    -------
    dict with signal names as keys and row counts as values.
    """
    conn = sqlite3.connect(db_path)

    try:
        df = _load_events(conn)
        logger.info(f"[signal_builder] Loaded {len(df)} events for '{event_name}'")

        results = {
            "event_volume":         build_event_volume(conn, df, event_name),
            "event_type":           build_event_type(conn, df, event_name),
            "actor_frequency":      build_actor_frequency(conn, df, event_name),
            "location_frequency":   build_location_frequency(conn, df, event_name),
            "tone_over_time":       build_tone_over_time(conn, df, event_name),
            "actor_location_graph": build_actor_location_graph(conn, df, event_name),
            "conflict_phase": build_conflict_phase(conn, df, event_name),
        }

        logger.info(f"[signal_builder] All signals built: {results}")
        return results

    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Run directly for manual testing
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    results = build_all_signals("sudan_2023")
    print(results)