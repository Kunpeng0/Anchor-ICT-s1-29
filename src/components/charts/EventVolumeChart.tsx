// Event Volume Chart renders a line chart displaying how many conflict events occurred over time
import { useEffect, useState } from 'react'
import Plot from 'react-plotly.js'
import { EventVolumePoint, PeriodType } from '@/lib/types'

interface EventVolumeChartProps {
  eventName: string         // event config key to fetch correct signal data
  periodType: PeriodType    // controls whether x-axis shows daily or weekly period
}

// convert raw period strings from the API into readable x-axis labels
// weekly periods arrive as 'YYYY-WNN' and are shortened to e.g. 'W3 '23'
function formatPeriodLabel(label: string, periodType: PeriodType) {
  if (periodType === 'weekly') {
    const match = label.match(/^(\d{4})-W(\d{2})$/)
    if (match) return `W${Number(match[2])} '${match[1].slice(2)}`
  }
  return label // daily periods are already YYYY-MM-DD, returned as-is
}

// get Plotly theme colors from the current dark/light mode
function getPlotTheme() {
  const isDark = document.documentElement.classList.contains('dark')
  return {
    axisColor: isDark ? '#e5e7eb' : '#9ca3af',
    labelColor: isDark ? '#f9fafb' : '#6b7280',
    gridColor: isDark ? 'rgba(148, 163, 184, 0.3)' : 'rgba(243, 244, 246, 0.9)',
    fillColor: isDark ? 'rgba(76, 110, 245, 0.24)' : 'rgba(76, 110, 245, 0.08)',
  }
}

export default function EventVolumeChart({ eventName, periodType }: EventVolumeChartProps) {
  // chart data fetched from the event-volume signal endpoint
  const [data, setData] = useState<EventVolumePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // re-fetch whenever eventName or periodType changes so the chart stays in sync
  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/signals/${eventName}/event-volume?period_type=${periodType}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<EventVolumePoint[]>
      })
      .then((d) => { setData(d); setLoading(false) })
      .catch((err: Error) => { setError(err.message); setLoading(false) })
  }, [eventName, periodType])

  // show spinner while data is loading
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
      </div>
    )
  }

  // show inline error if the fetch failed
  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-500">
        Failed to load: {error}
      </div>
    )
  }

    // show empty state if the endpoint returned no rows
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-gray-500">
        No data available.
      </div>
    )
  }

  const plotTheme = getPlotTheme()
  // filter to conflict period only: Sudan civil war began April 2023
  const filtered = data.filter((d) => d.period >= '2023-01-01')
  const xValues = filtered.map((d) => formatPeriodLabel(d.period, periodType))
  const yValues = filtered.map((d) => d.event_count)
  const showMarkers = filtered.length <= 26

// only show dot markers when there are few enough points that they don't overlap
return (
    <>
      <Plot
        data={[
          {
            x: xValues,
            y: yValues,
            type: 'scatter',    // scatter with mode 'lines' gives a line chart
            mode: showMarkers ? 'lines+markers' : 'lines',
            name: 'Event Count',
            line: { color: '#4c6ef5', width: 2.5 },
            marker: { color: '#4c6ef5', size: 5 },
            fill: 'tozeroy',    // fills the area between the line and y=0
            fillcolor: plotTheme.fillColor,
            hovertemplate: '%{x}<br>Events: %{y}<extra></extra>', // tooltip format on hover
          },
        ]}
        layout={{
          autosize: true,
          margin: { t: 10, r: 24, b: 48, l: 56 },
          paper_bgcolor: 'transparent', // inherits card background
          plot_bgcolor: 'transparent',
          font: { family: 'Inter, system-ui, sans-serif', size: 12, color: plotTheme.labelColor },
          xaxis: {
            automargin: true,
            nticks: 7,          // limit tick count so labels don't crowd on smaller containers
            tickangle: 0,
            showgrid: false,    // no vertical grid lines; keeps the chart clean
            zeroline: false,
            tickfont: { size: 11, color: plotTheme.axisColor },
            showline: false,
          },
          yaxis: {
            automargin: true,
            showgrid: true,     // horizontal grid lines aid reading values
            gridcolor: plotTheme.gridColor,
            zeroline: false,
            tickfont: { size: 11, color: plotTheme.axisColor },
            title: {
              text: 'Event Count',
              font: { size: 11, color: plotTheme.axisColor },
              standoff: 12,    // gap between axis title and tick labels
            },
          },
          showlegend: false,
          hovermode: 'x unified', // snaps hover tooltip to the nearest x value across all traces
          // make hover label more readable with only some transparency
          hoverlabel: {
            bgcolor: 'rgba(15, 23, 42, 0.85)',
            bordercolor: '#334155',
            font: { size: 12, color: '#f1f5f9', family: 'Inter, system-ui, sans-serif' },
          },
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
