// src/components/doctor/tabs/DoctorAgendaPanel.tsx
// Topo da aba Agenda do terapeuta: chips de filtro do dia a dia (Hoje, Amanhã, Semana, Não
// confirmados, Sem baixa, Faltas e Canceladas do mês) e o modo Lista. Busca a própria janela
// (1º dia do mês até hoje+7) para não depender do mês que o calendário está mostrando.
import { CalendarDays, FileText, List, MessageCircle, RefreshCw, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import appointmentService from '../../../services/appointmentService';
import { toDateString } from '../../../utils/dateUtils';
import {
    aptDateTime, isCanceled, isMissed, isOpen, isUnconfirmed, minutesUntil, patientOf, relativeLabel, todayLocal, tomorrowLocal, whatsappLink,
} from '../overview/agendaUtils';
import { billingChip, statusChip } from '../overview/TodayAgendaPanel';

export type AgendaFilter = 'today' | 'tomorrow' | 'week' | 'unconfirmed' | 'no_baixa' | 'missed' | 'canceled';
export type AgendaMode = 'list' | 'calendar';

interface Props {
    doctorId: string;
    mode: AgendaMode;
    onModeChange: (m: AgendaMode) => void;
    /** muda quando a agenda é alterada no calendário, para recontar */
    refreshKey?: number;
    pendingEvolutionIds?: Set<string>;
    onRegisterEvolution?: (p: { _id: string; fullName: string }) => void;
    onOpenPatient?: (id: string, name: string) => void;
}

const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return toDateString(d); };
const monthStart = () => { const d = new Date(); return toDateString(new Date(d.getFullYear(), d.getMonth(), 1)); };

const btn = 'inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1';
const btnGhost = `${btn} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`;
const btnSoft = `${btn} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`;

const FILTERS: { key: AgendaFilter; label: string }[] = [
    { key: 'today', label: 'Hoje' },
    { key: 'tomorrow', label: 'Amanhã' },
    { key: 'week', label: 'Próximos 7 dias' },
    { key: 'unconfirmed', label: 'Não confirmados' },
    { key: 'no_baixa', label: 'Sem baixa' },
    { key: 'missed', label: 'Faltas no mês' },
    { key: 'canceled', label: 'Canceladas no mês' },
];

const EMPTY: Record<AgendaFilter, string> = {
    today: 'Nenhuma sessão hoje.',
    tomorrow: 'Nenhuma sessão amanhã.',
    week: 'Nenhuma sessão nos próximos 7 dias.',
    unconfirmed: 'Todas as próximas sessões estão confirmadas.',
    no_baixa: 'Nenhuma sessão passada sem baixa.',
    missed: 'Nenhuma falta neste mês.',
    canceled: 'Nenhum cancelamento neste mês.',
};

function dayTitle(ymd: string) {
    const [y, m, d] = ymd.split('-').map(Number);
    const label = new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    if (ymd === todayLocal()) return `Hoje · ${label}`;
    if (ymd === tomorrowLocal()) return `Amanhã · ${label}`;
    return label.charAt(0).toUpperCase() + label.slice(1);
}

const CANCEL_BY: Record<string, string> = { patient: 'pelo paciente', professional: 'pelo profissional', clinic: 'pela clínica' };

