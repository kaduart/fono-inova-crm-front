// src/pages/Financial/components/finUi.tsx
// Peças visuais comuns do Financeiro (mesmo padrão de Gestão): chips com contagem,
// faixa de números, pílulas e barra de período no horário de Brasília.
import { ReactNode } from 'react';
import AnimatedValue from '../../../components/ui/insight/AnimatedValue';
import Sparkline from '../../../components/ui/insight/Sparkline';

export const TZ = 'America/Sao_Paulo';

export const brl = (v?: number | null) =>
    (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** 'YYYY-MM-DD' de uma data no horário de Brasília (toISOString usaria UTC). */
export const ymd = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ });

/** Hoje em Brasília, como Date ao meio-dia (evita virar de dia em contas de calendário). */
export const todaySP = () => {
    const [y, m, d] = ymd(new Date()).split('-').map(Number);
    return new Date(y, m - 1, d, 12);
};

export const fmtDay = (iso?: string | Date | null) => {
    if (!iso) return '—';
    const s = typeof iso === 'string' ? iso : iso.toISOString();
    // 'YYYY-MM-DD' puro é data de calendário; com hora, converte para Brasília.
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-');
        return `${d}/${m}/${y.slice(2)}`;
    }
    return new Date(s).toLocaleDateString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit' });
};

export const chipCls = (on: boolean) =>
    `inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 ${on
        ? 'border-emerald-700 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-200'
        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200'}`;

export const warnChipCls = (on: boolean) =>
    on ? chipCls(true)
        : 'inline-flex min-h-8 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 text-sm font-medium text-amber-900 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20';

export function Chip({ on, onClick, label, count, warn, disabled }: {
    on: boolean; onClick: () => void; label: string; count?: ReactNode; warn?: boolean; disabled?: boolean;
}) {
    return (
        <button type="button" aria-pressed={on} disabled={disabled} onClick={onClick} className={warn ? warnChipCls(on) : chipCls(on)}>
            {label}
            {count !== undefined && <span className="font-semibold tabular-nums opacity-70">{count}</span>}
        </button>
    );
}

export type Tone = 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'gray' | 'pink';
const PILL: Record<Tone, string> = {
    green: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
    amber: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
    red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30',
    violet: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30',
    gray: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10',
    pink: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-500/10 dark:text-pink-300 dark:border-pink-500/30',
};
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
    return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-px text-xs font-semibold ${PILL[tone]}`}>{children}</span>;
}

export interface KpiItem { label: string; value: ReactNode; sub?: ReactNode; hero?: boolean; danger?: boolean; onClick?: () => void; /** série curta para o mini-gráfico (opcional) */ trend?: number[] }
const KPI_COLS: Record<3 | 4 | 5, string> = { 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-3 xl:grid-cols-5' };
export function KpiStrip({ items, loading, cols = 4 }: { items: KpiItem[]; loading?: boolean; cols?: 3 | 4 | 5 }) {
    // Novo design: rótulo em caixa normal, número maior, "hero" com fio esmeralda no topo e "danger" com fio vermelho.
    return (
        <div className={`grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 shadow-sm dark:border-white/10 dark:bg-white/10 ${KPI_COLS[cols]}`}>
            {items.map((k) => {
                const Tag = k.onClick ? 'button' : 'div';
                const rule = k.danger ? 'before:bg-red-500' : k.hero ? 'before:bg-emerald-500' : 'before:bg-transparent';
                return (
                    <Tag key={k.label} type={k.onClick ? 'button' : undefined} onClick={k.onClick}
                        className={`relative min-w-0 bg-white px-4 pb-3.5 pt-3 text-left before:absolute before:inset-x-0 before:top-0 before:h-0.5 ${rule} dark:bg-[#161d1b] ${k.onClick ? 'transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:hover:bg-white/5' : ''}`}>
                        <div className="truncate text-[13px] font-medium text-gray-500 dark:text-gray-400">{k.label}</div>
                        <div className={`mt-1 text-[1.65rem] font-bold leading-none tracking-tight tabular-nums ${loading ? 'animate-pulse text-gray-300 dark:text-gray-600' : k.danger ? 'text-red-700 dark:text-red-400' : k.hero ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-50'}`}>{loading ? k.value : <AnimatedValue value={k.value} />}</div>
                        {k.trend && !loading && <Sparkline values={k.trend} tone={k.danger ? 'red' : 'emerald'} />}
                        {k.sub && <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{k.sub}</div>}
                    </Tag>
                );
            })}
        </div>
    );
}

