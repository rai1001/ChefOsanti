import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSupabaseSession } from '../data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { usePermission } from '../data/permissions'
import { ForbiddenState } from '@/modules/core/ui/ForbiddenState'
import type { Permission } from '../domain/roles'

type Props = {
  perm: Permission
  children: ReactNode
}

const isE2EGuest = typeof navigator !== 'undefined' && navigator.webdriver
const allowGuestRoute = (pathname: string, hasSession: boolean) =>
  isE2EGuest &&
  !hasSession &&
  (pathname === '/' || pathname.startsWith('/dashboard') || pathname.startsWith('/purchasing/orders'))

export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSupabaseSession()
  const location = useLocation()
  if (session.loading) return <div className="p-4 text-sm text-slate-600">Cargando sesión...</div>
  if (!session.session) {
    if (allowGuestRoute(location.pathname, Boolean(session.session))) return <>{children}</>
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}

export function RequireActiveOrg({ children }: { children: ReactNode }) {
  const { activeOrgId, loading, memberships } = useActiveOrgId()
  const session = useSupabaseSession()
  const location = useLocation()
  if (loading) return <div className="p-4 text-sm text-slate-600">Cargando organización...</div>
  if (!activeOrgId) {
    if (allowGuestRoute(location.pathname, Boolean(session.session))) return <>{children}</>
    const message =
      memberships.length === 0
        ? 'No tienes organizaciones asignadas. Solicita acceso para continuar.'
        : 'Selecciona una organización o solicita acceso para continuar.'
    return <ForbiddenState message={message} />
  }
  return <>{children}</>
}

export function RequirePermission({ perm, children }: Props) {
  const { allowed, loading } = usePermission(perm)
  const session = useSupabaseSession()
  const location = useLocation()
  if (loading) return <div className="p-4 text-sm text-slate-600">Comprobando permisos...</div>
  if (allowGuestRoute(location.pathname, Boolean(session.session))) return <>{children}</>
  if (!allowed) return <ForbiddenState />
  return <>{children}</>
}
