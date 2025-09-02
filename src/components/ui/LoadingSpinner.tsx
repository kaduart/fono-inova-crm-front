interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large';
    className?: string;
    color?: string; // cor da borda
}

export const LoadingSpinner = ({ size = 'medium', className = '', color = 'border-blue-600' }: LoadingSpinnerProps) => {
    const sizeClasses =
        size === 'small' ? 'h-4 w-4' :
            size === 'large' ? 'h-6 w-6' : // medium
                'h-5 w-5';

    return (
        <div className={`inline-block animate-spin rounded-full border-b-2 ${sizeClasses} ${color} ${className}`} />
    );
};
