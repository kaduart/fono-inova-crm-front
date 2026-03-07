import { Box } from '@mui/material';
import { FinancialLoading } from '../../pages/Financial/components/FinancialLoading';

interface LoadingOverlayProps {
    show: boolean;
    zIndex?: number;
    message?: string;
}

export const LoadingOverlay = ({
    show,
    zIndex = 100001,
    message = 'Carregando...'
}: LoadingOverlayProps) => {
    if (!show) return null;

    return (
        <Box
            sx={{
                position: 'fixed',
                inset: 0,
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex
            }}
        >
            <Box
                sx={{
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    p: 4,
                    width: '100%',
                    maxWidth: 800,
                    mx: 2
                }}
            >
                <Box sx={{ mb: 2, textAlign: 'center' }}>
                    <Box component="span" sx={{ fontSize: '1.1rem', fontWeight: 500 }}>
                        {message}
                    </Box>
                </Box>
                <FinancialLoading cardCount={4} gridSize={{ xs: 12, sm: 6 }} showProgress={true} />
            </Box>
        </Box>
    );
};
