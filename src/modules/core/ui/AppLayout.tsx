import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { can } from '@/modules/auth/domain/roles'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { queryClient } from '@/lib/queryClient'

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
  const { role, loading } = useCurrentRole()
  const navigate = useNavigate()

  const navItems: { label: string; to: string; perm?: any }[] = [
    { label: 'Dashboard', to: '/dashboard', perm: 'dashboard:read' },
    { label: 'Eventos', to: '/events', perm: 'events:read' },
    { label: 'Menus', to: '/menus', perm: 'menus:read' },
    { label: 'Productos', to: '/products', perm: 'recipes:read' },
    { label: 'Recetas', to: '/recipes', perm: 'recipes:read' },
    { label: 'Horarios', to: '/scheduling', perm: 'scheduling:read' },
    { label: 'Generar roster', to: '/scheduling/generate', perm: 'scheduling:write' },
    { label: 'Personal', to: '/staff', perm: 'staff:read' },
    { label: 'Pedidos evento', to: '/purchasing/event-orders', perm: 'purchasing:read' },
    { label: 'Pedidos', to: '/purchasing/orders', perm: 'purchasing:read' },
    { label: 'Proveedores', to: '/purchasing/suppliers', perm: 'purchasing:read' },
    { label: 'Stock', to: '/purchasing/stock', perm: 'purchasing:read' },
  ]

  const visibleNav = navItems.filter((item) => !item.perm || can(role, item.perm))

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
    <div className="min-h-screen font-sans text-slate-200 selection:bg-nano-blue-500/30">
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
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-400 hover:text-red-400 transition-colors hover:bg-red-500/10"
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
