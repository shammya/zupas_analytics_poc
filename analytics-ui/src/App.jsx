import { useSelector } from 'react-redux'
import AppShell from './layouts/AppShell'
import AnalyticsPage from './components/Analytics/AnalyticsPage'
import LoginPage from './components/Login/LoginPage'

export default function App() {
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated)

  if (!isAuthenticated) return <LoginPage />

  return (
    <AppShell>
      <AnalyticsPage />
    </AppShell>
  )
}
