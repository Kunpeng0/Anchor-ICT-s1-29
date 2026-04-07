# event_config.py
# Central configuration for all event scenarios.
# To add a new event: add a new entry to EVENTS.
# No other files need to change.
# Created, reviewed, tested, and commented by Jesse Ly.

EVENTS = {
    "sudan_2023": {
        "label": "Sudanese Civil War",
        "start_date": "2023-04-01",
        "end_date": None,  # None = ongoing, fetcher uses today's date
        "cameo_codes": [
            "14",   # Protest, riot         TODO: replace with confirmed codes
            "18",   # Assault               TODO: replace with confirmed codes
            "19",   # Use of force, attack  TODO: replace with confirmed codes
            "20",   # Mass violence         TODO: replace with confirmed codes
        ],
        "countries": ["SU"],  # GDELT country code for Sudan
    },
}

# The active event the dashboard loads by default
DEFAULT_EVENT = "sudan_2023"


def get_event(name: str) -> dict:
    """Return config for a named event. Raises KeyError if not found."""
    if name not in EVENTS:
        raise KeyError(f"Event '{name}' not found in config. Available: {list(EVENTS.keys())}")
    return EVENTS[name]


def list_events() -> list:
    """Return a list of all configured event names."""
    return list(EVENTS.keys())