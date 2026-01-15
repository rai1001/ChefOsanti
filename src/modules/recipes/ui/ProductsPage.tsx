import { useMemo, useState } from 'react'
import { Filter, Package, Plus, Sparkles } from 'lucide-react'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useCreateProduct, useProducts } from '../data/products'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { can } from '@/modules/auth/domain/roles'
import { UniversalImporter } from '@/modules/shared/ui/UniversalImporter'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import { FormField } from '@/modules/shared/ui/FormField'
import { toast } from '@/modules/shared/ui/Toast'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { Card } from '@/modules/shared/ui/Card'
import { Badge } from '@/modules/shared/ui/Badge'
import { Button } from '@/modules/shared/ui/Button'
import { Spinner } from '@/modules/shared/ui/Spinner'
import { DataState } from '@/modules/shared/ui/DataState'

export default function ProductsPage() {
  const { activeOrgId, loading, error } = useActiveOrgId()
  const products = useProducts(activeOrgId ?? undefined)
  const createProduct = useCreateProduct(activeOrgId ?? undefined)
  const [name, setName] = useState('')
  const [baseUnit, setBaseUnit] = useState<'kg' | 'ud'>('ud')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { role } = useCurrentRole()
  const canWrite = can(role, 'recipes:write')
  const [isImporterOpen, setIsImporterOpen] = useState(false)
  const formattedError = useFormattedError(error)
  const createError = useFormattedError(createProduct.error)

  const filtered = useMemo(() => {
    const list = products.data ?? []
    const term = search.toLowerCase().trim()
    return term.length ? list.filter((p) => p.name.toLowerCase().includes(term)) : list
  }, [products.data, search])

  const selected = useMemo(() => {
    if (selectedId) return filtered.find((p) => p.id === selectedId) ?? null
    return filtered[0] ?? null
  }, [filtered, selectedId])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !canWrite) return
    try {
      await createProduct.mutateAsync({ name: name.trim(), baseUnit })
      toast.success('Producto creado')
      setName('')
      setBaseUnit('ud')
      products.refetch()
    } catch (e) {
      toast.error('Error al crear producto')
    }
  }

  if (loading) return <div className="p-6"><Spinner /></div>
  if (error || !activeOrgId) {
    return (
      <div className="p-4 rounded-lg border border-red-500/10 bg-red-500/5">
        <p className="text-sm text-red-500">Selecciona una organización válida.</p>
        {formattedError && <p className="text-xs text-red-400 mt-1">{formattedError}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Catálogo</p>
          <h1 className="text-3xl font-semibold text-foreground">Product Catalog</h1>
          <p className="text-sm text-muted-foreground">Cards con imagen, side panel y scaling helper.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setIsImporterOpen(true)}>
            <Filter size={16} />
            Importar
          </Button>
          <Button onClick={() => setSelectedId(null)}>
            <Sparkles size={16} />
            Limpiar selección
          </Button>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1.7fr,0.9fr]">
        <Card className="rounded-3xl border border-border/25 bg-surface/70 p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <input
                className="ds-input w-full"
                placeholder="Buscar producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Badge variant="neutral">Total: {filtered.length}</Badge>
          </div>

          <DataState
            loading={products.isLoading}
            error={products.error}
            empty={filtered.length === 0}
            emptyState={
              <EmptyState
                icon={Package}
                title="Sin productos"
                description="Crea o importa productos para ver el catálogo."
              />
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => {
                const isActive = p.id === selected?.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-accent bg-white/10 shadow-[0_18px_44px_rgba(3,7,18,0.5)]'
                        : 'border-border/30 bg-surface/70 hover:border-accent/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-muted-foreground">
                        <Package size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">Unidad: {p.baseUnit}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <Badge variant={p.active ? 'success' : 'neutral'}>{p.active ? 'Activo' : 'Inactivo'}</Badge>
                      <span className="text-muted-foreground">Global</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </DataState>
        </Card>

        <Card className="rounded-3xl border border-border/25 bg-surface/70 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Side Panel</p>
              <p className="text-sm text-muted-foreground">Detalle + creación rápida</p>
            </div>
            <Badge variant="neutral">Scaling</Badge>
          </div>

          {selected ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-foreground">{selected.name}</p>
                <Badge variant="info">{selected.baseUnit}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Producto global, visible en todas las sucursales.</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">Estado: {selected.active ? 'Activo' : 'Inactivo'}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">ID: {selected.id.slice(0, 6)}...</span>
              </div>
            </div>
          ) : (
            <EmptyState title="Selecciona un producto" description="Verás aquí el detalle y estado." />
          )}

          <div className="rounded-2xl border border-border/20 bg-surface2/70 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Plus size={16} />
              Nuevo producto
            </div>
            {!canWrite && <p className="text-xs text-muted-foreground">Sin permisos para crear.</p>}
            <form className="space-y-3" onSubmit={onSubmit}>
              <FormField
                id="product-name"
                label="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canWrite}
                placeholder="Nombre del producto"
                className="bg-surface/80 text-foreground"
              />
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="product-unit">Unidad base</label>
                <select
                  id="product-unit"
                  className="ds-input"
                  value={baseUnit}
                  onChange={(e) => setBaseUnit(e.target.value as 'kg' | 'ud')}
                  disabled={!canWrite}
                >
                  <option value="ud">ud</option>
                  <option value="kg">kg</option>
                </select>
              </div>
              {createError && <p className="text-xs text-danger">{createError}</p>}
              <Button type="submit" disabled={createProduct.isPending || !canWrite} className="w-full">
                {createProduct.isPending ? 'Guardando...' : 'Crear'}
              </Button>
            </form>
          </div>
        </Card>
      </div>

      <UniversalImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        title="Productos"
        entity="products"
        fields={[
          { key: 'name', label: 'Nombre' },
          { key: 'baseUnit', label: 'Unidad (kg/ud)', transform: (val) => (val === 'kg' ? 'kg' : 'ud') },
        ]}
      />
    </div>
  )
}
