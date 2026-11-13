// Peças da Agenda do admin/secretária (mock aprovado em 30/10). Ícones só em render
// (nada de lucide no escopo do módulo — ver o FIX de TDZ em EnhancedCalendar.tsx).
import { CalendarClock, CalendarDays, CalendarPlus, CheckCircle, Info, Plus, RotateCcw, Search, XCircle } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Modal } from '../../ui/Modal';
import { ModalHeader } from '../../../pages/Financial/components/formKit';
import { motionDuration, motionEase } from '../../../design/motion';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getSpecialtyLabel } from '../../../constants/specialties';
import { normalizeSlots } from '../RescheduleDialog';
import AnimatedValue from '../../ui/insight/AnimatedValue';
import {
    AgendaFilter, STATUS_COLOR, STATUS_LABEL, STATUS_SINGLE, StatusGroup, TYPE_COLOR, TYPE_LABEL, TypeGroup,
    doctorIdOf, doctorNameOf, fmtBRL, patientNameOf, plural, statusGroupOf, typeGroupOf,
} from './agendaModel';

const capFirst = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
// "Mikaelly da Silva Sousa" → "Mikaelly Silva" (pula da/de/dos)
const shortName = (full: string) => {
    const parts = full.split(' ').filter(Boolean);
    const second = parts.slice(1).find(w => !['da', 'de', 'do', 'das', 'dos', 'e'].includes(w.toLowerCase()));
    return second ? `${parts[0]} ${second}` : parts[0] || full;
};

// ── Chips ────────────────────────────────────────────────────────────────────

