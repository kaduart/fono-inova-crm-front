import { LoadingSpinner } from './LoadingSpinner';

interface LoadingOverlayProps {
    show: boolean;
    zIndex?: number;
    spinnerSize?: 'small' | 'medium' | 'large';
    message?: string;
}

export const LoadingOverlay = ({
    show,
    zIndex = 100001,
    spinnerSize = 'medium',
    message = 'Carregando...'
}: LoadingOverlayProps) => {
    if (!show) return null;

    return (
        <div
            style={{ zIndex }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
        >
            <LoadingSpinner
                size={spinnerSize}
                message={message}
                isLoading={true}
                overlay={false} // Desativa o overlay interno do Spinner
            />
        </div>
    );
};