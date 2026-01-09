import { useMemo } from 'react'
import { AppError } from '@/lib/shared/errors'

export function formatErrorMessage(error: unknown): string {
    if (!error) return ''

    if (error instanceof AppError) {
        switch (error.type) {
            case 'NetworkError':
                return 'Error de conexión. Por favor verifica tu internet.'
            case 'ValidationError':
                return `Datos inválidos: ${error.message}`
            case 'NotFoundError':
                return 'No se encontró el recurso solicitado.'
            case 'AuthError':
                return 'No tienes permisos o tu sesión ha expirado.'
            case 'ConflictError':
                return 'Conflicto de datos: el recurso ya existe o fue modificado.'
            case 'UnknownError':
                return `Error inesperado: ${error.message}`
            default:
                return error.message
        }
    }

    if (error instanceof Error) {
        return error.message
    }

    if (typeof error === 'string') {
        return error
    }

    return 'Ha ocurrido un error desconocido.'
}

export function useFormattedError(error: unknown): string | null {
    return useMemo(() => {
        if (!error) return null
        return formatErrorMessage(error)
    }, [error])
}
