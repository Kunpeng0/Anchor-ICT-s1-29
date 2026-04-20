import { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: string
  delta: number
  icon: LucideIcon
  tooltip?: string
}

export default function StatCard({ label, value, delta, icon: Icon, tooltip }: StatCardProps) {
  const positive = delta >= 0
  return (
    <div className="card flex items-start justify-between">
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-gray-500">{label}</p>

          {/* only render ? icon if tooltip passed in */}
          {tooltip && (
            <div className="relative group">
              {/* smaller circular ? button */}
              <div className="flex h-4 w-4 cursor-default items-center justify-center rounded-full border border-gray-300 text-[10px] text-gray-400">
                ?
              </div>
              {/* tooltop box hidden by default, visible on hover via group-hover */}
              <div className="absolute left-1/2 top-5 z-10 hidden w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-500 shadow-sm group-hover:block">
                {tooltip}
              </div>
            </div>
          )}
        </div>

        <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        {delta !== undefined && (
          <p className={`mt-1 text-xs font-medium ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
            {positive ? '▲' : '▼'} {Math.abs(delta)}% vs last month
          </p>
        )}
      </div>
      {Icon && (
        <div className="rounded-lg bg-brand-50 p-3">
          <Icon className="h-5 w-5 text-brand-600" />
        </div>
      )}
    </div>
  )
}
