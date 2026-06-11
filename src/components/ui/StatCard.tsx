import { LucideIcon } from "lucide-react"

// stat card for metrics
interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  tooltip?: string
}

export default function StatCard({ label, value, icon: Icon, tooltip }: StatCardProps) {
  return (
    <div className="card flex items-start justify-between">
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>

          {/* only render ? icon if tooltip passed in */}
          {tooltip && (
            <div className="relative group">
              {/* smaller circular ? button */}
              <div className="flex h-4 w-4 cursor-default items-center justify-center rounded-full border border-gray-300 text-[10px] text-gray-400 dark:border-gray-700 dark:text-gray-500">
                ?
              </div>
              {/* tooltip box hidden by default, visible on hover via group-hover */}
              <div className="absolute left-1/2 top-5 z-10 hidden w-max -translate-x-1/2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-500 shadow-sm group-hover:block dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300">
                {tooltip}
              </div>
            </div>
          )}
        </div>

        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      </div>
      {Icon && (
        <div className="rounded-lg bg-brand-50 p-3 dark:bg-brand-900/30">
          <Icon className="h-5 w-5 text-brand-600 dark:text-brand-300" />
        </div>
      )}
    </div>
  )
}
