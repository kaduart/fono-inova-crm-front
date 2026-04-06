import { Box, Skeleton, Card, CardContent } from '@mui/material';

interface FinancialLoadingProps {
    cardCount?: number;
}

export const FinancialLoading = ({ cardCount = 4 }: FinancialLoadingProps) => {
    return (
        <Box sx={{ p: 2 }}>
            {/* Header skeleton */}
            <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
            
            {/* Cards grid */}
            <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: `repeat(${Math.min(cardCount, 4)}, 1fr)` },
                gap: 2,
                mb: 3
            }}>
                {[...Array(cardCount)].map((_, i) => (
                    <Card key={i}>
                        <CardContent>
                            <Skeleton variant="text" width="60%" height={24} />
                            <Skeleton variant="text" width="80%" height={40} sx={{ mt: 1 }} />
                            <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
                        </CardContent>
                    </Card>
                ))}
            </Box>
            
            {/* Content skeleton */}
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
        </Box>
    );
};

export default FinancialLoading;
