// components/ui/LoadingSpinner.tsx
export const LoadingSpinner = ({ size = 'medium', message = 'Carregando...' }) => {
    return (
        <div className="flex items-center justify-center p-4">
            <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${size === 'small' ? 'h-4 w-4' :
                    size === 'large' ? 'h-8 w-8' : 'h-6 w-6'
                }`} />
            {message && <span className="ml-2 text-gray-600">{message}</span>}
        </div>
    );
};