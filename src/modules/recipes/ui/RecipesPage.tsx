import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useCreateRecipe, useRecipes } from '../data/recipes'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { can } from '@/modules/auth/domain/roles'

export function RecipesPage() {
  const { activeOrgId, loading, error } = useActiveOrgId()
  const recipes = useRecipes(activeOrgId ?? undefined)
  const createRecipe = useCreateRecipe(activeOrgId ?? undefined)
  const [name, setName] = useState('')
  const [servings, setServings] = useState(10)
  const { role } = useCurrentRole()
  const canWrite = can(role, 'recipes:write')

  if (loading) return <p className="p-4 text-sm text-slate-600">Cargando organización...</p>
  if (error || !activeOrgId)
    return <p className="p-4 text-sm text-red-600">Selecciona una organización válida.</p>

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || servings <= 0 || !canWrite) return
    await createRecipe.mutateAsync({ name: name.trim(), defaultServings: servings })
    setName('')
    setServings(10)
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Recetas</p>
        <h1 className="text-2xl font-semibold text-slate-900">Recetas por organizacion</h1>
        <p className="text-sm text-slate-600">Usa productos globales, no depende del hotel.</p>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">Nueva receta</h2>
        {!canWrite && <p className="text-xs text-slate-500">Sin permisos para crear.</p>}
        <form className="mt-3 flex flex-col gap-2 md:flex-row md:items-end" onSubmit={onSubmit}>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-700" htmlFor="recipe-name">Nombre</label>
            <input
              id="recipe-name"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canWrite}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-slate-700" htmlFor="recipe-servings">Raciones base</label>
            <input
              id="recipe-servings"
              type="number"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={servings}
              onChange={(e) => setServings(Number(e.target.value) || 0)}
              disabled={!canWrite}
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={createRecipe.isPending || !canWrite}
            title={!canWrite ? 'Sin permisos' : undefined}
          >
            {createRecipe.isPending ? 'Guardando...' : 'Crear'}
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Listado</h2>
          {recipes.isLoading && <span className="text-xs text-slate-500">Cargando...</span>}
        </div>
        <div className="divide-y divide-slate-100">
          {recipes.data?.length ? (
            recipes.data.map((r) => (
              <Link
                key={r.id}
                to={`/recipes/${r.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{r.name}</p>
                  <p className="text-xs text-slate-600">Raciones base: {r.defaultServings}</p>
                </div>
                <span className="text-xs text-brand-700">Ver</span>
              </Link>
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-slate-600">Sin recetas.</p>
          )}
        </div>
      </div>
    </div>
  )
}
