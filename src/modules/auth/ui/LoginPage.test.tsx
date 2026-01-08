import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { LoginPage } from './LoginPage'

const signInWithPassword = vi.fn()

vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: () => ({
    auth: {
      signInWithPassword,
    },
  }),
}))

vi.mock('../data/session', () => ({
  useSupabaseSession: () => ({ session: null, loading: false }),
}))

function renderWithRouter() {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/dashboard', element: <div>Dashboard</div> },
    ],
    { initialEntries: ['/login'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('LoginPage', () => {
  beforeEach(() => {
    signInWithPassword.mockReset()
    signInWithPassword.mockResolvedValue({
      data: { session: { access_token: 'token' } },
      error: null,
    })
  })

  it('valida campos requeridos', async () => {
    const user = userEvent.setup()
    renderWithRouter()

    await user.click(screen.getByRole('button', { name: /Entrar/i }))

    expect(screen.getByText(/Introduce un correo/i)).toBeInTheDocument()
    expect(screen.getByText(/obligatoria/i)).toBeInTheDocument()
  })

  it('realiza login contra Supabase y redirige', async () => {
    const user = userEvent.setup()
    const router = renderWithRouter()

    await user.type(screen.getByLabelText(/Correo/i), 'chef@hotel.com')
    await user.type(screen.getByLabelText(/Contrase/i), 'secreto123')
    await user.click(screen.getByRole('button', { name: /Entrar/i }))

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'chef@hotel.com',
      password: 'secreto123',
    })
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'))
  })
})
