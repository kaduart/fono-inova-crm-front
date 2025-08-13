type LoadingSpinnerProps = {
    size?: 'small' | 'medium' | 'large';
    message?: string;
    isLoading?: boolean;
    overlay?: boolean;
};

export const LoadingSpinner = ({
    size = 'medium',
    message = '',
    isLoading = false,
    overlay = false
}: LoadingSpinnerProps) => {
    if (!isLoading) return null;

    const spinnerSize = {
        small: 'h-4 w-4',
        medium: 'h-6 w-6',
        large: 'h-8 w-8'
    }[size];

    return (
        <div className={`flex flex-col items-center justify-center ${overlay ? 'bg-black bg-opacity-20 absolute inset-0' : ''}`}>
            <div className={`animate-spin rounded-full border-2 border-transparent border-b-blue-600 ${spinnerSize}`} />
            {message && <span className="mt-2 text-white">{message}</span>}
        </div>
    );
};