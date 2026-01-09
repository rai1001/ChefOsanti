import { useCallback } from 'react'
import { AppError } from './errors'

export function useFormattedError() {
    const formatError = useCallback((error: unknown): { title: string; description: string; variant: 'destructive' | 'default' } => {
        if (error instanceof AppError) {
            if (error.type === 'AuthError') {
                return {
                    title: 'Sesión expirada',
                    description: 'Por favor, inicia sesión nuevamente.',
                    variant: 'destructive',
                }
            }

            if (error.type === 'NetworkError') {
                return {
                    title: 'Error de conexión',
                    description: 'Verifica tu conexión a internet.',
                    variant: 'destructive',
                }
            }

            if (error.type === 'ValidationError') {
                return {
                    title: 'Datos inválidos',
                    description: error.message || 'Revisa los datos ingresados.',
                    variant: 'destructive',
                }
            }

            if (error.type === 'ConflictError') {
                return {
                    title: 'Operación no permitida',
                    description: error.message || 'Esta acción viola una restricción del sistema (ej: duplicados).',
                    variant: 'destructive',
                }
            }

            return {
                title: 'Error',
                description: error.message || 'Ocurrió un error inesperado.',
                variant: 'destructive',
            }
        }

        if (error instanceof Error) {
            return {
                title: 'Error inesperado',
                description: error.message,
                variant: 'destructive',
            }
        }

        return {
            title: 'Error desconocido',
            description: 'Ha ocurrido un error desconocido.',
            variant: 'destructive',
        }
    }, [])

    return { formatError }
}