export const Chip: React.FC<{ active: boolean; onClick: () => void; count?: number; dot?: string; title?: string; children: React.ReactNode }> = ({ active, onClick, count, dot, title, children }) => (
    <button
        type="button"
        onClick={onClick}
        title={title}
        aria-pressed={active}
        className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[13px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            active
                ? 'border-emerald-600 bg-emerald-50 font-semibold text-emerald-800'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
        }`}
    >
        {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} aria-hidden />}
        <span>{children}</span>
        {count !== undefined && <span className={`tabular-nums ${active ? 'text-emerald-800' : 'text-gray-500 dark:text-gray-400'}`}>{count}</span>}
    </button>
);

// ── Topo ─────────────────────────────────────────────────────────────────────

export const AgendaHeader: React.FC<{
    monthLabel: string;
    total: number | null;
    preCount: number;
    onOpenPre?: () => void;
    onCreate?: () => void;
}> = ({ monthLabel, total, preCount, onOpenPre, onCreate }) => (
    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Agenda</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {monthLabel || 'Carregando…'}{monthLabel && total !== null && ` · ${plural(total, 'sessão no mês', 'sessões no mês')}`}
            </p>
        </div>
        <div className="flex flex-wrap gap-2">
            {onOpenPre && (
                <button type="button" onClick={onOpenPre}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                    <CalendarPlus size={15} aria-hidden />
                    Pré-agendamentos
                    {preCount > 0 && <span className="rounded-full bg-amber-100 px-1.5 text-xs font-bold tabular-nums text-amber-800">{preCount}</span>}
                </button>
            )}
            {onCreate && (
                <button type="button" onClick={onCreate}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2">
                    <Plus size={15} aria-hidden />
                    Novo agendamento
                </button>
            )}
        </div>
    </div>
);

// ── Filtros ──────────────────────────────────────────────────────────────────

export interface DoctorOption { id: string; label: string; fullName: string; count: number }

export const AgendaFilterBar: React.FC<{
    filter: AgendaFilter;
    onChange: (f: AgendaFilter) => void;
    doctorOptions: DoctorOption[] | null; // null = sem filtro de profissional
    doctorTotal: number;
    statusCounts: Record<StatusGroup, number>;
    statusTotal: number;
    typeCounts: Record<TypeGroup, number>;
    typeTotal: number;
    legend: React.ReactNode;
}> = ({ filter, onChange, doctorOptions, doctorTotal, statusCounts, statusTotal, typeCounts, typeTotal, legend }) => {
    const [legendOpen, setLegendOpen] = useState(false);
    const hasFilter = filter.doctor !== 'all' || filter.status !== 'all' || filter.type !== 'all';
    return (
        <div className="mb-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5">
            <div className="flex flex-wrap items-center gap-2">
                {doctorOptions && (
                    <select
                        aria-label="Profissional"
                        value={filter.doctor}
                        onChange={e => onChange({ ...filter, doctor: e.target.value })}
                        className="min-h-10 max-w-[15rem] rounded-lg border border-gray-300 bg-white px-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                    >
                        <option value="all">Todos os profissionais ({doctorTotal})</option>
                        {doctorOptions.map(d => <option key={d.id} value={d.id}>{d.fullName} · {d.count}</option>)}
                    </select>
                )}
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Status">
                    <Chip active={filter.status === 'all'} count={statusTotal} onClick={() => onChange({ ...filter, status: 'all' })}>Todos</Chip>
                    {(['todo', 'done', 'missed', 'canceled', 'pre'] as StatusGroup[]).map(s => (
                        <Chip key={s} active={filter.status === s} count={statusCounts[s]} dot={STATUS_COLOR[s]}
                            onClick={() => onChange({ ...filter, status: filter.status === s ? 'all' : s })}>{STATUS_LABEL[s]}</Chip>
                    ))}
                </div>
                <select
                    aria-label="Tipo"
                    value={filter.type}
                    onChange={e => onChange({ ...filter, type: e.target.value as AgendaFilter['type'] })}
                    className="min-h-10 rounded-lg border border-gray-300 bg-white px-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                >
                    <option value="all">Todos os tipos ({typeTotal})</option>
                    {(['particular', 'convenio', 'pacote', 'liminar'] as TypeGroup[]).map(t => <option key={t} value={t}>{TYPE_LABEL[t]} · {typeCounts[t]}</option>)}
                </select>
                <div className="ml-auto flex items-center gap-2">
                    {hasFilter && (
                        <button type="button" onClick={() => onChange({ doctor: 'all', status: 'all', type: 'all' })}
                            className="rounded-lg px-2 py-1 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100">Limpar filtros</button>
                    )}
                    <button type="button" onClick={() => setLegendOpen(o => !o)} aria-expanded={legendOpen}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50">
                        <Info size={14} aria-hidden /> Legenda
                    </button>
                </div>
            </div>
            {legendOpen && <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3">{legend}</div>}
        </div>
    );
};

// ── Mês: célula do dia ───────────────────────────────────────────────────────

export const MonthCell: React.FC<{
    dayNumber: string;
    isToday: boolean;
    isPast: boolean;
    appts: any[];
    holidayName?: string;
    freeSlots?: number;
    priority?: boolean;
}> = ({ dayNumber, isToday, isPast, appts, holidayName, freeSlots = 0, priority = false }) => {
    const c = { done: 0, todo: 0, missed: 0, canceled: 0, pre: 0 } as Record<StatusGroup, number>;
    appts.forEach(a => { c[statusGroupOf(a)]++; });
    const past = isPast && !isToday;
    const active = appts.length - c.canceled;
    const unconfirmed = past ? 0 : appts.filter(x => statusGroupOf(x) === 'todo' && String(x?.operationalStatus || x?.status || 'scheduled').toLowerCase() !== 'confirmed').length;
    const occupancy = active + freeSlots > 0 ? Math.round((active / (active + freeSlots)) * 100) : 0;
    const barColor = occupancy >= 70 ? 'var(--fx-emerald-600, #059669)' : occupancy >= 50 ? '#34d399' : '#f59e0b';
    const segs = [
        { n: c.done, color: STATUS_COLOR.done },
        { n: c.missed, color: STATUS_COLOR.missed },
        { n: c.canceled, color: STATUS_COLOR.canceled },
    ].filter(s => s.n > 0);
    const main = past ? c.done : active;
    const label = past ? (c.done === 1 ? 'realizada' : 'realizadas') : (active === 1 ? 'agendada' : 'agendadas');
    return (
        <div className={`flex h-full min-h-[96px] w-full flex-col gap-1 p-1.5 text-left ${priority ? 'rounded-md ring-2 ring-inset ring-amber-400' : ''}`}
            title={appts.length ? `${c.done} realizadas · ${c.todo + c.pre} a fazer · ${c.missed} faltas · ${c.canceled} canceladas` : undefined}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[13px] tabular-nums ${isToday ? 'bg-emerald-600 font-bold text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                {dayNumber}
            </span>
            {holidayName ? (
                <div className="mt-auto">
                    <p className="text-xs font-semibold leading-tight text-amber-800">{holidayName}</p>
                    <p className="text-[11px] text-amber-700">Sem atendimento</p>
                </div>
            ) : (appts.length > 0 || freeSlots > 0) && (
                <div className="mt-auto">
                    <p className="leading-none">
                        <span className={`text-[19px] font-bold tabular-nums ${past ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-100'}`}>{main}</span>
                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">{label}</span>
                    </p>
                    {past ? (
                        <div className="mt-1.5 flex h-1.5 w-full gap-[2px] overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                            {segs.map((sg, i) => <span key={i} style={{ flex: sg.n, background: sg.color }} />)}
                        </div>
                    ) : (
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800" title={`${occupancy}% da grade ocupada`}>
                            <span className="block h-full rounded-full transition-[width] duration-[250ms]" style={{ width: `${occupancy}%`, background: barColor }} />
                        </div>
                    )}
                    <p className="mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5 text-[11px] font-semibold leading-tight">
                        {past && c.canceled > 0 && <span className="text-red-600">{plural(c.canceled, 'cancelada', 'canceladas')}</span>}
                        {past && c.missed > 0 && <span className="text-amber-700">{plural(c.missed, 'falta', 'faltas')}</span>}
                        {unconfirmed > 0 && <span className="text-amber-700">{unconfirmed} sem confirmar</span>}
                        {!past && freeSlots > 0 && <span className="text-blue-700 dark:text-blue-300">{plural(freeSlots, 'vaga', 'vagas')}</span>}
                    </p>
                </div>
            )}
        </div>
    );
};

