import React from 'react';
import type { FieldError } from 'react-hook-form';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: FieldError | undefined;
    id: string; // id is required for accessibility
    children?: React.ReactNode;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
    ({ label, error, id, className = '', children, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1.5 w-full">
                <label
                    htmlFor={id}
                    className="text-sm font-medium text-muted-foreground"
                >
                    {label}
                </label>
                {children ? (
                    children
                ) : (
                    <input
                        ref={ref}
                        id={id}
                        className={`
            flex h-10 w-full rounded-md border border-border/40 bg-surface2 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground 
            focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50
            ${error ? 'border-danger focus:ring-danger' : ''}
            ${className}
          `}
                        aria-invalid={!!error}
                        aria-describedby={error ? `${id}-error` : undefined}
                        {...props}
                    />
                )}
                {error && (
                    <span
                        id={`${id}-error`}
                        className="text-sm text-danger"
                        role="alert"
                    >
                        {error.message}
                    </span>
                )}
            </div>
        );
    }
);

FormField.displayName = 'FormField';
