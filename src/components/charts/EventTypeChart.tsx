// Event Type Chart renders a horizontal bar chart showing event counts grouped by CAMEO event type
import Plot from "react-plotly.js";
import { EventTypePoint } from '@/lib/types'

// mock data being used for now
const mockData: EventTypePoint[] = [
    {cameo_root: '14', cameo_description: 'Protest', event_count: 345 },
    {cameo_root: '15', cameo_description: 'Mass Violence', event_count: 257 },
    {cameo_root: '16', cameo_description: 'Assault', event_count: 198 },
    {cameo_root: '17', cameo_description: 'Use of Force', event_count: 421 },
    {cameo_root: '18', cameo_description: 'Exhibit Force', event_count: 157 },
    {cameo_root: '19', cameo_description: 'Coerce', event_count: 267 },
]

export default function EventTypeChart() {
    // sorted in ascending order so longest bar appears top
    const sorted = [...mockData].sort((a, b) => a.event_count - b.event_count)

    // extract labels and values into arrays for plotly
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

                    // bar gradient colours
                    marker: {
                        color: values.map((v, i) => {
                            const opacity = 0.4 + (i / (values.length - 1)) * 0.6
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
                    range: [0, Math.max(...values) * 1.15], 
                },

                yaxis: {
                    showgrid: false,
                    zeroline: false,
                    tickfont: { size: 11, color: '#6b7280' },
                    ticklabelstandoff: 10,
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
