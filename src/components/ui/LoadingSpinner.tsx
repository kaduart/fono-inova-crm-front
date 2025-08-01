// components/ui/LoadingSpinner.tsx
import { ReactNode } from 'react';

type LoadingSpinnerProps = {
    size?: 'small' | 'medium' | 'large';
    message?: string;
    isLoading?: boolean;
    children?: ReactNode;
    overlay?: boolean;
};

export const LoadingSpinner = ({
    size = 'medium',
    message = 'Carregando...',
    isLoading = false,
    children,
    overlay = true
}: LoadingSpinnerProps) => {
    if (!isLoading) return <>{children}</>;

    return (
        <div className="relative">
            {children && (
                <div className={overlay ? 'opacity-50 pointer-events-none' : ''}>
                    {children}
                </div>
            )}

            <div className={`flex items-center justify-center ${overlay ? 'absolute inset-0 z-50' : ''}`}>
                <div
                    className={`animate-spin rounded-full border-b-2 border-blue-600 ${size === 'small' ? 'h-4 w-4' :
                            size === 'large' ? 'h-8 w-8' : 'h-6 w-6'
                        }`}
                />
                {message && <span className="ml-2 text-gray-600">{message}</span>}
            </div>
        </div>
    );
};