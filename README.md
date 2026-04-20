# Anchor — ICT Capstone 2026
**Project Number:** 2026-S1-29  
**Client:** Department of Foreign Affairs and Trade (DFAT)  
**Team:** Roy Vallecera, Jesse Ly, Kunpeng Xu, Von Solano, Tze Shen Ng

---

## Overview

Project Anchor is a locally deployed web application that ingests GDELT news event data, builds analytical signals about evolving international situations, and lets analysts query the data in plain English via a local LLM to generate dynamic charts.

---

## Project Structure

```
Anchor-ICT-s1-29/
├── backend/
│   ├── api/
│   │   └── main.py                   FastAPI app, scheduler, LLM routing
│   ├── config/
│   │   └── event_config.py           Centralised event configuration
│   ├── db/
│   │   ├── init_db.py                Database schema creation
│   │   └── db.py                     Query functions for FastAPI
│   ├── llm/
│   │   └── llm.py                    Ollama integration and intent parsing
│   └── ingestion/
│       ├── fetcher.py                GDELT ingestion pipeline
│       └── signal_builder.py         Signal aggregation
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── DashboardLayout.jsx   Main layout wrapper
│   │   │   ├── Sidebar.jsx           Navigation sidebar
│   │   │   └── Topbar.jsx            Top navigation bar
│   │   └── ui/
│   │       └── StatCard.jsx          Reusable stat card component
│   ├── hooks/
│   │   └── useLocalStorage.js        Local storage hook
│   ├── lib/
│   │   └── utils.js                  Shared utilities
│   ├── pages/
│   │   ├── dashboard/
│   │   │   ├── DashboardPage.jsx     Main dashboard view
│   │   │   ├── InsightsPage.jsx      Insights and LLM query view
│   │   │   ├── ReportsPage.jsx       Reports view
│   │   │   └── SettingsPage.jsx      Settings view
│   │   └── NotFoundPage.jsx          404 page
│   ├── router/
│   │   └── index.jsx                 React Router configuration
│   ├── App.jsx                       Root app component
│   ├── index.css                     Global styles
│   └── main.jsx                      Entry point
├── tests/
│   ├── test_event_config.py          6/6 passing
│   ├── test_fetcher.py               15/15 passing
│   ├── test_signal_builder.py        14/14 passing
│   ├── test_db.py                    24/24 passing
│   ├── test_api.py                   22/22 passing
│   └── test_llm.py                   8/8 passing
├── index.html
├── package.json
├── postcss.config.js
├── requirements.txt
├── tailwind.config.js
└── vite.config.js
```

---

## Frontend Setup

### Requirements
Node.js LTS — download from https://nodejs.org

### Steps

```bash
npm install
npm run dev
```

Once running, open your browser at the URL shown in the terminal (typically http://localhost:5173).

---

## Backend Setup

### Requirements
Python 3.11 — download from https://www.python.org or install via Homebrew on Mac.

### 1. Create and activate a virtual environment

```bash
python3 -m venv venv

# Mac/Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

> Note: the raw `events` table stores ingested GDELT rows without an `event_config` label.
> Signal tables such as `signals_event_volume` and `signals_actor_frequency` are event-specific.

### 3. Initialise the database

```bash
python backend/db/init_db.py
```

This creates anchor.db with all 10 required tables.

### 4. Run the historical data backfill

Pulls GDELT data from the start of the Sudan conflict. Takes around 15 minutes.

```bash
python3 - << 'EOF'
from backend.ingestion.fetcher import run_backfill
run_backfill("sudan_2023", start_date="2023-04-01")
EOF

# Windows
python -c "from backend.ingestion.fetcher import run_backfill; run_backfill('sudan_2023', start_date='2023-04-01')"
```

### 5. Build the signals

```bash
python3 - << 'EOF'
from backend.ingestion.signal_builder import build_all_signals
build_all_signals("sudan_2023")
EOF
```

### 6. Start the API

```bash
python backend/api/main.py
```

The API will be available at http://localhost:8000. Interactive docs at http://localhost:8000/docs.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Liveness check |
| GET | /events | Available event configs |
| GET | /signals/{event}/event-volume | Event counts over time |
| GET | /signals/{event}/event-type | Event counts by CAMEO code |
| GET | /signals/{event}/actor-frequency | Top actors |
| GET | /signals/{event}/location-frequency | Top locations |
| GET | /signals/{event}/tone-over-time | Goldstein scale trend |
| GET | /signals/{event}/actor-location-graph | Network graph nodes and edges |
| GET | /signals/{event}/media-attention | Total mentions over time |
| GET | /dashboard/{event}/summary | All dashboard data in one call |
| GET | /dashboard/{event}/recent-events | Recent raw events table |
| POST | /query | LLM natural language query |
| POST/GET | /graphs/{event} | Saved LLM graphs |
| PATCH | /graphs/{id}/visibility | Show or hide a saved graph |
| DELETE | /graphs/{id} | Delete a saved graph |
| POST/GET | /graphs/{id}/rate | Thumbs up/down rating |
> Note: `/dashboard/{event}/summary`, `/dashboard/{event}/recent-events`, and `/signals/{event}/media-attention`
> read from the shared raw `events` table, which is stored event-agnostically.
Full interactive documentation available at http://localhost:8000/docs when the API is running.

## Code Documentation

Backend-only documentation is available in the `docs` folder:

- `docs/README.md` — Documentation index and navigation.
- `docs/backend.md` — Backend module and API function reference.

Note: frontend code is not documented here yet; this docs set currently covers backend services only.

---

## Running the Tests

```bash
python tests/test_event_config.py
python tests/test_fetcher.py
python tests/test_signal_builder.py
python tests/test_db.py
python tests/test_api.py
python tests/test_llm.py
```

Expected result: 89/89 tests passing.

---

## Notes

- anchor.db is excluded from version control. Each team member generates their own by following the backend setup steps above.
- CAMEO event codes for the Sudan conflict are placeholders pending confirmation from Hamish Pratt. When confirmed, update cameo_codes in backend/config/event_config.py only and re-run the backfill. No other files need to change.
- The LLM query endpoint (POST /query) requires Ollama running locally on port 11434. Update `OLLAMA_BASE_URL` and `OLLAMA_MODEL` in backend/llm/llm.py if using a different host, port, or model name.
