// src/pages/Financial/tabs/ProfissionaisTab.tsx
// Profissionais: "quanto devo pagar a cada um e quem ainda não fechou".
// Lista com chips (contagens do back), linha de total do back e painel lateral por
// profissional: saldo a pagar, folha de sessões, adiantamentos e fechamentos (com cancelar).
// A visão antiga (Resultado, Pacientes, Saúde) continua acessível pelo botão "Visão detalhada".
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from '../../../utils/toast';
import API from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import {
    ProfessionalRankingItem, SettlementItem, SettlementPreview, professionalResultsService,
} from '../../../services/professionalResultsService';
import { ProfessionalAdvanceModal } from '../../../components/financial/ProfessionalAdvanceModal';
import { summarizeCommissionSessions, CommissionSessionItem } from './commissionSessionsSummary';
import { Chip, KpiStrip, Pill, brl, fmtDay } from '../components/finUi';
import BarList from '../../../components/ui/insight/BarList';
import { confirmDialog } from '../../../components/ui/ConfirmHost';
import { checkboxCls } from '../../../components/ui/table/batch';

const ProfessionalResultsPage = lazy(() => import('../../ProfessionalResults/ProfessionalResultsPage'));

type Filtro = 'todos' | 'a_fechar' | 'fechados' | 'sem_regra' | 'com_pendencia';
interface RankingTotals { sessions: number; production: number; received: number; receivables: number; commission: number; advances: number; balance: number }
type Counts = Record<Filtro, number>;
type Row = ProfessionalRankingItem & {
    sessions?: { completed?: number };
    health?: { orphanSessions?: number; orphanPayments?: number };
};

const pad = (n: number) => String(n).padStart(2, '0');
const monthRange = (m: number, y: number) => ({
    start: `${y}-${pad(m)}-01`,
    end: `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`,
});
const isClosed = (r: Row) => r.settlement?.status === 'closed';
const noRule = (r: Row) => !(r.commissionRates || []).length;
const hasIssue = (r: Row) => ((r.health?.orphanSessions || 0) + (r.health?.orphanPayments || 0)) > 0;
const matches = (f: Filtro, r: Row) =>
    f === 'todos' ? true
        : f === 'fechados' ? isClosed(r)
            : f === 'sem_regra' ? noRule(r)
                : f === 'com_pendencia' ? hasIssue(r)
                    : !isClosed(r) && !noRule(r);

interface Props { month: number; year: number; onMonthChange?: (m: number) => void; onYearChange?: (y: number) => void }

