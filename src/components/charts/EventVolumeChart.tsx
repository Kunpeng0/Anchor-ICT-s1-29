// Event Volume Chart renders a line chart displaying how many conflict events occurred over time
import Plot from "react-plotly.js";
import { EventVolumePoint, PeriodType } from '@/lib/types'

interface EventVolumeChartProps {
    periodType: PeriodType
}

// mock data for now
const mockDaily: EventVolumePoint[] = [
    {period: '2026-01-01', event_count: 42 },
    {period: '2026-01-02', event_count: 67 },
    {period: '2026-01-03', event_count: 32 },
    {period: '2026-01-04', event_count: 70 },
    {period: '2026-01-05', event_count: 45 },
    {period: '2026-01-06', event_count: 34 },
    {period: '2026-01-07', event_count: 56 },
    {period: '2026-01-08', event_count: 57 },
    {period: '2026-01-09', event_count: 65 },
    {period: '2026-01-10', event_count: 49 },
]

const mockWeekly: EventVolumePoint[] = [
    {period: '2026-W01', event_count: 300 },
    {period: '2026-W02', event_count: 400 },
    {period: '2026-W03', event_count: 367 },
    {period: '2026-W04', event_count: 235 },
    {period: '2026-W05', event_count: 304 },
    {period: '2026-W06', event_count: 450 },
    {period: '2026-W07', event_count: 421 },
    {period: '2026-W08', event_count: 367 },
    {period: '2026-W09', event_count: 432 },
    {period: '2026-W10', event_count: 411 },
]

export default function EventVolumeChart({ periodType }: EventVolumeChartProps) {
    // selecting which dataset based on period type prop
    const data = periodType === 'daily' ? mockDaily : mockWeekly

    // extract x-axis values and y-axis values
    const xValues = data.map((d) => d.period)
    const yValues = data.map((d) => d.event_count)

    // function to ensure weekly labels readable
    const formattedX = xValues.map((label) => {
        if(periodType === 'weekly'){
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
                type: 'scatter',            // scatter mode gives line chart
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

                hovertemplate: '%{x}<br>Events: %{y}<extra></extra>', // controls what appears in tooltip when hovering over a point
            },
        ]}
        // layout controls overall chart appearance
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
                ticklabelstandoff: 10,
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
                ticklabelstandoff: 10,
            },
            showlegend: false,
            hovermode: 'x unified'
        }}
        // controls interactive behaviours and plotly toolbar
        config={{
            responsive: true,
            displayModeBar: false,
        }}

        useResizeHandler
        style={{ width: '100%', height: '100%' }}
        />
    )
}