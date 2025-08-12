// components/ui/LoadingOverlay.tsx
import { LoadingSpinner } from './LoadingSpinner';

export const LoadingOverlay = ({ show }: { show: boolean }) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50">
            <LoadingSpinner size="large" />
            <span className="ml-3 text-lg font-medium text-gray-700">Carregando...</span>
        </div>
    );
};