// ── Período ─────────────────────────────────────────────────────────────────
export type PeriodKey = 'day' | 'yesterday' | 'week' | 'last_week' | 'month' | 'last_month' | 'custom';
export interface PeriodRange { key: PeriodKey; start: string; end: string; label: string }

/** Semana = segunda a domingo, em todas as abas. */
export function rangeFor(key: PeriodKey, month: number, year: number, custom?: { start: string; end: string }): PeriodRange {
    const t = todaySP();
    const add = (d: Date, n: number) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };
    const monday = add(t, -((t.getDay() + 6) % 7));
    const monthRange = (y: number, m: number) => ({ start: ymd(new Date(y, m - 1, 1, 12)), end: ymd(new Date(y, m, 0, 12)) });
    switch (key) {
        case 'day': return { key, start: ymd(t), end: ymd(t), label: 'Hoje' };
        case 'yesterday': { const y = ymd(add(t, -1)); return { key, start: y, end: y, label: 'Ontem' }; }
        case 'week': return { key, start: ymd(monday), end: ymd(add(monday, 6)), label: 'Esta semana' };
        case 'last_week': return { key, start: ymd(add(monday, -7)), end: ymd(add(monday, -1)), label: 'Semana passada' };
        case 'last_month': {
            const d = new Date(year, month - 2, 1, 12);
            return { key, ...monthRange(d.getFullYear(), d.getMonth() + 1), label: 'Mês anterior' };
        }
        case 'custom': return { key, start: custom?.start || ymd(t), end: custom?.end || custom?.start || ymd(t), label: 'Datas escolhidas' };
        case 'month':
        default: {
            const name = new Date(year, month - 1, 1, 12).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            return { key: 'month', ...monthRange(year, month), label: name };
        }
    }
}

export const describeRange = (r: PeriodRange) =>
    r.start === r.end ? fmtDay(r.start) : `${fmtDay(r.start)} a ${fmtDay(r.end)}`;

export function PeriodBar({ value, month, year, onChange, keys = ['day', 'week', 'month', 'last_month', 'custom'], right }: {
    value: PeriodRange; month: number; year: number; onChange: (r: PeriodRange) => void; keys?: PeriodKey[]; right?: ReactNode;
}) {
    const names: Record<PeriodKey, string> = {
        day: 'Hoje', yesterday: 'Ontem', week: 'Esta semana', last_week: 'Semana passada',
        month: 'Mês selecionado', last_month: 'Mês anterior', custom: 'Escolher datas',
    };
    return (
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs font-semibold text-gray-500 dark:text-gray-400">Período</span>
                {keys.map((k) => (
                    <button key={k} type="button" aria-pressed={value.key === k}
                        onClick={() => onChange(rangeFor(k, month, year, k === 'custom' ? { start: value.start, end: value.end } : undefined))}
                        className={value.key === k
                            ? 'inline-flex min-h-8 items-center rounded-full border border-emerald-700 bg-emerald-700 px-3 text-sm font-semibold text-white shadow-sm dark:border-emerald-500 dark:bg-emerald-600'
                            : chipCls(false)}>
                        {k === 'month' ? rangeFor('month', month, year).label : names[k]}
                    </button>
                ))}
                {value.key === 'custom' && (
                    <span className="flex flex-wrap items-center gap-1.5">
                        <input type="date" aria-label="De" value={value.start} max={value.end}
                            onChange={(e) => e.target.value && onChange({ ...value, start: e.target.value })}
                            className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">a</span>
                        <input type="date" aria-label="Até" value={value.end} min={value.start}
                            onChange={(e) => e.target.value && onChange({ ...value, end: e.target.value })}
                            className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
                    </span>
                )}
                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">{describeRange(value)}, horário de Brasília</span>
            </div>
            {right}
        </div>
    );
}

export function Pager({ page, pages, total, limit, onPage, busy }: {
    page: number; pages: number; total: number; limit: number; onPage: (p: number) => void; busy?: boolean;
}) {
    if (!total) return null;
    const from = (page - 1) * limit + 1;
    const to = Math.min(page * limit, total);
    return (
        <div className="flex items-center gap-1">
            <span className="mr-2 tabular-nums">{from}–{to} de {total}</span>
            {pages > 1 && <>
                <button type="button" disabled={page <= 1 || busy} onClick={() => onPage(page - 1)}
                    className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:hover:bg-white/5">Anterior</button>
                <span className="px-1 text-xs">Página {page} de {pages}</span>
                <button type="button" disabled={page >= pages || busy} onClick={() => onPage(page + 1)}
                    className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:hover:bg-white/5">Próxima</button>
            </>}
        </div>
    );
}
