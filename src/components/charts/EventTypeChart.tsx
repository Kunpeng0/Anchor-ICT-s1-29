// Event Type Chart renders horizontal bar chart showing event counts grouped by CAMEO event types  
import { useEffect, useState } from 'react'
import Plot from 'react-plotly.js'
import { EventTypePoint } from '@/lib/types'

// CAMEO root code descriptions: populated client-side since cameo_description is NULL in DB
const CAMEO_LABELS: Record<string, string> = {
  '01': 'Make Public Statement',
  '02': 'Appeal',
  '03': 'Express Intent to Cooperate',
  '04': 'Consult',
  '05': 'Engage in Diplomatic Cooperation',
  '06': 'Engage in Material Cooperation',
  '07': 'Provide Aid',
  '08': 'Yield',
  '09': 'Investigate',
  '10': 'Demand',
  '11': 'Disapprove',
  '12': 'Reject',
  '13': 'Threaten',
  '14': 'Protest',
  '15': 'Exhibit Force Posture',
  '16': 'Reduce Relations',
  '17': 'Coerce',
  '18': 'Assault',
  '19': 'Fight',
  '20': 'Use Unconventional Mass Violence',
}

interface EventTypeChartProps {
  eventName: string // event config key used to fetch the correct signal data
}

export default function EventTypeChart({ eventName }: EventTypeChartProps) {
  // chart data fetched from event type signal endpoint
  const [data, setData] = useState<EventTypePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // refetch whenever event name changes so chart stays synced with event selector
  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/signals/${eventName}/event-type`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<EventTypePoint[]>
      })
      .then((d) => { setData(d); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [eventName])

  // get theme colours from current light/dark mode
  const isDark = document.documentElement.classList.contains('dark')
  const axisColor = isDark ? '#94a3b8' : '#9ca3af'
  const labelColor = isDark ? '#e2e8f0' : '#374151'
  const gridColor = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.06)'

  // show spinner while graph is loading
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
      </div>
    )
  }

  // show inline error if fetch fails
  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-500">
        Failed to load: {error}
      </div>
    )
  }

  // show empty state if endpoint returns no rows
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        No data available.
      </div>
    )
  }

  // enrich rows with human readable label
  // padStart normalises single-digit roots (9 -> 09) to match CAMEO_LABELS keys
  const enriched = data.map((d) => ({
    ...d,
    label: CAMEO_LABELS[d.cameo_root.padStart(2, '0')] ?? `Code ${d.cameo_root}`,
  }))

  // sort ascending so highest counts appear at top
  const sorted = [...enriched].sort((a, b) => a.event_count - b.event_count)

  const labels = sorted.map((d) => d.label)
  const values = sorted.map((d) => d.event_count)
  const maxVal = Math.max(...values)

  // color scale: low counts get a lighter brand blue, high counts get full brand blue
  const colors = values.map((v) => {
    const t = v / maxVal
    const opacity = 0.25 + t * 0.75
    return `rgba(76, 110, 245, ${opacity})`
  })

return (
    <>
      <Plot
        data={[
          {
            x: values,
            y: labels,
            type: 'bar',
            orientation: 'h', // horizontal bars suit category over vertical bars
            marker: { color: colors },
            text: values.map((v) => v.toLocaleString()), // value labels shown outside each bar
            textposition: 'outside',
            textfont: { size: 11, color: axisColor },
            hovertemplate: '<b>%{y}</b><br>Events: <b>%{x:,}</b><extra></extra>',
            cliponaxis: false, // prevent labels from being clipped on chart edge
          },
        ]}
        layout={{
          autosize: true,
          margin: { t: 8, r: 60, b: 32, l: 16 },
          paper_bgcolor: 'transparent', // inherit chart background
          plot_bgcolor: 'transparent',
          font: { family: 'Inter, system-ui, sans-serif', size: 12, color: labelColor },
          bargap: 0.25, // controls spacing between bars; lower results in thicker bars
          xaxis: {
            showgrid: true,
            gridcolor: gridColor,
            zeroline: false,
            tickfont: { size: 11, color: axisColor },
            showline: false,
            range: [0, maxVal * 1.18],
          },
          yaxis: {
            type: 'category', // forces categorical axis so numeric root codes don't get treated as numbers
            showgrid: false,
            zeroline: false,
            tickfont: { size: 11, color: labelColor },
            automargin: true,
            ticklabelposition: 'outside left',
          },
          showlegend: false,
          hovermode: 'closest',
        }}
        config={{ responsive: true, displayModeBar: false }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
      {/* Plotly zoom hint */}
      <p className="mt-1.5 text-center text-[11px] text-gray-400 dark:text-gray-600">
        Click and drag to zoom · Double-click to reset
      </p>
    </>
  )
}
