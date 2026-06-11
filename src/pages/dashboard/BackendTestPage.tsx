// ─── BackendTestPage.tsx ──────────────────────────────────────────────────────
// To test every db.py query function exposed via FastAPI.
// Organised into four labelled Section groups that mirror the backend
// module structure: Signal Query Functions, Dashboard Summary Functions,
// Saved Graph Functions, and Rating Functions. Each test is rendered by the
// reusable TestCard component, which can be reused in other contexts if needed
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import Plot from 'react-plotly.js'
import {
  Activity,
  Users,
  MapPin,
  BarChart2,
  Newspaper,
  Network,
  BookMarked,
  Star,
  ClipboardList,
  Hash,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  XCircle,
  Terminal,
} from 'lucide-react'
import { EventTypePoint, EventVolumePoint, PeriodType } from '@/lib/types'
import QueryResultChart from '@/components/charts/QueryResultChart'

// ─── Types ────────────────────────────────────────────────────────────────────
// possible states of a test card.

type Status = 'idle' | 'loading' | 'success' | 'error'

// TestResult is the shape stored in each card's local state after a run.
// chartType and periodType are optional — only signal cards that have an
// inline Plotly preview (event_volume, event_type) populate them.
interface TestResult {
  status: Status
  data?: unknown
  error?: string
  duration?: number                          // round-trip ms from callApi
  chartType?: 'event_volume' | 'event_type' // determines which inline chart to render
  periodType?: PeriodType                    // passed through to EventVolumeChartInline
}

// ─── Inline chart components ──────────────────────────────────────────────────
// These two Plotly wrappers are only used inside ResultPanel when a signal card
// returns chartType metadata. They are intentionally minimal — no save/rate
// controls — since this is a test console, not the full Insights UI.

// EventVolumeChartInline: renders a smoothed area/line chart of daily or
// weekly event counts. The weekly label formatter converts the raw ISO week
// string (e.g. "2023-W04") into a shorter "W4 '23" label for the x-axis.
function EventVolumeChartInline({ data, periodType }: { data: EventVolumePoint[]; periodType: PeriodType }) {
  const xValues = data.map((d) => d.period)
  const yValues = data.map((d) => d.event_count)

  // shorten weekly labels for display
  const formattedX = xValues.map((label) => {
    if (periodType === 'weekly') {
      const [year, week] = label.split('-W')
      return `W${parseInt(week)} '${year.slice(2)}`
    }
    return label
  })

  return (
    <Plot
      data={[{
        x: formattedX,
        y: yValues,
        type: 'scatter',
        mode: 'lines',
        name: 'Event Count',
        // smooth lines
        line: { color: '#4c6ef5', width: 2.5, shape: 'spline', smoothing: 1.3 },
        // fill area below the line with a light tint of the line colour
        fill: 'tozeroy',
        fillcolor: 'rgba(76, 110, 245, 0.08)',
        hovertemplate: '%{x}<br>Events: %{y}<extra></extra>',
      }]}
      layout={{
        autosize: true,
        margin: { t: 10, r: 32, b: 80, l: 48 },
        paper_bgcolor: 'transparent', // lets the card background show through
        plot_bgcolor: 'transparent',
        font: { family: 'Inter, system-ui, sans-serif', size: 12, color: '#6b7280' },
        xaxis: { showgrid: false, zeroline: false, tickfont: { size: 11, color: '#9ca3af' }, showline: false, ticklabelstandoff: 10 },
        yaxis: {
          showgrid: true,
          gridcolor: 'rgba(243,244,246,0.8)',
          zeroline: false,
          tickfont: { size: 11, color: '#9ca3af' },
          title: { text: 'Event Count', font: { size: 11, color: '#9ca3af' }, standoff: 20 },
        },
        showlegend: false,
        hovermode: 'x unified', // single vertical tooltip line across all traces
      }}
      config={{ responsive: true, displayModeBar: false }} // hides the Plotly toolbar
      useResizeHandler                                      // re-renders on container resize
      style={{ width: '100%', height: '240px' }}
    />
  )
}

