// src/pages/Financial/components/projecaoUi.tsx
// Peças compartilhadas por Inteligência Financeira e Projeção Mensal (Resultados).
// As duas abas leem GET /provisionamento/projecao-mes. A peça central é a
// "Régua de fechamento": recebido, produzido, agendado e pendente numa só linha,
// com os três cenários e a meta marcados em cima.
import { ReactNode, useCallback, useEffect, useState } from 'react';
import api from '../../../services/api';
import { brl, fmtDay, Pager, Pill, Tone } from './finUi';

export interface ProjAppt { _id?: string; sessaoId?: string; pacoteId?: string; data?: string; hora?: string; valor?: number; paciente?: string; tipo?: string; diasParaAtendimento?: number; convenio?: string; sessoesRemanescentes?: number; valorPorSessao?: number; valorTotal?: number }
export interface ProjInsight { tipo: 'info' | 'warning' | 'error' | string; titulo: string; mensagem: string; acao?: string }
export interface Projecao {
    periodo?: { mes: number; ano: number; diasRestantes?: number; status?: 'PASSADO' | 'ATUAL' | 'FUTURO' };
    resumo?: {
        jaRecebido?: number; aReceber?: number; atendimentosRealizados?: number; valorProduzido?: number; ticketMedio?: number;
        particular?: number; convenio?: number; agendadoConfirmado?: number; pendenteConfirmacao?: number;
        creditoPacotes?: number; convenioAgendado?: number; totalPotencial?: number;
    };
    cenarios?: Record<'pessimista' | 'realista' | 'otimista', { valor: number; probabilidade?: string }>;
    metas?: { sugerida?: number; gapParaMeta?: number; percentualAtual?: number };
    taxaConversaoHistorica?: number;
    insights?: ProjInsight[];
    detalhes?: { realizados?: ProjAppt[]; agendados?: ProjAppt[]; pendentes?: ProjAppt[]; creditoPacotes?: ProjAppt[]; convenioAgendado?: ProjAppt[] };
}

/** Busca a projeção do mês escolhido no topo do Financeiro. */
export function useProjecao(month: number, year: number) {
    const [data, setData] = useState<Projecao | null>(null);
    const [loading, setLoading] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const load = useCallback(async () => {
        setLoading(true);
        setErro(null);
        try {
            const r = await api.get(`/provisionamento/projecao-mes?month=${month}&year=${year}`);
            setData(r.data as Projecao);
        } catch {
            setErro('Não foi possível carregar a projeção do mês. Tente atualizar.');
        } finally {
            setLoading(false);
        }
    }, [month, year]);
    useEffect(() => { void load(); }, [load]);
    return { data, loading, erro, reload: load };
}

export const monthName = (m: number, y: number) => {
    const s = new Date(y, m - 1, 1, 12).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
};

export function statusText(p?: Projecao['periodo']) {
    if (!p?.status) return '';
    if (p.status === 'PASSADO') return 'Mês fechado: os números abaixo são o que aconteceu.';
    if (p.status === 'FUTURO') return 'Mês futuro: tudo aqui ainda é projeção.';
    const d = Math.max(0, p.diasRestantes ?? 0);
    return d === 1 ? 'Mês em andamento, falta 1 dia.' : `Mês em andamento, faltam ${d} dias.`;
}

