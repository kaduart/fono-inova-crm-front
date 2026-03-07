import { Box, LinearProgress, Skeleton } from '@mui/material';

interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large';
    className?: string;
    color?: string; // cor da borda
    fullPage?: boolean;
}

/**
 * LoadingSpinner padronizado com FinancialDashboard
 * Exibe LinearProgress + Skeleton cards
 */
export const LoadingSpinner = ({ 
    size = 'medium', 
    className = '', 
    color = 'border-blue-600',
    fullPage = true 
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

    // Versão compacta (circular) para casos específicos
    const sizeClasses =
        size === 'small' ? 'h-4 w-4' :
            size === 'large' ? 'h-6 w-6' :
                'h-5 w-5';

    return (
        <div className={`inline-block animate-spin rounded-full border-b-2 ${sizeClasses} ${color} ${className}`} />
    );
};

export default LoadingSpinner;
