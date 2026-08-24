import React, { ForwardedRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'secondary' | 'ghost' | 'danger';
}

const variantClasses = {
    primary: 'border-transparent bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500',
    outline: 'border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50 focus:ring-emerald-500',
    secondary: 'border-gray-200 bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-400',
    ghost: 'border-transparent bg-transparent text-gray-700 shadow-none hover:bg-gray-100 focus:ring-emerald-500',
    danger: 'border-transparent bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
};

export const Button = React.forwardRef((
    { children, variant = 'primary', className = '', ...props }: ButtonProps,
    ref: ForwardedRef<HTMLButtonElement>
) => (
    <button
        className={`inline-flex min-h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
        {...props}
    >
        {children}
    </button>
));
