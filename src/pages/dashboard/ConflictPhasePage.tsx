// ConflictPhasePage renders the Q20 "Is the conflict getting better or worse?" view.
// Fetches directly from the /signals endpoint with raw fetch, matching the pattern
// used in EventVolumeChart and EventTypeChart.
import { useEffect, useState } from 'react'
import Plot from 'react-plotly.js'

interface ConflictPhaseRow {
  period: string
  event_count: number
  avg_goldstein: number | null
  violent_share: number
  phase: string
}

interface ConflictPhaseCurrent {
  phase: string | null
  volume_change: number | null
  goldstein_change: number | null
  violent_share_change: number | null
}

interface ConflictPhaseData {
  rows: ConflictPhaseRow[]
  current: ConflictPhaseCurrent
}

const EVENT_NAME = 'sudan_2023'

// Maps a phase key to a Tailwind background + text class pair for the banner.
const PHASE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  escalation:           { bg: 'bg-red-50 dark:bg-red-950/40',    text: 'text-red-700 dark:text-red-300',    label: 'Escalation'           },
  de_escalation:        { bg: 'bg-green-50 dark:bg-green-950/40', text: 'text-green-700 dark:text-green-300', label: 'De-escalation'        },
  sustained:            { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', label: 'Sustained'            },
  low_intensity:        { bg: 'bg-blue-50 dark:bg-blue-950/40',  text: 'text-blue-700 dark:text-blue-300',  label: 'Low Intensity'        },
  insufficient_history: { bg: 'bg-gray-50 dark:bg-gray-900',     text: 'text-gray-500 dark:text-gray-400',  label: 'Insufficient History' },
}

// Colour each bar by phase so the timeline is immediately readable.
const PHASE_BAR_COLOUR: Record<string, string> = {
  escalation:           '#ef4444',
  de_escalation:        '#22c55e',
  sustained:            '#f59e0b',
  low_intensity:        '#3b82f6',
  insufficient_history: '#d1d5db',
}

function getPlotTheme() {
  const isDark = document.documentElement.classList.contains('dark')
  return {
    axisColor:  isDark ? '#e5e7eb' : '#9ca3af',
    labelColor: isDark ? '#f9fafb' : '#6b7280',
    gridColor:  isDark ? 'rgba(148,163,184,0.3)' : 'rgba(243,244,246,0.9)',
  }
}

// Format a signed number with a + prefix for positive values.
function signed(value: number, decimals = 1): string {
  const formatted = value.toFixed(decimals)
  return value >= 0 ? `+${formatted}` : formatted
}

