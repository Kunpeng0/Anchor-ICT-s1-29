import { createBrowserRouter, Navigate } from 'react-router-dom'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import InsightsPage from '@/pages/dashboard/InsightsPage'
import ReportsPage from '@/pages/dashboard/ReportsPage'
import SettingsPage from '@/pages/dashboard/SettingsPage'
import NotFoundPage from '@/pages/NotFoundPage'
import BackendTestPage from '@/pages/dashboard/BackendTestPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/dashboard',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'insights', element: <InsightsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'backend-test', element: <BackendTestPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
