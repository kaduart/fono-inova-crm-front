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

// ========================================
// ✅ FUNÇÕES PARA CHAT/WHATSAPP
// ========================================

/**
 * Formata timestamp para exibição na lista de conversas
 * Hoje: "14:30"
 * Ontem: "Ontem"
 * Esta semana: "15 Nov"
 * Este ano: "15 Jan"
 * Outro ano: "15/01/2024"
 */
export function formatMessageTime(timestamp) {
    if (!timestamp) return '';

    const date = toLocalDate(timestamp);
    if (isNaN(date)) return '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffDays = Math.floor((today - msgDate) / (1000 * 60 * 60 * 24));

    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const time = `${h}:${m}`;
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Hoje: dia da semana + hora
    if (diffDays === 0) {
        return `${dias[date.getDay()]} ${time}`;
    }

    // Ontem
    if (diffDays === 1) {
        return `Ontem ${time}`;
    }

    // Mesma semana (últimos 7 dias)
    if (diffDays < 7) {
        return `${dias[date.getDay()]} ${time}`;
    }

    // Mesmo ano: dia e mês
    if (date.getFullYear() === now.getFullYear()) {
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${date.getDate()} ${meses[date.getMonth()]}`;
    }

    // Outro ano: data completa
    return formatDateToBR(date);
}

/**
 * Formata timestamp completo para rodapé da mensagem
 * Hoje: "14:30"
 * Ontem: "Ontem às 14:30"
 * Esta semana: "Segunda às 14:30"
 * Este ano: "15 de novembro às 14:30"
 * Outro ano: "15/11/2024 às 14:30"
 */
export function formatMessageTimestamp(timestamp) {
    if (!timestamp) return '';

    const date = toLocalDate(timestamp);
    if (isNaN(date)) return '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffDays = Math.floor((today - msgDate) / (1000 * 60 * 60 * 24));

    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const time = `${h}:${m}`;

    // Hoje: prefixo + hora
    if (diffDays === 0) {
        return `Hoje às ${time}`;
    }

    // Ontem
    if (diffDays === 1) {
        return `Ontem às ${time}`;
    }

    // Mesma semana
    if (diffDays < 7) {
        const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        return `${dias[date.getDay()]} às ${time}`;
    }

    // Mesmo ano
    if (date.getFullYear() === now.getFullYear()) {
        const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        return `${date.getDate()} de ${meses[date.getMonth()]} às ${time}`;
    }

    // Outro ano
    return `${formatDateToBR(date)} às ${time}`;
}

/**
 * Formata data para separadores no chat
 * Hoje: "Hoje"
 * Ontem: "Ontem"
 * Esta semana: "Segunda-feira"
 * Este ano: "15 de novembro"
 * Outro ano: "15/11/2024"
 */
export function formatDateSeparator(timestamp) {
    if (!timestamp) return '';

    const date = toLocalDate(timestamp);
    if (isNaN(date)) return '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffDays = Math.floor((today - msgDate) / (1000 * 60 * 60 * 24));

    // Hoje
    if (diffDays === 0) {
        return 'Hoje';
    }

    // Ontem
    if (diffDays === 1) {
        return 'Ontem';
    }

    // Mesma semana
    if (diffDays < 7) {
        const dias = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
            'Quinta-feira', 'Sexta-feira', 'Sábado'];
        return dias[date.getDay()];
    }

    // Mesmo ano
    if (date.getFullYear() === now.getFullYear()) {
        const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
        return `${date.getDate()} de ${meses[date.getMonth()]}`;
    }

    // Outro ano
    return formatDateToBR(date);
}

/**
 * Verifica se duas datas são do mesmo dia
 */
export function isSameDay(date1, date2) {
    if (!date1 || !date2) return false;

    const d1 = toLocalDate(date1);
    const d2 = toLocalDate(date2);

    if (isNaN(d1) || isNaN(d2)) return false;

    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

// Exporte também se quiser usar toLocalDate no componente
export { toLocalDate };
