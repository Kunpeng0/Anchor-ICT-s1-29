// Event Type Chart renders a horizontal bar chart showing event counts grouped by CAMEO event type
import { useEffect, useState } from 'react'
import Plot from "react-plotly.js";
import { EventTypePoint } from '@/lib/types'
import { API_BASE, DEFAULT_EVENT } from '@/lib/api'

export default function EventTypeChart() {
    const [data, setData] = useState<EventTypePoint[]>([])

    useEffect(() => {
        fetch(`${API_BASE}/signals/${DEFAULT_EVENT}/event-type`)
            .then(r => r.json())
            .then(setData)
            .catch(console.error)
    }, [])

    const sorted = [...data].sort((a, b) => a.event_count - b.event_count)
    const labels = sorted.map((d) => `${d.cameo_root} - ${d.cameo_description}`)
    const values = sorted.map((d) => d.event_count)

    return (
        <Plot
            data={[
                {
                    x: values,
                    y: labels,
                    type: 'bar',
                    orientation: 'h',
                    name: 'Events',
                    marker: {
                        color: values.map((v, i) => {
                            const opacity = 0.4 + (i / Math.max(values.length - 1, 1)) * 0.6
                            return `rgba(76, 110, 245, ${opacity})`
                        }),
                    },
                    hovertemplate: '<b>%{y}</b><br>Events: <b>%{x}</b><extra></extra>',
                    text: values.map(String),
                    textposition: 'outside',
                    textfont: { size: 11, color: '#6b7280' },
                },
            ]}
            layout={{
                autosize: true,
                margin: { t: 10, r: 24, b: 40, l: 160 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: {
                    family: 'Inter, system-ui, sans-serif',
                    size: 12,
                    color: '#6b7280'
                },
                bargap: 0.4,
                xaxis: {
                    showgrid: true,
                    gridcolor: 'rgba(243, 244, 246, 0.8)',
                    zeroline: false,
                    tickfont: { size: 11, color: '#9ca3af' },
                    showline: false,
                    range: [0, Math.max(...values, 1) * 1.15],
                },
                yaxis: {
                    showgrid: false,
                    zeroline: false,
                    tickfont: { size: 11, color: '#6b7280' },
                },
                showlegend: false,
                hovermode: 'closest',
            }}
            config={{
                responsive: true,
                displayModeBar: false,
            }}
            useResizeHandler
            style={{ width: '100%', height: '100%' }}
        />
    )
}
