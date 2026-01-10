import React from 'react';
import type { FieldError } from 'react-hook-form';

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: FieldError | undefined;
    id: string; // id is required for accessibility
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
    ({ label, error, id, className = '', ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1.5 w-full">
                <label
                    htmlFor={id}
                    className="text-sm font-medium text-slate-700"
                >
                    {label}
                </label>
                <input
                    ref={ref}
                    id={id}
                    className={`
            flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50
            ${error ? 'border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${id}-error` : undefined}
                    {...props}
                />
                {error && (
                    <span
                        id={`${id}-error`}
                        className="text-sm text-red-500"
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
