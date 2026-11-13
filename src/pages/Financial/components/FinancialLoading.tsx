// Componente de loading padronizado para as tabs do FinancialDashboard


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
    gridSize = { xs: 12, sm: 6, md: 3 },
    marginTop = 2
}: FinancialLoadingProps) => {
    const cols = gridSize.md && gridSize.md <= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2';
    return (
        <div className="animate-pulse" style={{ marginTop: marginTop * 8 }} aria-busy="true" aria-label="Carregando">
            <div className={`grid grid-cols-1 gap-3 ${cols}`}>
                {Array.from({ length: cardCount }, (_, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700" style={{ minHeight: Math.min(cardHeight, 120) }}>
                        <div className="h-3 w-24 rounded bg-gray-200/80 dark:bg-gray-700/60" />
                        <div className="mt-3 h-7 w-32 rounded bg-gray-200/80 dark:bg-gray-700/60" />
                        <div className="mt-3 h-3 w-4/5 rounded bg-gray-200/80 dark:bg-gray-700/60" />
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * Variante compacta para tabelas ou espaços menores
 */
export const FinancialLoadingCompact = () => (
    <div className="animate-pulse space-y-2 p-6" aria-busy="true" aria-label="Carregando">
        <div className="mx-auto h-3 w-1/2 max-w-sm rounded bg-gray-200/80 dark:bg-gray-700/60" />
        <div className="mx-auto h-3 w-1/3 max-w-xs rounded bg-gray-200/80 dark:bg-gray-700/60" />
    </div>
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

export const FinancialTableLoading = ({ rowCount = 5 }: TableLoadingProps) => (
    <div className="animate-pulse space-y-2 px-2 py-4" aria-busy="true" aria-label="Carregando">
        {Array.from({ length: rowCount }, (_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                <div className="h-4 w-16 rounded bg-gray-200/80 dark:bg-gray-700/60" />
                <div className="h-4 flex-1 rounded bg-gray-200/80 dark:bg-gray-700/60" />
                <div className="h-5 w-20 rounded-full bg-gray-200/80 dark:bg-gray-700/60" />
            </div>
        ))}
    </div>
);

export default FinancialLoading;
