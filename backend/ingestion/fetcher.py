# fetcher.py
# Fetches the latest GDELT 2.0 export, filters by CAMEO code and country,
# inserts new records into the events table, and logs the run.
# Called by APScheduler every 15 minutes inside the FastAPI process.
# Created, reviewed, tested, and commented by Jesse Ly.

import io
import logging
import os
import sqlite3
import sys
import zipfile
from datetime import date, datetime, timedelta, timezone

import pandas as pd
import requests

# ---------------------------------------------------------------------------
# Resolve project root so event_config can be imported regardless of where
# this file is invoked from (e.g. directly, via FastAPI, or via tests).
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from backend.config.event_config import get_event

# ---------------------------------------------------------------------------
# GDELT 2.0 column positions (0-indexed) in the export CSV.
# Full schema: https://www.gdeltproject.org/data/documentation/GDELT-Event_Codebook-V2.0.pdf
# ---------------------------------------------------------------------------
COL_EVENT_ID     = 0    # GLOBALEVENTID — unique identifier
COL_DATE         = 1    # SQLDATE — YYYYMMDD
COL_ACTOR1       = 6    # Actor1Name — verified col 6 (GDELT 2.0 codebook)
COL_ACTOR2       = 16   # Actor2Name — verified col 16 (GDELT 2.0 codebook)
COL_CAMEO_ROOT   = 28   # EventRootCode (e.g. "8", "14") — verified col 28 (GDELT 2.0 codebook)
COL_CAMEO_CODE   = 26   # EventCode (full, e.g. "081") — verified col 26 (GDELT 2.0 codebook)
COL_GOLDSTEIN    = 30   # GoldsteinScale
COL_NUM_MENTIONS = 31   # NumMentions
COL_LOCATION     = 52   # ActionGeo_FullName
COL_COUNTRY      = 53   # ActionGeo_CountryCode
COL_LAT          = 56   # ActionGeo_Lat
COL_LON          = 57   # ActionGeo_Long
COL_SOURCE_URL   = 60   # SOURCEURL

LASTUPDATE_URL = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt"

DB_PATH = "anchor.db"

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_export_url() -> str:
    """
    Fetch the GDELT lastupdate.txt file and extract the export CSV zip URL.
    lastupdate.txt has three lines; the first is the export file.
    Each line format: "<size> <md5> <url>"
    """
    response = requests.get(LASTUPDATE_URL, timeout=30)
    response.raise_for_status()
    first_line = response.text.strip().splitlines()[0]
    url = first_line.split()[-1]
    if not url.endswith(".export.CSV.zip"):
        raise ValueError(f"Unexpected GDELT export URL format: {url}")
    return url


def _download_export(url: str) -> pd.DataFrame:
    """
    Download the zipped GDELT export CSV and return it as a DataFrame
    with no header (columns are positional integers).
    """
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    with zipfile.ZipFile(io.BytesIO(response.content)) as z:
        csv_filename = [n for n in z.namelist() if n.endswith(".CSV")][0]
        with z.open(csv_filename) as f:
            df = pd.read_csv(f, sep="\t", header=None, low_memory=False)
    return df


def _filter_events(df: pd.DataFrame, cameo_codes: list, countries: list) -> pd.DataFrame:
    """
    Keep only rows where:
      - EventRootCode (col 27) matches one of the configured CAMEO root codes
      - ActionGeo_CountryCode (col 53) is in the configured countries list
    Both filters are applied only when the respective config list is non-empty.
    Passing an empty countries list captures global events (future use).
    """
    if cameo_codes:
        df = df[df[COL_CAMEO_ROOT].astype(str).isin(cameo_codes)]
    if countries:
        df = df[df[COL_COUNTRY].astype(str).isin(countries)]
    return df


def _safe(value):
    """Return None for NaN/NaT/non-finite values, otherwise return the value."""
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    return value


def _parse_date(raw) -> str | None:
    """
    Parse a GDELT SQLDATE value (YYYYMMDD integer or float) into an ISO date
    string (YYYY-MM-DD). Returns None if the value is null or malformed.
    """
    try:
        if pd.isna(raw):
            return None
        day_str = str(int(raw))
        if len(day_str) == 8:
            return f"{day_str[:4]}-{day_str[4:6]}-{day_str[6:]}"
        return None
    except (ValueError, TypeError, OverflowError):
        return None


def _insert_events(conn: sqlite3.Connection, df: pd.DataFrame) -> int:
    """
    Insert filtered rows into the events table.
    Uses INSERT OR IGNORE so duplicate event_ids are silently skipped.
    Returns the number of rows actually inserted.

    Note: the events table is event-agnostic (no event_config column).
    Signal tables carry the event_config label; see signal_builder.py.
    """
    cur = conn.cursor()
    inserted = 0

    for _, row in df.iterrows():
        try:
            event_id = str(int(row[COL_EVENT_ID]))
        except (ValueError, TypeError):
            logger.warning(f"[fetcher] Skipping row with invalid event_id: {row[COL_EVENT_ID]}")
            continue

        cur.execute(
            """
            INSERT OR IGNORE INTO events (
                event_id, event_date, cameo_code, cameo_description,
                actor1, actor2, country, location,
                latitude, longitude, goldstein_scale,
                num_mentions, source_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                event_id,
                _parse_date(row[COL_DATE]),
                _safe(row[COL_CAMEO_CODE]),
                None,                           # cameo_description not in export CSV
                _safe(row[COL_ACTOR1]),
                _safe(row[COL_ACTOR2]),
                _safe(row[COL_COUNTRY]),
                _safe(row[COL_LOCATION]),
                _safe(row[COL_LAT]),
                _safe(row[COL_LON]),
                _safe(row[COL_GOLDSTEIN]),
                _safe(row[COL_NUM_MENTIONS]),
                _safe(row[COL_SOURCE_URL]),
            ),
        )
        if cur.rowcount == 1:
            inserted += 1

    conn.commit()
    return inserted


def _log_run(
    conn: sqlite3.Connection,
    event_config: str,
    records_fetched: int,
    records_inserted: int,
    status: str,
    notes: str | None = None,
) -> None:
    """Write a row to ingestion_log."""
    conn.execute(
        """
        INSERT INTO ingestion_log
            (event_config, run_at, records_fetched, records_inserted, status, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            event_config,
            datetime.now(timezone.utc).isoformat(),
            records_fetched,
            records_inserted,
            status,
            notes,
        ),
    )
    conn.commit()


