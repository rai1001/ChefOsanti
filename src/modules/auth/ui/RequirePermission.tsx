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

export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSupabaseSession()
  const location = useLocation()
  if (session.loading) return <div className="p-4 text-sm text-slate-600">Cargando sesión...</div>
  if (!session.session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}

export function RequireActiveOrg({ children }: { children: ReactNode }) {
  const { activeOrgId, loading, memberships } = useActiveOrgId()
  if (loading) return <div className="p-4 text-sm text-slate-600">Cargando organización...</div>
  if (!activeOrgId) {
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
  if (loading) return <div className="p-4 text-sm text-slate-600">Comprobando permisos...</div>
  if (!allowed) return <ForbiddenState />
  return <>{children}</>
}
