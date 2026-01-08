import { useEffect, useMemo, useState } from 'react'
import { useUserMemberships } from './memberships'

const STORAGE_KEY = 'activeOrgId'

export function useActiveOrgId() {
  const memberships = useUserMemberships()
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)

  // Cargar posible selección previa
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setActiveOrgId(stored)
  }, [])

  // Resolver org activa con prioridad: membership.isActive -> stored v lido -> primera
  useEffect(() => {
    if (!memberships.data) return
    if (memberships.data.length === 0) {
      setActiveOrgId(null)
      localStorage.removeItem(STORAGE_KEY)
      return
    }

    const activeFlag = memberships.data.find((m) => m.isActive)?.orgId ?? null
    const stored = localStorage.getItem(STORAGE_KEY)
    const storedValid = stored && memberships.data.some((m) => m.orgId === stored) ? stored : null
    if (stored && !storedValid) {
      localStorage.removeItem(STORAGE_KEY)
    }

    setActiveOrgId((prev) => {
      const prevValid = prev && memberships.data.some((m) => m.orgId === prev) ? prev : null
      const candidate = activeFlag ?? storedValid ?? prevValid ?? memberships.data?.[0]?.orgId ?? null
      if (candidate && candidate !== prev) {
        localStorage.setItem(STORAGE_KEY, candidate)
      }
      return candidate
    })
  }, [memberships.data])

  const loading = memberships.isLoading
  const error = memberships.isError ? memberships.error : undefined

  const selector = useMemo(
    () => ({
      setOrg: (id: string) => {
        setActiveOrgId(id)
        localStorage.setItem(STORAGE_KEY, id)
      },
      memberships: memberships.data ?? [],
    }),
    [memberships.data],
  )

  return { activeOrgId, loading, error, ...selector }
}
