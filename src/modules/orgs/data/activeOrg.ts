import { useEffect, useMemo, useState } from 'react'
import { useUserMemberships } from './memberships'

const STORAGE_KEY = 'activeOrgId'
const SYNC_CHANNEL = 'chefos_org_sync'

export function useActiveOrgId() {
  const memberships = useUserMemberships()
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)

  // BroadcastChannel para sincronización entre pestañas
  useEffect(() => {
    let bc: BroadcastChannel | null = null
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ORG_CHANGED' && event.data.orgId) {
        setActiveOrgId(event.data.orgId)
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

    // Fallback: storage event para navegadores antiguos o si BC falla
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setActiveOrgId(e.newValue)
      }
    }
    window.addEventListener('storage', handleStorage)

    return () => {
      bc?.removeEventListener('message', handleMessage)
      bc?.close()
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  // Cargar posible selección previa
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setActiveOrgId(stored)
  }, [])

  // Resolver org activa con prioridad: membership.isActive -> stored válido -> primera
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

    // Si lo guardado ya no es válido (ej: usuario perdió acceso), limpiar
    if (stored && !storedValid) {
      localStorage.removeItem(STORAGE_KEY)
    }

    setActiveOrgId((prev) => {
      // Si ya tenemos uno seleccionado y sigue siendo válido, mantenerlo
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

  // Memoizar el selector para evitar recreaciones
  const selector = useMemo(() => {
    // Función para cambiar org y notificar
    const setOrg = (id: string) => {
      setActiveOrgId(id)
      localStorage.setItem(STORAGE_KEY, id)

      // Notificar a otras pestañas
      try {
        const bc = new BroadcastChannel(SYNC_CHANNEL)
        bc.postMessage({ type: 'ORG_CHANGED', orgId: id })
        bc.close()
      } catch (e) {
        // Ignorar si BC falla, el storage event hará de fallback (aunque storage event no se dispara en la misma pestaña, pero aquí seteamos state directo)
      }
    }

    return {
      setOrg,
      memberships: memberships.data ?? [],
    }
  }, [memberships.data])

  return { activeOrgId, loading, error, ...selector }
}
