import { AppError } from './errors';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMetadata {
    module?: string;
    operation?: string;
    orgId?: string;
    hotelId?: string;
    requestId?: string;
    [key: string]: any;
}

/**
 * Logger estructurado para ChefOS.
 * Integra metadatos y maneja AppError de forma nativa.
 */
class Logger {
    private isProd = import.meta.env.PROD;
    private sentryDsn = import.meta.env.VITE_SENTRY_DSN;

    info(message: string, metadata: LogMetadata = {}) {
        this.log('info', message, metadata);
    }

    warn(message: string, metadata: LogMetadata = {}) {
        this.log('warn', message, metadata);
    }

    error(message: string, error?: any, metadata: LogMetadata = {}) {
        let finalMetadata = { ...metadata };
        let finalMessage = message;

        if (AppError.is(error)) {
            finalMetadata = { ...finalMetadata, ...error.context, errorType: error.type };
            finalMessage = `${message}: ${error.message}`;
        } else if (error instanceof Error) {
            finalMetadata = { ...finalMetadata, stack: error.stack };
            finalMessage = `${message}: ${error.message}`;
        }

        this.log('error', finalMessage, finalMetadata);

        // Placeholder para Sentry
        if (this.isProd && this.sentryDsn) {
            // captureException(error, { extra: metadata })
        }
    }

    private log(level: LogLevel, message: string, metadata: LogMetadata) {
        const timestamp = new Date().toISOString();

        // En producción: JSON estructurado
        if (this.isProd) {
            console.log(JSON.stringify({
                timestamp,
                level,
                message,
                ...metadata
            }));
            return;
        }

        // En desarrollo: Formato legible para consola de navegador
        const styles = this.getStyles(level);
        const prefix = `[${level.toUpperCase()}]`;

        // Usamos %c para estilos, y pasamos la metadata como último argumento para que el navegador la formatee como objeto expandible
        console.log(`%c${prefix} ${message}`, styles, metadata);
    }

    private getStyles(level: LogLevel): string {
        switch (level) {
            case 'info': return 'color: #10B981; font-weight: bold;'; // Emerald-500
            case 'warn': return 'color: #F59E0B; font-weight: bold;'; // Amber-500
            case 'error': return 'color: #EF4444; font-weight: bold;'; // Red-500
            default: return 'color: inherit;';
        }
    }
}

export const logger = new Logger();
