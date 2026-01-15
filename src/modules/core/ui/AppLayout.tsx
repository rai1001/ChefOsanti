import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { can, type Permission } from '@/modules/auth/domain/roles'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { queryClient } from '@/lib/queryClient'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'

type Props = {
  children: ReactNode
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all',
    isActive
      ? 'bg-brand-100/10 text-brand-600 border border-brand-500/40 shadow-[0_0_28px_rgb(var(--accent)/0.25)]'
      : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent',
  ].join(' ')

const navSectionLabel = 'px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80'

export function AppLayout({ children }: Props) {
  const { role, loading: roleLoading } = useCurrentRole()
  const { activeOrgId, activeOrgName, memberships, setOrg, loading: orgLoading } = useActiveOrgId()
  const navigate = useNavigate()
  const [density, setDensity] = useState<'compact' | 'comfortable'>(() => {
    if (typeof localStorage === 'undefined') return 'compact'
    return (localStorage.getItem('ds-density') as 'compact' | 'comfortable') || 'compact'
  })
  const [kitchenMode, setKitchenMode] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem('kitchen-mode') === '1'
  })

  const loading = roleLoading || orgLoading

  const navSections: { label: string; items: { label: string; to: string; perm?: Permission }[] }[] = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', to: '/dashboard', perm: 'dashboard:read' },
        { label: 'Reportes', to: '/reports', perm: 'reports:read' },
      ],
    },
    {
      label: 'Operations',
      items: [
        { label: 'Eventos', to: '/events', perm: 'events:read' },
        { label: 'Produccion', to: '/production', perm: 'events:read' },
        { label: 'Menus', to: '/menus', perm: 'menus:read' },
        { label: 'Recetas', to: '/recipes', perm: 'recipes:read' },
        { label: 'Productos', to: '/products', perm: 'recipes:read' },
      ],
    },
    {
      label: 'Procurement',
      items: [
        { label: 'Pedidos evento', to: '/purchasing/event-orders', perm: 'purchasing:read' },
        { label: 'Pedidos', to: '/purchasing/orders', perm: 'purchasing:read' },
        { label: 'Proveedores', to: '/purchasing/suppliers', perm: 'purchasing:read' },
        { label: 'Stock', to: '/purchasing/stock', perm: 'purchasing:read' },
      ],
    },
    {
      label: 'Inventory',
      items: [
        { label: 'Caducidades', to: '/inventory/expiries', perm: 'purchasing:read' },
        { label: 'Elaboraciones', to: '/inventory/preparations', perm: 'purchasing:read' },
        { label: 'Mermas', to: '/waste', perm: 'waste:read' },
      ],
    },
    {
      label: 'People',
      items: [
        { label: 'Horarios', to: '/scheduling', perm: 'scheduling:read' },
        { label: 'Generar roster', to: '/scheduling/generate', perm: 'scheduling:write' },
        { label: 'Personal', to: '/staff', perm: 'staff:read' },
      ],
    },
  ]

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.perm || can(role, item.perm)),
    }))
    .filter((section) => section.items.length > 0)

  const densityLabel = useMemo(
    () => (density === 'compact' ? 'Compacto' : 'Comodo'),
    [density],
  )

  useEffect(() => {
    localStorage.setItem('ds-density', density)
  }, [density])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.toggle('kitchen', kitchenMode)
    localStorage.setItem('kitchen-mode', kitchenMode ? '1' : '0')
  }, [kitchenMode])

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
    <div className="relative min-h-screen bg-bg text-foreground selection:bg-accent/20" data-density={density}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-80 w-80 rounded-full bg-brand-500/10 blur-[120px]" />
        <div className="absolute right-[-5%] bottom-[-5%] h-96 w-96 rounded-full bg-accent-alt/10 blur-[160px]" />
      </div>
      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-[270px] flex-col border-r border-border/25 bg-surface/40 backdrop-blur-2xl lg:flex">
          <div className="px-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-lg font-semibold text-accent shadow-[0_0_24px_rgb(var(--accent)/0.3)]">
                C
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">ChefOS</p>
                <p className="text-sm font-semibold text-foreground">Premium Ops</p>
              </div>
            </div>
          </div>

          <div className="px-6 pt-6">
            <div className="rounded-2xl border border-border/20 bg-surface2/70 p-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Sucursal</p>
              <div className="mt-2">
                {loading ? (
                  <div className="ds-skeleton h-9 w-full" />
                ) : (
                  <select
                    className="h-9 w-full rounded-lg border border-border/40 bg-surface3/70 px-2 text-sm text-foreground outline-none focus:border-accent"
                    value={activeOrgId ?? ''}
                    onChange={(event) => setOrg(event.target.value)}
                  >
                    {memberships.map((membership) => (
                      <option key={membership.orgId} value={membership.orgId}>
                        {membership.orgName ?? membership.orgSlug ?? membership.orgId}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {activeOrgName && (
                <p className="mt-2 text-xs text-muted-foreground">Activo: {activeOrgName}</p>
              )}
            </div>
          </div>

          <nav className="flex-1 space-y-6 px-4 py-6">
            {loading ? (
              <div className="space-y-3 px-3">
                {[...Array(6)].map((_, idx) => (
                  <div key={idx} className="ds-skeleton h-9 w-full" />
                ))}
              </div>
            ) : (
              visibleSections.map((section) => (
                <div key={section.label} className="space-y-2">
                  <p className={navSectionLabel}>{section.label}</p>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <NavLink key={item.to} to={item.to} className={navClass}>
                        <span className="h-1.5 w-1.5 rounded-full bg-accent/70" />
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))
            )}
          </nav>

          <div className="px-6 pb-6">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-between rounded-xl border border-border/30 bg-surface2/60 px-3 py-2 text-sm font-semibold text-foreground transition hover:border-danger/40 hover:text-danger"
            >
              <span>Salir</span>
              <span className="text-xs text-muted-foreground">Logout</span>
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-40 w-full">
            <div className="border-b border-white/5 bg-surface/60 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-lg font-semibold text-accent shadow-[0_0_24px_rgb(var(--accent)/0.3)] lg:hidden">
                    C
                  </div>
                  <div className="relative w-full max-w-lg">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm9 2-4.35-4.35"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <input
                      type="search"
                      placeholder="Buscar eventos, compras, recetas..."
                      className="h-11 w-full rounded-full border border-border/30 bg-surface2/70 pl-10 pr-16 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-brand-500/50"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 text-[11px] text-muted-foreground sm:flex">
                      Ctrl K
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 rounded-full border border-border/30 bg-surface/60 px-3 py-1 text-xs text-muted-foreground lg:hidden">
                    <span className="text-[10px] uppercase tracking-wide">Sucursal</span>
                    <select
                      className="bg-transparent text-xs text-foreground outline-none"
                      value={activeOrgId ?? ''}
                      onChange={(event) => setOrg(event.target.value)}
                    >
                      {memberships.map((membership) => (
                        <option key={membership.orgId} value={membership.orgId}>
                          {membership.orgName ?? membership.orgSlug ?? membership.orgId}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full border border-border/30 bg-surface/60 px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setDensity((prev) => (prev === 'compact' ? 'comfortable' : 'compact'))}
                  >
                    <span className="text-[10px] uppercase tracking-wide">Densidad</span>
                    <span className="font-semibold text-foreground">{densityLabel}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setKitchenMode((prev) => !prev)}
                    className="flex items-center gap-2 rounded-full border border-border/30 bg-surface/60 px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <span className="text-[10px] uppercase tracking-wide">Kitchen</span>
                    <span className="font-semibold text-foreground">{kitchenMode ? 'On' : 'Off'}</span>
                  </button>

                  <button
                    type="button"
                    className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border/30 bg-surface/70 text-muted-foreground transition hover:-translate-y-0.5 hover:text-foreground"
                    aria-label="Notificaciones"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6 9a6 6 0 1 1 12 0v4.2c0 .6.2 1.2.6 1.7l.8 1.1H4.6l.8-1.1c.4-.5.6-1.1.6-1.7V9Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-warning shadow-[0_0_8px_rgb(var(--warning)/0.6)]" />
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-full border border-border/30 bg-surface/60 px-3 py-1 text-xs font-semibold text-foreground hover:border-danger/40 hover:text-danger"
                  >
                    Salir
                  </button>
                </div>
              </div>

              <nav className="mx-auto flex max-w-[1400px] gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
                {loading ? (
                  <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    Cargando...
                  </div>
                ) : (
                  visibleSections.flatMap((section) => section.items).map((item) => (
                    <NavLink key={item.to} to={item.to} className={navClass}>
                      {item.label}
                    </NavLink>
                  ))
                )}
              </nav>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1400px] px-4 py-8 lg:px-6 animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