export default function DoctorAgendaPanel({ doctorId, mode, onModeChange, refreshKey, pendingEvolutionIds, onRegisterEvolution, onOpenPatient }: Props) {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [filter, setFilter] = useState<AgendaFilter>('today');

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const res: any = await appointmentService.list({ startDate: monthStart(), endDate: addDays(7), doctorId, limit: 500 });
            const data = Array.isArray(res?.data) ? res.data : (res?.data?.data?.appointments || res?.data?.appointments || res?.data?.data || []);
            const mine = (Array.isArray(data) ? data : []).filter((a: any) => {
                const d = a.doctor?._id || a.doctor?.id || a.doctorId || a.doctor;
                return !d || String(d) === String(doctorId);
            });
            setItems(mine);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [doctorId]);

    useEffect(() => { load(); }, [load, refreshKey]);

    const groups = useMemo(() => {
        const today = todayLocal(), tomorrow = tomorrowLocal(), week = addDays(6), month = monthStart().slice(0, 7);
        const now = Date.now();
        const day = (a: any) => toDateString(a.date);
        const past = (a: any) => (aptDateTime(a)?.getTime() ?? 0) < now;
        return {
            today: items.filter(a => day(a) === today),
            tomorrow: items.filter(a => day(a) === tomorrow),
            week: items.filter(a => day(a) >= today && day(a) <= week && !isCanceled(a)),
            unconfirmed: items.filter(a => isUnconfirmed(a) && !past(a)),
            no_baixa: items.filter(a => isOpen(a) && past(a)),
            missed: items.filter(a => isMissed(a) && day(a).startsWith(month)),
            canceled: items.filter(a => isCanceled(a) && day(a).startsWith(month)),
        } as Record<AgendaFilter, any[]>;
    }, [items]);

    const shown = useMemo(() => {
        const list = [...(groups[filter] || [])];
        const desc = filter === 'missed' || filter === 'canceled' || filter === 'no_baixa';
        // dias mais recentes primeiro nos filtros do passado; dentro do dia, sempre na ordem do horário
        list.sort((a, b) => {
            const da = toDateString(a.date), db = toDateString(b.date);
            if (da !== db) return (da < db ? -1 : 1) * (desc ? -1 : 1);
            return (aptDateTime(a)?.getTime() ?? 0) - (aptDateTime(b)?.getTime() ?? 0);
        });
        const byDay = new Map<string, any[]>();
        list.forEach(a => { const k = toDateString(a.date); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k)!.push(a); });
        return [...byDay.entries()];
    }, [groups, filter]);

    const pick = (f: AgendaFilter) => { setFilter(f); if (mode !== 'list') onModeChange('list'); };

    return (
        <div className="space-y-3 text-left">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filtros da agenda">
                    {FILTERS.map(f => {
                        const on = mode === 'list' && filter === f.key;
                        const n = groups[f.key]?.length ?? 0;
                        const warn = (f.key === 'no_baixa' || f.key === 'unconfirmed') && n > 0;
                        return (
                            <button key={f.key} type="button" aria-pressed={on} onClick={() => pick(f.key)}
                                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${on ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}>
                                {f.label} <b className={warn && !on ? 'text-amber-800' : ''}>{loading ? '…' : n}</b>
                            </button>
                        );
                    })}
                </div>
                <div className="inline-flex overflow-hidden rounded-lg border border-gray-300" role="group" aria-label="Modo de exibição">
                    <button type="button" aria-pressed={mode === 'list'} onClick={() => onModeChange('list')}
                        className={`inline-flex min-h-9 items-center gap-1.5 px-3 text-sm font-semibold ${mode === 'list' ? 'bg-emerald-50 text-emerald-900' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                        <List className="h-4 w-4" aria-hidden />Lista
                    </button>
                    <button type="button" aria-pressed={mode === 'calendar'} onClick={() => onModeChange('calendar')}
                        className={`inline-flex min-h-9 items-center gap-1.5 border-l border-gray-300 px-3 text-sm font-semibold ${mode === 'calendar' ? 'bg-emerald-50 text-emerald-900' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                        <CalendarDays className="h-4 w-4" aria-hidden />Calendário
                    </button>
                </div>
            </div>

            {mode === 'list' && (
                <section className="min-w-0 rounded-2xl border border-gray-200 bg-white" aria-label="Lista de sessões">
                    {loading ? (
                        <p className="px-4 py-6 text-sm text-gray-600">Carregando sessões...</p>
                    ) : error ? (
                        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm text-amber-900">
                            Não foi possível carregar as sessões.
                            <button type="button" className={btnGhost} onClick={load}><RefreshCw className="h-4 w-4" aria-hidden />Tentar de novo</button>
                        </div>
                    ) : shown.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-gray-600">{EMPTY[filter]}</p>
                    ) : shown.map(([ymd, list]) => {
                        const canceled = list.filter(isCanceled).length;
                        const next = list.find(a => isOpen(a) && (aptDateTime(a)?.getTime() ?? 0) >= Date.now());
                        return (
                            <div key={ymd}>
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2">
                                    <h3 className="text-sm font-semibold text-gray-900">{dayTitle(ymd)}</h3>
                                    <span className="text-xs text-gray-600">
                                        {list.length} {list.length === 1 ? 'sessão' : 'sessões'}{canceled ? ` · ${canceled} cancelada${canceled > 1 ? 's' : ''}` : ''}{next && ymd === todayLocal() ? ` · próxima às ${next.time}` : ''}
                                    </span>
                                </div>
                                <ul>
                                    {list.map(a => {
                                        const p = patientOf(a);
                                        const dt = aptDateTime(a);
                                        const mins = minutesUntil(dt);
                                        const cancel = isCanceled(a);
                                        const wa = whatsappLink(p.phone);
                                        const pend = pendingEvolutionIds?.has(String(p._id)) && a.operationalStatus === 'completed';
                                        return (
                                            <li key={a._id} className="grid gap-3 border-b border-gray-100 px-4 py-3 sm:grid-cols-[64px_minmax(0,1fr)_auto] sm:items-center">
                                                <div className="flex items-baseline gap-2 sm:block">
                                                    <p className="font-semibold tabular-nums text-gray-900">{a.time || '—'}</p>
                                                    <p className="text-xs text-gray-600">{isOpen(a) && mins !== null && mins > 0 && mins < 24 * 60 ? relativeLabel(mins) : a.duration ? `${a.duration} min` : ''}</p>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`font-semibold ${cancel ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{p.fullName}</p>
                                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                                        {statusChip(a)}
                                                        {cancel && a.cancelRequester && CANCEL_BY[a.cancelRequester] && <span className="rounded-full border border-gray-300 bg-gray-50 px-2 py-px text-xs font-semibold text-gray-700">{CANCEL_BY[a.cancelRequester]}</span>}
                                                        {!cancel && billingChip(a)}
                                                        {pend && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-px text-xs font-semibold text-amber-900">Evolução pendente</span>}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 sm:justify-end">
                                                    {a.operationalStatus === 'completed' && onRegisterEvolution && (
                                                        <button type="button" className={btnSoft} onClick={() => onRegisterEvolution({ _id: p._id, fullName: p.fullName })}>
                                                            <FileText className="h-4 w-4" aria-hidden />Registrar evolução
                                                        </button>
                                                    )}
                                                    {wa && !cancel && (
                                                        <a className={btnGhost} href={wa} target="_blank" rel="noreferrer" aria-label={`WhatsApp de ${p.fullName}`}>
                                                            <MessageCircle className="h-4 w-4" aria-hidden />{isUnconfirmed(a) && mins !== null && mins > 0 ? 'Confirmar no WhatsApp' : 'WhatsApp'}
                                                        </a>
                                                    )}
                                                    {onOpenPatient && p._id && (
                                                        <button type="button" className={btnGhost} onClick={() => onOpenPatient(p._id, p.fullName)}>
                                                            <UserRound className="h-4 w-4" aria-hidden />Ver ficha
                                                        </button>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        );
                    })}
                </section>
            )}
        </div>
    );
}
