/**
 * Tipos de error específicos para la aplicación ChefOS.
 * Basado en unión discriminada para manejo exhaustivo.
 */

export type AppErrorType =
    | 'NetworkError'
    | 'ValidationError'
    | 'NotFoundError'
    | 'AuthError'
    | 'ConflictError'
    | 'UnknownError';

export interface AppErrorContext {
    module?: string;
    operation?: string;
    orgId?: string;
    hotelId?: string;
    originalError?: any;
    [key: string]: any;
}

export class AppError extends Error {
    readonly type: AppErrorType;
    readonly context: AppErrorContext;

    constructor(type: AppErrorType, message: string, context: AppErrorContext = {}) {
        super(message);
        this.name = 'AppError';
        this.type = type;
        this.context = context;

        // Asegurar que el prototipo sea correcto para instanceof
        Object.setPrototypeOf(this, AppError.prototype);
    }

    static is(error: any): error is AppError {
        return error instanceof AppError;
    }
}

/**
 * Mapea errores de Supabase/Postgrest a tipos AppError coherentes.
 */
export function mapSupabaseError(error: any, context: AppErrorContext = {}): AppError {
    if (!error) return new AppError('UnknownError', 'Error desconocido', context);

    const { code, message, details, hint } = error;
    const fullContext = { ...context, code, details, hint, originalError: error };

    // Códigos comunes de Postgrest: https://postgrest.org/en/stable/errors.html
    // Códigos comunes de Postgres: https://www.postgresql.org/docs/current/errcodes-appendix.html

    switch (code) {
        case 'PGRST116': // JSON object requested, but no rows returned (single())
            return new AppError('NotFoundError', message || 'Recurso no encontrado', fullContext);

        case '23505': // Unique violation
            return new AppError('ConflictError', 'El recurso ya existe', fullContext);

        case '23503': // Foreign key violation
            return new AppError('ValidationError', 'Referencia inexistente', fullContext);

        case '42P01': // Undefined table
            return new AppError('UnknownError', 'Error de configuración de base de datos', fullContext);

        case 'PGRST301': // JWT expired (often AuthError)
        case '401':
            return new AppError('AuthError', 'No autorizado o sesión expirada', fullContext);

        case 'PGRST102': // Invalid search criteria
        case '22P02':    // Invalid text representation (tipo de dato incorrecto)
            return new AppError('ValidationError', 'Datos de búsqueda inválidos', fullContext);

        default:
            // Si el status es 404 pero no tiene código específico
            if (error.status === 404) {
                return new AppError('NotFoundError', message || 'No encontrado', fullContext);
            }

            return new AppError('UnknownError', message || 'Error inesperado de datos', fullContext);
    }
}
