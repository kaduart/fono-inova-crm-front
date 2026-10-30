// Regras de leitura dos agendamentos usadas pela Agenda do admin/secretária (filtros, mês,
// dia por profissional, dia aberto). Aceita tanto o agendamento cru da API quanto o DTO.
// Mock aprovado em 30/10: https://claude.ai/artifact/1GpgZsUT82fLP1m8D1U4SZ

export type StatusGroup = 'todo' | 'done' | 'missed' | 'canceled' | 'pre';
export type TypeGroup = 'particular' | 'convenio' | 'pacote' | 'liminar';

export interface AgendaFilter {
    doctor: string; // 'all' ou id do profissional
    status: 'all' | StatusGroup;
    type: 'all' | TypeGroup;
}

export const DEFAULT_FILTER: AgendaFilter = { doctor: 'all', status: 'all', type: 'all' };

// Paleta validada para daltonismo (a mesma do painel do terapeuta)
export const STATUS_COLOR: Record<StatusGroup, string> = {
    done: '#1baf7a',
    todo: '#94a3b8',
    pre: '#94a3b8',
    missed: '#eda100',
    canceled: '#e5484d',
};

export const STATUS_LABEL: Record<StatusGroup, string> = {
    todo: 'A fazer',
    done: 'Realizadas',
    missed: 'Faltas',
    canceled: 'Canceladas',
    pre: 'Pré-agendadas',
};

export const STATUS_SINGLE: Record<StatusGroup, string> = {
    todo: 'A fazer',
    done: 'Realizada',
    missed: 'Faltou',
    canceled: 'Cancelada',
    pre: 'Pré-agendada',
};

export const TYPE_LABEL: Record<TypeGroup, string> = {
    particular: 'Particular',
    convenio: 'Convênio',
    pacote: 'Pacote',
    liminar: 'Liminar',
};

// Mesmas cores de tipo da legenda e dos cards da semana
export const TYPE_COLOR: Record<TypeGroup, string> = {
    particular: '#047857',
    convenio: '#1d4ed8',
    pacote: '#7e22ce',
    liminar: '#c2410c',
};

export const ymdOf = (a: any): string => {
    const d = a?.date;
    if (!d) return '';
    if (typeof d === 'string') return d.includes('T') ? d.split('T')[0] : d;
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

export const doctorIdOf = (a: any): string => {
    const d = a?.doctor;
    if (d && typeof d === 'object') return String(d._id || d.id || a.doctorId || '');
    if (typeof d === 'string') return d;
    return String(a?.doctorId || '');
};

export const doctorNameOf = (a: any): string => {
    const d = a?.doctor;
    return (d && typeof d === 'object' ? d.fullName || d.name : '') || a?.professional || a?.doctorName || 'Profissional';
};

export const patientNameOf = (a: any): string => {
    const p = a?.patient;
    return (p && typeof p === 'object' ? p.fullName || p.name : '') || a?.patientName || a?.patientInfo?.fullName || 'Paciente';
};

export const statusGroupOf = (a: any): StatusGroup => {
    const s = String(a?.operationalStatus || a?.status || 'scheduled').toLowerCase();
    if (s === 'completed') return 'done';
    if (s === 'missed' || s === 'absent') return 'missed';
    if (['canceled', 'cancelled', 'cancelado', 'cancelada', 'force_cancelled'].includes(s)) return 'canceled';
    if (s === 'pre_agendado' || a?.__isPreAgendamento) return 'pre';
    return 'todo';
};

// Mesma precedência do card da semana: liminar → pacote → convênio → particular
export const typeGroupOf = (a: any): TypeGroup => {
    const pkg = a?.package;
    if (a?.billingType === 'liminar' || a?.liminarContract || (pkg && typeof pkg === 'object' && pkg.type === 'liminar')) return 'liminar';
    if (pkg || a?.serviceType === 'package_session' || a?.isPackageSession) return 'pacote';
    if (a?.billingType === 'convenio' || a?.paymentMethod === 'convenio' || (a?.insuranceProvider && a.insuranceProvider !== '')) return 'convenio';
    return 'particular';
};

export const matchesFilter = (a: any, f: AgendaFilter, skip?: keyof AgendaFilter): boolean =>
    (skip === 'doctor' || f.doctor === 'all' || doctorIdOf(a) === f.doctor)
    && (skip === 'status' || f.status === 'all' || statusGroupOf(a) === f.status)
    && (skip === 'type' || f.type === 'all' || typeGroupOf(a) === f.type);

const FILTER_KEY = 'agenda.filters.v1';
export const loadFilter = (): AgendaFilter => {
    try {
        const raw = localStorage.getItem(FILTER_KEY);
        if (!raw) return DEFAULT_FILTER;
        return { ...DEFAULT_FILTER, ...JSON.parse(raw) };
    } catch {
        return DEFAULT_FILTER;
    }
};
export const saveFilter = (f: AgendaFilter) => {
    try { localStorage.setItem(FILTER_KEY, JSON.stringify(f)); } catch { /* sem storage: só não lembra */ }
};

export const loadPref = (key: string, fallback: string) => {
    try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
};
export const savePref = (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { /* idem */ }
};

// "unimed-anapolis" → "Unimed Anapolis" quando o convênio não está no cadastro carregado
export const prettifyCode = (code?: string | null) =>
    (code || '').split(/[-_\s]+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export const monthTitle = (ym: string) => {
    if (!/^\d{4}-\d{2}$/.test(ym)) return '';
    const [y, m] = ym.split('-').map(Number);
    const s = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
};

export const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