# ---------------------------------------------------------------------------
# Public entry points
# ---------------------------------------------------------------------------

def run_fetch(event_name: str, db_path: str = DB_PATH) -> dict:
    """
    Fetch the latest GDELT export, filter for the given event, and persist
    new records to the database.

    Parameters
    ----------
    event_name : str
        Key from event_config.EVENTS (e.g. "sudan_2023").
    db_path : str
        Path to the SQLite database file.

    Returns
    -------
    dict with keys: event_config, records_fetched, records_inserted, status, notes
    """
    config = get_event(event_name)
    cameo_codes = config["cameo_codes"]
    countries = config["countries"]

    conn = sqlite3.connect(db_path)

    try:
        logger.info(f"[fetcher] Starting fetch for '{event_name}'")

        export_url = _get_export_url()
        logger.info(f"[fetcher] Export URL: {export_url}")

        df_raw = _download_export(export_url)
        logger.info(f"[fetcher] Downloaded {len(df_raw)} total rows")

        df_filtered = _filter_events(df_raw, cameo_codes, countries)
        records_fetched = len(df_filtered)
        logger.info(f"[fetcher] {records_fetched} rows after filtering")

        records_inserted = _insert_events(conn, df_filtered)
        logger.info(f"[fetcher] {records_inserted} new rows inserted")

        _log_run(conn, event_name, records_fetched, records_inserted, "success")

        return {
            "event_config":    event_name,
            "records_fetched": records_fetched,
            "records_inserted": records_inserted,
            "status":          "success",
            "notes":           None,
        }

    except Exception as e:
        error_msg = str(e)
        logger.error(f"[fetcher] Error during fetch: {error_msg}")
        _log_run(conn, event_name, 0, 0, "error", error_msg)
        return {
            "event_config":    event_name,
            "records_fetched": 0,
            "records_inserted": 0,
            "status":          "error",
            "notes":           error_msg,
        }

    finally:
        conn.close()


def run_backfill(
    event_name: str,
    start_date: str,
    end_date: str | None = None,
    db_path: str = DB_PATH,
) -> dict:
    """
    Backfill historical GDELT data day by day from start_date to end_date.
    Uses the midnight (000000) export file for each day — one file per day.
    Safe to re-run: INSERT OR IGNORE skips already-ingested records.

    Parameters
    ----------
    event_name : str
        Key from event_config.EVENTS (e.g. "sudan_2023").
    start_date : str
        ISO date string for the first day to fetch (e.g. "2023-04-01").
    end_date : str | None
        ISO date string for the last day to fetch. Defaults to today.
    db_path : str
        Path to the SQLite database file.

    Returns
    -------
    dict with total_days, total_fetched, total_inserted, skipped, errors.
    """
    config = get_event(event_name)
    cameo_codes = config["cameo_codes"]
    countries = config["countries"]

    start = date.fromisoformat(start_date)
    end = date.fromisoformat(end_date) if end_date else date.today()

    conn = sqlite3.connect(db_path)

    total_fetched = 0
    total_inserted = 0
    skipped = 0
    errors = 0
    day_count = 0

    current = start
    while current <= end:
        day_str = current.strftime("%Y%m%d")
        url = f"http://data.gdeltproject.org/gdeltv2/{day_str}000000.export.CSV.zip"
        day_count += 1

        try:
            df_raw = _download_export(url)
            df_filtered = _filter_events(df_raw, cameo_codes, countries)
            fetched = len(df_filtered)
            inserted = _insert_events(conn, df_filtered)

            total_fetched += fetched
            total_inserted += inserted

            _log_run(conn, event_name, fetched, inserted, "backfill", f"date={current.isoformat()}")
            print(f"  {current.isoformat()} — fetched {fetched}, inserted {inserted}")

        except requests.exceptions.HTTPError as e:
            # 404 means no export file for that day — normal for gaps in GDELT history
            if e.response is not None and e.response.status_code == 404:
                print(f"  {current.isoformat()} — skipped (no export available)")
                skipped += 1
            else:
                print(f"  {current.isoformat()} — HTTP error: {e}")
                _log_run(conn, event_name, 0, 0, "error", str(e))
                errors += 1

        except Exception as e:
            print(f"  {current.isoformat()} — error: {e}")
            _log_run(conn, event_name, 0, 0, "error", str(e))
            errors += 1

        current += timedelta(days=1)

    conn.close()

    summary = {
        "event_config":  event_name,
        "total_days":    day_count,
        "total_fetched": total_fetched,
        "total_inserted": total_inserted,
        "skipped":       skipped,
        "errors":        errors,
    }
    print(f"\nBackfill complete: {summary}")
    return summary


# ---------------------------------------------------------------------------
# Run directly for manual testing
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    result = run_fetch("sudan_2023")
    print(result)