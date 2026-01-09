import { AlertCircle } from 'lucide-react'
import { getUserMessage } from '@/lib/shared/userMessages'

interface ErrorMessageProps {
    error: any
    className?: string
}

export function ErrorMessage({ error, className = '' }: ErrorMessageProps) {
    if (!error) return null

    const message = getUserMessage(error)

    return (
        <div className={`rounded-lg border border-red-500/10 bg-red-500/5 p-4 ${className}`}>
            <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-red-500">{message.title}</h3>
                    <p className="text-sm text-red-400/90">{message.description}</p>
                    {message.action && (
                        <p className="text-xs text-red-400/75 mt-2 font-medium">
                            💡 {message.action}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
