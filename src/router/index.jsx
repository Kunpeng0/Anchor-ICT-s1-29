import { createBrowserRouter, Navigate } from 'react-router-dom'
import DashboardLayout from '@/components/layout/DashboardLayout'
import OverviewPage from '@/pages/dashboard/OverviewPage'
import AnalyticsPage from '@/pages/dashboard/AnalyticsPage'
import SettingsPage from '@/pages/dashboard/SettingsPage'
import NotFoundPage from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/dashboard',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
