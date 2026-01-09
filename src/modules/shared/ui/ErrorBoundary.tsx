import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { logger } from '@/lib/shared/logger'

interface Props {
    children?: ReactNode
    fallback?: ReactNode
    module?: string
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error(`Uncaught error in ErrorBoundary [${this.props.module || 'Global'}]`, error, {
            componentStack: errorInfo.componentStack,
            module: this.props.module
        })
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
                    <div className="mb-4 rounded-full bg-rose-500/10 p-4">
                        <AlertTriangle className="h-8 w-8 text-rose-500" />
                    </div>
                    <h2 className="mb-2 text-xl font-bold text-white">Algo salió mal</h2>
                    <p className="mb-6 max-w-md text-slate-400">
                        Se ha producido un error inesperado en la aplicación.
                        El equipo técnico ha sido notificado.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-2 rounded-lg bg-nano-blue-600 px-6 py-2.5 font-semibold text-white transition hover:bg-nano-blue-500"
                    >
                        <RefreshCcw className="h-4 w-4" />
                        Recargar aplicación
                    </button>

                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-8 max-w-2xl overflow-auto rounded-lg bg-slate-900 p-4 text-left font-mono text-xs text-rose-300">
                            {this.state.error?.toString()}
                        </div>
                    )}
                </div>
            )
        }

        return this.props.children
    }
}
