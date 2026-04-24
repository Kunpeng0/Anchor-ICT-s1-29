import { useState } from 'react'
import { Users, DollarSign, TrendingUp, ShoppingCart, TrendingDown } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import EventVolumeChart from '@/components/charts/EventVolumeChart'
import EventTypeChart from '@/components/charts/EventTypeChart'
import { PeriodType } from '@/lib/types'

const stats = [
  { label: 'Events', value: '5412', delta: 12.5, icon: TrendingUp, tooltip: 'Tooltip used for description of metric cards' },
  { label: 'Conflict Intensity', value: '58%', delta: 8.1, icon: TrendingUp, tooltip: 'Tooltip used for description of metric cards' },
  { label: 'Active Actors', value: '4.6%', delta: 1.3, icon: TrendingUp, tooltip: 'Tooltip used for description of metric cards' },
  { label: 'Media Mentions', value: '8003', delta: -14, icon: TrendingDown, tooltip: 'Tooltip used for description of metric cards' },
]

export default function DashboardPage() {
  const [periodType, setPeriodType] = useState<PeriodType>('daily')
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      { /* period toggle button */ }
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
        {/* Left column - Chart and Table */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900">Conflict Timeline</h2>
            <div className="mt-4 h-56">
              {/* inserting event volume chart */ }
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

        {/* Right column - Map */}
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