// Event Volume Chart renders a line chart displaying how many conflict events occurred over time
import { useEffect, useState } from 'react'
import Plot from "react-plotly.js";
import { EventVolumePoint, PeriodType } from '@/lib/types'
import { API_BASE, DEFAULT_EVENT } from '@/lib/api'

interface EventVolumeChartProps {
    periodType: PeriodType
}

export default function EventVolumeChart({ periodType }: EventVolumeChartProps) {
    const [data, setData] = useState<EventVolumePoint[]>([])

    useEffect(() => {
        fetch(`${API_BASE}/signals/${DEFAULT_EVENT}/event-volume?period_type=${periodType}`)
            .then(r => r.json())
            .then(setData)
            .catch(console.error)
    }, [periodType])

    const xValues = data.map((d) => d.period)
    const yValues = data.map((d) => d.event_count)

    const formattedX = xValues.map((label) => {
        if (periodType === 'weekly') {
            const [year, week] = label.split('-W')
            return `W${parseInt(week)} '${year.slice(2)}`
        }
        return label
    })

    return (
        <Plot
        data={[
            {
                x: formattedX,
                y: yValues,
                type: 'scatter',
                mode: 'lines',
                name: 'Event Count',
                line: {
                    color: '#4c6ef5',
                    width: 2.5,
                    shape: 'spline',
                    smoothing: 1.3,
                },
                fill: 'tozeroy',
                fillcolor: 'rgba(76, 110, 245, 0.08)',
                hovertemplate: '%{x}<br>Events: %{y}<extra></extra>',
            },
        ]}
        layout={{
            autosize: true,
            margin: { t: 10, r: 32, b: 100, l: 48},
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: {
                family: 'Inter, system-ui, sans-serif',
                size: 12,
                color: '#6b7280'
            },
            xaxis: {
                tickangle: 0,
                showgrid: false,
                zeroline: false,
                tickfont: { size: 11, color: '#9ca3af' },
                showline: false,
            },
            yaxis: {
                rangemode: 'normal',
                showgrid: true,
                gridcolor: 'rgba(243, 244, 246, 0.8)',
                zeroline: false,
                tickfont: { size: 11, color: '#9ca3af' },
                title: {
                    text: 'Event Count',
                    font: { size: 11, color: '#9ca3af' },
                    standoff: 20,
                },
            },
            showlegend: false,
            hovermode: 'x unified'
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
