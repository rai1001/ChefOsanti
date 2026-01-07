import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('valida y muestra mensaje placeholder', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(screen.getByText(/Introduce un correo válido/i)).toBeInTheDocument()
    expect(screen.getByText(/La contraseña es obligatoria/i)).toBeInTheDocument()

    await user.clear(screen.getByLabelText(/Correo electrónico/i))
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'chef@hotel.com')
    await user.type(screen.getByLabelText(/Contraseña/i), 'secreto123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))

    expect(
      await screen.findByText(/Conexión real a Supabase Auth pendiente en P1/i),
    ).toBeInTheDocument()
  })
})
