import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { refreshSession } from '../lib/api'
export default function RequireSession() {
  const session = useSession()
  const location = useLocation()
  if (session.status === 'loading') return <p className="p-8" role="status">Restoring your session…</p>
  if (session.status === 'error') return <div className="p-8 space-y-3"><p role="alert">{session.error}</p>
    <button className="underline" onClick={() => void refreshSession().catch(() => {})}>Retry connection</button></div>
  if (!session.user) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />
  return <Outlet />
}
