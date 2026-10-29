/**
 * DoctorInsightsSection — camada de visualização de analytics clínico.
 *
 * Componente dumb: recebe tudo via props de useDoctorInsights().
 * Não faz fetch, não conhece a origem dos dados.
 *
 * Período, totais e frequência vêm do back (/doctors/:id/attendance-summary?range=…), lidos dos
 * agendamentos com a mesma conta do Dashboard: comparecimento = realizadas ÷ previstas até agora.
 */

import { AlertTriangle, CalendarPlus, MessageCircle, RefreshCw, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DoctorInsights, PeriodTotals, TimeRange } from '../../hooks/useDoctorInsights';
import type { AttendanceSummary, PatientRisk } from '../../utils/derivePatientRisk';
import { toDateString } from '../../utils/dateUtils';
import { whatsappLink } from './overview/agendaUtils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    insights: DoctorInsights | null;
    loading: boolean;
    error: string | null;
    timeRange: TimeRange;
    onTimeRangeChange: (range: TimeRange) => void;
    onRefresh: () => void;
    onPatientClick?: (patientId: string, patientName: string) => void;
    onSchedule?: (patientId: string, patientName: string, hints?: { lastSessionType?: string }) => void;
    onViewHistory?: (patientId: string, patientName: string) => void;
}

const TIME_RANGES: { value: TimeRange; label: string }[] = [
    { value: 'month', label: 'Este mês' },
    { value: 'last_month', label: 'Mês passado' },
    { value: '7d', label: '7 dias' },
    { value: '30d', label: '30 dias' },
    { value: '90d', label: '90 dias' },
    { value: '6m', label: '6 meses' },
];

type RiskFilter = 'all' | 'no_next' | 'missed' | 'low_frequency' | 'no_session';
type FreqFilter = 'all' | 'low' | 'mid' | 'high' | 'none';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const btn = 'inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1';
const btnGhost = `${btn} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`;
const btnSoft = `${btn} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`;
const card = 'rounded-2xl border border-gray-200 bg-white min-w-0';

function ddmm(iso?: string | null) {
    const ymd = toDateString(iso || '');
    if (!ymd) return '—';
    const [, m, d] = ymd.split('-');
    return `${d}/${m}`;
}

function nextLabel(n?: { date: string; time?: string | null } | null) {
    if (!n) return null;
    const ymd = toDateString(n.date);
    const [y, m, d] = ymd.split('-').map(Number);
    const wd = new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    return `${wd}, ${ddmm(n.date)}${n.time ? ` · ${n.time}` : ''}`;
}

function freqTone(f: number | null) {
    if (f === null) return { bar: 'bg-gray-300', text: 'text-gray-600' };
    if (f >= 90) return { bar: 'bg-emerald-600', text: 'text-emerald-800' };
    if (f >= 75) return { bar: 'bg-amber-500', text: 'text-amber-800' };
    return { bar: 'bg-red-600', text: 'text-red-700' };
}

function previousLabel(range: TimeRange, start?: string) {
    if (range === 'month') return 'vs mesmo período do mês anterior';
    if (range === 'last_month' && start) {
        const [y, m] = toDateString(start).split('-').map(Number);
        return `vs ${new Date(y, m - 2, 1).toLocaleDateString('pt-BR', { month: 'long' })}`;
    }
    const n = { '7d': 7, '30d': 30, '90d': 90, '6m': 182 }[range as '7d'];
    return n ? `vs ${n === 182 ? '6 meses' : `${n} dias`} anteriores` : 'vs período anterior';
}

function Delta({ now, before, unit = '', invert = false }: { now: number | null; before: number | null; unit?: string; invert?: boolean }) {
    if (now === null || before === null) return null;
    const d = now - before;
    if (d === 0) return <span className="font-semibold text-gray-700">igual</span>;
    const good = invert ? d < 0 : d > 0;
    return <span className={`font-semibold ${good ? 'text-emerald-800' : 'text-red-700'}`}>{d > 0 ? '+' : '−'}{Math.abs(d)}{unit}</span>;
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button type="button" aria-pressed={on} onClick={onClick}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${on ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
            {children}
        </button>
    );
}

function StackBar({ parts, label }: { parts: { value: number; color: string }[]; label: string }) {
    const total = parts.reduce((a, p) => a + p.value, 0);
    return (
        <div role="img" aria-label={label} className="flex h-3.5 overflow-hidden rounded-full bg-gray-200">
            {total > 0 && parts.map((p, i) => p.value > 0 && <i key={i} className={`block h-full ${p.color}`} style={{ width: `${(p.value / total) * 100}%` }} />)}
        </div>
    );
}