// EventTypeChartInline: renders a horizontal bar chart of event counts grouped
// by CAMEO root code. Bars are sorted ascending so the longest bar is at the
// top, and opacity is ramped from 40 % to 100 % to give a visual gradient.
function EventTypeChartInline({ data }: { data: EventTypePoint[] }) {
  // Sort bars by event count
  const sorted = [...data].sort((a, b) => a.event_count - b.event_count)
  const labels = sorted.map((d) => `${d.cameo_root} - ${d.cameo_description}`)
  const values = sorted.map((d) => d.event_count)

  return (
    <Plot
      data={[{
        x: values,
        y: labels,
        type: 'bar',
        orientation: 'h',
        name: 'Events',
        // creates a gradient effect
        marker: {
          color: values.map((_, i) =>
            `rgba(76, 110, 245, ${0.4 + (i / (values.length - 1)) * 0.6})`
          ),
        },
        hovertemplate: '<b>%{y}</b><br>Events: <b>%{x}</b><extra></extra>',
        text: values.map(String),
        textposition: 'outside', // labels just outside the bar end
        textfont: { size: 11, color: '#6b7280' },
      }]}
      layout={{
        autosize: true,
        margin: { t: 10, r: 24, b: 40, l: 160 }, // left margin accommodates long CAMEO labels
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { family: 'Inter, system-ui, sans-serif', size: 12, color: '#6b7280' },
        bargap: 0.4,
        xaxis: {
          showgrid: true,
          gridcolor: 'rgba(243,244,246,0.8)',
          zeroline: false,
          tickfont: { size: 11, color: '#9ca3af' },
          showline: false,
          // Add 15 % headroom so 'outside' text labels don't clip
          range: [0, Math.max(...values) * 1.15],
        },
        yaxis: { showgrid: false, zeroline: false, tickfont: { size: 11, color: '#6b7280' }, ticklabelstandoff: 10 },
        showlegend: false,
        hovermode: 'closest',
      }}
      config={{ responsive: true, displayModeBar: false }}
      useResizeHandler
      style={{ width: '100%', height: '240px' }}
    />
  )
}

// ─── Config ───────────────────────────────────────────────────────────────────
// All API calls are prefixed with this base.
const BASE_URL = 'http://localhost:8000'

// ─── callApi helper ───────────────────────────────────────────────────────────
// Helper function for making API calls. Returns both the
// parsed JSON body and a round-trip duration in milliseconds so cards can
// display response time in the ResultPanel header.
//
// Throws a descriptive Error on any non-2xx response — the message includes
// the HTTP status code, status text, and raw response body so the ResultPanel
// can display exactly what FastAPI returned (e.g. a 422 validation error body).
async function callApi(
  path: string,
  method = 'GET',
  body?: object
): Promise<{ data: unknown; duration: number }> {
  const start = performance.now()                          // capture start time before fetch
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,         // only serialize when body is provided
  })
  const duration = Math.round(performance.now() - start)  // total round-trip in ms

  if (!res.ok) {
    // Show backend error details, for debugging
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }

  const data = await res.json()
  return { data, duration }
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
// Displays the current status of a test card. Returns null for 'idle'
// so no badge is visible before the first run. Each status maps to a distinct
// colour and icon so the developer can spot failures at a glance across cards.
function StatusBadge({ status }: { status: Status }) {
  if (status === 'idle') return null   // nothing shown before first run

  if (status === 'loading')
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-brand-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running…
      </span>
    )

  if (status === 'success')
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" /> OK
      </span>
    )

  // Fallback is always 'error'
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-red-500">
      <XCircle className="h-3.5 w-3.5" /> Error
    </span>
  )
}

