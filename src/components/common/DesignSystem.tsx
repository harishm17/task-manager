import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
// eslint-disable-next-line react-refresh/only-export-components
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Button ---
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
        const variants: Record<ButtonVariant, string> = {
            primary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm active:scale-[0.98]',
            secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:scale-[0.98]',
            ghost: 'bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            danger: 'bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-100',
            outline: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900',
        };

        const sizes: Record<ButtonSize, string> = {
            sm: 'h-8 px-3 text-xs',
            md: 'h-10 px-4 py-2 text-sm',
            lg: 'h-12 px-6 text-base',
            icon: 'h-9 w-9 p-0 flex items-center justify-center',
        };

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    'inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {isLoading ? (
                    <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                ) : null}
                {children}
            </button>
        );
    }
);
Button.displayName = 'Button';

// --- Card ---
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md',
                className
            )}
            {...props}
        />
    )
);
Card.displayName = 'Card';

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, id, ...props }, ref) => {
        const generatedId = React.useId();
        const inputId = id || generatedId;
        return (
            <div className="space-y-1.5">
                {label && (
                    <label htmlFor={inputId} className="text-xs font-semibold text-slate-700 ml-1">
                        {label}
                    </label>
                )}
                <input
                    id={inputId}
                    ref={ref}
                    className={cn(
                        'flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 transition-all',
                        error && 'border-rose-300 focus:border-rose-400 focus:ring-rose-50',
                        className
                    )}
                    {...props}
                />
                {error && <p className="text-xs text-rose-600 ml-1">{error}</p>}
            </div>
        );
    }
);
Input.displayName = 'Input';

// --- Select ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, label, error, id, children, ...props }, ref) => {
        const generatedId = React.useId();
        const selectId = id || generatedId;
        return (
            <div className="space-y-1.5">
                {label && (
                    <label htmlFor={selectId} className="text-xs font-semibold text-slate-700 ml-1">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        id={selectId}
                        ref={ref}
                        className={cn(
                            'flex h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50 transition-all',
                            error && 'border-rose-300 focus:border-rose-400 focus:ring-rose-50',
                            className
                        )}
                        {...props}
                    >
                        {children}
                    </select>
                    {/* Custom Chevron */}
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 8L10 12L14 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>
                {error && <p className="text-xs text-rose-600 ml-1">{error}</p>}
            </div>
        );
    }
);
Select.displayName = 'Select';

// --- Badge ---
type BadgeVariant = 'slate' | 'emerald' | 'amber' | 'rose' | 'ocean';

export const Badge = ({
    className,
    variant = 'slate',
    children,
    ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) => {
    const variants: Record<BadgeVariant, string> = {
        slate: 'bg-slate-100 text-slate-700 border-slate-200',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        rose: 'bg-rose-50 text-rose-700 border-rose-200',
        ocean: 'bg-sky-50 text-sky-700 border-sky-200',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors',
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </span>
    );
};

// --- Avatar ---
export const Avatar = ({
    name,
    src,
    size = 'md',
    className,
}: {
    name: string;
    src?: string | null;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}) => {
    const sizes = {
        sm: 'h-6 w-6 text-[10px]',
        md: 'h-9 w-9 text-xs',
        lg: 'h-12 w-12 text-sm',
    };

    const initial = name ? name[0].toUpperCase() : '?';

    return (
        <div
            className={cn(
                'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 border border-white shadow-sm ring-1 ring-slate-100',
                sizes[size],
                className
            )}
            title={name}
        >
            {src ? (
                <img src={src} alt={name} className="h-full w-full object-cover" />
            ) : (
                <span className="font-semibold text-slate-600">{initial}</span>
            )}
        </div>
    );
};