export function Panel({ title, sub, right, children, id }: { title: string; sub?: ReactNode; right?: ReactNode; children: ReactNode; id?: string }) {
    return (
        <section id={id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#161d1b] sm:p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
                    {sub && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{sub}</p>}
                </div>
                {right}
            </div>
            {children}
        </section>
    );
}

export function RefreshButton({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
    return (
        <button type="button" onClick={onClick} disabled={busy}
            className="inline-flex min-h-8 items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/5">
            {busy ? 'Atualizando…' : 'Atualizar'}
        </button>
    );
}

// ── Régua de fechamento ────────────────────────────────────────────────────
/**
 * Uma linha de 0 até o maior valor entre otimista e meta.
 * Faixas: recebido (verde cheio), produzido a receber (verde claro),
 * agendado + convênio agendado (listrado), pendente de confirmação (âmbar pontilhado).
 * Marcas em cima: pessimista, realista, otimista e a meta.
 */
export function ReguaFechamento({ p }: { p: Projecao }) {
    const r = p.resumo || {};
    const c = p.cenarios;
    const meta = p.metas?.sugerida || 0;
    const recebido = Math.max(0, r.jaRecebido || 0);
    const produzido = Math.max(0, r.valorProduzido || 0);
    const aReceber = Math.max(0, produzido - recebido);
    const agendado = Math.max(0, (r.agendadoConfirmado || 0) + (r.convenioAgendado || 0));
    const pendente = Math.max(0, r.pendenteConfirmacao || 0);
    const base = Math.max(recebido, produzido);
    const max = Math.max(1, base + agendado + pendente, c?.otimista?.valor || 0, meta) * 1.04;
    const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;

    const segs: { key: string; label: string; v: number; cls: string; style?: React.CSSProperties }[] = [
        { key: 'rec', label: 'Recebido', v: recebido, cls: 'bg-emerald-600 dark:bg-emerald-500' },
        { key: 'arec', label: 'Atendido, a receber', v: produzido > recebido ? aReceber : 0, cls: 'bg-emerald-300 dark:bg-emerald-700' },
        {
            key: 'ag', label: 'Agendado', v: agendado, cls: 'bg-sky-200 dark:bg-sky-900',
            style: { backgroundImage: 'repeating-linear-gradient(135deg, rgba(14,116,144,.35) 0 4px, transparent 4px 9px)' },
        },
        {
            key: 'pend', label: 'Pendente de confirmação', v: pendente, cls: 'bg-amber-100 dark:bg-amber-900/60',
            style: { backgroundImage: 'radial-gradient(rgba(180,83,9,.55) 1px, transparent 1.3px)', backgroundSize: '6px 6px' },
        },
    ];

    const marks: { key: string; label: string; v: number; strong?: boolean; meta?: boolean }[] = [];
    if (c) {
        marks.push({ key: 'pes', label: 'Pessimista', v: c.pessimista?.valor || 0 });
        marks.push({ key: 'rea', label: 'Realista', v: c.realista?.valor || 0, strong: true });
        marks.push({ key: 'oti', label: 'Otimista', v: c.otimista?.valor || 0 });
    }
    if (meta > 0) marks.push({ key: 'meta', label: 'Meta', v: meta, meta: true });

    return (
        <div>
            <div className="relative h-9">
                {marks.map((m) => (
                    <div key={m.key} className="absolute bottom-0 -translate-x-1/2 text-center" style={{ left: pct(m.v) }}>
                        <div className={`whitespace-nowrap text-[11px] leading-tight ${m.meta ? 'font-bold text-gray-900 dark:text-gray-50' : m.strong ? 'font-semibold text-emerald-800 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400'}`}>
                            {m.label}
                        </div>
                        <div className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">{brl(m.v).replace(',00', '')}</div>
                    </div>
                ))}
            </div>
            <div className="relative mt-1" role="img"
                aria-label={`Recebido ${brl(recebido)}, a receber ${brl(aReceber)}, agendado ${brl(agendado)}, pendente ${brl(pendente)}${meta ? `, meta ${brl(meta)}` : ''}`}>
                <div className="flex h-7 w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-white/5">
                    {segs.filter((s) => s.v > 0).map((s) => (
                        <div key={s.key} className={`h-full ${s.cls}`} style={{ width: pct(s.v), ...s.style }} title={`${s.label}: ${brl(s.v)}`} />
                    ))}
                </div>
                {marks.map((m) => (
                    <div key={m.key} aria-hidden className={`absolute -top-1 h-9 -translate-x-1/2 ${m.meta ? 'w-0.5 bg-gray-900 dark:bg-gray-50' : m.strong ? 'w-0.5 bg-emerald-800 dark:bg-emerald-300' : 'w-px bg-gray-400 dark:bg-gray-500'}`}
                        style={{ left: pct(m.v) }} />
                ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                {segs.map((s) => (
                    <li key={s.key} className="inline-flex items-center gap-1.5">
                        <span className={`inline-block h-3 w-4 rounded-sm ${s.cls}`} style={s.style} aria-hidden />
                        {s.label} <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-50">{brl(s.v)}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ── Avisos do back ─────────────────────────────────────────────────────────
const INSIGHT_TONE: Record<string, { tone: Tone; box: string; label: string }> = {
    error: { tone: 'red', label: 'Urgente', box: 'border-red-200 bg-red-50/60 dark:border-red-500/30 dark:bg-red-500/10' },
    warning: { tone: 'amber', label: 'Atenção', box: 'border-amber-200 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/10' },
    info: { tone: 'blue', label: 'Info', box: 'border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5' },
};

export function InsightList({ items, onAction }: { items: ProjInsight[]; onAction?: (i: ProjInsight) => void }) {
    if (!items.length) {
        return <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum alerta para este mês. A projeção realista cobre a meta e não há pendências urgentes.</p>;
    }
    const order = { error: 0, warning: 1, info: 2 } as Record<string, number>;
    return (
        <ul className="space-y-2">
            {[...items].sort((a, b) => (order[a.tipo] ?? 3) - (order[b.tipo] ?? 3)).map((i, idx) => {
                const t = INSIGHT_TONE[i.tipo] || INSIGHT_TONE.info;
                return (
                    <li key={idx} className={`flex flex-wrap items-start justify-between gap-2 rounded-xl border p-3 ${t.box}`}>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <Pill tone={t.tone}>{t.label}</Pill>
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">{i.titulo}</span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{i.mensagem}</p>
                        </div>
                        {i.acao && onAction && (
                            <button type="button" onClick={() => onAction(i)}
                                className="inline-flex min-h-8 shrink-0 items-center rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:bg-emerald-600 dark:hover:bg-emerald-500">
                                {i.acao}
                            </button>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

// ── Tabela simples com paginação local ─────────────────────────────────────
export interface Col { key: string; label: string; right?: boolean; render: (a: ProjAppt) => ReactNode }

export function ApptTable({ rows, cols, empty, rowTone, pageSize = 10 }: { rows: ProjAppt[]; cols: Col[]; empty: string; rowTone?: (a: ProjAppt) => string; pageSize?: number }) {
    const [page, setPage] = useState(1);
    useEffect(() => { setPage(1); }, [rows]);
    if (!rows.length) return <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">{empty}</p>;
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    const slice = rows.slice((page - 1) * pageSize, page * pageSize);
    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500 dark:border-white/10 dark:text-gray-400">
                            {cols.map((c) => <th key={c.key} scope="col" className={`px-2 py-2 ${c.right ? 'text-right' : ''}`}>{c.label}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {slice.map((a, i) => (
                            <tr key={a._id || a.sessaoId || a.pacoteId || i} className={`border-b border-gray-100 last:border-0 dark:border-white/5 ${rowTone?.(a) || ''}`}>
                                {cols.map((c) => <td key={c.key} className={`px-2 py-2 text-gray-800 dark:text-gray-100 ${c.right ? 'text-right tabular-nums' : ''}`}>{c.render(a)}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="mt-2 flex justify-end text-xs text-gray-500 dark:text-gray-400">
                <Pager page={page} pages={pages} total={rows.length} limit={pageSize} onPage={setPage} />
            </div>
        </div>
    );
}

export const dataHora = (a: ProjAppt) => `${fmtDay(a.data).slice(0, 5)}${a.hora && a.hora !== '--:--' ? ` ${a.hora}` : ''}`;
export const colData: Col = { key: 'data', label: 'Data', render: dataHora };
export const colPaciente: Col = { key: 'pac', label: 'Paciente', render: (a) => a.paciente || 'Paciente' };
export const colValor: Col = { key: 'valor', label: 'Valor', right: true, render: (a) => brl(a.valor ?? a.valorTotal) };
export const colTipo: Col = {
    key: 'tipo', label: 'Tipo', render: (a) => <Pill tone={a.tipo?.startsWith('Convênio') ? 'blue' : 'green'}>{a.tipo || 'Particular'}</Pill>,
};

export function EmptyOrError({ erro, onRetry }: { erro: string; onRetry: () => void }) {
    return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {erro} <button type="button" onClick={onRetry} className="ml-2 font-semibold underline">Tentar de novo</button>
        </div>
    );
}
