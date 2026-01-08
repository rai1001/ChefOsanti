import { useMemo } from 'react'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useUserMemberships } from '@/modules/orgs/data/memberships'
import { can, type Permission, type Role } from '../domain/roles'

export function useCurrentRole(): { role: Role; loading: boolean } {
  const { activeOrgId } = useActiveOrgId()
  const memberships = useUserMemberships()
  const role = useMemo<Role>(() => {
    const found = memberships.data?.find((m) => m.orgId === activeOrgId)
    const foundRole = found?.role as string | undefined
    if (foundRole === 'owner') return 'admin'
    if (foundRole === 'member') return 'staff'
    if (foundRole === 'admin' || foundRole === 'manager' || foundRole === 'staff') return foundRole
    return 'staff'
  }, [activeOrgId, memberships.data])
  return { role, loading: memberships.isLoading }
}

export function usePermission(permission: Permission) {
  const { role, loading } = useCurrentRole()
  return { allowed: can(role, permission), loading }
}
