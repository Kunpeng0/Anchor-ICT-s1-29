import { Users, DollarSign, TrendingUp, ShoppingCart, TrendingDown } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'

const stats = [
  { label: 'Events', value: '5412', delta: 12.5, icon: TrendingUp, tooltip: 'Tooltip used for description of metric cards' },
  { label: 'Conflict Intensity', value: '58%', delta: 8.1, icon: TrendingUp, tooltip: 'Tooltip used for description of metric cards' },
  { label: 'Active Actors', value: '4.6%', delta: 1.3, icon: TrendingUp, tooltip: 'Tooltip used for description of metric cards' },
  { label: 'Media Mentions', value: '8003', delta: -14, icon: TrendingDown, tooltip: 'Tooltip used for description of metric cards' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left column - Chart and Table */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900">Conflict Timeline</h2>
            <div className="mt-4 flex h-56 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
              [ Chart goes here ]
            </div>
          </div>
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900">Conflict Breakdown</h2>
            <div className="mt-4 flex h-40 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
              [ Table goes here ]
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