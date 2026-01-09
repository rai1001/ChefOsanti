import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '@/lib/shared/logger';
import { AppError } from '@/lib/shared/errors';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    module?: string;
}

interface State {
    hasError: boolean;
    error: any;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: any): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: any, errorInfo: ErrorInfo) {
        logger.error('Error capturado por ErrorBoundary', error, {
            module: this.props.module || 'ErrorBoundary',
            componentStack: errorInfo.componentStack,
        });
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const isAppError = AppError.is(this.state.error);
            const title = isAppError ? this.getAppErrorTitle(this.state.error.type) : 'Algo ha salido mal';
            const message = this.state.error?.message || 'Se ha producido un error inesperado.';

            return (
                <div className="flex min-h-[200px] w-full items-center justify-center p-6">
                    <div className="glass-panel max-w-md w-full p-6 text-center border-red-500/20 shadow-lg shadow-red-500/10">
                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
                        <p className="text-sm text-slate-400 mb-6">{message}</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => window.location.reload()}
                                className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 transition-all"
                            >
                                Recargar página
                            </button>
                            <button
                                onClick={this.handleRetry}
                                className="rounded-md bg-nano-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-nano-blue-500 transition-all"
                            >
                                Reintentar
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }

    private getAppErrorTitle(type: string): string {
        switch (type) {
            case 'NetworkError': return 'Error de conexión';
            case 'ValidationError': return 'Datos inválidos';
            case 'NotFoundError': return 'No encontrado';
            case 'AuthError': return 'Sesión expirada';
            case 'ConflictError': return 'Conflicto de datos';
            default: return 'Error del sistema';
        }
    }
}
