export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account and preferences.</p>
      </div>
      <div className="card space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {['First name', 'Last name', 'Email', 'Role'].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700">{field}</label>
              <input
                type="text"
                placeholder={field}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 transition"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-2">
          <button className="btn-primary">Save changes</button>
        </div>
      </div>
    </div>
  )
}
