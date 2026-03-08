// Componente de loading padronizado para as tabs do FinancialDashboard
// Baseado no design do VisaoGeralEstrategicaTab

import { Box, Grid, LinearProgress, Skeleton } from '@mui/material';

interface FinancialLoadingProps {
    /** Número de skeleton cards a exibir (padrão: 4) */
    cardCount?: number;
    /** Altura dos cards de skeleton (padrão: 140) */
    cardHeight?: number;
    /** Se deve mostrar o LinearProgress (padrão: true) */
    showProgress?: boolean;
    /** Tamanho do grid para os cards (padrão: { xs: 12, sm: 6, md: 3 }) */
    gridSize?: {
        xs?: number;
        sm?: number;
        md?: number;
        lg?: number;
    };
    /** Margem superior (padrão: 2) */
    marginTop?: number;
}

/**
 * Componente de loading padronizado para o FinancialDashboard.
 * Exibe um LinearProgress na parte superior seguido de Skeletons em grid.
 * 
 * @example
 * // Uso básico
 * {loading && <FinancialLoading />}
 * 
 * // Personalizado
 * {loading && <FinancialLoading cardCount={6} cardHeight={160} />}
 * 
 * // Grid customizado
 * {loading && (
 *   <FinancialLoading 
 *     cardCount={6} 
 *     gridSize={{ xs: 6, sm: 6, md: 4, lg: 2 }}
 *   />
 * )}
 */
export const FinancialLoading = ({
    cardCount = 4,
    cardHeight = 140,
    showProgress = true,
    gridSize = { xs: 12, sm: 6, md: 3 },
    marginTop = 2
}: FinancialLoadingProps) => {
    return (
        <Box sx={{ mt: marginTop }}>
            {showProgress && (
                <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />
            )}
            <Grid container spacing={2}>
                {Array.from({ length: cardCount }, (_, i) => (
                    <Grid 
                        item
                        xs={gridSize.xs || 12}
                        sm={gridSize.sm || 6}
                        md={gridSize.md || 3}
                        lg={gridSize.lg}
                        key={i}
                    >
                        <Skeleton 
                            variant="rectangular" 
                            height={cardHeight} 
                            sx={{ borderRadius: 2 }} 
                        />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

/**
 * Variante compacta para tabelas ou espaços menores
 */
export const FinancialLoadingCompact = () => (
    <Box sx={{ p: 4, textAlign: 'center' }}>
        <LinearProgress sx={{ maxWidth: 400, mx: 'auto', borderRadius: 1 }} />
    </Box>
);

/**
 * Variante para telas com muitos cards (dashboard executivo)
 */
export const FinancialLoadingDashboard = () => (
    <FinancialLoading 
        cardCount={6} 
        gridSize={{ xs: 6, sm: 6, md: 4, lg: 2 }}
    />
);

/**
 * Variante para tabelas com skeleton de linhas
 */
interface TableLoadingProps {
    rowCount?: number;
    colSpan?: number;
}

export const FinancialTableLoading = ({ rowCount = 5, colSpan = 6 }: TableLoadingProps) => (
    <Box sx={{ py: 4 }}>
        <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />
        {Array.from({ length: rowCount }, (_, i) => (
            <Skeleton 
                key={i}
                variant="rectangular" 
                height={50} 
                sx={{ 
                    borderRadius: 1, 
                    mb: 1,
                    mx: 2
                }} 
            />
        ))}
    </Box>
);

export default FinancialLoading;
