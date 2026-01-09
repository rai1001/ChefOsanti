export type AppErrorType =
    | 'NotFound'
    | 'ValidationError'
    | 'NetworkError'
    | 'AuthError'
    | 'ConflictError'
    | 'UnknownError'

export interface UserMessage {
    title: string
    description: string
    action?: string
}

export const errorMessages: Record<AppErrorType, UserMessage> = {
    NotFound: {
        title: 'No encontrado',
        description: 'El recurso solicitado no existe o no tienes acceso',
        action: 'Verifica la URL o contacta soporte',
    },
    ValidationError: {
        title: 'Datos inválidos',
        description: 'Los datos ingresados no cumplen los requisitos',
        action: 'Revisa los campos marcados en rojo',
    },
    NetworkError: {
        title: 'Error de conexión',
        description: 'No se pudo conectar con el servidor',
        action: 'Verifica tu conexión a internet e intenta de nuevo',
    },
    AuthError: {
        title: 'Sesión expirada',
        description: 'Tu sesión ha caducado por seguridad',
        action: 'Por favor, inicia sesión nuevamente',
    },
    ConflictError: {
        title: 'Registro duplicado',
        description: 'Este recurso ya existe en el sistema',
        action: 'Usa un identificador diferente',
    },
    UnknownError: {
        title: 'Error inesperado',
        description: 'Algo salió mal. El equipo técnico ha sido notificado',
        action: 'Si persiste, contacta soporte con el código de error',
    },
}

export function getUserMessage(error: any): UserMessage {
    if (!error) {
        return errorMessages.UnknownError
    }

    // Check if error has a known specific type property
    if (error.type && error.type in errorMessages) {
        return errorMessages[error.type as AppErrorType]
    }

    // Handle common error patterns
    if (error.message?.includes('Network Error')) {
        return errorMessages.NetworkError
    }
    if (error.code === 'PGRST116') {
        // Supabase: The result contains 0 rows
        return errorMessages.NotFound
    }
    if (error.code === '23505') {
        // Postgres unique violation
        return errorMessages.ConflictError
    }

    // Fallback
    return errorMessages.UnknownError
}

export function getErrorTitle(error: any): string {
    return getUserMessage(error).title
}

export function getErrorDescription(error: any): string {
    return getUserMessage(error).description
}

export function getErrorAction(error: any): string | undefined {
    return getUserMessage(error).action
}
