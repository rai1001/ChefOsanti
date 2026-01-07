import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

type Props = {
  children: ReactNode
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-brand-100 text-brand-700' : 'text-slate-700 hover:bg-slate-100',
  ].join(' ')

export function AppLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded bg-brand-600 px-2 py-1 text-sm font-semibold text-white">
              ChefOS
            </div>
            <span className="text-sm text-slate-500">Purchasing P1</span>
          </div>
          <nav className="flex items-center gap-2">
            <NavLink to="/purchasing/suppliers" className={navClass} end>
              Compras · Proveedores
            </NavLink>
            <NavLink to="/login" className={navClass}>
              Acceder
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