// ── Valor/forma de cobrança de uma sessão (texto) ────────────────────────────

export const billingText = (a: any, convenioName: (code?: string) => string): string => {
    const t = typeGroupOf(a);
    if (t === 'convenio') return `Convênio ${convenioName(a.insuranceProvider) || ''}`.trim() + ' · a faturar';
    if (t === 'liminar') return 'Liminar · contrato';
    if (t === 'pacote') {
        const p = a.package && typeof a.package === 'object' ? a.package : null;
        const prog = p?.totalSessions ? ` · ${p.sessionsDone ?? 0}/${p.totalSessions}` : '';
        return `Pacote${prog}`;
    }
    const v = Number(a.sessionValue || a.paymentAmount || a.amount || 0);
    const ps = String(a.paymentStatus || '');
    const st = ps === 'paid' ? 'pago' : ps === 'partial' ? 'parcial' : v > 0 ? 'a receber' : '';
    return v > 0 ? `${fmtBRL(v)}${st ? ` · ${st}` : ''}` : 'Particular';
};

const StatusTag: React.FC<{ a: any }> = ({ a }) => {
    const g = statusGroupOf(a);
    const confirmed = String(a.operationalStatus || a.status) === 'confirmed';
    return (
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
            <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[g] }} aria-hidden />
            {g === 'todo' && confirmed ? 'Confirmada' : STATUS_SINGLE[g]}
        </span>
    );
};

// ── Dia aberto: linhas compactas ─────────────────────────────────────────────

export interface RowActions {
    onOpen: (a: any) => void;
    onReschedule?: (a: any) => void;
    onCancel?: (a: any) => void;
    onFinalize?: (a: any) => void;
}

