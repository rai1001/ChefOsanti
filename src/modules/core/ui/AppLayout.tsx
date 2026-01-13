import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { can } from '@/modules/auth/domain/roles'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { queryClient } from '@/lib/queryClient'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'

type Props = {
  children: ReactNode
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-md px-3 py-2 text-sm font-medium transition-all duration-300',
    isActive
      ? 'bg-nano-blue-500/10 text-nano-blue-400 shadow-[0_0_10px_rgba(34,211,238,0.2)] border border-nano-blue-500/20'
      : 'text-slate-400 hover:text-white hover:bg-white/5',
  ].join(' ')

export function AppLayout({ children }: Props) {
  const { role, loading: roleLoading } = useCurrentRole()
  const { activeOrgName, loading: orgLoading } = useActiveOrgId()
  const navigate = useNavigate()
  const [density, setDensity] = useState<'compact' | 'comfortable'>(() => {
    if (typeof localStorage === 'undefined') return 'compact'
    return (localStorage.getItem('ds-density') as 'compact' | 'comfortable') || 'compact'
  })

  const loading = roleLoading || orgLoading

  const navItems: { label: string; to: string; perm?: any }[] = [
    { label: 'Dashboard', to: '/dashboard', perm: 'dashboard:read' },
    { label: 'Reportes', to: '/reports', perm: 'reports:read' },
    { label: 'Eventos', to: '/events', perm: 'events:read' },
    { label: 'Producción', to: '/production', perm: 'events:read' },
    { label: 'Menus', to: '/menus', perm: 'menus:read' },
    { label: 'Productos', to: '/products', perm: 'recipes:read' },
    { label: 'Recetas', to: '/recipes', perm: 'recipes:read' },
    { label: 'Horarios', to: '/scheduling', perm: 'scheduling:read' },
    { label: 'Generar roster', to: '/scheduling/generate', perm: 'scheduling:write' },
    { label: 'Personal', to: '/staff', perm: 'staff:read' },
    { label: 'Pedidos evento', to: '/purchasing/event-orders', perm: 'purchasing:read' },
    { label: 'Pedidos', to: '/purchasing/orders', perm: 'purchasing:read' },
    { label: 'Proveedores', to: '/purchasing/suppliers', perm: 'purchasing:read' },
    { label: 'Mermas', to: '/waste', perm: 'waste:read' },
    { label: 'Stock', to: '/purchasing/stock', perm: 'purchasing:read' },
    { label: 'Caducidades', to: '/inventory/expiries', perm: 'purchasing:read' },
    { label: 'Elaboraciones', to: '/inventory/preparations', perm: 'purchasing:read' },
  ]

  const visibleNav = navItems.filter((item) => !item.perm || can(role, item.perm))
  const densityLabel = useMemo(
    () => (density === 'compact' ? 'Compacto' : 'Cmodo'),
    [density],
  )

  useEffect(() => {
    localStorage.setItem('ds-density', density)
  }, [density])

  const handleLogout = async () => {
    try {
      const client = getSupabaseClient()
      const storageKey = (client.auth as any).storageKey
      await client.auth.signOut()
      if (storageKey) {
        localStorage.removeItem(storageKey)
      }
    } catch (_err) {
      /* ignore logout errors but still clear local state */
    }
    queryClient.clear()
    localStorage.removeItem('activeOrgId')
    localStorage.removeItem('__E2E_SESSION__')
    if (typeof window !== 'undefined') {
      delete (window as any).__E2E_SESSION__
    }
    navigate('/login')
  }

  return (
    <div className="min-h-screen font-sans text-slate-200 selection:bg-nano-blue-500/30" data-density={density}>
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-nano-blue-500 to-nano-pink-500 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative rounded-lg bg-nano-navy-900 border border-white/10 px-3 py-1.5 text-sm font-bold text-white flex items-center gap-1.5">
                <span className="text-nano-blue-400">⚡</span> ChefOS
              </div>
            </div>
            <span className="text-xs text-slate-500 font-medium tracking-wider uppercase hidden sm:block">Premium</span>
            {activeOrgName && (
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-nano-blue-500/10 text-nano-blue-400 border border-nano-blue-500/20">
                {activeOrgName}
              </span>
            )}
            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-300 shadow-sm md:flex">
              <span className="text-[10px] uppercase tracking-wide text-slate-400">Densidad</span>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-semibold text-slate-200 hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-nano-blue-400"
                aria-label="Cambiar densidad"
                onClick={() => setDensity((prev) => (prev === 'compact' ? 'comfortable' : 'compact'))}
              >
                {densityLabel}
              </button>
            </div>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 mask-linear-fade">
            {loading ? (
              <div className="flex items-center gap-2 px-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-nano-blue-500 border-t-transparent"></div>
                <span className="text-xs text-slate-500">Cargando...</span>
              </div>
            ) : (
              visibleNav.map((item) => (
                <NavLink key={item.to} to={item.to} className={navClass}>
                  {item.label}
                </NavLink>
              ))
            )}
            <div className="h-4 w-px bg-white/10 mx-2"></div>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-400 hover:text-red-400 transition-colors hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
              Salir
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 animate-fade-in">{children}</main>
    </div>
  )
}
