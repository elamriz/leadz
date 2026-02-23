import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', label, error, icon, ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-1.5">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`input-modern ${icon ? 'pl-10' : ''} ${error ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : ''
                            } ${className}`}
                        {...props}
                    />
                </div>
                {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';
