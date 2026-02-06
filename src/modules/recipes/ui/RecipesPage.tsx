import { useDeferredValue, useMemo, useState, useCallback } from 'react'
import { ChefHat, Filter, Sparkles, SlidersHorizontal } from 'lucide-react'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useCreateRecipe, useRecipes } from '../data/recipes'
import type { RecipeCategory } from '../domain/recipes'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { can } from '@/modules/auth/domain/roles'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import { FormField } from '@/modules/shared/ui/FormField'
import { toast } from 'sonner'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { Card } from '@/modules/shared/ui/Card'
import { Badge } from '@/modules/shared/ui/Badge'
import { Button } from '@/modules/shared/ui/Button'
import { Spinner } from '@/modules/shared/ui/Spinner'
import { DataState } from '@/modules/shared/ui/DataState'
import { RecipeCard } from './RecipeCard'

const RECIPE_CATEGORIES: { value: RecipeCategory; label: string }[] = [
  { value: 'bases', label: 'Bases' },
  { value: 'salsas', label: 'Salsas' },
  { value: 'platos', label: 'Platos' },
  { value: 'quinta_gama', label: 'Quinta gama' },
]

export default function RecipesPage() {
  const { activeOrgId, loading, error } = useActiveOrgId()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | RecipeCategory>('all')
  const deferredSearch = useDeferredValue(search)
  const recipes = useRecipes(activeOrgId ?? undefined, {
    search: deferredSearch,
    category: categoryFilter === 'all' ? null : categoryFilter,
  })
  const createRecipe = useCreateRecipe(activeOrgId ?? undefined)
  const [name, setName] = useState('')
  const [servings, setServings] = useState(10)
  const [category, setCategory] = useState<RecipeCategory | ''>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const { role } = useCurrentRole()
  const canWrite = can(role, 'recipes:write')
  const formattedError = useFormattedError(error)
  const createError = useFormattedError(createRecipe.error)

  const filtered = useMemo(() => recipes.data ?? [], [recipes.data])

  const selected = useMemo(() => {
    if (selectedId) return filtered.find((r) => r.id === selectedId) ?? null
    return filtered[0] ?? null
  }, [filtered, selectedId])

  const handleSelect = useCallback((id: string) => setSelectedId(id), [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || servings <= 0 || !canWrite) return
    try {
      await createRecipe.mutateAsync({
        name: name.trim(),
        defaultServings: servings,
        category: category || null,
      })
      toast.success('Receta creada correctamente')
      setName('')
      setServings(10)
      setCategory('')
      recipes.refetch()
    } catch {
      toast.error('Error al crear la receta')
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

  const scaledServings = selected ? Math.round(selected.defaultServings * scale) : 0

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Recetas</p>
          <h1 className="text-3xl font-semibold text-foreground">Recipe & Product Catalog</h1>
          <p className="text-sm text-muted-foreground">Cards con imagen, side panel y scaling por raciones.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setSelectedId(null)
              setSearch('')
              setCategoryFilter('all')
            }}
          >
            <Filter size={16} />
            Limpiar filtros
          </Button>
          <Button onClick={() => setScale(1)}>
            <Sparkles size={16} />
            Reset scale
          </Button>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1.7fr,0.9fr]">
        <Card className="rounded-3xl border border-border/25 bg-surface/70 p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="ds-input flex-1 min-w-[240px]"
              placeholder="Buscar receta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="ds-input min-w-[180px]"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'all' | RecipeCategory)}
            >
              <option value="all">Todas las categorias</option>
              {RECIPE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <Badge variant="neutral">Total: {filtered.length}</Badge>
          </div>

          <DataState
            loading={recipes.isLoading}
            error={recipes.error}
            empty={filtered.length === 0}
            emptyState={<EmptyState title="Sin recetas" description="Crea tu primera receta para empezar a calcular costes." />}
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((r) => (
                <RecipeCard
                  key={r.id}
                  recipe={r}
                  isActive={r.id === selected?.id}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </DataState>
        </Card>

        <Card className="rounded-3xl border border-border/25 bg-surface/70 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">Side Panel</p>
              <p className="text-sm text-muted-foreground">Scaling y creación rápida</p>
            </div>
            <Badge variant="info">Yield</Badge>
          </div>

          {selected ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-foreground">{selected.name}</p>
                <Badge variant="neutral">{selected.defaultServings} raciones</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-foreground">
                  <span>Factor de escala</span>
                  <span className="text-muted-foreground">x{scale.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <SlidersHorizontal size={16} className="text-muted-foreground" />
                  <input
                    type="range"
                    min={0.5}
                    max={3}
                    step={0.1}
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full accent-accent"
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Raciones ajustadas</span>
                  <span className="font-semibold text-foreground">{scaledServings}</span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title="Selecciona una receta" description="Verás aquí el side panel con scaling." />
          )}

          <div className="rounded-2xl border border-border/20 bg-surface2/70 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <ChefHat size={16} />
              Nueva receta
            </div>
            {!canWrite && <p className="text-xs text-muted-foreground">Sin permisos para crear.</p>}
            <form className="space-y-3" onSubmit={onSubmit}>
              <FormField
                id="recipe-name"
                label="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canWrite}
                placeholder="Nombre de la receta"
                className="bg-surface/80 text-foreground"
              />
              <FormField
                id="recipe-servings"
                label="Raciones base"
                type="number"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value) || 0)}
                disabled={!canWrite}
                className="bg-surface/80 text-foreground"
              />
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="recipe-category">
                  Categoria
                </label>
                <select
                  id="recipe-category"
                  className="ds-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as RecipeCategory | '')}
                  disabled={!canWrite}
                >
                  <option value="">Sin categoria</option>
                  {RECIPE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              {createError && <p className="text-xs text-danger">{createError}</p>}
              <Button type="submit" disabled={createRecipe.isPending || !canWrite} className="w-full">
                {createRecipe.isPending ? 'Guardando...' : 'Crear'}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  )
}
