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
            "01",   # Make public statement
            "02",   # Appeal
            "03",   # Express intent to cooperate
            "04",   # Consult
            "05",   # Engage in diplomatic cooperation
            "06",   # Engage in material cooperation
            "07",   # Provide aid
            "08",   # Yield
            "09",   # Investigate
            "10",   # Demand
            "11",   # Disapprove
            "12",   # Reject
            "13",   # Threaten
            "14",   # Protest or hunger strike
            "15",   # Demonstrate or rally
            "16",   # Reduce relations
            "17",   # Coerce
            "18",   # Assault
            "19",   # Use of force, attack
            "20",   # Use unconventional mass violence
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