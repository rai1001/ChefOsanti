import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useUserMemberships } from './memberships'

const STORAGE_KEY = 'activeOrgId'
const SYNC_CHANNEL = 'chefos_org_sync'
const ORG_EVENT = 'chefos-org-changed'

function subscribeStoredOrg(listener: () => void) {
  if (typeof window === 'undefined') return () => {}
  let bc: BroadcastChannel | null = null

  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'ORG_CHANGED') {
      listener()
    }
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel(SYNC_CHANNEL)
      bc.addEventListener('message', handleMessage)
    }
  } catch (e) {
    console.warn('BroadcastChannel not supported', e)
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener()
    }
  }

  const handleCustom = () => listener()

  window.addEventListener('storage', handleStorage)
  window.addEventListener(ORG_EVENT, handleCustom)

  return () => {
    bc?.removeEventListener('message', handleMessage)
    bc?.close()
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(ORG_EVENT, handleCustom)
  }
}

function getStoredOrgId() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

function notifyOrgChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(ORG_EVENT))
}

export function useActiveOrgId() {
  const memberships = useUserMemberships()
  const storedOrgId = useSyncExternalStore(subscribeStoredOrg, getStoredOrgId, getStoredOrgId)

  const activeOrgId = useMemo(() => {
    if (!memberships.data || memberships.data.length === 0) return null
    const activeFlag = memberships.data.find((m) => m.isActive)?.orgId ?? null
    const storedValid =
      storedOrgId && memberships.data.some((m) => m.orgId === storedOrgId) ? storedOrgId : null
    return activeFlag ?? storedValid ?? memberships.data[0]?.orgId ?? null
  }, [memberships.data, storedOrgId])

  useEffect(() => {
    if (!memberships.data) return
    if (memberships.data.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    if (storedOrgId && !memberships.data.some((m) => m.orgId === storedOrgId)) {
      localStorage.removeItem(STORAGE_KEY)
    }
    if (activeOrgId && storedOrgId !== activeOrgId) {
      localStorage.setItem(STORAGE_KEY, activeOrgId)
      notifyOrgChanged()
    }
  }, [memberships.data, storedOrgId, activeOrgId])

  const loading = memberships.isLoading
  const error = memberships.isError ? memberships.error : undefined

  const selector = useMemo(() => {
    const setOrg = (id: string) => {
      localStorage.setItem(STORAGE_KEY, id)
      notifyOrgChanged()

      try {
        const bc = new BroadcastChannel(SYNC_CHANNEL)
        bc.postMessage({ type: 'ORG_CHANGED', orgId: id })
        bc.close()
      } catch (e) {
        // ignore; storage + custom event already handled
      }
    }

    return {
      setOrg,
      memberships: memberships.data ?? [],
    }
  }, [memberships.data])

  const activeOrgName = useMemo(() => {
    return memberships.data?.find((m) => m.orgId === activeOrgId)?.orgName ?? null
  }, [memberships.data, activeOrgId])

  return { activeOrgId, activeOrgName, loading, error, ...selector }
}