const IconAction: React.FC<{ title: string; onClick: () => void; tone?: 'danger' | 'success'; children: React.ReactNode }> = ({ title, onClick, tone, children }) => (
    <button type="button" title={title} aria-label={title}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            tone === 'danger' ? 'text-red-600 hover:bg-red-50' : tone === 'success' ? 'text-emerald-700 hover:bg-emerald-50' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100'
        }`}>
        {children}
    </button>
);

const SessionRow: React.FC<{ a: any; actions: RowActions; convenioName: (c?: string) => string; showMoney: boolean }> = ({ a, actions, convenioName, showMoney }) => {
    const g = statusGroupOf(a);
    const raw = String(a.operationalStatus || a.status || 'scheduled');
    const active = ['scheduled', 'confirmed', 'pre_agendado'].includes(raw);
    const canceled = g === 'canceled';
    const type = typeGroupOf(a);
    const spec = a.specialty ? getSpecialtyLabel(a.specialty) : '';
    return (
        <li>
            <div role="button" tabIndex={0} onClick={() => actions.onOpen(a)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); actions.onOpen(a); } }}
                className="flex cursor-pointer items-center gap-3 rounded-lg border-l-[3px] px-2.5 py-2 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                style={{ borderLeftColor: TYPE_COLOR[type] }}>
                <span className="w-11 shrink-0 text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">{(a.time || '').slice(0, 5)}</span>
                <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold ${canceled ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>{patientNameOf(a)}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {doctorNameOf(a)}{spec && ` · ${spec}`}
                        {showMoney && <span className="sm:hidden"> · {billingText(a, convenioName)}</span>}
                    </p>
                </div>
                {showMoney && <span className="hidden w-44 shrink-0 truncate text-right text-xs text-gray-600 dark:text-gray-400 sm:block">{billingText(a, convenioName)}</span>}
                <span className="hidden w-24 shrink-0 sm:block"><StatusTag a={a} /></span>
                <div className="flex shrink-0 items-center">
                    {(active || canceled) && actions.onReschedule && (
                        <IconAction title={canceled ? 'Reativar e remarcar' : 'Mudar data'} onClick={() => actions.onReschedule!(a)}>
                            {canceled ? <RotateCcw size={15} /> : <CalendarClock size={15} />}
                        </IconAction>
                    )}
                    {active && actions.onCancel && (
                        <IconAction title="Cancelar" tone="danger" onClick={() => actions.onCancel!(a)}><XCircle size={15} /></IconAction>
                    )}
                    {active && actions.onFinalize && (
                        <IconAction title="Confirmar / finalizar" tone="success" onClick={() => actions.onFinalize!(a)}><CheckCircle size={15} /></IconAction>
                    )}
                </div>
            </div>
            <p className="ml-[3.6rem] -mt-1 pb-1 sm:hidden"><StatusTag a={a} /></p>
        </li>
    );
};

// Prévia do dia ao passar o mouse no mês (linhas compactas, sem ações)
export const DayPreviewList: React.FC<{ appts: any[]; convenioName: (c?: string) => string; showMoney: boolean; onOpen: (a: any) => void; freeCount?: number }> = ({ appts, convenioName, showMoney, onOpen, freeCount = 0 }) => {
    const sorted = [...appts].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const active = appts.filter(a => statusGroupOf(a) !== 'canceled').length;
    const unconfirmed = appts.filter(a => statusGroupOf(a) === 'todo' && String(a?.operationalStatus || a?.status || 'scheduled').toLowerCase() !== 'confirmed').length;
    const shown = sorted.slice(0, 5);
    const rest = sorted.length - shown.length;
    return (
        <div>
            <div className="flex flex-wrap gap-1.5 px-1 py-2">
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">{plural(active, 'agendada', 'agendadas')}</span>
                {unconfirmed > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">{unconfirmed} sem confirmar</span>}
                {freeCount > 0 && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{plural(freeCount, 'vaga', 'vagas')}</span>}
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {shown.map(a => (
                    <SessionRow key={a._id || a.id} a={a} actions={{ onOpen }} convenioName={convenioName} showMoney={showMoney} />
                ))}
            </ul>
            <p className="flex justify-between gap-2 rounded-b-lg bg-gray-50 px-2.5 py-2 text-xs text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                <span>{rest > 0 ? `+ ${plural(rest, 'sessão', 'sessões')} neste dia` : ' '}</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Clique para ver tudo{freeCount > 0 ? ' e as vagas' : ''}</span>
            </p>
        </div>
    );
};


// ── Vagas livres do dia (aba do modal do dia) ────────────────────────────────

export interface DaySlots { professionalId: string; name: string; specialty: string; times: string[] }
type SlotPick = { doctorId: string; doctorName: string; specialty: string; time: string };

export const FreeSlotsPanel: React.FC<{
    dateStr: string;
    slots: DaySlots[];
    onSlot?: (slot: SlotPick) => void;
}> = ({ dateStr, slots, onSlot }) => {
    const reduce = useReducedMotion();
    const [area, setArea] = useState<string>('');
    const [per, setPer] = useState<'all' | 'm' | 't'>('all');
    const [listRef] = useAutoAnimate<HTMLDivElement>({ duration: motionDuration.fast * 1000 });
    const todayYmd = new Date().toLocaleDateString('en-CA');
    const nowHm = new Date().toTimeString().slice(0, 5);
    // só horários que ainda não passaram
    const live = useMemo(() => slots
        .map(p => ({ ...p, times: p.times.filter(t => dateStr > todayYmd || t > nowHm).sort() }))
        .filter(p => p.times.length > 0), [slots, dateStr, todayYmd, nowHm]);
    const areas = useMemo(() => {
        const m = new Map<string, number>();
        live.forEach(p => m.set(p.specialty, (m.get(p.specialty) || 0) + p.times.length));
        return [...m.entries()].sort((a, b) => b[1] - a[1]);
    }, [live]);
    const current = areas.some(([k]) => k === area) ? area : (areas[0]?.[0] || '');
    const inPer = (t: string) => per === 'all' || (per === 'm' ? t < '12:00' : t >= '12:00');
    const rows = live.filter(p => p.specialty === current).map(p => ({ ...p, times: p.times.filter(inPer) })).filter(p => p.times.length > 0)
        .sort((a, b) => a.times[0].localeCompare(b.times[0]) || a.name.localeCompare(b.name));
    if (areas.length === 0) return <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">Sem horário livre neste dia.</p>;
    return (
        <div>
            <div className="flex gap-2 overflow-x-auto px-3 pb-1 pt-3">
                {areas.map(([k, n]) => (
                    <button key={k} type="button" aria-pressed={k === current} onClick={() => setArea(k)}
                        className={`shrink-0 rounded-xl border px-3 py-2 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${k === current ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-emerald-500'}`}>
                        <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{getSpecialtyLabel(k) || 'Sem área'}</span>
                        <span className={`text-xs tabular-nums ${k === current ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400'}`}><AnimatedValue value={n} /> {n === 1 ? 'vaga' : 'vagas'}</span>
                    </button>
                ))}
            </div>
            <div className="flex gap-1.5 px-3 py-2">
                {([['all', 'Dia todo'], ['m', 'Manhã'], ['t', 'Tarde']] as const).map(([k, l]) => (
                    <button key={k} type="button" aria-pressed={per === k} onClick={() => setPer(k)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${per === k ? 'border-gray-900 bg-gray-900 text-white dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}>{l}</button>
                ))}
            </div>
            <div ref={listRef} className="space-y-2.5 px-3 pb-3">
                {rows.length === 0 && <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">Sem horário livre nessa área neste período.</p>}
                {rows.map(p => (
                    <div key={p.professionalId + current} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                        <div className="mb-2 flex items-baseline justify-between gap-2">
                            <span className="min-w-0 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{shortName(p.name)}</span>
                            <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{plural(p.times.length, 'vaga', 'vagas')}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {p.times.map((t, i) => (
                                <motion.button key={t} type="button" disabled={!onSlot}
                                    initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: motionDuration.fast, ease: motionEase.smoothOut, delay: reduce ? 0 : Math.min(i, 7) * 0.04 }}
                                    onClick={() => onSlot?.({ doctorId: p.professionalId, doctorName: p.name, specialty: p.specialty, time: t })}
                                    title={onSlot ? 'Encaixar paciente neste horário' : undefined}
                                    className="min-h-[36px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm font-semibold tabular-nums text-gray-800 dark:text-gray-200 transition-colors duration-150 hover:border-emerald-600 hover:bg-emerald-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-default disabled:hover:border-gray-200 disabled:hover:bg-white disabled:hover:text-gray-800">
                                    {t}
                                </motion.button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const DayAgendaModal: React.FC<{
    dateStr: string;
    appts: any[];
    onClose: () => void;
    actions: RowActions;
    convenioName: (code?: string) => string;
    showMoney: boolean;
    freeSlots?: { slots: DaySlots[]; onSlot?: (s: SlotPick) => void };
}> = ({ dateStr, appts, onClose, actions, convenioName, showMoney, freeSlots }) => {
    const [status, setStatus] = useState<'all' | StatusGroup>('all');
    const [q, setQ] = useState('');
    const [tab, setTab] = useState<'sessoes' | 'vagas'>('sessoes');
    const reduce = useReducedMotion();
    const todayYmd = new Date().toLocaleDateString('en-CA');
    const nowHm = new Date().toTimeString().slice(0, 5);
    const canFree = !!freeSlots && dateStr >= todayYmd;
    const freeCount = canFree ? freeSlots!.slots.reduce((n, p) => n + p.times.filter(t => dateStr > todayYmd || t > nowHm).length, 0) : 0;
    const [listRef] = useAutoAnimate<HTMLDivElement>({ duration: motionDuration.fast * 1000 });
    const date = new Date(dateStr + 'T12:00:00');
    const title = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const counts = useMemo(() => {
        const c = { done: 0, todo: 0, missed: 0, canceled: 0, pre: 0 } as Record<StatusGroup, number>;
        appts.forEach(a => { c[statusGroupOf(a)]++; });
        return c;
    }, [appts]);
    const query = q.trim().toLowerCase();
    const list = appts
        .filter(a => status === 'all' || statusGroupOf(a) === status || (status === 'todo' && statusGroupOf(a) === 'pre'))
        .filter(a => !query || patientNameOf(a).toLowerCase().includes(query) || doctorNameOf(a).toLowerCase().includes(query))
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const morning = list.filter(a => parseInt((a.time || '0').split(':')[0], 10) < 12);
    const afternoon = list.filter(a => parseInt((a.time || '0').split(':')[0], 10) >= 12);

    const group = (label: string, items: any[]) => items.length > 0 && (
        <section key={label}>
            <h4 className="px-2.5 pb-1 pt-3 text-xs font-semibold text-gray-500 dark:text-gray-400">{label} · {items.length}</h4>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map(a => <SessionRow key={a._id || a.id} a={a} actions={actions} convenioName={convenioName} showMoney={showMoney} />)}
            </ul>
        </section>
    );
    const titleId = 'day-modal-title';
    const tabs: ['sessoes' | 'vagas', React.ReactNode][] = [
        ['sessoes', <>Sessões · <AnimatedValue value={appts.length} /></>],
        ['vagas', <>Vagas livres · <AnimatedValue value={freeCount} /></>],
    ];
    return (
        <Modal open onClose={onClose} labelledBy={titleId} zIndexClass="z-[99999]"
            panelClassName="flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-gray-900 sm:rounded-2xl">
            <ModalHeader icon={<CalendarDays size={20} />} color="#059669" title={capFirst(title)} titleId={titleId}
                subtitle={`${plural(appts.length, 'sessão', 'sessões')}${canFree ? ` · ${plural(freeCount, 'vaga livre', 'vagas livres')}` : ''}`} onClose={onClose} />
            <div className="px-5 pb-3 pt-3 sm:px-6">
                {canFree && (
                    <div role="tablist" className="relative inline-flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
                        {tabs.map(([k, label]) => (
                            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                                className={`relative rounded-lg px-4 py-1.5 text-sm font-semibold tabular-nums transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${tab === k ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                {tab === k && (
                                    <motion.span layoutId="day-tab-pill" className="absolute inset-0 rounded-lg bg-emerald-600"
                                        transition={reduce ? { duration: 0 } : { duration: motionDuration.fast, ease: motionEase.smoothOut }} />
                                )}
                                <span className="relative">{label}</span>
                            </button>
                        ))}
                    </div>
                )}
                {tab === 'sessoes' && (
                    <>
                        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                            <Chip active={status === 'all'} count={appts.length} onClick={() => setStatus('all')}>Todas</Chip>
                            {(['done', 'todo', 'missed', 'canceled'] as StatusGroup[]).map(s => {
                                const n = s === 'todo' ? counts.todo + counts.pre : counts[s];
                                return <Chip key={s} active={status === s} count={n} dot={STATUS_COLOR[s]} onClick={() => setStatus(status === s ? 'all' : s)}>{STATUS_LABEL[s]}</Chip>;
                            })}
                        </div>
                        <label className="relative mt-2 block">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar paciente ou profissional…"
                                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
                        </label>
                    </>
                )}
            </div>
            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto border-t border-gray-100 px-2 pb-3 dark:border-gray-800">
                {tab === 'vagas' && canFree
                    ? <FreeSlotsPanel dateStr={dateStr} slots={freeSlots!.slots} onSlot={freeSlots!.onSlot} />
                    : list.length === 0
                        ? <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">Nenhuma sessão com esse filtro.</p>
                        : <>{group('Manhã', morning)}{group('Tarde', afternoon)}</>}
            </div>
        </Modal>
    );
};

// ── Dia por profissional ─────────────────────────────────────────────────────

interface DoctorLite { _id?: string; id?: string; fullName?: string; name?: string; specialty?: string }

// % da grade ocupada (sessões ÷ sessões + livres)
const occ = (busy: number, free: number) => (busy + free > 0 ? Math.round((busy / (busy + free)) * 100) : 0);

export const DayByProfessional: React.FC<{
    dateStr: string;
    appts: any[];
    doctors: DoctorLite[];
    doctorFilter: string;
    fetchSlots: (p: { doctorId: string; date: string }) => Promise<string[]>;
    onOpen: (a: any) => void;
    onSlot?: (slot: { doctorId: string; doctorName: string; specialty: string; time: string }) => void;
}> = ({ dateStr, appts, doctors, doctorFilter, fetchSlots, onOpen, onSlot }) => {
    const [slots, setSlots] = useState<Record<string, string[]>>({});
    const [loadingSlots, setLoadingSlots] = useState(false);
    const cache = useRef<Record<string, string[]>>({});
    const fetchRef = useRef(fetchSlots);
    fetchRef.current = fetchSlots;
    const todayYmd = new Date().toLocaleDateString('en-CA');
    const isPastDay = dateStr < todayYmd;

    const docList = useMemo(() => {
        const map = new Map<string, { id: string; name: string; specialty: string }>();
        doctors.forEach(d => {
            const id = String(d._id || d.id || '');
            if (id) map.set(id, { id, name: d.fullName || d.name || 'Profissional', specialty: d.specialty || '' });
        });
        // Profissional com sessão no dia que não veio na lista de profissionais
        appts.forEach(a => {
            const id = doctorIdOf(a);
            if (id && !map.has(id)) map.set(id, { id, name: doctorNameOf(a), specialty: a.doctor?.specialty || a.specialty || '' });
        });
        return [...map.values()].filter(d => doctorFilter === 'all' || d.id === doctorFilter);
    }, [doctors, appts, doctorFilter]);

    const docKey = docList.map(d => d.id).join(',');
    useEffect(() => {
        if (isPastDay) { setSlots({}); return; }
        let alive = true;
        const ids = docKey ? docKey.split(',') : [];
        const missing = ids.filter(id => !cache.current[`${id}|${dateStr}`]);
        const apply = () => {
            if (!alive) return;
            const next: Record<string, string[]> = {};
            ids.forEach(id => { next[id] = cache.current[`${id}|${dateStr}`] || []; });
            setSlots(next);
        };
        if (missing.length === 0) { apply(); return; }
        setLoadingSlots(true);
        Promise.allSettled(missing.map(id => fetchRef.current({ doctorId: id, date: dateStr }).then(r => { cache.current[`${id}|${dateStr}`] = normalizeSlots(r).filter(x => x.available).map(x => x.time); })))
            .finally(() => { if (alive) { setLoadingSlots(false); apply(); } });
        return () => { alive = false; };
    }, [docKey, dateStr, isPastDay]);

    const nowHm = new Date().toTimeString().slice(0, 5);
    const freeOf = (id: string) => (slots[id] || []).filter(t => dateStr > todayYmd || t.slice(0, 5) > nowHm).map(t => t.slice(0, 5));
    const apptsOf = (id: string) => appts.filter(a => doctorIdOf(a) === id);

    const columns = docList
        .map(d => ({ ...d, appts: apptsOf(d.id), free: freeOf(d.id) }))
        .filter(d => d.appts.length > 0 || d.free.length > 0 || doctorFilter === d.id)
        .sort((a, b) => b.appts.length - a.appts.length || a.name.localeCompare(b.name));

    const times = [...new Set(columns.flatMap(c => [...c.appts.map(a => (a.time || '').slice(0, 5)), ...c.free]))].filter(Boolean).sort();
    const totalFree = columns.reduce((s, c) => s + c.free.length, 0);
    const title = capFirst(new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }));

    return (
        <div className="px-3 pb-4 pt-1">
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-gray-100">{title}</span>
                {' · '}{plural(appts.length, 'sessão', 'sessões')}
                {!isPastDay && <> · {loadingSlots ? 'buscando horários livres…' : plural(totalFree, 'horário livre', 'horários livres')}</>}
            </p>
            {/* Faixa do dia: o que já está vendido e onde ainda cabe venda */}
            {!isPastDay && !loadingSlots && columns.length > 0 && (
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                        { label: 'Sessões', value: appts.length, tone: 'text-gray-900' },
                        { label: 'Horários livres', value: totalFree, tone: totalFree > 0 ? 'text-emerald-700' : 'text-gray-900' },
                        { label: 'Ocupação do dia', value: `${occ(appts.length, totalFree)}%`, tone: 'text-gray-900' },
                        { label: 'Pré-agendados', value: appts.filter(a => statusGroupOf(a) === 'pre').length, tone: 'text-amber-700' },
                    ].map(k => (
                        <div key={k.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2">
                            <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{k.label}</div>
                            <div className={`text-lg font-bold tabular-nums ${k.tone}`}><AnimatedValue value={k.value} /></div>
                        </div>
                    ))}
                </div>
            )}
            {columns.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 py-10 text-center text-sm text-gray-500 dark:text-gray-400">Nenhuma sessão nem horário livre neste dia.</p>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr>
                                <th scope="col" className="sticky left-0 z-[1] w-14 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Hora</th>
                                {columns.map(c => (
                                    <th key={c.id} scope="col" className="min-w-[170px] border-b border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-2 align-bottom">
                                        <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-100" title={c.name}>{shortName(c.name)}</span>
                                        <span className="block truncate text-xs font-normal text-gray-500 dark:text-gray-400">
                                            {c.specialty ? `${getSpecialtyLabel(c.specialty)} · ` : ''}{plural(c.appts.length, 'sessão', 'sessões')}{!isPastDay && ` · ${c.free.length} livres`}
                                        </span>
                                        {!isPastDay && (c.appts.length + c.free.length) > 0 && (
                                            <span className="mt-1 flex items-center gap-1.5" title={`${occ(c.appts.length, c.free.length)}% da grade ocupada`}>
                                                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                                    <span className={`block h-full rounded-full ${occ(c.appts.length, c.free.length) >= 85 ? 'bg-emerald-600' : occ(c.appts.length, c.free.length) >= 50 ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${occ(c.appts.length, c.free.length)}%` }} />
                                                </span>
                                                <span className="text-[11px] font-semibold tabular-nums text-gray-600 dark:text-gray-400">{occ(c.appts.length, c.free.length)}%</span>
                                            </span>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {times.map(t => (
                                <tr key={t}>
                                    <th scope="row" className="sticky left-0 z-[1] border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-2 py-1.5 align-top text-xs font-semibold tabular-nums text-gray-600 dark:text-gray-400">{t}</th>
                                    {columns.map(c => {
                                        const here = c.appts.filter(a => (a.time || '').slice(0, 5) === t);
                                        const free = here.length === 0 && c.free.includes(t);
                                        return (
                                            <td key={c.id} className="border-b border-l border-gray-100 dark:border-gray-800 p-1 align-top">
                                                {here.map(a => {
                                                    const g = statusGroupOf(a);
                                                    return (
                                                        <button key={a._id || a.id} type="button" onClick={() => onOpen(a)}
                                                            className="mb-1 block w-full rounded-md border-l-[3px] bg-gray-50 dark:bg-gray-800/60 px-2 py-1 text-left last:mb-0 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                                            style={{ borderLeftColor: TYPE_COLOR[typeGroupOf(a)] }}
                                                            title={`${patientNameOf(a)} · ${STATUS_SINGLE[g]} · ${TYPE_LABEL[typeGroupOf(a)]}`}>
                                                            <span className={`block truncate text-[13px] font-semibold ${g === 'canceled' ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>{patientNameOf(a)}</span>
                                                            <span className="flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-400">
                                                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[g] }} aria-hidden />
                                                                {String(a.operationalStatus) === 'confirmed' ? 'Confirmada' : STATUS_SINGLE[g]} · {TYPE_LABEL[typeGroupOf(a)]}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                                {free && (
                                                    <button type="button" onClick={() => onSlot?.({ doctorId: c.id, doctorName: c.name, specialty: c.specialty, time: t })} disabled={!onSlot || isPastDay}
                                                        title={onSlot && !isPastDay ? 'Ver quem pode ocupar este horário' : undefined}
                                                        className="group block w-full rounded-md border border-dashed border-gray-300 dark:border-gray-600 px-2 py-1.5 text-left text-xs text-gray-500 dark:text-gray-400 hover:border-emerald-500 hover:text-emerald-700 disabled:cursor-default disabled:hover:border-gray-300 disabled:hover:text-gray-500">
                                                        Livre{onSlot && !isPastDay && <span className="hidden group-hover:inline"> · encaixar</span>}
                                                    </button>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