export default function ProfissionaisTab({ month, year, onMonthChange, onYearChange }: Props) {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const { start, end } = monthRange(month, year);
    const monthLabel = new Date(year, month - 1, 1, 12).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const [rows, setRows] = useState<Row[]>([]);
    const [totals, setTotals] = useState<RankingTotals | null>(null);
    const [counts, setCounts] = useState<Counts | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [filtro, setFiltro] = useState<Filtro>('todos');
    const [busca, setBusca] = useState('');
    const [openId, setOpenId] = useState<string | null>(null);
    const [detalhada, setDetalhada] = useState(false);
    // Fechamento em lote: só quem tem regra, não está fechado e não tem pendência. Usa a mesma prévia + fechamento do painel.
    const [lote, setLote] = useState<Set<string>>(new Set());
    const [fechandoLote, setFechandoLote] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await API.get('/v2/professionals/ranking', { params: { startDate: start, endDate: end } });
            setRows(res.data?.data || []);
            setTotals(res.data?.totals || null);
            setCounts(res.data?.counts || null);
        } catch (e) {
            console.error('[ProfissionaisTab] ranking', e);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [start, end]);

    useEffect(() => { void load(); }, [load]);

    const visiveis = useMemo(() => {
        const q = busca.trim().toLowerCase();
        return rows.filter(r => matches(filtro, r) && (!q || r.doctorName.toLowerCase().includes(q)));
    }, [rows, filtro, busca]);
    const aberto = rows.find(r => r.doctorId === openId) || null;
    const elegivel = (r: Row) => isAdmin && !noRule(r) && !isClosed(r) && !hasIssue(r);
    const toggleLote = (id: string) => setLote(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const fecharLote = async () => {
        const alvo = rows.filter(r => lote.has(r.doctorId) && elegivel(r));
        if (!alvo.length) return;
        const total = alvo.reduce((s2, r) => s2 + Number(r.balance || 0), 0);
        if (!await confirmDialog(`Fechar o mês de ${alvo.length} profissional(is), somando ${brl(total)} de saldo? Quem tiver pendência na prévia fica de fora.`,
            { title: 'Fechar mês em lote', confirmText: 'Fechar mês' })) return;
        setFechandoLote(true);
        const ok: string[] = []; const pulados: string[] = [];
        for (const r of alvo) {
            try {
                const pv = await professionalResultsService.previewSettlement(r.doctorId, month, year);
                if (pv?.hasFinancialIssues) { pulados.push(r.doctorName); continue; }
                await professionalResultsService.closeSettlement(r.doctorId, month, year, { force: false });
                ok.push(r.doctorName);
            } catch { pulados.push(r.doctorName); }
        }
        setFechandoLote(false);
        setLote(new Set());
        if (ok.length) toast.success(`Mês fechado para ${ok.length} profissional(is)`);
        if (pulados.length) toast.info(`Ficaram de fora (abra cada um para conferir): ${pulados.join(', ')}`, { duration: 12000 });
        void load();
    };

    if (detalhada) {
        return (
            <div className="space-y-3">
                <button type="button" onClick={() => setDetalhada(false)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50">
                    ← Voltar para a lista
                </button>
                <Suspense fallback={<div className="py-16 text-center text-gray-400">Carregando...</div>}>
                    <ProfessionalResultsPage month={month} year={year} onMonthChange={onMonthChange || (() => {})} onYearChange={onYearChange || (() => {})} />
                </Suspense>
            </div>
        );
    }

    const t = totals;
    const chip = (f: Filtro, label: string, warn = false) => (
        <Chip key={f} on={filtro === f} onClick={() => setFiltro(f)} label={label} count={counts?.[f] ?? '—'} warn={warn && (counts?.[f] || 0) > 0 && filtro !== f} />
    );

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Profissionais · {monthLabel}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Comissão, adiantamentos e fechamento de cada profissional. O mês é o do topo da página.</p>
                </div>
                <button type="button" onClick={() => setDetalhada(true)} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50">
                    Visão detalhada (resultado, pacientes, saúde)
                </button>
            </div>

            <KpiStrip loading={loading && !t} items={[
                { label: 'Saldo a pagar', value: t ? brl(t.balance) : '—', sub: t ? `comissão ${brl(t.commission)} − adiantamentos ${brl(t.advances)}` : undefined, hero: true },
                { label: 'Comissão do mês', value: t ? brl(t.commission) : '—', sub: t ? `${t.sessions.toLocaleString('pt-BR')} sessões` : undefined },
                { label: 'Produção', value: t ? brl(t.production) : '—', sub: 'sessões realizadas no mês' },
                { label: 'A receber', value: t ? brl(t.receivables) : '—', sub: 'sem pacote pré-pago' },
            ]} />

            {/* Novo design (Tremor): quem mais tem saldo a pagar, num relance. Clique abre o detalhe. */}
            {rows.some(r => (r.balance ?? 0) > 0) && (
                <details className="group rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 dark:border-white/10 dark:bg-[#161d1b]" open>
                    <summary className="cursor-pointer list-none text-sm font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-200">
                        Saldo a pagar por profissional <span className="font-normal text-gray-400">· maiores primeiro</span>
                    </summary>
                    <div className="mt-2">
                        <BarList items={[...rows].filter(r => (r.balance ?? 0) > 0).sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0)).slice(0, 8)
                            .map(r => ({ key: r.doctorId, label: r.doctorName, value: r.balance ?? 0, display: brl(r.balance), onClick: () => setOpenId(r.doctorId) }))} />
                    </div>
                </details>
            )}

            <section className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <div className="flex flex-col gap-2 border-b border-gray-100 dark:border-gray-800 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {chip('todos', 'Todos')}
                        {chip('a_fechar', 'A fechar')}
                        {chip('fechados', 'Fechados')}
                        {chip('sem_regra', 'Sem regra de comissão', true)}
                        {chip('com_pendencia', 'Com pendência', true)}
                    </div>
                    <input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar profissional"
                        aria-label="Buscar profissional"
                        className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 text-sm lg:w-64" />
                </div>

                {lote.size > 0 && (
                    <div className="flex flex-wrap items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-900/40 dark:text-emerald-100">
                        <b>{lote.size} selecionado(s)</b> · saldo {brl(rows.filter(r => lote.has(r.doctorId)).reduce((s2, r) => s2 + Number(r.balance || 0), 0))}
                        <span className="flex-1" />
                        <button type="button" disabled={fechandoLote} onClick={() => void fecharLote()} className="rounded-lg bg-emerald-700 px-3 py-1.5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                            {fechandoLote ? 'Fechando…' : 'Fechar mês dos selecionados'}
                        </button>
                        <button type="button" onClick={() => setLote(new Set())} className="px-2 underline">Limpar</button>
                    </div>
                )}
                {error ? (
                    <div role="alert" className="flex flex-wrap items-center gap-2 px-4 py-6 text-sm text-red-700">
                        Não foi possível carregar os profissionais.
                        <button type="button" onClick={() => void load()} className="font-semibold underline">Tentar de novo</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                <tr>
                                    {isAdmin && <th className="w-8 py-2 pl-4"><span className="sr-only">Selecionar</span></th>}
                                    <th className="px-4 py-2">Profissional</th>
                                    <th className="hidden px-3 py-2 text-right sm:table-cell">Sessões</th>
                                    <th className="hidden px-3 py-2 text-right md:table-cell">Produção</th>
                                    <th className="px-3 py-2 text-right">Comissão</th>
                                    <th className="hidden px-3 py-2 text-right md:table-cell">Adiant. (mês)</th>
                                    <th className="px-3 py-2 text-right">Saldo a pagar</th>
                                    <th className="px-3 py-2">Fechamento</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {loading && rows.length === 0 && Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}><td colSpan={isAdmin ? 8 : 7} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" /></td></tr>
                                ))}
                                {!loading && visiveis.length === 0 && (
                                    <tr><td colSpan={isAdmin ? 8 : 7} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">Nenhum profissional neste filtro.</td></tr>
                                )}
                                {visiveis.map(r => (
                                    <tr key={r.doctorId} onClick={() => setOpenId(r.doctorId)} className="cursor-pointer hover:bg-gray-50"
                                        tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') setOpenId(r.doctorId); }}>
                                        {isAdmin && (
                                            <td className="py-2.5 pl-4" onClick={e => e.stopPropagation()}>
                                                <input type="checkbox" className={checkboxCls} disabled={!elegivel(r)} checked={lote.has(r.doctorId)} onChange={() => toggleLote(r.doctorId)}
                                                    aria-label={`Selecionar ${r.doctorName} para fechar o mês`} title={elegivel(r) ? 'Selecionar para fechar em lote' : 'Fechado, sem regra ou com pendência: abra o profissional'} />
                                            </td>
                                        )}
                                        <td className="px-4 py-2.5">
                                            <div className="font-semibold text-gray-900 dark:text-gray-100">{r.doctorName}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{r.specialty || '—'}</div>
                                        </td>
                                        <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{r.sessions?.completed ?? '—'}</td>
                                        <td className="hidden px-3 py-2.5 text-right tabular-nums md:table-cell">{brl(r.production?.total)}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">{noRule(r) ? '—' : brl(r.commission)}</td>
                                        <td className="hidden px-3 py-2.5 text-right tabular-nums md:table-cell">{r.advances ? brl(r.advances) : '—'}</td>
                                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{noRule(r) ? '—' : brl(r.balance)}</td>
                                        <td className="px-3 py-2.5">
                                            {noRule(r) ? <Pill tone="amber">Sem regra</Pill>
                                                : isClosed(r) ? <Pill tone="green">Fechado{r.settlement?.closedAt ? ` ${fmtDay(r.settlement.closedAt)}` : ''}</Pill>
                                                    : <Pill tone="gray">A fechar</Pill>}
                                            {hasIssue(r) && <span className="ml-1"><Pill tone="red">Pendência</Pill></span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {t && (
                                <tfoot className="bg-gray-50 dark:bg-gray-800/60 font-semibold">
                                    <tr>
                                        {isAdmin && <td />}
                                        <td className="px-4 py-2.5">Total · {rows.length} profissionais</td>
                                        <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{t.sessions}</td>
                                        <td className="hidden px-3 py-2.5 text-right tabular-nums md:table-cell">{brl(t.production)}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">{brl(t.commission)}</td>
                                        <td className="hidden px-3 py-2.5 text-right tabular-nums md:table-cell">{brl(t.advances)}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums">{brl(t.balance)}</td>
                                        <td className="px-3 py-2.5 text-xs font-normal text-gray-500 dark:text-gray-400">clique na linha para abrir</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </section>

            {aberto && (
                <ProfDrawer row={aberto} month={month} year={year} start={start} end={end} isAdmin={isAdmin}
                    onClose={() => setOpenId(null)} onChanged={() => void load()} />
            )}
        </div>
    );
}

// ── Painel lateral ──────────────────────────────────────────────────────────
interface Advance { _id: string; amount: number; date: string; type: string; notes?: string; status: string }

function ProfDrawer({ row, month, year, start, end, isAdmin, onClose, onChanged }: {
    row: Row; month: number; year: number; start: string; end: string; isAdmin: boolean; onClose: () => void; onChanged: () => void;
}) {
    const [sessions, setSessions] = useState<CommissionSessionItem[] | null>(null);
    const [advances, setAdvances] = useState<Advance[] | null>(null);
    const [settlements, setSettlements] = useState<SettlementItem[] | null>(null);
    const [advanceOpen, setAdvanceOpen] = useState(false);
    const [preview, setPreview] = useState<SettlementPreview | null>(null);
    const [busy, setBusy] = useState(false);
    const [cancelling, setCancelling] = useState<SettlementItem | null>(null);
    const [cancelReason, setCancelReason] = useState('');

    const loadDetails = useCallback(async () => {
        const id = row.doctorId;
        const [s, a, f] = await Promise.allSettled([
            API.get(`/v2/professionals/${id}/commission-sessions`, { params: { startDate: start, endDate: end } }),
            API.get(`/v2/professionals/${id}/advances`, { params: { startDate: start, endDate: end, status: 'active' } }),
            professionalResultsService.getSettlements(id),
        ]);
        setSessions(s.status === 'fulfilled' ? (s.value.data?.data?.items || []) : []);
        setAdvances(a.status === 'fulfilled' ? (a.value.data?.data || []) : []);
        setSettlements(f.status === 'fulfilled' ? f.value : []);
    }, [row.doctorId, start, end]);

    useEffect(() => { void loadDetails(); }, [loadDetails]);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const resumo = useMemo(() => (sessions ? summarizeCommissionSessions(sessions) : null), [sessions]);
    const fechadoNoMes = row.settlement?.status === 'closed';

    const abrirFechamento = async () => {
        setBusy(true);
        try {
            setPreview(await professionalResultsService.previewSettlement(row.doctorId, month, year));
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Não foi possível montar a prévia do fechamento');
        } finally { setBusy(false); }
    };
    const confirmarFechamento = async () => {
        if (!preview) return;
        setBusy(true);
        try {
            await professionalResultsService.closeSettlement(row.doctorId, month, year, { force: preview.hasFinancialIssues });
            toast.success('Mês fechado');
            setPreview(null);
            onChanged();
            void loadDetails();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Não foi possível fechar o mês');
        } finally { setBusy(false); }
    };
    const confirmarCancelamento = async () => {
        if (!cancelling) return;
        setBusy(true);
        try {
            await API.patch(`/v2/professionals/${row.doctorId}/settlements/${cancelling.periodYear}/${cancelling.periodMonth}/cancel`, { reason: cancelReason.trim() });
            toast.success('Fechamento cancelado');
            setCancelling(null);
            setCancelReason('');
            onChanged();
            void loadDetails();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Não foi possível cancelar o fechamento');
        } finally { setBusy(false); }
    };
    const cancelarAdiantamento = async (a: Advance) => {
        if (!await confirmDialog(`Cancelar o lançamento de ${brl(a.amount)} de ${fmtDay(a.date)}?`)) return;
        try {
            await API.patch(`/v2/professionals/${row.doctorId}/advances/${a._id}/cancel`);
            toast.success('Lançamento cancelado');
            onChanged();
            void loadDetails();
        } catch (e: any) {
            toast.error(e?.response?.data?.message || 'Não foi possível cancelar');
        }
    };

    const semRegra = noRule(row);

    return (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Detalhe de ${row.doctorName}`}>
            <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/30" onClick={onClose} />
            <aside className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white dark:bg-gray-900 shadow-xl">
                <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{row.doctorName}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{row.specialty || '—'}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Fechar painel" className="rounded-lg p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100"><X size={18} /></button>
                </header>

                <div className="space-y-5 px-5 py-4">
                    <section>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Saldo a pagar</div>
                        <div className="text-3xl font-bold tabular-nums text-emerald-700">{semRegra ? '—' : brl(row.balance)}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            {semRegra ? 'Sem regra de comissão cadastrada.' : `comissão ${brl(row.commission)} − adiantamentos do mês ${brl(row.advances)}`}
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Produção {brl(row.production?.total)} · Recebido {brl(row.received?.total)} · A receber {brl(row.receivables?.total)} · pela sessão de cada pagamento
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {isAdmin && !fechadoNoMes && !semRegra && (
                                <button type="button" disabled={busy} onClick={abrirFechamento}
                                    className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">Fechar o mês</button>
                            )}
                            <button type="button" onClick={() => setAdvanceOpen(true)}
                                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50">+ Adiantamento</button>
                        </div>
                    </section>

                    <section>
                        <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Sessões do mês</h4>
                        {!resumo ? <div className="h-8 animate-pulse rounded bg-gray-100 dark:bg-gray-800" /> : (
                            <div className="flex flex-wrap gap-1.5">
                                <Pill tone="green">Remuneradas {resumo.payable}</Pill>
                                <Pill tone={resumo.nonPayable ? 'amber' : 'gray'}>Sem repasse {resumo.nonPayable}</Pill>
                                <Pill tone="gray">Particular {resumo.byOrigin.particular}</Pill>
                                <Pill tone="blue">Convênio {resumo.byOrigin.convenio}</Pill>
                                <Pill tone="pink">Liminar {resumo.byOrigin.liminar}</Pill>
                            </div>
                        )}
                    </section>

                    <section>
                        <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Adiantamentos do mês</h4>
                        {!advances ? <div className="h-8 animate-pulse rounded bg-gray-100 dark:bg-gray-800" /> : advances.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum lançamento neste mês.</p>
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                {advances.map(a => (
                                    <li key={a._id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                                        <span>{fmtDay(a.date)} · {a.type === 'bonus' ? 'Bonificação' : a.type === 'adjustment' ? 'Ajuste' : 'Adiantamento'}{a.notes ? ` · ${a.notes}` : ''}</span>
                                        <span className="flex items-center gap-2">
                                            <b className="tabular-nums">{brl(a.amount)}</b>
                                            <button type="button" onClick={() => cancelarAdiantamento(a)} className="text-xs font-semibold text-red-700 hover:underline">Cancelar</button>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section>
                        <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Fechamentos</h4>
                        {!settlements ? <div className="h-8 animate-pulse rounded bg-gray-100 dark:bg-gray-800" /> : settlements.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum fechamento ainda.</p>
                        ) : (
                            <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                {settlements.map(s => (
                                    <li key={s._id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                                        <span>
                                            {pad(s.periodMonth)}/{s.periodYear} · comissão {brl(s.snapshot?.commission)} · saldo {brl(s.snapshot?.balance)}
                                        </span>
                                        <span className="flex items-center gap-2">
                                            {s.status === 'closed' ? <Pill tone="green">Fechado{s.closedAt ? ` ${fmtDay(s.closedAt)}` : ''}</Pill> : <Pill tone="gray">Cancelado</Pill>}
                                            {isAdmin && s.status === 'closed' && (
                                                <button type="button" onClick={() => { setCancelling(s); setCancelReason(''); }} className="text-xs font-semibold text-red-700 hover:underline">Cancelar fechamento</button>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>

                {preview && (
                    <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Fechar {pad(month)}/{year}?</h4>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Comissão {brl(preview.preview?.commission)} − adiantamentos {brl(preview.preview?.advances)} = saldo {brl(preview.preview?.balance)}.
                        </p>
                        {preview.alreadyClosed && <p className="mt-1 text-sm text-amber-800">Este mês já está fechado. Para refazer, cancele o fechamento na lista acima.</p>}
                        {preview.hasFinancialIssues && (
                            <p className="mt-1 text-sm text-amber-800">
                                Há {preview.financialIssues?.orphanSessions || 0} sessão(ões) sem pagamento identificado. Elas entram na comissão como estão; se o pagamento aparecer depois, cancele e feche de novo.
                            </p>
                        )}
                        <div className="mt-3 flex justify-end gap-2">
                            <button type="button" onClick={() => setPreview(null)} disabled={busy} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100">Voltar</button>
                            <button type="button" onClick={confirmarFechamento} disabled={busy || preview.alreadyClosed || !preview.canClose && !preview.hasFinancialIssues}
                                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">Confirmar fechamento</button>
                        </div>
                    </div>
                )}

                {cancelling && (
                    <div className="sticky bottom-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Cancelar o fechamento de {pad(cancelling.periodMonth)}/{cancelling.periodYear}?</h4>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Os adiantamentos vinculados voltam a ficar em aberto e o mês pode ser fechado de novo.</p>
                        <label className="mt-2 block text-xs font-semibold text-gray-700 dark:text-gray-300" htmlFor="cancel-reason">Motivo</label>
                        <textarea id="cancel-reason" value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={2}
                            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm" />
                        <div className="mt-3 flex justify-end gap-2">
                            <button type="button" onClick={() => setCancelling(null)} disabled={busy} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100">Voltar</button>
                            <button type="button" onClick={confirmarCancelamento} disabled={busy || cancelReason.trim().length < 5}
                                className="rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50">Cancelar fechamento</button>
                        </div>
                    </div>
                )}
            </aside>

            <ProfessionalAdvanceModal open={advanceOpen} onClose={() => setAdvanceOpen(false)} doctorId={row.doctorId} doctorName={row.doctorName}
                onSuccess={() => { setAdvanceOpen(false); onChanged(); void loadDetails(); }} />
        </div>
    );
}
