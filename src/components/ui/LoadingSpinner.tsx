import { Box, LinearProgress, Skeleton } from '@mui/material';

interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large';
    className?: string;
    color?: string;
    fullPage?: boolean;
    centered?: boolean;
}

// Spinner simples girando — para botões e inline
export const LoadingSpinner = ({
    size = 'medium',
    className = '',
    color = 'border-blue-600',
    fullPage = false,
    centered = false,
}: LoadingSpinnerProps) => {
    if (fullPage) {
        return (
            <Box sx={{
                p: { xs: 2, md: 4 },
                minHeight: '60vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
            }}>
                <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton
                            key={i}
                            variant="rectangular"
                            height={120}
                            width={280}
                            sx={{ borderRadius: 2 }}
                        />
                    ))}
                </Box>
            </Box>
        );
    }

    const sizeClass =
        size === 'small' ? 'h-4 w-4 border-2' :
        size === 'large' ? 'h-8 w-8 border-4' :
                           'h-5 w-5 border-2';

    const spinner = (
        <div className={`animate-spin rounded-full border-t-transparent ${sizeClass} ${color} ${centered ? '' : className}`} />
    );

    if (centered) {
        return (
            <div className={`flex items-center justify-center ${className}`}>
                {spinner}
            </div>
        );
    }

    return spinner;
};

// Spinner de modal — centralizado na área de conteúdo, sem padding excessivo
export const ModalSpinner = ({ color = 'border-blue-500' }: { color?: string }) => (
    <div className="flex items-center justify-center w-full h-full min-h-[80px]">
        <div className={`animate-spin rounded-full h-7 w-7 border-4 border-t-transparent ${color}`} />
    </div>
);

export default LoadingSpinner;
