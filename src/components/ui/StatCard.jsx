export default function StatCard({ label, value, delta, icon: Icon }) {
  const positive = delta >= 0
  return (
    <div className="card flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
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