// ─── ResultPanel ──────────────────────────────────────────────────────────────
// Collapsible panel rendered below the Run button after a fetch completes.
// Hidden entirely while idle or loading. Three rendering modes:
//   1. Error   → red panel with the thrown error message
//   2. Chart   → inline Plotly chart (only for event_volume and event_type cards)
//   3. Default → pretty-printed JSON of the raw response
function ResultPanel({ result }: { result: TestResult }) {
  // Starts open; the chevron toggle collapses/expands the content area
  const [open, setOpen] = useState(true)

  // Don't render anything until a run has completed (or if data is explicitly null,
  // e.g. SavedGraphsCard sets data: null and renders charts as separate siblings)
  if (result.status === 'idle' || result.status === 'loading' || result.data === null) return null

  const isError = result.status === 'error'

  // showChart is true only when the card's onRun returned a chartType AND data is
  // an array — guards against rendering a chart for scalar or object responses
  const showChart = !isError && result.chartType && Array.isArray(result.data)

  return (
    <div
      className={`mt-3 rounded-lg border text-xs font-mono ${
        isError
          ? 'border-red-200 bg-red-50 text-red-700'   // red tint for errors
          : 'border-gray-200 bg-gray-50 text-gray-800' // neutral tint for success
      }`}
    >
      {/* Collapsible header: shows label ("Chart" / "Response" / "Error") + duration badge */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="flex items-center gap-1.5 font-sans text-xs font-medium text-gray-500">
          <Terminal className="h-3.5 w-3.5" />
          {/* Label changes based on content type so the developer knows what to expect */}
          {isError ? 'Error' : showChart ? 'Chart' : 'Response'}
          {/* Duration badge only shown on successful runs */}
          {result.duration != null && !isError && (
            <span className="ml-1 rounded bg-gray-200 px-1.5 py-0.5 text-gray-500">
              {result.duration}ms
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        )}
      </button>

      {/* Content area — hidden when collapsed */}
      {open && (
        <div className="border-t border-gray-200">
          {isError ? (
            // Mode 1: error — plain pre with the thrown error string
            <pre className="max-h-64 overflow-auto px-3 py-2 text-xs leading-relaxed">{result.error}</pre>
          ) : showChart ? (
            // Mode 2: inline chart — branch on chartType to pick the right Plotly component
            <div className="bg-white px-2 py-2 rounded-b-lg">
              {result.chartType === 'event_volume' && (
                // periodType is required to format the x-axis labels correctly
                <EventVolumeChartInline data={result.data as EventVolumePoint[]} periodType={result.periodType ?? 'daily'} />
              )}
              {result.chartType === 'event_type' && (
                <EventTypeChartInline data={result.data as EventTypePoint[]} />
              )}
            </div>
          ) : (
            // Mode 3: default — pretty-printed JSON
            <pre className="max-h-64 overflow-auto px-3 py-2 text-xs leading-relaxed">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Types for TestCard ───────────────────────────────────────────────────────
// Defines an input field for a TestCard.
// type chooses between an input box or dropdown
// default values sets the starting value
interface Field {
  key: string           // used as the key in the `values` state object
  label: string         // shown above the input
  placeholder?: string
  defaultValue?: string
  type?: 'text' | 'number' | 'select'
  options?: string[]    // only used when type === 'select'
}

// TestCardProps is the public API for every card on the page.
// `onRun` receives the current field values and must return a promise that
// resolves to whatever callApi returns (plus any extra metadata like chartType).
interface TestCardProps {
  icon: React.ReactNode
  title: string
  description: string
  fields: Field[]
  onRun: (values: Record<string, string>) => Promise<unknown>
  accent?: string // Tailwind bg-* class for the icon badge colour
}

// QueryIntent is the shape SavedGraphsCard uses when it normalises intent_json
// rows from the backend before passing them to QueryResultChart.
interface QueryIntent {
  chart_type: string
  signal: string
  params: Record<string, unknown>
}

// ─── TestCard ─────────────────────────────────────────────────────────────────
// The core reusable unit of this page. Renders a white card with:
//   • A coloured icon badge + title + inline StatusBadge
//   • A responsive grid of input fields (text, number, or select)
//   • A Run button that calls onRun and manages loading state
//   • A ResultPanel that appears after the run completes
//
// Each card is completely independent, so running one never affects another's state.

function TestCard({ icon, title, description, fields, onRun, accent = 'bg-brand-600' }: TestCardProps) {
  // `init` builds the initial values map from each field's defaultValue (or '')
  // so every field is controlled from the first render without extra boilerplate
  const init = Object.fromEntries(
    fields.map(f => [f.key, f.defaultValue ?? ''])
  )
  const [values, setValues] = useState<Record<string, string>>(init) // current field values
  const [result, setResult] = useState<TestResult>({ status: 'idle' })

  // Runs the selected API test:
  //   1. Immediately sets status to 'loading' (disables the button, shows spinner)
  //   2. Awaits onRun, which calls callApi internally
  //   3. Destructures optional chartType / periodType from the resolved value
  //      so signal cards can opt into the inline chart rendering path
  //   4. On catch, stores the error message for the ResultPanel to display
  const handleRun = async () => {
    setResult({ status: 'loading' })
    try {
      const res = await onRun(values)
      const { data, duration, chartType, periodType } = res as {
        data: unknown
        duration: number
        chartType?: TestResult['chartType']
        periodType?: PeriodType
      }
      setResult({ status: 'success', data, duration, chartType, periodType })
    } catch (e) {
      setResult({ status: 'error', error: (e as Error).message })
    }
  }

  return (
    <div className="card">
      {/* Card header: icon badge + title + live status badge */}
      <div className="flex items-start gap-3">
        {/* accent prop sets the icon badge colour — each API section uses a distinct hue */}
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${accent} text-white`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {/* StatusBadge re-renders automatically because result.status is in local state */}
            <StatusBadge status={result.status} />
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
      </div>

      {/* Parameter input grid — 1 column on mobile, 2 on sm+ */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {fields.map(f => (
          <div key={f.key} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">{f.label}</label>
            {/* Render a <select> for enum fields, <input> for everything else */}
            {f.type === 'select' ? (
              <select
                value={values[f.key]}
                // Spread the previous values to avoid clobbering other fields
                onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
              >
                {f.options?.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                type={f.type ?? 'text'}
                value={values[f.key]}
                placeholder={f.placeholder}
                onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
              />
            )}
          </div>
        ))}
      </div>

      {/* Run button — disabled during loading to prevent duplicate requests */}
      <button
        onClick={handleRun}
        disabled={result.status === 'loading'}
        className="btn-primary mt-4 flex w-full items-center justify-center gap-1.5 disabled:opacity-50"
      >
        {result.status === 'loading' ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running…
          </>
        ) : (
          'Run'
        )}
      </button>

      {/* ResultPanel mounts below the button once a run completes */}
      <ResultPanel result={result} />
    </div>
  )
}

// ─── SavedGraphsCard ──────────────────────────────────────────────────────────
// Special composite card for get_saved_graphs(). Unlike the generic TestCard,
// it needs to do two async steps per saved graph row:
//   1. Fetch the list of saved graph rows from GET /graphs/{event_name}
//   2. For each row, look up the signal endpoint from signalEndpointMap and
//      fetch the actual chart data to pass to QueryResultChart
//
// The resulting charts are rendered as QueryResultChart siblings below the
// TestCard, matching how the Dashboard page displays saved graphs. Because
// data is null in the onRun return, ResultPanel suppresses the JSON panel
// and the charts are rendered directly in this component instead.
function SavedGraphsCard() {
  // charts holds the hydrated results — one entry per saved graph row
  const [charts, setCharts] = useState<{ intent: QueryIntent; data: unknown; label: string | null }[]>([])

  return (
    <div>
      <TestCard
        icon={<BookMarked className="h-4 w-4" />}
        title="get_saved_graphs()"
        description="Returns visible saved graphs and renders each one."
        accent="bg-teal-600"
        fields={[
          { key: 'event_name', label: 'event_name', placeholder: 'e.g. sudan_2023', defaultValue: 'sudan_2023' },
          // include_hidden lets surface soft-deleted graphs during testing
          { key: 'include_hidden', label: 'include_hidden', type: 'select', options: ['false', 'true'], defaultValue: 'false' },
        ]}
        onRun={async v => {
          setCharts([]) // clear previous results before each new run

          // Step 1: fetch the saved graph rows for this event config
          const { data, duration } = await callApi(
            `/graphs/${v.event_name}?include_hidden=${v.include_hidden}`
          )

          const rows = data as {
            event_config: string
            intent_json: string  // stored as a JSON string in SQLite
            label: string | null
          }[]

          // Step 2: for every row, parse intent_json and fetch real signal data
          const results = await Promise.all(
            rows.map(async row => {
              // intent_json may arrive as a string (from SQLite) or already parsed
              const parsed = typeof row.intent_json === 'string'
                ? JSON.parse(row.intent_json)
                : row.intent_json

              // Normalise the intent shape: the backend stores "type" but
              // QueryResultChart expects "signal". Support both to avoid breakage
              // if older rows were saved before the schema was settled.
              const intent: QueryIntent = {
                chart_type: parsed.chart_type ?? parsed.type ?? '',
                signal: parsed.signal ?? parsed.type ?? '',  // handles both storage shapes
                params: parsed.params ?? {},
              }

              // signalEndpointMap translates a signal name into a fully-qualified
              // API path. Params fall back to sensible defaults so old saved graphs
              // without stored params still render correctly.
              const signalEndpointMap: Record<string, string> = {
                event_volume:         `/signals/${row.event_config}/event-volume?period_type=${intent.params?.period_type ?? 'daily'}`,
                event_type:           `/signals/${row.event_config}/event-type`,
                actor_frequency:      `/signals/${row.event_config}/actor-frequency?limit=${intent.params?.limit ?? 10}`,
                location_frequency:   `/signals/${row.event_config}/location-frequency?limit=${intent.params?.limit ?? 10}`,
                tone_over_time:       `/signals/${row.event_config}/tone-over-time?period_type=${intent.params?.period_type ?? 'weekly'}`,
                media_attention:      `/signals/${row.event_config}/media-attention?period_type=${intent.params?.period_type ?? 'daily'}`,
                actor_location_graph: `/signals/${row.event_config}/actor-location-graph?min_edge_weight=${intent.params?.min_edge_weight ?? 1}`,
                recent_events:        `/dashboard/${row.event_config}/recent-events?limit=${intent.params?.limit ?? 20}`,
              }

              const endpoint = signalEndpointMap[intent.signal]
              // Surface a clear error if a saved graph has an unrecognised signal type
              if (!endpoint) throw new Error(`Unknown signal: "${intent.signal}" in saved graph`)

              const { data: chartData } = await callApi(endpoint)
              return { intent, data: chartData, label: row.label }
            })
          )

          setCharts(results) // triggers re-render of the chart list below

          // Return data: null so ResultPanel skips the JSON panel — charts are
          // rendered as siblings of this TestCard rather than inside it
          return { data: null, duration }
        }}
      />

      {/* Render one QueryResultChart per hydrated saved graph row */}
      {charts.map((chart, i) => (
        <div key={i} className="mt-4">
          {/* Show the graph's label if one was saved with it */}
          {chart.label && (
            <p className="mb-1 text-xs font-medium text-gray-500">{chart.label}</p>
          )}
          <QueryResultChart intent={chart.intent} data={chart.data} />
        </div>
      ))}
    </div>
  )
}

// ─── BackendTestPage ──────────────────────────────────────────────────────────
// Root page component. Renders a header card followed by four Section groups,
// each containing the TestCards that map to that area of db.py. The page has
// no state of its own — all state lives inside individual TestCards.
export default function BackendTestPage() {
  return (
    <div className="space-y-6">
      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900">Backend Test Console</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Test all{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-gray-700">db.py</code>{' '}
          functions against local{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-gray-700">anchor.db</code>.
          FastAPI must be running on{' '}
          <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-gray-700">localhost:8000</code>.
        </p>
      </div>

      {/* ── Signal Query Functions ─────────────────────────────────────────
           These cards each hit a /signals/{event_name}/{signal} endpoint.
           get_event_volume and get_event_type return chartType metadata so
           ResultPanel renders an inline Plotly chart instead of raw JSON.
           All others display JSON output only. ──────────────────────────── */}
      <Section title="Signal Query Functions" subtitle="Pre-aggregated signal table reads">

        {/* get_event_volume — returns chartType so ResultPanel renders EventVolumeChartInline */}
        <TestCard
          icon={<Activity className="h-4 w-4" />}
          title="get_event_volume()"
          description="Daily or weekly event counts from signals_event_volume."
          accent="bg-brand-600"
          fields={[
            { key: 'event_name', label: 'event_name', placeholder: 'e.g. sudan_2023', defaultValue: 'sudan_2023' },
            // period_type controls both the API query param and the x-axis label formatter
            { key: 'period_type', label: 'period_type', type: 'select', options: ['daily', 'weekly'], defaultValue: 'daily' },
          ]}
          onRun={async v => {
            const { data, duration } = await callApi(
              `/signals/${v.event_name}/event-volume?period_type=${v.period_type}`
            )
            // chartType and periodType are passed back so ResultPanel knows to render the chart
            return { data, duration, chartType: 'event_volume' as const, periodType: v.period_type as PeriodType }
          }}
        />

        {/* get_event_type — returns chartType so ResultPanel renders EventTypeChartInline */}
        <TestCard
          icon={<Hash className="h-4 w-4" />}
          title="get_event_type()"
          description="Event counts grouped by CAMEO root code from signals_event_type."
          accent="bg-violet-600"
          fields={[
            { key: 'event_name', label: 'event_name', placeholder: 'e.g. sudan_2023', defaultValue: 'sudan_2023' },
          ]}
          onRun={async v => {
            const { data, duration } = await callApi(`/signals/${v.event_name}/event-type`)
            return { data, duration, chartType: 'event_type' as const }
          }}
        />

        <TestCard
          icon={<Users className="h-4 w-4" />}
          title="get_actor_frequency()"
          description="Top N actors by event count from signals_actor_frequency."
          accent="bg-sky-600"
          fields={[
            { key: 'event_name', label: 'event_name', placeholder: 'e.g. sudan_2023', defaultValue: 'sudan_2023' },
            // limit is sent as a query param; backend defaults to 10 if omitted
            { key: 'limit', label: 'limit', type: 'number', placeholder: '10', defaultValue: '10' },
          ]}
          onRun={async v => {
            const { data, duration } = await callApi(
              `/signals/${v.event_name}/actor-frequency?limit=${v.limit}`
            )
            return { data, duration }
          }}
        />

        <TestCard
          icon={<MapPin className="h-4 w-4" />}
          title="get_location_frequency()"
          description="Top N locations by event count from signals_location_frequency."
          accent="bg-emerald-600"
          fields={[
            { key: 'event_name', label: 'event_name', placeholder: 'e.g. sudan_2023', defaultValue: 'sudan_2023' },
            { key: 'limit', label: 'limit', type: 'number', placeholder: '10', defaultValue: '10' },
          ]}
          onRun={async v => {
            const { data, duration } = await callApi(
              `/signals/${v.event_name}/location-frequency?limit=${v.limit}`
            )
            return { data, duration }
          }}
        />

        <TestCard
          icon={<BarChart2 className="h-4 w-4" />}
          title="get_tone_over_time()"
          description="Average Goldstein scale per period from signals_tone_over_time."
          accent="bg-amber-600"
          fields={[
            { key: 'event_name', label: 'event_name', placeholder: 'e.g. sudan_2023', defaultValue: 'sudan_2023' },
            // weekly is the default because Goldstein trends are smoother at that granularity
            { key: 'period_type', label: 'period_type', type: 'select', options: ['weekly', 'daily'], defaultValue: 'weekly' },
          ]}
          onRun={async v => {
            const { data, duration } = await callApi(
              `/signals/${v.event_name}/tone-over-time?period_type=${v.period_type}`
            )
            return { data, duration }
          }}
        />

        <TestCard
          icon={<Newspaper className="h-4 w-4" />}
          title="get_media_attention()"
          description="Sum of num_mentions per period, queried directly from the events table."
          accent="bg-rose-600"
          fields={[
            { key: 'event_name', label: 'event_name', placeholder: 'e.g. sudan_2023', defaultValue: 'sudan_2023' },
            { key: 'period_type', label: 'period_type', type: 'select', options: ['daily', 'weekly'], defaultValue: 'daily' },
          ]}
          onRun={async v => {
            const { data, duration } = await callApi(
              `/signals/${v.event_name}/media-attention?period_type=${v.period_type}`
            )
            return { data, duration }
          }}
        />

        <TestCard
          icon={<Network className="h-4 w-4" />}
          title="get_actor_location_graph()"
          description="Actor–location edges with weights from signals_actor_location_graph."
          accent="bg-indigo-600"
          fields={[
            { key: 'event_name', label: 'event_name', placeholder: 'e.g. sudan_2023', defaultValue: 'sudan_2023' },
            // min_edge_weight filters low-frequency actor–location pairings from the graph
            { key: 'min_edge_weight', label: 'min_edge_weight', type: 'number', placeholder: '1', defaultValue: '1' },
          ]}
          onRun={async v => {
            const { data, duration } = await callApi(
              `/signals/${v.event_name}/actor-location-graph?min_edge_weight=${v.min_edge_weight}`
            )
            return { data, duration }
          }}
        />
      </Section>

      {/* ── Dashboard Summary Functions ────────────────────────────────────
           Dashboard page header stats.
           Both route through /dashboard/{event_name}/... rather than /signals.
           Responses are JSON-only — no inline charts. ─────────────────── */}
      <Section title="Dashboard Summary Functions" subtitle="Quick counts and recent event rows">

        {/* get_event_count — hits /dashboard/{event_name}/summary which returns
            a single {count: N} object, not the full signal table ─────────── */}
        <TestCard
          icon={<Hash className="h-4 w-4" />}
          title="get_event_count()"
          description="Total raw event count via COUNT(*) on the events table."
          accent="bg-gray-700"
          fields={[
            { key: 'event_name', label: 'event_name', placeholder: 'e.g. sudan_2023', defaultValue: 'sudan_2023' },
          ]}
          onRun={async v => {
            const { data, duration } = await callApi(`/dashboard/${v.event_name}/summary`)
            return { data, duration }
          }}
        />

        {/* get_recent_events — limit is passed as a query param to cap the
            number of full event rows returned (default 20) ──────────────── */}
        <TestCard
          icon={<ClipboardList className="h-4 w-4" />}
          title="get_recent_events()"
          description="Most recent full event rows ordered by event_date descending."
          accent="bg-gray-700"
          fields={[
            { key: 'event_name', label: 'event_name', placeholder: 'e.g. sudan_2023', defaultValue: 'sudan_2023' },
            { key: 'limit', label: 'limit', type: 'number', placeholder: '20', defaultValue: '20' },
          ]}
          onRun={async v => {
            const { data, duration } = await callApi(
              `/dashboard/${v.event_name}/recent-events?limit=${v.limit}`
            )
            return { data, duration }
          }}
        />
      </Section>

      <Section title="Saved Graph Functions" subtitle="Create, retrieve, hide and delete saved graphs">

        {/* Loads and displays the saved graphs card */}
        <SavedGraphsCard/>

        {/* save_graph — intent_json must be a valid JSON string in the input;
            it is parsed with JSON.parse before POSTing so the backend receives
            a dict, not a string (FastAPI validates the body shape strictly) ── */}
        <TestCard
          icon={<BookMarked className="h-4 w-4" />}
          title="save_graph()"
          description="Save a new graph row. Returns the new row id."
          accent="bg-teal-600"
          fields={[
            { key: 'event_name', label: 'event_name', placeholder: 'sudan_2023', defaultValue: 'sudan_2023' },
            { key: 'query_text', label: 'query_text', placeholder: 'Show actor frequency', defaultValue: 'Show actor frequency' },
            // Convert JSON text into an object before sending — the backend expects a dict, not a string, and
            // sending a string here would cause a FastAPI 422 validation error
            { key: 'intent_json', label: 'intent_json (JSON string)', placeholder: '{"type":"actor_frequency"}', defaultValue: '{"type":"actor_frequency"}' },
            { key: 'label', label: 'label (optional)', placeholder: 'My graph' },
          ]}
          onRun={async v => {
            const { data, duration } = await callApi(`/graphs/${v.event_name}`, 'POST', {
              query_text: v.query_text,
              intent_json: JSON.parse(v.intent_json), // parse here — must be a dict, not a string
              label: v.label || null,                  // empty string → null so backend stores NULL
            })
            return { data, duration }
          }}
        />

        {/* update_graph_visibility — uses PATCH /graphs/{id}/visibility.
            The select converts the string 'true'/'false' to a boolean for
            the request body because JSON booleans are required by the schema. */}
        <TestCard
          icon={<BookMarked className="h-4 w-4" />}
          title="update_graph_visibility()"
          description="Show or hide a saved graph by its id."
          accent="bg-teal-600"
          fields={[
            { key: 'graph_id', label: 'graph_id', type: 'number', placeholder: '1', defaultValue: '1' },
            { key: 'visible', label: 'visible', type: 'select', options: ['true', 'false'], defaultValue: 'true' },
          ]}
          onRun={async v => {
            const { data, duration } = await callApi(`/graphs/${v.graph_id}/visibility`, 'PATCH', {
              graph_id: Number(v.graph_id),
              visible: v.visible === 'true', // string → boolean; 'true' === 'true' evaluates to true
            })
            return { data, duration }
          }}
        />

        {/* delete_graph — permanently removes the graph row and any associated
            ratings rows from the database ──────────── */}
        <TestCard
          icon={<BookMarked className="h-4 w-4" />}
          title="delete_graph()"
          description="Delete a saved graph and its ratings by graph id."
          accent="bg-red-600"  // red accent signals a destructive operation
          fields={[
            { key: 'graph_id', label: 'graph_id', type: 'number', placeholder: '1', defaultValue: '1' },
          ]}
          onRun={async v => {
            const { data, duration } = await callApi(`/graphs/${v.graph_id}`, 'DELETE', {
              graph_id: Number(v.graph_id),
            })
            return { data, duration }
          }}
        />
      </Section>

      {/* ── Rating Functions ───────────────────────────────────────────────
           Two cards covering rate_graph (write) and get_graph_ratings (read).
           Ratings are 1 (👍) or -1 (👎) and are stored per saved_graph_id.
           convert the thumbs up or down into string value then to Number before POSTing. ─── */}
      <Section title="Rating Functions" subtitle="Developer-facing thumbs up / down on saved graphs">

        {/* rate_graph — rating arrives from the select as '1' or '-1' (string)
            and must be changed to Number before sending to match the schema ── */}
        <TestCard
          icon={<Star className="h-4 w-4" />}
          title="rate_graph()"
          description="Submit a rating of 1 (👍) or -1 (👎) for a saved graph."
          accent="bg-yellow-500"
          fields={[
            { key: 'saved_graph_id', label: 'saved_graph_id', type: 'number', placeholder: '1', defaultValue: '1' },
            { key: 'rating', label: 'rating', type: 'select', options: ['1', '-1'], defaultValue: '1' },
          ]}
          onRun={async v => {
            const { data, duration } = await callApi(`/graphs/${v.saved_graph_id}/rate`, 'POST', {
              saved_graph_id: Number(v.saved_graph_id),
              rating: Number(v.rating), // change '1'/'-1' string → number
            })
            return { data, duration }
          }}
        />

        {/* get_graph_ratings — read-only; returns thumbs_up, thumbs_down, total ── */}
        <TestCard
          icon={<Star className="h-4 w-4" />}
          title="get_graph_ratings()"
          description="Returns thumbs_up, thumbs_down, and total counts for a saved graph."
          accent="bg-yellow-500"
          fields={[
            { key: 'saved_graph_id', label: 'saved_graph_id', type: 'number', placeholder: '1', defaultValue: '1' },
          ]}
          onRun={async v => {
            const { data, duration } = await callApi(
              `/graphs/${v.saved_graph_id}/ratings`
            )
            return { data, duration }
          }}
        />
      </Section>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────
// Reusable component. Renders a
// titled, bordered heading row above a 2-column grid of TestCard children.
// Keeping this as a separate component means the grid gutter and border style
// only need to be defined once.
function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="card">
      {/* Section heading with a bottom border to visually separate it from the cards */}
      <div className="mb-4 border-b border-gray-200 pb-3">
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      {/* 1-column on mobile, 2-column on lg+ to match the dashboard card grid */}
      <div className="grid gap-4 lg:grid-cols-2">{children}</div>
    </div>
  )
}