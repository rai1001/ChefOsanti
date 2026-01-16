import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
    return (
        <SonnerToaster
            position="top-right"
            toastOptions={{
                classNames: {
                    toast: 'group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-950 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-lg',
                    description: 'group-[.toast]:text-slate-500',
                    actionButton: 'group-[.toast]:bg-brand-500 group-[.toast]:text-white',
                    cancelButton: 'group-[.toast]:bg-slate-100 group-[.toast]:text-slate-500',
                    error: 'group-[.toaster]:text-red-600 group-[.toaster]:bg-red-50 group-[.toaster]:border-red-100',
                    success: 'group-[.toaster]:text-green-600 group-[.toaster]:bg-green-50 group-[.toaster]:border-green-100',
                },
            }}
        />
    );
}

// Re-export toast for convenience
