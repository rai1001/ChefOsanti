import { describe, expect, it, vi, afterEach } from 'vitest'
import { parseCSV } from './csvParser'
import Papa from 'papaparse'

// Mock de papaparse
vi.mock('papaparse', () => ({
    default: {
        parse: vi.fn()
    }
}))

describe('csvParser', () => {
    afterEach(() => {
        vi.clearAllMocks()
    })

    it('debe parsear un archivo CSV correctamente y normalizar headers', async () => {
        const mockFile = new File(['header1,Header 2\nval1,Val 2'], 'test.csv', { type: 'text/csv' })

        // Simular implementación de Papa.parse
        const executeParse = (_file: any, config: any) => {
            config.complete({
                data: [
                    { 'header1': 'val1', 'Header 2': 'Val 2' }
                ],
                errors: []
            })
        }

        // cast to any for mock manipulation
        (Papa.parse as any).mockImplementation(executeParse)

        const result = await parseCSV(mockFile)

        expect(result).toHaveLength(1)
        expect(result[0]).toEqual({
            'header1': 'val1',
            'header 2': 'Val 2' // Comprobar normalización a lowercase/trim
        })
    })

    it('debe manejar errores de parsing', async () => {
        const mockFile = new File([''], 'empty.csv')

        const executeParse = (_file: any, config: any) => {
            config.error(new Error('Parse error'))
        }

        (Papa.parse as any).mockImplementation(executeParse)

        await expect(parseCSV(mockFile)).rejects.toThrow('Parse error')
    })

    it('debe manejar filas con columnas extra o inconsistencias suavemente', async () => {
        // Si parseCSV se traga errores de validación de formato (como dice el comentario en código)
        // verificamos que resuelva con data aunque haya warnings en errors
        const mockFile = new File(['a,b\n1'], 'bad.csv')

        const executeParse = (_file: any, config: any) => {
            config.complete({
                data: [{ 'a': '1' }],
                errors: [{ message: 'Too few fields' }]
            })
        }

        (Papa.parse as any).mockImplementation(executeParse)

        const result = await parseCSV(mockFile)
        expect(result).toHaveLength(1)
        expect(result[0]).toEqual({ 'a': '1' })
    })
})
