import { getSupabaseClient } from '@/lib/supabaseClient';
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

    private async pushToSupabase(level: LogLevel, message: string, metadata: LogMetadata) {
        if (!metadata.orgId) return;

        try {
            const supabase = getSupabaseClient();
            await supabase.rpc('log_event', {
                p_org_id: metadata.orgId,
                p_level: level,
                p_event: message.substring(0, 100),
                p_metadata: { ...metadata, full_message: message }
            });
        } catch (e) {
            // No hacer log infinito si falla Supabase
            if (!this.isProd) console.warn('Failed to push log to Supabase', e);
        }
    }

    private log(level: LogLevel, message: string, metadata: LogMetadata) {
        const timestamp = new Date().toISOString();

        // Push to DB for serious issues or prod tracking
        if (level === 'error' || level === 'warn' || this.isProd) {
            this.pushToSupabase(level, message, metadata);
        }

        // Production: structured JSON for cloud logging
        if (this.isProd) {
            console.log(JSON.stringify({
                timestamp,
                level,
                message,
                ...metadata
            }));
            return;
        }

        // Development: readable console format
        const styles = this.getStyles(level);
        const prefix = `[${level.toUpperCase()}]`;
        console.log(`%c${prefix} ${message}`, styles, metadata);
    }

    private getStyles(level: LogLevel): string {
        switch (level) {
            case 'info': return 'color: #10B981; font-weight: bold;';
            case 'warn': return 'color: #F59E0B; font-weight: bold;';
            case 'error': return 'color: #EF4444; font-weight: bold;';
            default: return 'color: inherit;';
        }
    }
}

export const logger = new Logger();
