import { render, screen, fireEvent } from '@testing-library/react'
import { RecipeCard } from './RecipeCard'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, it, expect } from 'vitest'
import type { Recipe } from '../domain/recipes'

const mockRecipe: Recipe = {
  id: 'recipe-123',
  name: 'Test Recipe',
  defaultServings: 4,
  category: 'bases',
}

describe('RecipeCard', () => {
  it('renders recipe details correctly', () => {
    render(
      <BrowserRouter>
        <RecipeCard recipe={mockRecipe} isActive={false} onSelect={() => {}} />
      </BrowserRouter>
    )

    expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    expect(screen.getByText('Base: 4 raciones')).toBeInTheDocument()
    expect(screen.getByText('bases')).toBeInTheDocument()
    expect(screen.getByText('ID: recipe...')).toBeInTheDocument()
  })

  it('calls onSelect when clicked', () => {
    const handleSelect = vi.fn()
    render(
      <BrowserRouter>
        <RecipeCard recipe={mockRecipe} isActive={false} onSelect={handleSelect} />
      </BrowserRouter>
    )

    const link = screen.getByRole('link')
    fireEvent.click(link)

    expect(handleSelect).toHaveBeenCalledWith('recipe-123')
  })

  it('applies active styles when isActive is true', () => {
    render(
      <BrowserRouter>
        <RecipeCard recipe={mockRecipe} isActive={true} onSelect={() => {}} />
      </BrowserRouter>
    )

    const link = screen.getByRole('link')
    expect(link.className).toContain('border-accent')
    expect(link.className).toContain('bg-white/10')
  })

  it('applies inactive styles when isActive is false', () => {
    render(
      <BrowserRouter>
        <RecipeCard recipe={mockRecipe} isActive={false} onSelect={() => {}} />
      </BrowserRouter>
    )

    const link = screen.getByRole('link')
    expect(link.className).toContain('border-border/30')
    expect(link.className).toContain('bg-surface/70')
  })
})
