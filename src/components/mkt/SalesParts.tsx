// Peças comuns das abas de Vendas & Marketing (padrão finUi do Financeiro).
// Os números vêm prontos do back (docs/SALES_MARKETING.md); aqui só formatamos.
import { useEffect, useState } from 'react';
import { specialtyText } from '../commercial/commercialCopy';
import { brl, KpiStrip, Pill, rangeFor, type PeriodRange } from '../../pages/Financial/components/finUi';
import { salesMarketingService, type IdleSpecialty, type LeadsSummary, type RoiSummary } from '../../services/salesMarketingService';

const now = new Date();
export const CUR_MONTH = now.getMonth() + 1;
export const CUR_YEAR = now.getFullYear();

/** Período inicial = mês corrente, igual ao Financeiro. */
export function useSalesPeriod() {
    return useState<PeriodRange>(() => rangeFor('month', CUR_MONTH, CUR_YEAR));
}

function useSummary<T>(load: (s: string, e: string) => Promise<T>, range: PeriodRange, tick = 0) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        let alive = true;
        setLoading(true);
        load(range.start, range.end)
            .then(d => { if (alive) { setData(d); setError(null); } })
            .catch(e => { if (alive) setError(e?.response?.data?.message || e?.message || 'Erro ao carregar'); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [load, range.start, range.end, tick]);
    return { data, loading, error };
}

export const useLeadsSummary = (range: PeriodRange, tick = 0) => useSummary<LeadsSummary>(salesMarketingService.leadsSummary, range, tick);
export const useRoiSummary = (range: PeriodRange, tick = 0) => useSummary<RoiSummary>(salesMarketingService.roiSummary, range, tick);

