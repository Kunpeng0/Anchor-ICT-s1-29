import { Users, DollarSign, TrendingUp, ShoppingCart } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'

const stats = [
  { label: 'Total Revenue', value: '$48,295', delta: 12.5, icon: DollarSign },
  { label: 'Active Users', value: '3,842', delta: 8.1, icon: Users },
  { label: 'Conversion Rate', value: '4.6%', delta: -1.2, icon: TrendingUp },
  { label: 'Total Orders', value: '1,073', delta: 5.3, icon: ShoppingCart },
]

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome back, Jane. Here's what's happening today.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900">Revenue over time</h2>
        <div className="mt-4 flex h-56 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
          [ Chart goes here ]
        </div>
      </div>
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900">Recent activity</h2>
        <div className="mt-4 flex h-40 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400">
          [ Table goes here ]
        </div>
      </div>
    </div>
  )
}
