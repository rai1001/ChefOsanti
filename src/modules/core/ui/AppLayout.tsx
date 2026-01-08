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
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-100 text-brand-700' : 'text-slate-700 hover:bg-slate-100',
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded bg-brand-600 px-2 py-1 text-sm font-semibold text-white">
              ChefOS
            </div>
            <span className="text-sm text-slate-500">Compras + Eventos</span>
          </div>
          <nav className="flex items-center gap-2">
            {loading ? (
              <span className="text-xs text-slate-500">Cargando menu...</span>
            ) : (
              visibleNav.map((item) => (
                <NavLink key={item.to} to={item.to} className={navClass}>
                  {item.label}
                </NavLink>
              ))
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Cerrar sesi¢n
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
