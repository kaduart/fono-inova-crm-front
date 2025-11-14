// dateHelpers.js — versão JS pura

// Constrói Date em horário LOCAL quando vier 'yyyy-MM-dd'
function toLocalDate(date) {
    if (date instanceof Date) return date;

    if (typeof date === 'string') {
        // 'yyyy-MM-dd' -> cria em horário LOCAL (não UTC)
        const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) {
            const y = Number(m[1]);
            const mo = Number(m[2]);
            const d = Number(m[3]);
            return new Date(y, mo - 1, d); // local time
        }
        const t = Date.parse(date);
        if (!Number.isNaN(t)) return new Date(t);
    }

    return new Date(date);
}

// ✅ Para input (yyyy-MM-dd)
export function formatDateForInput(date) {
    if (!date) return '';
    const d = toLocalDate(date);
    if (isNaN(d)) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// ✅ Para exibir (dd/MM/yyyy)
export function formatDateToBR(date) {
    if (!date) return '';
    const d = toLocalDate(date);
    if (isNaN(d)) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    return `${day}/${m}/${y}`;
}

// ✅ 'dd/MM/yyyy' -> 'yyyy-MM-dd'
export function convertBRToInputFormat(brDate) {
    if (!brDate) return '';
    const parts = brDate.split('/');
    if (parts.length !== 3) return '';
    const day = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2];
    return `${y}-${m}-${day}`;
}

// Exporte também se quiser usar toLocalDate no componente
export { toLocalDate };
