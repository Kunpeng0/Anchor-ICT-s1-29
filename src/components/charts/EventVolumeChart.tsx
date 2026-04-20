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

    return (
        <Plot
        data={[
            {
                x: xValues,
                y: yValues,
                type: 'scatter',            // scatter mode gives line chart
                mode: 'lines+markers',      // drawing both line  and dots at each data point
                name: 'Event Count',
                line: {
                    color: '#4c6ef5',
                    width: 2,
                },
                marker: {
                    color: '#4c6ef5',
                    size: 5,
                },
                hovertemplate: '%{x}<br>Events: %{y}<extra></extra>', // controls what appears in tooltip when hovering over a point
            },
        ]}
        // layout controls overall chart appearance
        layout={{
            autosize: true,
            margin: { t: 10, r: 16, b: 48, l: 48},
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: {
                family: 'Inter, system-ui, sans-serif',
                size: 12,
                color: '#6b7280'
            },

            xaxis: {
                type: 'category',
                tickangle: -30,
                showgrid: false,
                zeroline: false,
                tickfont: { size: 11 },
            },

            yaxis: {
                showgrid: true,
                gridcolor: '#f3f4f6',
                zeroline: false,
                tickfont: { size: 11 },
                title: {
                    text: 'Event Count',
                    font: { size: 11, color: '#9ca3af' },
                },
            },

            showlegend: false,
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