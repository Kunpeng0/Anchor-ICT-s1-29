import { useEffect, useState } from 'react'
import { Users, TrendingUp, TrendingDown, Newspaper } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import EventVolumeChart from '@/components/charts/EventVolumeChart'
import EventTypeChart from '@/components/charts/EventTypeChart'
import { PeriodType } from '@/lib/types'
import { API_BASE, DEFAULT_EVENT } from '@/lib/api'

interface SummaryStats {
  events: string
  conflictIntensity: string
  activeActors: string
  mediaMentions: string
}

export default function DashboardPage() {
  const [periodType, setPeriodType] = useState<PeriodType>('daily')
  const [stats, setStats] = useState<SummaryStats>({
    events: '—',
    conflictIntensity: '—',
    activeActors: '—',
    mediaMentions: '—',
  })

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/dashboard/${DEFAULT_EVENT}/summary`).then(r => r.json()),
      fetch(`${API_BASE}/signals/${DEFAULT_EVENT}/media-attention?period_type=weekly`).then(r => r.json()),
    ])
      .then(([summary, mediaAttention]) => {
        const goldsteinValues: number[] = (summary.tone_over_time ?? []).map((p: { avg_goldstein: number }) => p.avg_goldstein)
        const avgGoldstein = goldsteinValues.length
          ? goldsteinValues.reduce((a: number, b: number) => a + b, 0) / goldsteinValues.length
          : 0

        const totalMentions: number = (mediaAttention ?? []).reduce(
          (sum: number, p: { total_mentions: number }) => sum + p.total_mentions, 0
        )

        setStats({
          events: summary.event_count?.toLocaleString() ?? '—',
          conflictIntensity: avgGoldstein.toFixed(2),
          activeActors: String(summary.top_actors?.length ?? '—'),
          mediaMentions: totalMentions.toLocaleString(),
        })
      })
      .catch(console.error)
  }, [])

  const statCards = [
    { label: 'Events', value: stats.events, delta: 0, icon: TrendingUp, tooltip: 'Total conflict events ingested from GDELT' },
    { label: 'Avg Goldstein', value: stats.conflictIntensity, delta: 0, icon: TrendingDown, tooltip: 'Average Goldstein scale score — negative means more conflict' },
    { label: 'Top Actors', value: stats.activeActors, delta: 0, icon: Users, tooltip: 'Number of unique top actors identified' },
    { label: 'Media Mentions', value: stats.mediaMentions, delta: 0, icon: Newspaper, tooltip: 'Total media mentions across all tracked periods' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">View by:</span>
        <button
          onClick={() => setPeriodType('daily')}
          className={periodType === 'daily' ? 'btn-primary' : 'btn-secondary'}
        >
          Daily
        </button>
        <button
          onClick={() => setPeriodType('weekly')}
          className={periodType === 'weekly' ? 'btn-primary' : 'btn-secondary'}
        >
          Weekly
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900">Conflict Timeline</h2>
            <div className="mt-4 h-56">
              <EventVolumeChart periodType={periodType} />
            </div>
          </div>

          <div className="card">
            <h2 className="text-base font-semibold text-gray-900">Conflict Breakdown</h2>
            <div className="mt-4 h-56">
              <EventTypeChart />
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-gray-900">Map</h2>
          <div className="mt-4 h-[320px] flex items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
            [ Map goes here ]
          </div>
        </div>
      </div>
    </div>
  )
}
