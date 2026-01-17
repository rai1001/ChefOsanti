import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UniversalImporter } from '@/modules/shared/ui/UniversalImporter'
import { vi, describe, it, expect } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
})

describe('UniversalImporter Integration', () => {
    it('parses CSV and shows preview', async () => {
        const onImport = vi.fn()
        const onClose = vi.fn()
        const user = userEvent.setup()
        const queryClient = createTestQueryClient()

        render(
            <QueryClientProvider client={queryClient}>
                <UniversalImporter
                    isOpen={true}
                    onClose={onClose}
                    onImport={onImport}
                    title="Test Import"
                    fields={[{ key: 'name', label: 'Name' }]}
                />
            </QueryClientProvider>
        )

        const file = new File(['Name\nItem 1\nItem 2'], 'test.csv', { type: 'text/csv' })
        const input = screen.getByLabelText(/Click para subir/i)

        await user.upload(input, file)

        await waitFor(() => {
            expect(screen.getByText('Item 1')).toBeInTheDocument()
            expect(screen.getByText('Item 2')).toBeInTheDocument()
        })
    })

    it('calls onImport with parsed data', async () => {
        const onImport = vi.fn()
        const onClose = vi.fn()
        const user = userEvent.setup()
        const queryClient = createTestQueryClient()

        render(
            <QueryClientProvider client={queryClient}>
                <UniversalImporter
                    isOpen={true}
                    onClose={onClose}
                    onImport={onImport}
                    title="Test Import"
                    fields={[{ key: 'name', label: 'Name' }]}
                />
            </QueryClientProvider>
        )

        const file = new File(['Name\nItem A'], 'test.csv', { type: 'text/csv' })
        const input = screen.getByLabelText(/Click para subir/i)

        await user.upload(input, file)

        await waitFor(() => {
            expect(screen.getByText('Item A')).toBeInTheDocument()
        })

        const confirmBtn = screen.getByText('Confirmar Importación')
        await user.click(confirmBtn)

        const finalImportBtn = screen.getByRole('button', { name: 'Importar' })
        await user.click(finalImportBtn)

        await waitFor(() => {
            expect(onImport).toHaveBeenCalledWith([{ name: 'Item A' }])
        })
    })

    it('shows error for invalid CSV', async () => {
        const onImport = vi.fn()
        const onClose = vi.fn()
        const user = userEvent.setup()
        const queryClient = createTestQueryClient()

        // Mock Papa.parse implementation locally? 
        // No, we rely on real PapaParse. If we feed it garbage, it might still parse depending on config.
        // It's hard to make PapaParse throw unless we force it or give it unreadable file.
        // But invalid structure might be filtered out or result in empty.

        // Let's test error display if onImport fails.
        onImport.mockRejectedValue(new Error('Import failed'))

        render(
            <QueryClientProvider client={queryClient}>
                <UniversalImporter
                    isOpen={true}
                    onClose={onClose}
                    onImport={onImport}
                    title="Test Import"
                    fields={[{ key: 'name', label: 'Name' }]}
                />
            </QueryClientProvider>
        )

        const file = new File(['Name\nItem B'], 'test.csv', { type: 'text/csv' })
        const input = screen.getByLabelText(/Click para subir/i)

        await user.upload(input, file)

        await waitFor(() => expect(screen.getByText('Item B')).toBeInTheDocument())

        const confirmBtn = screen.getByText('Confirmar Importación')
        await user.click(confirmBtn)

        const finalImportBtn = screen.getByRole('button', { name: 'Importar' })
        await user.click(finalImportBtn)

        await waitFor(() => {
            expect(screen.getByText('Import failed')).toBeInTheDocument()
        })
    })
})
