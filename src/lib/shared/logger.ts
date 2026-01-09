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
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

        // En desarrollo usamos colores y formato legible
        if (!this.isProd) {
            const color = this.getLevelColor(level);
            console.log(`${color}${prefix} ${message}%c`, 'color: inherit', metadata);
            return;
        }

        // En producción (log estructurado JSON para sistemas de observabilidad)
        console.log(JSON.stringify({
            timestamp,
            level,
            message,
            ...metadata
        }));
    }

    private getLevelColor(level: LogLevel): string {
        switch (level) {
            case 'info': return '\x1b[32m'; // Verde
            case 'warn': return '\x1b[33m'; // Amarillo
            case 'error': return '\x1b[31m'; // Rojo
            default: return '\x1b[0m';    // Reset
        }
    }
}

export const logger = new Logger();
