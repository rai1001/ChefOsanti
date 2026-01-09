import { useEffect, useMemo, useState } from 'react'
import { useUserMemberships } from './memberships'

const STORAGE_KEY = 'activeOrgId'
const SYNC_CHANNEL = 'chefos_org_sync'

export function useActiveOrgId() {
  const memberships = useUserMemberships()
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)

  // BroadcastChannel para sincronizaci n entre pestañas
  const syncChannel = useMemo(() => new BroadcastChannel(SYNC_CHANNEL), [])

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'ORG_CHANGED' && event.data.orgId) {
        setActiveOrgId(event.data.orgId)
      }
    }
    syncChannel.addEventListener('message', handler)
    return () => {
      syncChannel.removeEventListener('message', handler)
      syncChannel.close()
    }
  }, [syncChannel])

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
        syncChannel.postMessage({ type: 'ORG_CHANGED', orgId: id })
      },
      memberships: memberships.data ?? [],
    }),
    [memberships.data, syncChannel],
  )

  return { activeOrgId, loading, error, ...selector }
}
