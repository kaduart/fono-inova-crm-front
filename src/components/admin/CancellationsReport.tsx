import { Clock, HelpCircle, Loader2, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import cancellationReportService, {
    type CancellationDetailItem,
    type CancellationReport,
    type CancellationPatientRow,
    type CancellationProfessionalRow,
    type RequesterKey,
} from '../../services/cancellationReportService';
import { extractErrorMessage } from '../../utils/errorUtils';

/**
 * Cancelamentos — tela para o comercial/gestão.
 *   1. Quem solicita mais?  → três cards (paciente/responsável, profissional, clínica)
 *   2. Quais pessoas?       → abas com ranking (nome, quantidade, <24h, último)
 *   3. O que aconteceu?     → painel lateral com o histórico caso a caso
 * Toda conta (contagem, %, taxa, comparação) vem do backend — aqui só exibimos.
 */

type TabKey = 'patient' | 'professional' | 'clinic' | 'unspecified';
type PresetKey = 'month' | 'quarter' | 'custom';

const REPEAT_THRESHOLD = 3;
const PAGE_SIZE = 10;

const TAB_LABEL: Record<TabKey, string> = {
    patient: 'Pacientes que cancelaram',
    professional: 'Profissionais que cancelaram',
    clinic: 'Clínica',
    unspecified: 'Sem identificação',
};

const CARD_LABEL: Record<Exclude<TabKey, 'unspecified'>, string> = {
    patient: 'Pacientes/responsáveis',
    professional: 'Profissionais',
    clinic: 'Clínica',
};

const EMPTY_TEXT: Record<'patient' | 'professional' | 'clinic', string> = {
    patient: 'Nenhum cancelamento identificado como pedido por pacientes neste período.',
    professional: 'Nenhum cancelamento identificado como pedido por profissionais neste período.',
    clinic: 'Nenhum cancelamento identificado como pedido pela clínica neste período.',
};

const CHANNEL_LABELS: Record<string, string> = {
    agenda_service: 'agenda externa',
    amanda: 'Amanda',
    legacy_client: 'tela antiga',
    historico: 'registros anteriores ao novo campo',
};

const isoDate = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

function presetRange(preset: PresetKey): { startDate: string; endDate: string } {
    const now = new Date();
    if (preset === 'quarter') {
        return { startDate: isoDate(new Date(now.getFullYear(), now.getMonth() - 2, 1)), endDate: isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
    }
    return { startDate: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
}

const fmtDate = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
const fmtDateTime = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

function formatAdvance(hours: number | null): string {
    if (hours === null) return 'Não calculável';
    if (hours < 0) return 'Pedido depois do horário do atendimento';
    if (hours < 24) return `${Math.round(hours)} h antes`;
    const days = Math.floor(hours / 24);
    return `${days} dia${days > 1 ? 's' : ''} antes`;
}

/** "3 a mais" / "2 a menos" / "igual" — sempre em texto (a cor só reforça). */
function diffText(diff: number): string {
    if (diff === 0) return 'igual ao período anterior';
    return `${Math.abs(diff)} a ${diff > 0 ? 'mais' : 'menos'} que no período anterior`;
}
const diffTone = (diff: number) => (diff > 0 ? 'text-orange-700' : diff < 0 ? 'text-emerald-700' : 'text-gray-500');

type PersonRow = {
    id: string;
    name: string;
    sub?: string | null;
    count: number;
    late: number;
    last: string | null;
    rate?: number;
    drill: { title: string; requester: RequesterKey; doctorId?: string; patientId?: string };
};

interface DrawerState {
    title: string;
    items: CancellationDetailItem[];
    loading: boolean;
}

export default function CancellationsReport() {
    const [preset, setPreset] = useState<PresetKey>('month');
    const [range, setRange] = useState(() => presetRange('month'));
    const [report, setReport] = useState<CancellationReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [helpOpen, setHelpOpen] = useState(false);

    const [tab, setTab] = useState<TabKey>('patient');
    const pickedManually = useRef(false);
    const chooseTab = (key: TabKey) => { pickedManually.current = true; setTab(key); };
    const [search, setSearch] = useState('');
    const [onlyRepeat, setOnlyRepeat] = useState(false);
    const [onlyLate, setOnlyLate] = useState(false);
    const [sort, setSort] = useState<'count' | 'late' | 'name' | 'last'>('count');
    const [page, setPage] = useState(1);

    const [casesList, setCasesList] = useState<CancellationDetailItem[]>([]);
    const [casesLoading, setCasesLoading] = useState(false);
    const [drawer, setDrawer] = useState<DrawerState | null>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

    const invalidRange = !range.startDate || !range.endDate || range.startDate > range.endDate;

    const choosePreset = (p: PresetKey) => {
        setPreset(p);
        if (p !== 'custom') setRange(presetRange(p));
    };

    // Só a ÚLTIMA requisição vale: trocar o período rápido não pode deixar a resposta antiga
    // (outro período) sobrescrever a nova sob o título do período atual.
    const loadSeq = useRef(0);
    const load = useCallback(async () => {
        if (invalidRange) return;
        const seq = ++loadSeq.current;
        setLoading(true);
        setError('');
        try {
            const data = await cancellationReportService.getReport(range);
            if (seq === loadSeq.current) setReport(data);
        } catch (e) {
            if (seq !== loadSeq.current) return;
            setError(extractErrorMessage(e, 'Erro ao carregar o relatório de cancelamentos'));
            setReport(null);
        } finally {
            if (seq === loadSeq.current) setLoading(false);
        }
    }, [range, invalidRange]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { setPage(1); }, [tab, search, onlyRepeat, onlyLate, sort, range]);

    // Abas "Clínica" e "Sem identificação" listam os atendimentos (não há ranking de pessoas)
    useEffect(() => {
        if (tab !== 'clinic' && tab !== 'unspecified') return;
        if (invalidRange) return;
        let alive = true;
        setCasesLoading(true);
        cancellationReportService
            .getDetails({ ...range, requester: tab })
            .then((items) => { if (alive) setCasesList(items); })
            .catch((e) => { if (alive) setError(extractErrorMessage(e, 'Erro ao carregar os atendimentos')); })
            .finally(() => { if (alive) setCasesLoading(false); });
        return () => { alive = false; };
    }, [tab, range, invalidRange]);

    useEffect(() => {
        if (!drawer) return;
        closeRef.current?.focus();
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [drawer]);

    const openHistory = useCallback(async (d: PersonRow['drill']) => {
        setDrawer({ title: d.title, items: [], loading: true });
        try {
            const items = await cancellationReportService.getDetails({ ...range, requester: d.requester, doctorId: d.doctorId, patientId: d.patientId });
            setDrawer({ title: d.title, items, loading: false });
        } catch (e) {
            setError(extractErrorMessage(e, 'Erro ao carregar o histórico'));
            setDrawer(null);
        }
    }, [range]);

    const summary = report?.summary;
    const comparison = report?.comparison;
    const total = summary?.totalCanceled ?? 0;
    const unspecified = summary?.unspecified ?? 0;
    const identified = total - unspecified;
    const noneIdentified = total > 0 && identified === 0;

    useEffect(() => {
        if (report && !pickedManually.current) setTab(noneIdentified ? 'unspecified' : 'patient');
    }, [report, noneIdentified]);

    const rows: PersonRow[] = useMemo(() => {
        if (!report) return [];
        if (tab === 'patient') {
            return report.patients.filter((p: CancellationPatientRow) => p.requestedByPatient > 0).map((p) => ({
                id: p.patientId, name: p.name, count: p.requestedByPatient, late: p.lessThan24hByPatient, last: p.lastRequestedByPatient ?? null,
                drill: { title: p.name, requester: 'patient' as const, patientId: p.patientId },
            }));
        }
        if (tab === 'professional') {
            return report.professionals.filter((p: CancellationProfessionalRow) => p.requestedByProfessional > 0).map((p) => ({
                id: p.doctorId, name: p.name, sub: p.specialty, count: p.requestedByProfessional, late: p.lessThan24hByProfessional,
                last: p.lastRequestedByProfessional ?? null, rate: p.professionalRate,
                drill: { title: p.name, requester: 'professional' as const, doctorId: p.doctorId },
            }));
        }
        return [];
    }, [report, tab]);

    const visibleRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = rows
            .filter((r) => !q || r.name.toLowerCase().includes(q))
            .filter((r) => !onlyRepeat || r.count >= REPEAT_THRESHOLD)
            .filter((r) => !onlyLate || r.late > 0);
        const by = {
            count: (a: PersonRow, b: PersonRow) => b.count - a.count || a.name.localeCompare(b.name),
            late: (a: PersonRow, b: PersonRow) => b.late - a.late || b.count - a.count,
            name: (a: PersonRow, b: PersonRow) => a.name.localeCompare(b.name),
            last: (a: PersonRow, b: PersonRow) => (b.last || '').localeCompare(a.last || ''),
        }[sort];
        return [...list].sort(by);
    }, [rows, search, onlyRepeat, onlyLate, sort]);

    const pages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
    const pageRows = visibleRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const tabCount = (k: TabKey) => report?.byRequester.find((r) => r.requester === k)?.count ?? 0;
    const isPeopleTab = tab === 'patient' || tab === 'professional';

    return (
        <div className="space-y-5 text-left">
            {/* ── Cabeçalho ─────────────────────────────────────────── */}
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div><h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Cancelamentos</h2><p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{fmtDate(range.startDate)} a {fmtDate(range.endDate)}</p></div>
                    <button
                        type="button"
                        onClick={() => setHelpOpen((v) => !v)}
                        aria-expanded={helpOpen}
                        aria-label="Como os números são calculados"
                        className="rounded-full p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                        <HelpCircle className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                    <div role="group" aria-label="Período" className="inline-flex max-w-full overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm">
                        {([['month', 'Este mês'], ['quarter', 'Últimos 3 meses'], ['custom', 'Personalizado']] as const).map(([k, label]) => (
                            <button
                                key={k}
                                type="button"
                                aria-pressed={preset === k}
                                onClick={() => choosePreset(k)}
                                className={`px-3 py-1.5 font-medium ${preset === k ? 'bg-emerald-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    {preset === 'custom' && (
                        <div className="flex items-center gap-2 text-sm">
                            <input aria-label="Data inicial" type="date" value={range.startDate} onChange={(e) => setRange((r) => ({ ...r, startDate: e.target.value }))} className="rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1.5" />
                            <span className="text-gray-500 dark:text-gray-400">até</span>
                            <input aria-label="Data final" type="date" value={range.endDate} onChange={(e) => setRange((r) => ({ ...r, endDate: e.target.value }))} className="rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1.5" />
                        </div>
                    )}
                </div>
            </header>

            {helpOpen && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-4 py-3 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                    <p className="mb-1 font-semibold text-gray-700 dark:text-gray-300">Como os números são calculados</p>
                    <ul className="list-disc space-y-0.5 pl-4">
                        <li>O período vale para tudo na tela e usa a <strong>data do atendimento</strong>.</li>
                        <li>Cada atendimento cancelado conta <strong>uma vez</strong>; se foi cancelado, reativado e cancelado de novo, vale o último solicitante.</li>
                        <li>Faltas (paciente não compareceu) e cancelamentos automáticos do sistema não entram aqui.</li>
                        <li>&quot;Taxa&quot; do profissional = cancelamentos que ele pediu ÷ todos os agendamentos dele no período.</li>
                        <li>Antecedência = horário do atendimento − momento do pedido. Sem a hora do pedido, usamos a hora do registro (aproximação).</li>
                        <li>Nunca deduzimos quem pediu: o que não foi informado fica em &quot;Sem identificação&quot;.</li>
                    </ul>
                </div>
            )}

            {invalidRange && <Alert tone="amber">Período inválido: a data inicial deve ser anterior à final.</Alert>}
            {error && <Alert tone="red">{error}</Alert>}
            {loading && !report && <div className="flex items-center gap-2 py-10 text-gray-500 dark:text-gray-400"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>}

            {report && summary && total === 0 && <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-10"><h3 className="font-semibold text-gray-900 dark:text-gray-100">Nenhum cancelamento neste período</h3><p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Escolha outro período para consultar os registros.</p></div>}
            {report && summary && total > 0 && (
                <>
                    {/* ── 1. Quem solicita mais? ─────────────────────── */}
                    {/* linha de apoio */}
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong className="text-gray-900 dark:text-gray-100">{total}</strong> cancelamento{total === 1 ? '' : 's'} no período
                        {summary.totalAppointments > 0 && (
                            <>
                                {' '}· <span className="rounded-md bg-red-50 px-1.5 py-0.5 font-semibold text-red-700" title={`${total} de ${summary.totalAppointments} sessões agendadas no período`}>
                                    {Number(summary.cancelRate || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% das sessões
                                </span>
                            </>
                        )}
                        {comparison && (
                            <>
                                {' '}· <span className={`font-medium ${diffTone(comparison.total.diff)}`}>{diffText(comparison.total.diff)}</span>

                            </>
                        )}
                        {!noneIdentified && unspecified > 0 && (
                            <>
                                {' '}· <button type="button" onClick={() => chooseTab('unspecified')} className="font-medium text-gray-700 dark:text-gray-300 underline decoration-dotted underline-offset-2 hover:text-gray-900">
                                    {unspecified} sem identificação
                                </button>
                                {Object.entries(summary.unspecifiedByChannel || {}).length > 0 && (
                                    <span className="text-gray-500 dark:text-gray-400"> ({Object.entries(summary.unspecifiedByChannel || {}).map(([c, n]) => `${n} ${CHANNEL_LABELS[c] || c}`).join(' · ')})</span>
                                )}
                            </>
                        )}
                    </p>
                    {noneIdentified && (
                        <Alert tone="amber">
                            Há {total} cancelamento{total > 1 ? 's' : ''} neste período sem identificação de quem solicitou. Os novos cancelamentos já registram o solicitante.
                        </Alert>
                    )}

                    {!noneIdentified && <section aria-label="Resumo por solicitante" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {(['patient', 'professional', 'clinic'] as const).map((k) => {
                            const row = report.byRequester.find((r) => r.requester === k);
                            const cmp = comparison?.byRequester.find((r) => r.requester === k);
                            const selected = tab === k;
                            return (
                                <button
                                    key={k}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => chooseTab(k)}
                                    className={`rounded-lg border bg-white dark:bg-gray-900 p-4 text-left transition-colors hover:border-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${selected ? 'border-emerald-600 ring-1 ring-emerald-600' : 'border-gray-200 dark:border-gray-700'}`}
                                >
                                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{CARD_LABEL[k]}</div>
                                    {noneIdentified ? (
                                        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Sem dados identificados</div>
                                    ) : (
                                        <>
                                            <div className="mt-1 flex items-baseline gap-2">
                                                <span className="text-2xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{row?.count ?? 0}</span>
                                                <span className="text-sm tabular-nums text-gray-500 dark:text-gray-400">{row?.percent ?? 0}% dos cancelamentos</span>
                                            </div>
                                            {cmp && comparison?.byRequesterReliable && (
                                                <div className={`mt-1 text-xs font-medium ${diffTone(cmp.diff)}`}>{diffText(cmp.diff)}</div>
                                            )}
                                        </>
                                    )}
                                </button>
                            );
                        })}
                    </section>}

                    {comparison && !comparison.byRequesterReliable && total > 0 && !noneIdentified && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Comparação por solicitante indisponível: a identificação de quem pediu foi muito diferente entre os dois períodos
                            ({comparison.coverage.current.percent ?? 0}% agora × {comparison.coverage.previous.percent ?? 0}% antes).
                        </p>
                    )}
                    {!noneIdentified && unspecified > 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Identificados: {report.coverage?.percent ?? 0}% dos cancelamentos. Os demais ficam visíveis em &quot;Sem identificação&quot;.</p>
                    )}

                    {/* ── 2. Quais pessoas? ──────────────────────────── */}
                    <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                        <div role="tablist" aria-label="Detalhamento" className="flex flex-wrap gap-2 border-b border-gray-100 dark:border-gray-800 px-3 py-2.5">
                            {(['patient', 'professional', 'clinic', 'unspecified'] as const).map((k) => (
                                <button
                                    key={k}
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === k}
                                    onClick={() => chooseTab(k)}
                                    className={`rounded-full border px-3 py-1.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${tab === k ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50'}`}
                                >
                                    {TAB_LABEL[k]} <span className="ml-1 rounded-full bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-xs tabular-nums text-gray-600 dark:text-gray-400">{tabCount(k)}</span>
                                </button>
                            ))}
                        </div>

                        <div role="tabpanel" className="p-4">
                            {isPeopleTab && noneIdentified && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">{tab === 'patient' || tab === 'professional' ? EMPTY_TEXT[tab] : ''}</p>
                            )}

                            {isPeopleTab && !noneIdentified && (
                                <>
                                    <div className="mb-3 flex flex-wrap items-center gap-2">
                                        <label className="relative">
                                            <span className="sr-only">Buscar por nome</span>
                                            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                                            <input
                                                type="search"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                placeholder="Buscar por nome"
                                                className="w-56 rounded-lg border border-gray-300 dark:border-gray-600 py-2 pl-8 pr-3 text-sm"
                                            />
                                        </label>
                                        <Chip active={onlyRepeat} onClick={() => setOnlyRepeat((v) => !v)}>{REPEAT_THRESHOLD} ou mais cancelamentos</Chip>
                                        <Chip active={onlyLate} onClick={() => setOnlyLate((v) => !v)}>Com menos de 24h</Chip>
                                        <label className="ml-auto text-sm text-gray-600 dark:text-gray-400">
                                            <span className="mr-1">Ordenar por</span>
                                            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm">
                                                <option value="count">Mais cancelamentos</option>
                                                <option value="late">Mais com menos de 24h</option>
                                                <option value="last">Cancelamento mais recente</option>
                                                <option value="name">Nome (A–Z)</option>
                                            </select>
                                        </label>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="block w-full text-sm sm:table">
                                            <thead className="hidden text-left text-xs font-medium text-gray-500 dark:text-gray-400 sm:table-header-group">
                                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                                    <th className="py-2 pr-3">{tab === 'patient' ? 'Paciente' : 'Profissional'}</th>
                                                    <th className="px-2 text-right">Cancelamentos</th>
                                                    {tab === 'professional' && (
                                                        <th className="px-2 text-right" title="Cancelamentos pedidos por ele ÷ todos os agendamentos dele no período">
                                                            Taxa sobre seus agendamentos
                                                        </th>
                                                    )}
                                                    <th className="px-2 text-right">Com menos de 24h</th>
                                                    {tab === 'patient' && <th className="px-2 text-right">Último cancelamento</th>}
                                                    <th className="px-2"><span className="sr-only">Ações</span></th>
                                                </tr>
                                            </thead>
                                            <tbody className="block sm:table-row-group">
                                                {pageRows.length === 0 && (
                                                    <tr><td colSpan={5} className="py-6 text-left text-gray-500 dark:text-gray-400">{rows.length === 0 ? EMPTY_TEXT[tab as 'patient' | 'professional'] : 'Ninguém encontrado com esses filtros.'}</td></tr>
                                                )}
                                                {pageRows.map((r) => (
                                                    <tr key={r.id} className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-gray-100 dark:border-gray-800 py-4 sm:table-row sm:py-0">
                                                        <td className="col-span-2 sm:py-2.5 sm:pr-3">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="font-medium text-gray-900 dark:text-gray-100">{r.name}</span>
                                                                {r.count >= REPEAT_THRESHOLD && (
                                                                    <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs text-orange-800">{r.count} no período</span>
                                                                )}
                                                            </div>
                                                            {r.sub && <div className="text-xs text-gray-500 dark:text-gray-400">{r.sub}</div>}
                                                        </td>
                                                        <td data-label="Cancelamentos" className="text-left font-semibold tabular-nums text-gray-900 dark:text-gray-100 before:block before:text-xs before:font-normal before:text-gray-500 before:content-[attr(data-label)] sm:px-2 sm:text-right sm:before:hidden">{r.count}</td>
                                                        {tab === 'professional' && <td data-label="Taxa" className="text-left before:block before:text-xs before:text-gray-500 before:content-[attr(data-label)] sm:before:hidden sm:px-2 sm:text-right tabular-nums">{r.rate}%</td>}
                                                        <td data-label="Com menos de 24h" className={`text-left before:block before:text-xs before:text-gray-500 before:content-[attr(data-label)] sm:before:hidden sm:px-2 sm:text-right tabular-nums ${r.late > 0 ? 'font-medium text-orange-700' : 'text-gray-500 dark:text-gray-400'}`}>{r.late}</td>
                                                        {tab === 'patient' && <td data-label="Último cancelamento" className="text-left tabular-nums text-gray-700 dark:text-gray-300 before:block before:text-xs before:text-gray-500 before:content-[attr(data-label)] sm:px-2 sm:text-right sm:before:hidden">{r.last ? fmtDate(r.last) : <span className="text-gray-500 dark:text-gray-400">sem data</span>}</td>}
                                                        <td className="col-span-2 text-right sm:px-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => openHistory(r.drill)}
                                                                aria-label={`Ver histórico de ${r.name}`}
                                                                className="rounded-lg px-2 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                                                            >
                                                                Ver histórico
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {pages > 1 && (
                                        <nav aria-label="Paginação" className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                                            <span>{visibleRows.length} resultado{visibleRows.length === 1 ? '' : 's'}</span>
                                            <div className="flex items-center gap-2">
                                                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1 disabled:opacity-40">Anterior</button>
                                                <span className="tabular-nums">Página {page} de {pages}</span>
                                                <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1 disabled:opacity-40">Próxima</button>
                                            </div>
                                        </nav>
                                    )}
                                </>
                            )}

                            {!isPeopleTab && (
                                <CasesTable
                                    loading={casesLoading}
                                    items={casesList}
                                    emptyText={tab === 'clinic' ? 'Nenhum cancelamento pedido pela clínica neste período.' : 'Todos os cancelamentos do período têm solicitante identificado.'}
                                    onOpen={(it) => setDrawer({ title: it.patientName || 'Atendimento', items: [it], loading: false })}
                                />
                            )}
                        </div>
                    </section>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Faltas (paciente não compareceu): <strong>{summary.absences}</strong> no período — não entram nos cancelamentos.
                    </p>
                </>
            )}

            {/* ── 3. O que aconteceu? (painel lateral) ───────────────── */}
            {drawer && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setDrawer(null)}>
                    <aside
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Histórico de ${drawer.title}`}
                        className="flex h-full w-full max-w-md flex-col bg-white dark:bg-gray-900 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3 border-b border-gray-200 dark:border-gray-700 px-5 py-4">
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{drawer.title}</h3>
                                {!drawer.loading && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {drawer.items.length} cancelamento{drawer.items.length === 1 ? '' : 's'} · {drawer.items.filter((i) => i.lessThan24h).length} com menos de 24h
                                        {' '}· {fmtDate(range.startDate)} a {fmtDate(range.endDate)}
                                    </p>
                                )}
                            </div>
                            <button ref={closeRef} type="button" onClick={() => setDrawer(null)} aria-label="Fechar" className="rounded-lg p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                            {drawer.loading && <div className="flex items-center gap-2 py-8 text-gray-500 dark:text-gray-400"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>}
                            {!drawer.loading && drawer.items.length === 0 && <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Nada para mostrar.</p>}
                            {drawer.items.map((it) => <CaseCard key={it.appointmentId} it={it} />)}
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}

function CaseCard({ it }: { it: CancellationDetailItem }) {
    const requestedAt = it.requestedAt || it.registeredAt;
    return (
        <article className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{fmtDate(it.date)}{it.time ? ` às ${it.time}` : ''}</h4>
                {it.lessThan24h && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-800">
                        <Clock className="h-3 w-3" /> Menos de 24h
                    </span>
                )}
            </div>
            <dl className="mt-2 grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-1">
                <dt className="text-gray-500 dark:text-gray-400">Paciente</dt><dd className="text-gray-900 dark:text-gray-100">{it.patientName || '—'}</dd>
                <dt className="text-gray-500 dark:text-gray-400">Profissional</dt><dd className="text-gray-900 dark:text-gray-100">{it.doctorName || '—'}</dd>
                <dt className="text-gray-500 dark:text-gray-400">Quem solicitou</dt><dd className="text-gray-900 dark:text-gray-100">{it.requesterLabel}</dd>
                <dt className="text-gray-500 dark:text-gray-400">Motivo</dt><dd className="text-gray-900 dark:text-gray-100">{it.reason || '—'}</dd>
                <dt className="text-gray-500 dark:text-gray-400">Pedido em</dt>
                <dd className="text-gray-900 dark:text-gray-100">
                    {fmtDateTime(requestedAt)}
                    {it.requestedAtApproximate && <span className="block text-xs text-gray-500 dark:text-gray-400">Aproximado: usamos a hora do registro.</span>}
                </dd>
                <dt className="text-gray-500 dark:text-gray-400">Antecedência</dt>
                <dd className={it.lessThan24h ? 'font-medium text-orange-800' : 'text-gray-900'}>{formatAdvance(it.hoursInAdvance)}</dd>
                <dt className="text-gray-500 dark:text-gray-400">Registrado por</dt><dd className="text-gray-900 dark:text-gray-100">{it.registeredBy || '—'}</dd>
            </dl>
        </article>
    );
}

function CasesTable({ loading, items, emptyText, onOpen }: { loading: boolean; items: CancellationDetailItem[]; emptyText: string; onOpen: (it: CancellationDetailItem) => void }) {
    if (loading) return <div className="flex items-center gap-2 py-8 text-gray-500 dark:text-gray-400"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>;
    if (items.length === 0) return <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{emptyText}</p>;
    return (
        <div className="overflow-x-auto">
            <table className="block w-full text-sm sm:table">
                <thead className="hidden text-left text-xs font-medium text-gray-500 dark:text-gray-400 sm:table-header-group">
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="py-2 pr-3">Atendimento</th>
                        <th className="px-2">Paciente</th>
                        <th className="px-2">Profissional</th>
                        <th className="px-2">Motivo</th>
                        <th className="px-2"><span className="sr-only">Ações</span></th>
                    </tr>
                </thead>
                <tbody className="block sm:table-row-group">
                    {items.map((it) => (
                        <tr key={it.appointmentId} className="grid grid-cols-2 gap-3 border-b border-gray-100 dark:border-gray-800 py-4 sm:table-row sm:py-0 sm:align-top">
                            <td data-label="Atendimento" className="col-span-2 before:block before:text-xs before:text-gray-500 before:content-[attr(data-label)] sm:whitespace-nowrap sm:py-2.5 sm:pr-3 sm:before:hidden">{fmtDate(it.date)}{it.time ? ` ${it.time}` : ''}</td>
                            <td data-label="Paciente" className="min-w-0 break-words text-gray-900 dark:text-gray-100 before:block before:text-xs before:text-gray-500 before:content-[attr(data-label)] sm:px-2 sm:before:hidden">{it.patientName || '—'}</td>
                            <td data-label="Profissional" className="min-w-0 break-words text-gray-700 dark:text-gray-300 before:block before:text-xs before:text-gray-500 before:content-[attr(data-label)] sm:px-2 sm:before:hidden">{it.doctorName || '—'}</td>
                            <td data-label="Motivo" className="col-span-2 min-w-0 break-words text-gray-700 dark:text-gray-300 before:block before:text-xs before:text-gray-500 before:content-[attr(data-label)] sm:max-w-[16rem] sm:px-2 sm:before:hidden">{it.reason || '—'}</td>
                            <td className="col-span-2 text-right sm:px-2">
                                <button type="button" onClick={() => onOpen(it)} aria-label={`Ver detalhes de ${it.patientName || 'atendimento'}`} className="rounded-lg px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-50">
                                    Ver detalhes
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={`rounded-full border px-3 py-1.5 text-sm ${active ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50'}`}
        >
            {children}
        </button>
    );
}

function Alert({ tone, children }: { tone: 'amber' | 'red'; children: ReactNode }) {
    const cls = tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-700';
    return <div role={tone === 'red' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-2 text-sm ${cls}`}>{children}</div>;
}
