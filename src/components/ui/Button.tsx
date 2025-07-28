import React, { ForwardedRef } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'secondary' | 'ghost';
}

export const Button = React.forwardRef((
    { children, variant = 'primary', className = '', ...props }: ButtonProps,
    ref: ForwardedRef<HTMLButtonElement>
) => (
    <button
        className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${variant === 'primary'
            ? 'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            : variant === 'outline'
                ? 'text-blue-600 border-blue-600 hover:bg-blue-50 focus:ring-blue-500'
                : 'text-blue-600 border-blue-600 hover:bg-blue-50 focus:ring-blue-500'
            } ${className}`}
        {...props}
    >
        {children}
    </button>
));