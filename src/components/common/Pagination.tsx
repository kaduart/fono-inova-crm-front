import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    /** Classe Tailwind de cor do dot ativo (ex.: 'bg-amber-500'). Default: indigo. */
    accentClassName?: string;
    className?: string;
}

// Acima disso os dots viram ruído visual (e sem serventia — ninguém "conta"
// posição em 30 bolinhas). Cai pro texto "Página X de Y" nesse caso.
const MAX_DOTS = 8;

export function Pagination({ page, totalPages, onPageChange, accentClassName = 'bg-indigo-500', className = '' }: PaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <div className={`flex items-center justify-between gap-3 ${className}`}>
            <button
                type="button"
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent"
            >
                <ChevronLeft size={14} />
                Anterior
            </button>

            {totalPages <= MAX_DOTS ? (
                <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onPageChange(i + 1)}
                            aria-label={`Ir para página ${i + 1}`}
                            aria-current={i + 1 === page ? 'page' : undefined}
                            className={`h-1.5 rounded-full transition-all ${i + 1 === page ? `w-4 ${accentClassName}` : 'w-1.5 bg-gray-200 hover:bg-gray-300'}`}
                        />
                    ))}
                </div>
            ) : (
                <span className="text-xs font-semibold text-gray-500">
                    Página {page} de {totalPages}
                </span>
            )}

            <button
                type="button"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent"
            >
                Próxima
                <ChevronRight size={14} />
            </button>
        </div>
    );
}

export default Pagination;
