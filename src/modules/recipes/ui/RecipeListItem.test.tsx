import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { RecipeListItem } from './RecipeListItem'
import type { Recipe } from '../domain/recipes'

// Mock Badge component
vi.mock('@/modules/shared/ui/Badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>
}))

describe('RecipeListItem', () => {
  const mockRecipe: Recipe = {
    id: 'r-1',
    name: 'Test Recipe',
    defaultServings: 10,
    category: 'salsas'
  }

  const mockOnSelect = vi.fn()

  it('renders recipe details correctly', () => {
    render(
      <MemoryRouter>
        <RecipeListItem recipe={mockRecipe} isActive={false} onSelect={mockOnSelect} />
      </MemoryRouter>
    )

    expect(screen.getByText('Test Recipe')).toBeDefined()
    expect(screen.getByText('Base: 10 raciones')).toBeDefined()
    expect(screen.getByText('salsas')).toBeDefined()
  })

  it('calls onSelect when clicked', () => {
    render(
      <MemoryRouter>
        <RecipeListItem recipe={mockRecipe} isActive={false} onSelect={mockOnSelect} />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText('Test Recipe'))
    expect(mockOnSelect).toHaveBeenCalledWith('r-1')
  })

  it('applies active styles when isActive is true', () => {
    const { container } = render(
      <MemoryRouter>
        <RecipeListItem recipe={mockRecipe} isActive={true} onSelect={mockOnSelect} />
      </MemoryRouter>
    )

    const link = container.querySelector('a')
    expect(link?.className).toContain('border-accent')
    expect(link?.className).toContain('shadow-')
  })
})