const fmtPct = (v?: number | null) => `${(v ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

export function LeadsKpis({ data, loading, waitingCount, onWaitingClick }: {
    data: LeadsSummary | null; loading: boolean; waitingCount: number; onWaitingClick?: () => void;
}) {
    const k = data?.kpis;
    const diff = k ? k.newLeads - k.prevNewLeads : 0;
    return (
        <KpiStrip cols={5} loading={loading && !data} items={[
            { label: 'Leads novos', value: k?.newLeads ?? '—', sub: k ? `${diff >= 0 ? '+' : ''}${diff} vs período anterior` : undefined },
            { label: 'Sem resposta >2h', value: waitingCount, danger: waitingCount > 0, sub: waitingCount ? 'clique para ver' : 'ninguém esperando', onClick: waitingCount ? onWaitingClick : undefined },
            { label: 'Conversaram', value: k ? fmtPct(k.conversedRate) : '—', sub: k ? `${k.conversed} de ${k.newLeads}` : undefined },
            { label: 'Agendaram 1ª', value: k ? fmtPct(k.scheduledRate) : '—', hero: true, sub: k ? `${k.scheduled} avaliações` : undefined },
            { label: 'Valor gerado', value: k ? brl(k.revenue) : '—', hero: true, sub: 'caixa dos pacientes novos' },
        ]} />
    );
}

/** Funil em barras com a perda de cada etapa para a anterior. */
export function FunnelBars({ steps }: { steps: { key: string; label: string; value: number }[] }) {
    const top = steps[0]?.value || 0;
    return (
        <div className="flex flex-col gap-1.5">
            {steps.map((s, i) => {
                const prev = i ? steps[i - 1].value : 0;
                const drop = i && prev ? Math.round(((prev - s.value) / prev) * 100) : null;
                const w = top ? Math.max(2, (s.value / top) * 100) : 0;
                return (
                    <div key={s.key} className="grid grid-cols-[120px_minmax(0,1fr)_96px] items-center gap-3 text-sm sm:grid-cols-[160px_minmax(0,1fr)_110px]">
                        <span className="truncate text-gray-700 dark:text-gray-300">{s.label}</span>
                        <div className="h-5 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800">
                            <div className="h-full rounded-md bg-emerald-600" style={{ width: `${w}%` }} />
                        </div>
                        <span className="text-right tabular-nums text-gray-900 dark:text-gray-100">
                            {s.value}
                            {drop !== null && drop > 0 && <span className="ml-1 text-xs text-red-600">−{drop}%</span>}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

const TONE = { green: 'green', amber: 'amber', red: 'red', gray: 'gray' } as const;

/** Tabela do ROI por canal (aba ROI) — custo por paciente decide onde investir. */
export function RoiChannelTable({ data }: { data: RoiSummary }) {
    if (!data.channels.length) return <p className="py-6 text-center text-sm text-gray-500">Nenhum lead no período.</p>;
    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[720px] text-sm">
                <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700">
                        <th className="px-3 py-2">Canal</th>
                        <th className="px-3 py-2 text-right">Invest.</th>
                        <th className="px-3 py-2 text-right">Leads</th>
                        <th className="px-3 py-2 text-right">Pacientes</th>
                        <th className="px-3 py-2 text-right">Custo/paciente</th>
                        <th className="px-3 py-2 text-right">Receita</th>
                        <th className="px-3 py-2">Leitura</th>
                    </tr>
                </thead>
                <tbody>
                    {data.channels.map(c => (
                        <tr key={c.key} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                            <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{c.label}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{c.spend ? brl(c.spend) : '—'}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{c.leads}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{c.patients}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{c.costPerPatient != null ? brl(c.costPerPatient) : '—'}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{brl(c.revenue)}</td>
                            <td className="px-3 py-2"><Pill tone={TONE[c.verdict.tone]}>{c.verdict.text}</Pill></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function RoiKpis({ data, loading }: { data: RoiSummary | null; loading: boolean }) {
    const t = data?.totals;
    return (
        <KpiStrip cols={5} loading={loading && !data} items={[
            { label: 'Investimento', value: t ? brl(t.spend) : '—', sub: 'gasto lançado nos anúncios' },
            { label: 'Custo por lead', value: t?.costPerLead != null ? brl(t.costPerLead) : '—', sub: t ? `${t.leads} leads` : undefined },
            { label: 'Custo por paciente', value: t?.costPerPatient != null ? brl(t.costPerPatient) : '—', sub: t ? `${t.patients} fecharam pacote` : undefined },
            { label: 'Receita (caixa)', value: t ? brl(t.revenue) : '—', hero: true, sub: 'dos pacientes novos' },
            { label: 'Retorno', value: t?.returnMultiple != null ? `${t.returnMultiple.toLocaleString('pt-BR')}×` : '—', hero: true, sub: 'receita ÷ investimento' },
        ]} />
    );
}

/**
 * Social Media: "Sugestões da semana" a partir das vagas ociosas por especialidade
 * (GET /v2/commercial/idle-slots). Post de uma especialidade com vaga traz o lead que ocupa a vaga.
 */
export function WeekSuggestions({ onPick }: { onPick?: (specialty: string) => void }) {
    const [items, setItems] = useState<IdleSpecialty[] | null>(null);
    useEffect(() => {
        salesMarketingService.idleSlots().then(setItems).catch((e) => { console.error('[social] vagas ociosas', e); setItems([]); });
    }, []);
    if (!items || !items.length) return null;
    const top = items.slice(0, 2);
    return (
        <section aria-label="Sugestões da semana" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <h2 className="mb-2 text-sm font-bold text-emerald-900 dark:text-emerald-200">Sugestões da semana</h2>
            <ul className="flex flex-col gap-2">
                {top.map(s => (
                    <li key={s.specialty} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-emerald-950 dark:text-emerald-100">
                        <span className="min-w-0 flex-1">
                            <b>{specialtyText(s.specialty)}</b> tem {s.idleSlots} {s.idleSlots === 1 ? 'horário vago' : 'horários vagos'} na grade
                            {s.weekday ? `, mais na ${s.weekday} de ${s.period}` : `, mais de ${s.period}`}. Um post sobre {specialtyText(s.specialty)} no Instagram e no GMB ajuda a ocupar esses horários.
                        </span>
                        {onPick && (
                            <button type="button" onClick={() => onPick(s.specialty)}
                                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800">
                                Criar post
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}
