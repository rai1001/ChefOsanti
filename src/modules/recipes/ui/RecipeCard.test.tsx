import { render, screen, fireEvent } from '@testing-library/react'
import { RecipeCard } from './RecipeCard'
import { describe, it, expect, vi } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import type { Recipe } from '../domain/recipes'

const mockRecipe: Recipe = {
  id: 'recipe-123',
  name: 'Test Recipe',
  defaultServings: 4,
  category: 'platos'
}

describe('RecipeCard', () => {
  it('renders recipe details', () => {
    render(
      <BrowserRouter>
        <RecipeCard recipe={mockRecipe} isActive={false} onSelect={vi.fn()} />
      </BrowserRouter>
    )

    expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    expect(screen.getByText('Base: 4 raciones')).toBeInTheDocument()
    expect(screen.getByText('platos')).toBeInTheDocument()
  })

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn()
    render(
      <BrowserRouter>
        <RecipeCard recipe={mockRecipe} isActive={false} onSelect={onSelect} />
      </BrowserRouter>
    )

    const link = screen.getByRole('link')
    fireEvent.click(link)

    expect(onSelect).toHaveBeenCalledWith('recipe-123')
  })

  it('shows active state styles', () => {
    const { container } = render(
      <BrowserRouter>
        <RecipeCard recipe={mockRecipe} isActive={true} onSelect={vi.fn()} />
      </BrowserRouter>
    )

    // Check for active border class
    expect(container.firstChild).toHaveClass('border-accent')
  })
})
