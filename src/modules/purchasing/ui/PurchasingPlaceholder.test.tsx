import { render, screen } from '@testing-library/react'
import { PurchasingPlaceholder } from './PurchasingPlaceholder'

it('muestra placeholder de purchasing', () => {
  render(<PurchasingPlaceholder />)

  expect(screen.getByText(/Purchasing/i)).toBeInTheDocument()
  expect(screen.getByText(/En construcción/i)).toBeInTheDocument()
})
