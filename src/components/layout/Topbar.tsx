import { Bell, Search } from 'lucide-react'

export default function Topbar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 transition-colors dark:border-gray-800 dark:bg-gray-950">
      {/*Keep to have items centered to the right*/}
      <div className="relative w-72">
      </div>
      <div className="flex items-center gap-3">

        {/*Filter Dropdown */}
        <select className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800">
          <option value="">Filter</option>
          <option value="revenue">Revenue</option>
          <option value="users">Users</option>
          <option value="orders">Orders</option>
        </select>

        {/*Date Dropdown*/}
        <select className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800">
          <option value="30">Last 30 days</option>
          <option value="7">Last 7 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last 12 months</option>
        </select>

        {/*Notification*/}
        <button className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-500" />
        </button>
        {/*Report*/}
        <button className="btn-primary">New Report</button>
      </div>
    </header>
  )
}