function Legend({ items }: { items: { value: number; label: string; color: string }[] }) {
    return (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map(it => (
                <div key={it.label}>
                    <dd className="text-xl font-semibold tabular-nums text-gray-900">{it.value}</dd>
                    <dt className="flex items-center gap-1.5 text-xs text-gray-600"><i className={`inline-block h-2 w-2 rounded-sm ${it.color}`} aria-hidden />{it.label}</dt>
                </div>
            ))}
        </dl>
    );
}

function InsightsSkeleton() {
    return (
        <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Carregando insights">
            <div className="flex gap-2">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-9 w-24 rounded-full bg-gray-200" />)}</div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-200" />)}</div>
            <div className="grid gap-4 lg:grid-cols-2"><div className="h-36 rounded-2xl bg-gray-200" /><div className="h-36 rounded-2xl bg-gray-200" /></div>
            <div className="h-64 rounded-2xl bg-gray-200" />
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DoctorInsightsSection({
    insights,
    loading,
    error,
    timeRange,
    onTimeRangeChange,
    onRefresh,
    onPatientClick,
    onSchedule,
    onViewHistory,
}: Props) {
    const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
    const [freqFilter, setFreqFilter] = useState<FreqFilter>('all');
    const [showAllRisk, setShowAllRisk] = useState(false);

    const riskPatients = insights?.riskPatients ?? [];
    const attendanceData = insights?.attendanceData ?? [];

    const riskCounts = useMemo(() => ({
        all: riskPatients.length,
        no_next: riskPatients.filter(r => r.flags?.includes('no_next')).length,
        missed: riskPatients.filter(r => r.flags?.includes('missed')).length,
        low_frequency: riskPatients.filter(r => r.flags?.includes('low_frequency')).length,
        no_session: riskPatients.filter(r => r.flags?.includes('no_session')).length,
    }), [riskPatients]);
    const riskShown = riskFilter === 'all' ? riskPatients : riskPatients.filter(r => r.flags?.includes(riskFilter));

    const freqOf = (p: AttendanceSummary) => (typeof p.frequency === 'number' ? p.frequency : null);
    const freqCounts = useMemo(() => ({
        all: attendanceData.length,
        low: attendanceData.filter(p => freqOf(p) !== null && (freqOf(p) as number) < 75).length,
        mid: attendanceData.filter(p => freqOf(p) !== null && (freqOf(p) as number) >= 75 && (freqOf(p) as number) < 90).length,
        high: attendanceData.filter(p => (freqOf(p) ?? -1) >= 90).length,
        none: attendanceData.filter(p => freqOf(p) === null).length,
    }), [attendanceData]);
    const freqShown = useMemo(() => {
        const f = (p: AttendanceSummary) => {
            const v = freqOf(p);
            if (freqFilter === 'low') return v !== null && v < 75;
            if (freqFilter === 'mid') return v !== null && v >= 75 && v < 90;
            if (freqFilter === 'high') return v !== null && v >= 90;
            if (freqFilter === 'none') return v === null;
            return true;
        };
        return attendanceData.filter(f).sort((a, b) => (freqOf(a) ?? 101) - (freqOf(b) ?? 101));
    }, [attendanceData, freqFilter]);

    const header = (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
                {TIME_RANGES.map(({ value, label }) => (
                    <Chip key={value} on={timeRange === value} onClick={() => onTimeRangeChange(value)}>{label}</Chip>
                ))}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
                {insights?.range && <span>{ddmm(insights.range.start)} a {ddmm(insights.range.end)}</span>}
                <button type="button" onClick={onRefresh} className={btnGhost}>
                    <RefreshCw className="h-4 w-4" aria-hidden />Atualizar
                </button>
            </div>
        </div>
    );

    if (loading) return <div className="space-y-4 text-left">{header}<InsightsSkeleton /></div>;

    if (error) {
        return (
            <div className="space-y-4 text-left">
                {header}
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                    <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" aria-hidden />{error}</span>
                    <button type="button" onClick={onRefresh} className={btnGhost}><RefreshCw className="h-4 w-4" aria-hidden />Tentar de novo</button>
                </div>
            </div>
        );
    }

    if (!insights) return null;

    const period: PeriodTotals | null = insights.period;
    const previous: PeriodTotals | null = insights.previous;
    const prevText = previousLabel(timeRange, insights.range?.start);
    const missedPct = period && period.expected > 0 ? Math.round((period.missed / period.expected) * 100) : null;

    const openPatient = (id: string, name: string) => (onPatientClick || onViewHistory)?.(id, name);

    const kpi = (label: string, value: React.ReactNode, sub: React.ReactNode) => (
        <div className={`${card} px-4 py-3.5`}>
            <p className="text-sm text-gray-600">{label}</p>
            <p className="text-3xl font-semibold leading-tight tabular-nums text-gray-900">{value}</p>
            <p className="mt-0.5 text-xs text-gray-600">{sub}</p>
        </div>
    );

    const riskActions = (r: PatientRisk, mobile = false) => {
        const wa = whatsappLink(r.patient.phone || undefined);
        return (
            <div className={`flex gap-1.5 ${mobile ? 'flex-wrap justify-start' : 'justify-end'}`}>
                {!r.nextAppointment && onSchedule && (
                    <button type="button" className={btnSoft} onClick={() => onSchedule(r.patient._id, r.patient.fullName, { lastSessionType: r.lastSessionType })}>
                        <CalendarPlus className="h-4 w-4" aria-hidden />Agendar
                    </button>
                )}
                {wa && (
                    <a className={btnGhost} href={wa} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${r.patient.fullName}`}>
                        <MessageCircle className="h-4 w-4" aria-hidden />WhatsApp
                    </a>
                )}
                <button type="button" className={btnGhost} onClick={() => openPatient(r.patient._id, r.patient.fullName)}>
                    <UserRound className="h-4 w-4" aria-hidden />Ver ficha
                </button>
            </div>
        );
    };

    const reasonTone = (r: PatientRisk) => (r.riskLevel === 'high' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900');
    const visibleRisk = showAllRisk ? riskShown : riskShown.slice(0, 8);

    return (
        <div className="space-y-4 text-left">
            {header}

            {/* ── KPIs do período ── */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {kpi('Comparecimento',
                    period?.attendanceRate === null || period?.attendanceRate === undefined ? '—' : `${period.attendanceRate}%`,
                    period ? <><Delta now={period.attendanceRate} before={previous?.attendanceRate ?? null} unit=" pts" /> {prevText} · {period.attended} de {period.expected} previstas</> : 'sem sessões previstas')}
                {kpi('Faltas',
                    period?.missed ?? 0,
                    period ? <><Delta now={period.missed} before={previous?.missed ?? null} invert /> {prevText}{missedPct !== null ? ` · ${missedPct}% das previstas` : ''}</> : '—')}
                {kpi('Cancelamentos',
                    period?.canceled ?? 0,
                    period ? `${period.canceledBy.patient} pelo paciente · ${period.canceledBy.professional + period.canceledBy.clinic} pela clínica · ${period.canceledBy.unknown} não informado` : '—')}
                {kpi('Pacientes atendidos',
                    period?.patients ?? attendanceData.length,
                    `${insights.activePatients} ativos no mês · ${insights.riskCount} pedem atenção`)}
            </div>

            {/* ── Sessões + distribuição ── */}
            <div className="grid gap-4 lg:grid-cols-2">
                <section className={`${card} space-y-3 p-4`} aria-labelledby="ins-sessoes">
                    <div className="flex items-center justify-between gap-2">
                        <h3 id="ins-sessoes" className="text-base font-semibold text-gray-900">Sessões do período</h3>
                        <span className="text-sm text-gray-600">{period?.total ?? insights.totalSessions} no total</span>
                    </div>
                    <StackBar label={`${period?.attended ?? 0} realizadas, ${period?.missed ?? 0} faltas, ${period?.canceled ?? 0} canceladas, ${period?.pending ?? 0} sem baixa`}
                        parts={[
                            { value: period?.attended ?? 0, color: 'bg-emerald-600' },
                            { value: period?.missed ?? 0, color: 'bg-red-600' },
                            { value: period?.canceled ?? 0, color: 'bg-amber-500' },
                            { value: period?.pending ?? 0, color: 'bg-gray-400' },
                        ]} />
                    <Legend items={[
                        { value: period?.attended ?? 0, label: 'Realizadas', color: 'bg-emerald-600' },
                        { value: period?.missed ?? 0, label: 'Faltas', color: 'bg-red-600' },
                        { value: period?.canceled ?? 0, label: 'Canceladas', color: 'bg-amber-500' },
                        { value: period?.pending ?? 0, label: 'Sem baixa', color: 'bg-gray-400' },
                    ]} />
                    {(period?.pending ?? 0) > 0 && <p className="text-xs text-gray-600">"Sem baixa" são sessões que já passaram e ainda estão como agendadas.</p>}
                </section>

                <section className={`${card} space-y-3 p-4`} aria-labelledby="ins-dist">
                    <div className="flex items-center justify-between gap-2">
                        <h3 id="ins-dist" className="text-base font-semibold text-gray-900">Distribuição de frequência</h3>
                        <span className="text-sm text-gray-600">média {insights.avgFrequency}% · {attendanceData.length} pacientes</span>
                    </div>
                    <StackBar label={`${freqCounts.high} com 90% ou mais, ${freqCounts.mid} entre 75 e 89%, ${freqCounts.low} abaixo de 75%`}
                        parts={[
                            { value: freqCounts.high, color: 'bg-emerald-600' },
                            { value: freqCounts.mid, color: 'bg-amber-500' },
                            { value: freqCounts.low, color: 'bg-red-600' },
                        ]} />
                    <Legend items={[
                        { value: freqCounts.high, label: '90% ou mais', color: 'bg-emerald-600' },
                        { value: freqCounts.mid, label: '75 a 89%', color: 'bg-amber-500' },
                        { value: freqCounts.low, label: 'abaixo de 75%', color: 'bg-red-600' },
                        { value: freqCounts.none, label: 'só sessões futuras', color: 'bg-gray-300' },
                    ]} />
                </section>
            </div>

            {/* ── Pacientes que precisam de atenção ── */}
            <section className={card} aria-labelledby="ins-risco">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
                    <h3 id="ins-risco" className="text-base font-semibold text-gray-900">Pacientes que precisam de atenção · {riskPatients.length}</h3>
                    <span className="text-sm text-gray-600">ordenado pelo risco</span>
                </div>
                {riskPatients.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-600">Ninguém com frequência baixa, faltas repetidas ou muito tempo sem sessão neste período.</p>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-2 px-4 pt-3" role="group" aria-label="Filtrar por motivo">
                            <Chip on={riskFilter === 'all'} onClick={() => setRiskFilter('all')}>Todos <b>{riskCounts.all}</b></Chip>
                            <Chip on={riskFilter === 'no_next'} onClick={() => setRiskFilter('no_next')}>Sem próxima sessão <b>{riskCounts.no_next}</b></Chip>
                            <Chip on={riskFilter === 'missed'} onClick={() => setRiskFilter('missed')}>Faltas repetidas <b>{riskCounts.missed}</b></Chip>
                            <Chip on={riskFilter === 'low_frequency'} onClick={() => setRiskFilter('low_frequency')}>Frequência baixa <b>{riskCounts.low_frequency}</b></Chip>
                            <Chip on={riskFilter === 'no_session'} onClick={() => setRiskFilter('no_session')}>Muito tempo sem sessão <b>{riskCounts.no_session}</b></Chip>
                        </div>

                        {/* Desktop */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="mt-2 w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-600">
                                        <th className="px-4 py-2">Paciente</th><th className="px-3 py-2">Motivo</th><th className="px-3 py-2 text-right">Freq.</th>
                                        <th className="px-3 py-2">Última sessão</th><th className="px-3 py-2">Próxima</th><th className="px-4 py-2"><span className="sr-only">Ações</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleRisk.map(r => (
                                        <tr key={r.patient._id} className="border-b border-gray-100 align-middle">
                                            <td className="px-4 py-2.5">
                                                <button type="button" className="text-left font-semibold text-gray-900 hover:text-emerald-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" onClick={() => openPatient(r.patient._id, r.patient.fullName)}>{r.patient.fullName}</button>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex flex-wrap gap-1">{r.reasons.map((x, i) => <span key={i} className={`rounded-full border px-2 py-px text-xs font-semibold ${reasonTone(r)}`}>{x}</span>)}</div>
                                            </td>
                                            <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${freqTone(r.frequency).text}`}>{r.frequency === null ? '—' : `${r.frequency}%`}</td>
                                            <td className="px-3 py-2.5 tabular-nums text-gray-800">{ddmm(r.lastSession)}</td>
                                            <td className="px-3 py-2.5 text-gray-800">{nextLabel(r.nextAppointment) || <span className="whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-px text-xs font-semibold text-amber-900">Sem agendamento</span>}</td>
                                            <td className="px-4 py-2.5">{riskActions(r)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Celular */}
                        <ul className="mt-2 md:hidden">
                            {visibleRisk.map(r => (
                                <li key={r.patient._id} className="space-y-2 border-t border-gray-100 px-4 py-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <button type="button" className="text-left font-semibold text-gray-900" onClick={() => openPatient(r.patient._id, r.patient.fullName)}>{r.patient.fullName}</button>
                                        <span className={`font-semibold tabular-nums ${freqTone(r.frequency).text}`}>{r.frequency === null ? '—' : `${r.frequency}%`}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">{r.reasons.map((x, i) => <span key={i} className={`rounded-full border px-2 py-px text-xs font-semibold ${reasonTone(r)}`}>{x}</span>)}</div>
                                    <p className="text-xs text-gray-600">Última {ddmm(r.lastSession)} · Próxima {nextLabel(r.nextAppointment) || 'sem agendamento'}</p>
                                    {riskActions(r, true)}
                                </li>
                            ))}
                        </ul>

                        {riskShown.length > 8 && (
                            <div className="border-t border-gray-100 px-4 py-2.5">
                                <button type="button" className={btnGhost} onClick={() => setShowAllRisk(v => !v)}>
                                    {showAllRisk ? 'Mostrar menos' : `Ver todos (${riskShown.length - 8} a mais)`}
                                </button>
                            </div>
                        )}
                        {riskShown.length === 0 && <p className="px-4 py-4 text-sm text-gray-600">Ninguém com esse motivo.</p>}
                    </>
                )}
            </section>

            {/* ── Frequência por paciente ── */}
            <section className={card} aria-labelledby="ins-freq">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
                    <h3 id="ins-freq" className="text-base font-semibold text-gray-900">Frequência por paciente · {attendanceData.length}</h3>
                    <span className="text-sm text-gray-600">média {insights.avgFrequency}% · clique no nome para abrir a ficha</span>
                </div>
                {attendanceData.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-600">Nenhuma sessão neste período.</p>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-2 px-4 pt-3" role="group" aria-label="Filtrar por faixa de frequência">
                            <Chip on={freqFilter === 'all'} onClick={() => setFreqFilter('all')}>Todos <b>{freqCounts.all}</b></Chip>
                            <Chip on={freqFilter === 'low'} onClick={() => setFreqFilter('low')}>Abaixo de 75% <b>{freqCounts.low}</b></Chip>
                            <Chip on={freqFilter === 'mid'} onClick={() => setFreqFilter('mid')}>75 a 89% <b>{freqCounts.mid}</b></Chip>
                            <Chip on={freqFilter === 'high'} onClick={() => setFreqFilter('high')}>90% ou mais <b>{freqCounts.high}</b></Chip>
                            {freqCounts.none > 0 && <Chip on={freqFilter === 'none'} onClick={() => setFreqFilter('none')}>Só sessões futuras <b>{freqCounts.none}</b></Chip>}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="mt-2 w-full min-w-[720px] text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-600">
                                        <th className="px-4 py-2">Paciente</th><th className="px-3 py-2">Frequência</th>
                                        <th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">Realizadas</th>
                                        <th className="px-3 py-2 text-right">Faltas</th><th className="px-3 py-2 text-right">Canceladas</th>
                                        <th className="px-3 py-2 text-right">Sem baixa</th><th className="px-3 py-2">Última</th><th className="px-4 py-2">Próxima</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {freqShown.map(item => {
                                        const f = freqOf(item);
                                        const tone = freqTone(f);
                                        return (
                                            <tr key={item.patient._id} className="border-b border-gray-100">
                                                <td className="px-4 py-2.5">
                                                    <button type="button" className="text-left font-semibold text-gray-900 hover:text-emerald-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" onClick={() => openPatient(item.patient._id, item.patient.fullName)}>{item.patient.fullName}</button>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex min-w-[140px] items-center gap-2">
                                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200"><div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${f ?? 0}%` }} /></div>
                                                        <span className={`w-10 text-right font-semibold tabular-nums ${tone.text}`}>{f === null ? '—' : `${f}%`}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 text-right tabular-nums text-gray-800">{item.total}</td>
                                                <td className="px-3 py-2.5 text-right tabular-nums text-gray-800">{item.attended}</td>
                                                <td className={`px-3 py-2.5 text-right tabular-nums ${item.missed ? 'font-semibold text-red-700' : 'text-gray-800'}`}>{item.missed}</td>
                                                <td className="px-3 py-2.5 text-right tabular-nums text-gray-800">{item.canceled}</td>
                                                <td className="px-3 py-2.5 text-right tabular-nums text-gray-800">{item.pending}</td>
                                                <td className="px-3 py-2.5 tabular-nums text-gray-800">{ddmm(item.lastSession)}</td>
                                                <td className="px-4 py-2.5 text-gray-800">{nextLabel(item.nextAppointment) || '—'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}
