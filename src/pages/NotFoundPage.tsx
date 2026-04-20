import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-black text-brand-600">404</p>
      <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="text-sm text-gray-500">The page you're looking for doesn't exist.</p>
      <Link to="/dashboard" className="btn-primary mt-2">
        Back to Dashboard
      </Link>
    </div>
  )
}
