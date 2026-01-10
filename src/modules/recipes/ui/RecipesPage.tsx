import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useCreateRecipe, useRecipes } from '../data/recipes'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { can } from '@/modules/auth/domain/roles'
import { ChefHat } from 'lucide-react'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import { FormField } from '@/modules/shared/ui/FormField'
import { toast } from '@/modules/shared/ui/Toast'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'

export default function RecipesPage() {
  const { activeOrgId, loading, error } = useActiveOrgId()
  const recipes = useRecipes(activeOrgId ?? undefined)
  const createRecipe = useCreateRecipe(activeOrgId ?? undefined)
  const [name, setName] = useState('')
  const [servings, setServings] = useState(10)
  const { role } = useCurrentRole()
  const canWrite = can(role, 'recipes:write')
  const formattedError = useFormattedError(error)
  const createError = useFormattedError(createRecipe.error)

  if (loading) return <p className="p-4 text-sm text-slate-400">Cargando organización...</p>
  if (error || !activeOrgId) {
    return (
      <div className="p-4 rounded-lg border border-red-500/10 bg-red-500/5">
        <p className="text-sm text-red-500">Selecciona una organización válida.</p>
        {formattedError && <p className="text-xs text-red-400 mt-1">{formattedError}</p>}
      </div>
    )
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || servings <= 0 || !canWrite) return
    try {
      await createRecipe.mutateAsync({ name: name.trim(), defaultServings: servings })
      toast.success('Receta creada correctamente')
      setName('')
      setServings(10)
    } catch (e) {
      toast.error('Error al crear la receta')
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-nano-blue-400">Recetas</p>
        <h1 className="text-2xl font-bold text-white">Recetas por organización</h1>
        <p className="text-sm text-slate-400">Usa productos globales, no depende del hotel.</p>
      </header>

      <div className="rounded-xl border border-white/10 bg-nano-navy-800/50 p-4 shadow-xl backdrop-blur-sm">
        <h2 className="text-sm font-semibold text-white">Nueva receta</h2>
        {!canWrite && <p className="text-xs text-slate-500">Sin permisos para crear.</p>}
        <form className="mt-3 flex flex-col gap-2 md:flex-row md:items-end" onSubmit={onSubmit}>
          <div className="flex flex-col flex-1">
            <FormField
              id="recipe-name"
              label="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canWrite}
              placeholder="Nombre de la receta"
              className="bg-nano-navy-900 border-white/10 focus:border-nano-blue-500 text-white"
            />
          </div>
          <div className="flex flex-col w-32">
            <FormField
              id="recipe-servings"
              label="Raciones base"
              type="number"
              value={servings}
              onChange={(e) => setServings(Number(e.target.value) || 0)}
              disabled={!canWrite}
              className="bg-nano-navy-900 border-white/10 focus:border-nano-blue-500 text-white"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-nano-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 transition hover:bg-nano-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={createRecipe.isPending || !canWrite}
            title={!canWrite ? 'Sin permisos' : undefined}
          >
            {createRecipe.isPending ? 'Guardando...' : 'Crear'}
          </button>
        </form>
        {createError && (
          <div className="mt-2 text-xs text-red-400">
            <span className="font-semibold">Error:</span> {createError}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-nano-navy-800/50 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Listado</h2>
          {recipes.isLoading && <span className="text-xs text-slate-400">Cargando...</span>}
        </div>
        <div className="divide-y divide-white/10">
          {recipes.data?.length ? (
            recipes.data.map((r) => (
              <Link
                key={r.id}
                to={`/recipes/${r.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors group"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{r.name}</p>
                  <p className="text-xs text-slate-500 group-hover:text-slate-400">Raciones base: {r.defaultServings}</p>
                </div>
                <span className="text-xs font-semibold text-nano-blue-400 group-hover:text-nano-blue-300 transition-colors">Ver</span>
              </Link>
            ))
          ) : (
            <div className="py-8">
              <EmptyState
                icon={ChefHat}
                title="Sin recetas"
                description="Crea tu primera receta para empezar a calcular costes."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
