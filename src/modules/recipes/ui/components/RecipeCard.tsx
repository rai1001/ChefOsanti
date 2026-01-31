import { Link } from 'react-router-dom'
import { ChefHat } from 'lucide-react'
import { Badge } from '@/modules/shared/ui/Badge'
import { memo } from 'react'
import type { Recipe } from '../../domain/recipes'

interface RecipeCardProps {
  recipe: Recipe
  isActive: boolean
  onSelect: (id: string) => void
}

/**
 * ⚡ Bolt Performance Optimization:
 * This component is memoized to prevent unnecessary re-renders when the parent list re-renders.
 * Only the specific card that changes state (e.g., selection) will re-render, keeping the rest of the list static.
 */
export const RecipeCard = memo(function RecipeCard({ recipe, isActive, onSelect }: RecipeCardProps) {
  return (
    <Link
      to={`/recipes/${recipe.id}`}
      onClick={(e) => {
        e.preventDefault()
        onSelect(recipe.id)
      }}
      className={`rounded-2xl border px-4 py-3 text-left transition ${
        isActive
          ? 'border-accent bg-white/10 shadow-[0_18px_44px_rgba(3,7,18,0.5)]'
          : 'border-border/30 bg-surface/70 hover:border-accent/60'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-muted-foreground">
          <ChefHat size={18} />
        </div>
        <div>
          <p className="font-semibold text-foreground">{recipe.name}</p>
          <p className="text-xs text-muted-foreground">Base: {recipe.defaultServings} raciones</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <Badge variant="neutral">{recipe.category ?? 'Sin categoria'}</Badge>
        <span className="text-muted-foreground">ID: {recipe.id.slice(0, 6)}...</span>
      </div>
    </Link>
  )
})
