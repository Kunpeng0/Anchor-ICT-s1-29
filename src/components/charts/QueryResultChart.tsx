import Plot from 'react-plotly.js'

type SignalName =
  | 'event_volume'
  | 'event_type'
  | 'actor_frequency'
  | 'location_frequency'
  | 'tone_over_time'
  | 'media_attention'
  | 'actor_location_graph'
  | 'recent_events'

interface QueryIntent {
  chart_type: string
  signal: SignalName
  params: Record<string, unknown>
}

interface QueryResultChartProps {
  intent: QueryIntent
  data: unknown
}

const signalTitles: Record<SignalName, string> = {
  event_volume: 'Event Volume',
  event_type: 'Event Types',
  actor_frequency: 'Actor Frequency',
  location_frequency: 'Location Frequency',
  tone_over_time: 'Average Goldstein Scale',
  media_attention: 'Media Attention',
  actor_location_graph: 'Actor Location Links',
  recent_events: 'Recent Events',
}

// API responses are typed as unknown at the boundary; keep only object rows before plotting.
function asRecords(data: unknown): Record<string, unknown>[] {
  return Array.isArray(data)
    ? data.filter(
        (row): row is Record<string, unknown> =>
          Boolean(row) && typeof row === 'object' && !Array.isArray(row),
      )
    : []
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

// Long actor/location names are shortened on the axis, while full labels remain available in hover text.
function shortLabel(value: unknown, maxLength = 34) {
  const label = formatValue(value)
  return label.length > maxLength ? `${label.slice(0, maxLength - 1)}...` : label
}

// Weekly signal labels arrive as "YYYY-WNN"; this keeps x-axis labels compact in chat-sized charts.
function formatPeriodLabel(value: unknown) {
  const label = formatValue(value)
  const weeklyMatch = label.match(/^(\d{4})-W(\d{2})$/)
  if (weeklyMatch) {
    return `W${Number(weeklyMatch[2])} '${weeklyMatch[1].slice(2)}`
  }
  return label
}

// Network graph data is shaped differently from the list-based signal responses.
function isGraphData(data: unknown): data is { edges: Record<string, unknown>[] } {
  return Boolean(
    data &&
      typeof data === 'object' &&
      'edges' in data &&
      Array.isArray((data as { edges?: unknown }).edges),
  )
}

function EmptyState() {
  return (
    <div className="flex h-56 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
      No data returned for this query.
    </div>
  )
}

function ResultTable({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return <EmptyState />

  // Limit visible columns and rows so raw event tables do not overwhelm the chat message.
  const columns = Object.keys(rows[0]).slice(0, 8)

  return (
    <div className="max-h-72 overflow-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
        <thead className="sticky top-0 bg-gray-50 text-gray-500">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 font-semibold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
          {rows.slice(0, 20).map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column} className="max-w-[220px] truncate px-3 py-2">
                  {formatValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LineChart({
  rows,
  yKey,
  yLabel,
}: {
  rows: Record<string, unknown>[]
  yKey: string
  yLabel: string
}) {
  if (rows.length === 0) return <EmptyState />

  // Dense time-series data becomes unreadable in a chat panel, so show the latest year of weekly points.
  const visibleRows = rows.slice(-52)
  const showMarkers = visibleRows.length <= 26

  return (
    <div className="h-[360px]">
      <Plot
        data={[
          {
            x: visibleRows.map((row) => formatPeriodLabel(row.period)),
            y: visibleRows.map((row) => Number(row[yKey] ?? 0)),
            type: 'scatter',
            mode: showMarkers ? 'lines+markers' : 'lines',
            line: { color: '#4c6ef5', width: 2.5 },
            marker: { color: '#4c6ef5', size: 5 },
            fill: 'tozeroy',
            fillcolor: 'rgba(76, 110, 245, 0.08)',
            hovertemplate: `%{x}<br>${yLabel}: %{y}<extra></extra>`,
          },
        ]}
        layout={{
          autosize: true,
          margin: { t: 12, r: 24, b: 56, l: 72 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { family: 'Inter, system-ui, sans-serif', size: 12, color: '#6b7280' },
          xaxis: {
            automargin: true,
            nticks: 7,
            showgrid: false,
            tickangle: 0,
            tickfont: { size: 11, color: '#9ca3af' },
            zeroline: false,
          },
          yaxis: {
            automargin: true,
            showgrid: true,
            gridcolor: 'rgba(243, 244, 246, 0.9)',
            zeroline: false,
            tickfont: { size: 11, color: '#9ca3af' },
            title: { text: yLabel, font: { size: 11, color: '#9ca3af' } },
          },
          showlegend: false,
          hovermode: 'x unified',
        }}
        config={{ responsive: true, displayModeBar: false }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}

function BarChart({
  rows,
  labelKey,
  valueKey,
}: {
  rows: Record<string, unknown>[]
  labelKey: string
  valueKey: string
}) {
  if (rows.length === 0) return <EmptyState />

  // Keep the chart focused on the largest categories; smaller items are still available from raw endpoints.
  const sorted = [...rows]
    .sort((a, b) => Number(a[valueKey] ?? 0) - Number(b[valueKey] ?? 0))
    .slice(-12)
  const fullLabels = sorted.map((row) => formatValue(row[labelKey]))

  return (
    <div className="h-[360px]">
      <Plot
        data={[
          {
            x: sorted.map((row) => Number(row[valueKey] ?? 0)),
            y: fullLabels.map((label) => shortLabel(label)),
            type: 'bar',
            orientation: 'h',
            marker: { color: '#4c6ef5' },
            text: sorted.map((row) => formatValue(row[valueKey])),
            textposition: 'outside',
            customdata: fullLabels,
            hovertemplate: '<b>%{customdata}</b><br>Count: %{x}<extra></extra>',
          },
        ]}
        layout={{
          autosize: true,
          margin: { t: 12, r: 72, b: 48, l: 220 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { family: 'Inter, system-ui, sans-serif', size: 12, color: '#6b7280' },
          xaxis: {
            showgrid: true,
            gridcolor: 'rgba(243, 244, 246, 0.9)',
            zeroline: false,
            tickfont: { size: 11, color: '#9ca3af' },
          },
          yaxis: {
            automargin: true,
            showgrid: false,
            tickfont: { size: 11, color: '#6b7280' },
            zeroline: false,
          },
          showlegend: false,
        }}
        config={{ responsive: true, displayModeBar: false }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}

function EventTypeChart({ rows }: { rows: Record<string, unknown>[] }) {
  // Prefer backend CAMEO descriptions when present, but fall back to root codes for older signal builds.
  const labelledRows = rows.map((row) => ({
    ...row,
    label: row.cameo_description
      ? `${formatValue(row.cameo_root)} - ${formatValue(row.cameo_description)}`
      : formatValue(row.cameo_root),
  }))

  return <BarChart rows={labelledRows} labelKey="label" valueKey="event_count" />
}

export default function QueryResultChart({ intent, data }: QueryResultChartProps) {
  const rows = asRecords(data)

  // The LLM chooses a signal; this component chooses the safest visual form for that signal's data shape.
  let content
  if (intent.signal === 'event_volume') {
    content = <LineChart rows={rows} yKey="event_count" yLabel="Events" />
  } else if (intent.signal === 'tone_over_time') {
    content = <LineChart rows={rows} yKey="avg_goldstein" yLabel="Avg Goldstein" />
  } else if (intent.signal === 'media_attention') {
    content = <LineChart rows={rows} yKey="total_mentions" yLabel="Mentions" />
  } else if (intent.signal === 'actor_frequency') {
    content = <BarChart rows={rows} labelKey="actor" valueKey="event_count" />
  } else if (intent.signal === 'location_frequency') {
    content = <BarChart rows={rows} labelKey="location" valueKey="event_count" />
  } else if (intent.signal === 'event_type') {
    content = <EventTypeChart rows={rows} />
  } else if (intent.signal === 'actor_location_graph' && isGraphData(data)) {
    content = <ResultTable rows={data.edges} />
  } else {
    content = <ResultTable rows={rows} />
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/70 p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{signalTitles[intent.signal]}</h3>
        </div>
      </div>
      {content}
    </div>
  )
}
