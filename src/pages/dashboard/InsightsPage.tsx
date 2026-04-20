export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
        <p className="mt-1 text-sm text-gray-500">Create and discover custom insights.</p>
      </div>

      {/* AI Chat Card */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900">AI Analysis</h2>

        {/* Chat output box */}
        <div className="mt-4 h-40 rounded-lg bg-gray-50 p-4 text-sm text-gray-400">
          [ AI response will appear here ]
        </div>

        {/*Chat Input*/}
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            placeholder="Ask a question about the data..."
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 transition"
          />
          <button className="btn-primary">Send</button>
        </div>

        {/*Graph Buttons*/}
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Output as:</p>
          <div className="flex flex-wrap gap-2">
            {['Bar Chart', 'Line Chart', 'Pie Chart', 'Scatter Plot', 'Table', 'Summary'].map((type) => (
              <button
                key={type}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 transition-colors"
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/*Output Box*/}
      <div className="card flex h-64 items-center justify-center text-sm text-gray-400">
        [ Output charts go here ]
      </div>
    </div>
  )
}
