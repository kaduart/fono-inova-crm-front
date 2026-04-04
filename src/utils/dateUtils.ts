/**
 * 🆕 Utilitários para lidar com datas do backend
 * 
 * O backend pode retornar datas como:
 * - String "YYYY-MM-DD" (formato antigo)
 * - String "2026-03-30T00:00:00.000Z" (ISO Date)
 * - Date object (após migração)
 */

/**
 * Converte uma data do backend para string YYYY-MM-DD
 */
export function toDateString(date: string | Date | undefined): string {
    if (!date) return '';
    
    if (typeof date === 'string') {
        // Se for ISO string, pega apenas a parte da data
        if (date.includes('T')) {
            return date.split('T')[0];
        }
        // Se já for YYYY-MM-DD, retorna como está
        return date;
    }
    
    if (date instanceof Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    return String(date);
}

/**
 * Converte uma data do backend para objeto Date
 */
export function toDate(date: string | Date | undefined): Date | null {
    if (!date) return null;
    
    if (date instanceof Date) {
        return new Date(date);
    }
    
    if (typeof date === 'string') {
        // Se for YYYY-MM-DD, cria data no timezone local
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = date.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        // Senão, deixa o construtor parser
        return new Date(date);
    }
    
    return null;
}

/**
 * Compara duas datas (ignorando hora)
 * Retorna true se forem a mesma data
 */
export function isSameDate(date1: string | Date | undefined, date2: string | Date | undefined): boolean {
    const d1 = toDateString(date1);
    const d2 = toDateString(date2);
    return d1 === d2 && d1 !== '';
}

/**
 * Formata data para exibição
 */
export function formatDateBR(date: string | Date | undefined): string {
    if (!date) return '';
    
    const d = toDate(date);
    if (!d) return '';
    
    return d.toLocaleDateString('pt-BR');
}