export default function ConflictPhasePage() {
  const [data, setData] = useState<ConflictPhaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/signals/${EVENT_NAME}/conflict-phase`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<ConflictPhaseData>
      })
      .then((d) => { setData(d); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
        <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">Loading conflict phase data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-red-500">
        Failed to load: {error}
      </div>
    )
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        No phase data available yet. The backend needs at least one completed ingestion cycle.
      </div>
    )
  }

  const { rows, current } = data
  const phaseKey = current.phase ?? 'insufficient_history'
  const phaseStyle = PHASE_STYLES[phaseKey] ?? PHASE_STYLES.insufficient_history
  const theme = getPlotTheme()

  // Filter to conflict period and build chart arrays.
  const filtered = rows.filter((r) => r.period >= '2023-01-01')
  const periods     = filtered.map((r) => r.period)
  const eventCounts = filtered.map((r) => r.event_count)
  const goldsteins  = filtered.map((r) => r.avg_goldstein)
  const barColours  = filtered.map((r) => PHASE_BAR_COLOUR[r.phase] ?? '#d1d5db')
  const violentPct  = filtered.map((r) => +(r.violent_share * 100).toFixed(1))

  const sharedLayout: Partial<Plotly.Layout> = {
    autosize: true,
    margin: { t: 40, r: 60, b: 60, l: 60 },
    paper_bgcolor: 'transparent',
    plot_bgcolor:  'transparent',
    font: { family: 'Inter, system-ui, sans-serif', size: 12, color: theme.labelColor },
    hovermode: 'x unified',
    hoverlabel: {
      bgcolor: 'rgba(15,23,42,0.85)',
      bordercolor: '#334155',
      font: { size: 12, color: '#f1f5f9', family: 'Inter, system-ui, sans-serif' },
    },
  }

  return (
    <div className="space-y-6 p-6">

      {/* Heading */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Conflict Status</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Sudan 2023 — Is the conflict getting better or worse?
        </p>
      </div>

      {/* Current phase banner */}
      <div className={`card rounded-2xl p-6 ${phaseStyle.bg}`}>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Current phase
        </p>
        <p className={`mt-1 text-4xl font-bold ${phaseStyle.text}`}>
          {phaseStyle.label}
        </p>

        {/* Delta chips */}
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="rounded-full bg-white/70 px-4 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200 dark:bg-gray-800/60 dark:text-gray-200 dark:ring-gray-700">
            Volume:{' '}
            {current.volume_change !== null
              ? `${signed(current.volume_change)}% vs prior 8 weeks`
              : '—'}
          </span>
          <span className="rounded-full bg-white/70 px-4 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200 dark:bg-gray-800/60 dark:text-gray-200 dark:ring-gray-700">
            Goldstein:{' '}
            {current.goldstein_change !== null
              ? `${signed(current.goldstein_change)} vs prior 8 weeks`
              : '—'}
          </span>
          <span className="rounded-full bg-white/70 px-4 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-gray-200 dark:bg-gray-800/60 dark:text-gray-200 dark:ring-gray-700">
            Violent events:{' '}
            {current.violent_share_change !== null
              ? `${signed(current.violent_share_change * 100)}% vs prior 8 weeks`
              : '—'}
          </span>
        </div>
      </div>

      {/* Phase timeline — bars coloured by phase + Goldstein line on second y-axis */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Weekly Events &amp; Goldstein Score by Phase
        </h2>
        <div className="mt-4 h-80">
          <Plot
            data={[
              {
                x: periods,
                y: eventCounts,
                type: 'bar',
                name: 'Event Count',
                marker: { color: barColours },
                yaxis: 'y',
                hovertemplate: '%{x}<br>Events: %{y}<extra></extra>',
              },
              {
                x: periods,
                y: goldsteins,
                type: 'scatter',
                mode: 'lines',
                name: 'Avg Goldstein',
                line: { color: '#3b82f6', width: 2 },
                yaxis: 'y2',
                hovertemplate: '%{x}<br>Goldstein: %{y:.2f}<extra></extra>',
              },
            ]}
            layout={{
              ...sharedLayout,
              margin: { t: 10, r: 60, b: 48, l: 56 },
              xaxis: {
                showgrid: false,
                zeroline: false,
                tickfont: { size: 11, color: theme.axisColor },
                nticks: 8,
              },
              yaxis: {
                title: { text: 'Event Count', font: { size: 11, color: theme.axisColor }, standoff: 8 },
                showgrid: true,
                gridcolor: theme.gridColor,
                zeroline: false,
                tickfont: { size: 11, color: theme.axisColor },
              },
              yaxis2: {
                title: { text: 'Goldstein', font: { size: 11, color: '#3b82f6' }, standoff: 8 },
                overlaying: 'y',
                side: 'right',
                showgrid: false,
                zeroline: false,
                tickfont: { size: 11, color: '#3b82f6' },
              },
              showlegend: true,
              legend: { orientation: 'h', x: 0, y: 1.08, font: { size: 11 } },
              bargap: 0.2,
            }}
            config={{ responsive: true, displayModeBar: false }}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>

      {/* Violent share line chart */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Weekly Violent Event Share (%)
        </h2>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Share of events with CAMEO roots 18, 19, or 20 (assault, use of force, mass violence)
        </p>
        <div className="mt-4 h-64">
          <Plot
            data={[
              {
                x: periods,
                y: violentPct,
                type: 'scatter',
                mode: 'lines',
                name: 'Violent share',
                line: { color: '#ef4444', width: 2 },
                fill: 'tozeroy',
                fillcolor: 'rgba(239,68,68,0.08)',
                hovertemplate: '%{x}<br>Violent: %{y}%<extra></extra>',
              },
              {
                // Reference line at 20%
                x: [periods[0], periods[periods.length - 1]],
                y: [20, 20],
                type: 'scatter',
                mode: 'lines',
                name: '20% threshold',
                line: { color: '#9ca3af', width: 1.5, dash: 'dash' },
                hoverinfo: 'skip',
              },
            ]}
            layout={{
              ...sharedLayout,
              margin: { t: 10, r: 24, b: 48, l: 56 },
              xaxis: {
                showgrid: false,
                zeroline: false,
                tickfont: { size: 11, color: theme.axisColor },
                nticks: 8,
              },
              yaxis: {
                title: { text: 'Violent share (%)', font: { size: 11, color: theme.axisColor }, standoff: 8 },
                showgrid: true,
                gridcolor: theme.gridColor,
                zeroline: false,
                tickfont: { size: 11, color: theme.axisColor },
                rangemode: 'tozero',
              },
              showlegend: true,
              legend: { orientation: 'h', x: 0, y: 1.08, font: { size: 11 } },
            }}
            config={{ responsive: true, displayModeBar: false }}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        <p className="mt-1.5 text-center text-[11px] text-gray-400 dark:text-gray-600">
          Click and drag to zoom · Double-click to reset
        </p>
      </div>

    </div>
  )
}
