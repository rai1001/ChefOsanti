import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: React.ReactNode;
    secondaryAction?: React.ReactNode;
    className?: string;
    compact?: boolean;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    secondaryAction,
    className = '',
    compact = false,
}: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-6 px-4' : 'py-12 px-4'} ${className}`}>
            {Icon && (
                <div className={`bg-brand-50 rounded-full ${compact ? 'p-2 mb-2' : 'p-4 mb-4'}`}>
                    <Icon className={`text-brand-500 ${compact ? 'w-5 h-5' : 'w-8 h-8'}`} />
                </div>
            )}
            <h3 className={`font-semibold text-slate-900 mb-1 ${compact ? 'text-sm' : 'text-lg'}`}>
                {title}
            </h3>
            {description && (
                <p className={`text-slate-500 max-w-sm ${compact ? 'text-xs mb-3' : 'mb-6'}`}>
                    {description}
                </p>
            )}
            <div className="flex flex-col sm:flex-row gap-3 items-center">
                {action}
                {secondaryAction}
            </div>
        </div>
    );
}
