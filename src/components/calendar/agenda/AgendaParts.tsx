// Peças da Agenda do admin/secretária (mock aprovado em 30/10). Ícones só em render
// (nada de lucide no escopo do módulo — ver o FIX de TDZ em EnhancedCalendar.tsx).
import { CalendarClock, CalendarPlus, CheckCircle, Info, Plus, RotateCcw, Search, X, XCircle } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getSpecialtyLabel } from '../../../constants/specialties';
import { normalizeSlots } from '../RescheduleDialog';
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
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
        }`}
    >
        {dot && <span className="h-2 w-2 rounded-full" style={{ background: dot }} aria-hidden />}
        <span>{children}</span>
        {count !== undefined && <span className={`tabular-nums ${active ? 'text-emerald-800' : 'text-gray-500'}`}>{count}</span>}
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
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Agenda</h1>
            <p className="mt-0.5 text-sm text-gray-500">
                {monthLabel || 'Carregando…'}{monthLabel && total !== null && ` · ${plural(total, 'sessão no mês', 'sessões no mês')}`}
            </p>
        </div>
        <div className="flex flex-wrap gap-2">
            {onOpenPre && (
                <button type="button" onClick={onOpenPre}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
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

const FilterRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex min-w-0 items-center gap-2">
        <span className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
        <div className="-my-1 flex min-w-0 gap-1.5 overflow-x-auto py-1 [scrollbar-width:thin]">{children}</div>
    </div>
);

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
        <div className="mb-3 rounded-xl border border-gray-200 bg-white p-3">
            <div className="flex flex-col gap-2">
                {doctorOptions && (
                    <FilterRow label="Profissional">
                        <Chip active={filter.doctor === 'all'} count={doctorTotal} onClick={() => onChange({ ...filter, doctor: 'all' })}>Todos</Chip>
                        {doctorOptions.map(d => (
                            <Chip key={d.id} active={filter.doctor === d.id} count={d.count} title={d.fullName}
                                onClick={() => onChange({ ...filter, doctor: filter.doctor === d.id ? 'all' : d.id })}>{d.label}</Chip>
                        ))}
                    </FilterRow>
                )}
                <FilterRow label="Status">
                    <Chip active={filter.status === 'all'} count={statusTotal} onClick={() => onChange({ ...filter, status: 'all' })}>Todos</Chip>
                    {(['todo', 'done', 'missed', 'canceled', 'pre'] as StatusGroup[]).map(s => (
                        <Chip key={s} active={filter.status === s} count={statusCounts[s]} dot={STATUS_COLOR[s]}
                            onClick={() => onChange({ ...filter, status: filter.status === s ? 'all' : s })}>{STATUS_LABEL[s]}</Chip>
                    ))}
                </FilterRow>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <FilterRow label="Tipo">
                        <Chip active={filter.type === 'all'} count={typeTotal} onClick={() => onChange({ ...filter, type: 'all' })}>Todos</Chip>
                        {(['particular', 'convenio', 'pacote', 'liminar'] as TypeGroup[]).map(t => (
                            <Chip key={t} active={filter.type === t} count={typeCounts[t]} dot={TYPE_COLOR[t]}
                                onClick={() => onChange({ ...filter, type: filter.type === t ? 'all' : t })}>{TYPE_LABEL[t]}</Chip>
                        ))}
                    </FilterRow>
                    <div className="ml-auto flex items-center gap-2">
                        {hasFilter && (
                            <button type="button" onClick={() => onChange({ doctor: 'all', status: 'all', type: 'all' })}
                                className="rounded-lg px-2 py-1 text-[13px] font-medium text-gray-600 hover:bg-gray-100">Limpar filtros</button>
                        )}
                        <button type="button" onClick={() => setLegendOpen(o => !o)} aria-expanded={legendOpen}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-[13px] font-medium text-gray-700 hover:bg-gray-50">
                            <Info size={14} aria-hidden /> Legenda
                        </button>
                    </div>
                </div>
            </div>
            {legendOpen && <div className="mt-3 border-t border-gray-100 pt-3">{legend}</div>}
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
}> = ({ dayNumber, isToday, isPast, appts, holidayName }) => {
    const c = { done: 0, todo: 0, missed: 0, canceled: 0, pre: 0 } as Record<StatusGroup, number>;
    appts.forEach(a => { c[statusGroupOf(a)]++; });
    const total = appts.length;
    const todo = c.todo + c.pre;
    const notes = [
        c.missed > 0 && { text: plural(c.missed, 'falta', 'faltas'), color: 'text-amber-700' },
        c.canceled > 0 && { text: plural(c.canceled, 'cancelada', 'canceladas'), color: 'text-red-600' },
    ].filter(Boolean) as { text: string; color: string }[];
    const segs = [
        { n: c.done, color: STATUS_COLOR.done },
        { n: todo, color: '#cbd5e1' },
        { n: c.missed, color: STATUS_COLOR.missed },
        { n: c.canceled, color: STATUS_COLOR.canceled },
    ].filter(s => s.n > 0);
    return (
        <div className={`flex h-full min-h-[84px] w-full flex-col gap-1 p-1.5 text-left ${isPast && !isToday ? 'opacity-80' : ''}`}
            title={total ? `${c.done} de ${total} realizadas · ${todo} a fazer · ${c.missed} faltas · ${c.canceled} canceladas` : undefined}>
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[13px] tabular-nums ${isToday ? 'bg-emerald-600 font-bold text-white' : 'font-medium text-gray-700'}`}>
                {dayNumber}
            </span>
            {holidayName ? (
                <div className="mt-auto">
                    <p className="text-xs font-semibold leading-tight text-amber-800">{holidayName}</p>
                    <p className="text-[11px] text-amber-700">Sem atendimento</p>
                </div>
            ) : total > 0 && (
                <div className="mt-auto">
                    <p className="leading-none text-gray-900">
                        <span className="text-[17px] font-bold tabular-nums">{c.done}</span>
                        <span className="text-xs text-gray-500"> de {total}</span>
                    </p>
                    <div className="mt-1.5 flex h-1.5 w-full gap-[2px] overflow-hidden rounded-full bg-gray-100">
                        {segs.map((s, i) => <span key={i} style={{ flex: s.n, background: s.color }} />)}
                    </div>
                    {notes.length > 0 && (
                        <p className="mt-1 truncate text-[11px] font-medium leading-tight">
                            {notes.map((n, i) => <span key={n.text} className={n.color}>{i > 0 && ' · '}{n.text}</span>)}
                        </p>
                    )}
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
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-gray-700">
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
            tone === 'danger' ? 'text-red-600 hover:bg-red-50' : tone === 'success' ? 'text-emerald-700 hover:bg-emerald-50' : 'text-gray-600 hover:bg-gray-100'
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
                <span className="w-11 shrink-0 text-sm font-bold tabular-nums text-gray-900">{(a.time || '').slice(0, 5)}</span>
                <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-semibold ${canceled ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{patientNameOf(a)}</p>
                    <p className="truncate text-xs text-gray-500">
                        {doctorNameOf(a)}{spec && ` · ${spec}`}
                        {showMoney && <span className="sm:hidden"> · {billingText(a, convenioName)}</span>}
                    </p>
                </div>
                {showMoney && <span className="hidden w-44 shrink-0 truncate text-right text-xs text-gray-600 sm:block">{billingText(a, convenioName)}</span>}
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
export const DayPreviewList: React.FC<{ appts: any[]; convenioName: (c?: string) => string; showMoney: boolean; onOpen: (a: any) => void }> = ({ appts, convenioName, showMoney, onOpen }) => (
    <ul className="divide-y divide-gray-100">
        {[...appts].sort((a, b) => (a.time || '').localeCompare(b.time || '')).map(a => (
            <SessionRow key={a._id || a.id} a={a} actions={{ onOpen }} convenioName={convenioName} showMoney={showMoney} />
        ))}
    </ul>
);

export const DayAgendaModal: React.FC<{
    dateStr: string;
    appts: any[];
    onClose: () => void;
    actions: RowActions;
    convenioName: (code?: string) => string;
    showMoney: boolean;
}> = ({ dateStr, appts, onClose, actions, convenioName, showMoney }) => {
    const [status, setStatus] = useState<'all' | StatusGroup>('all');
    const [q, setQ] = useState('');
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

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const group = (label: string, items: any[]) => items.length > 0 && (
        <section key={label}>
            <h4 className="px-2.5 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{label} · {items.length}</h4>
            <ul className="divide-y divide-gray-100">
                {items.map(a => <SessionRow key={a._id || a.id} a={a} actions={actions} convenioName={convenioName} showMoney={showMoney} />)}
            </ul>
        </section>
    );

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 p-3 sm:p-6" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div role="dialog" aria-modal="true" aria-label={`Sessões de ${title}`}
                className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="border-b border-gray-100 px-4 pb-3 pt-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">{capFirst(title)}</h3>
                            <p className="text-sm text-gray-500">{plural(appts.length, 'sessão', 'sessões')}</p>
                        </div>
                        <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-gray-500 hover:bg-gray-100"><X size={18} /></button>
                    </div>
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
                            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                    </label>
                </div>
                <div className="overflow-y-auto px-2 pb-3">
                    {list.length === 0
                        ? <p className="py-10 text-center text-sm text-gray-500">Nenhuma sessão com esse filtro.</p>
                        : <>{group('Manhã', morning)}{group('Tarde', afternoon)}</>}
                </div>
            </div>
        </div>
    );
};

// ── Dia por profissional ─────────────────────────────────────────────────────

interface DoctorLite { _id?: string; id?: string; fullName?: string; name?: string; specialty?: string }

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
            <p className="mb-3 text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{title}</span>
                {' · '}{plural(appts.length, 'sessão', 'sessões')}
                {!isPastDay && <> · {loadingSlots ? 'buscando horários livres…' : plural(totalFree, 'horário livre', 'horários livres')}</>}
            </p>
            {columns.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">Nenhuma sessão nem horário livre neste dia.</p>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr>
                                <th scope="col" className="sticky left-0 z-[1] w-14 border-b border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-500">Hora</th>
                                {columns.map(c => (
                                    <th key={c.id} scope="col" className="min-w-[170px] border-b border-l border-gray-200 bg-white px-2.5 py-2 align-bottom">
                                        <span className="block truncate text-sm font-semibold text-gray-900" title={c.name}>{shortName(c.name)}</span>
                                        <span className="block truncate text-xs font-normal text-gray-500">
                                            {c.specialty ? `${getSpecialtyLabel(c.specialty)} · ` : ''}{plural(c.appts.length, 'sessão', 'sessões')}{!isPastDay && ` · ${c.free.length} livres`}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {times.map(t => (
                                <tr key={t}>
                                    <th scope="row" className="sticky left-0 z-[1] border-b border-gray-100 bg-white px-2 py-1.5 align-top text-xs font-semibold tabular-nums text-gray-600">{t}</th>
                                    {columns.map(c => {
                                        const here = c.appts.filter(a => (a.time || '').slice(0, 5) === t);
                                        const free = here.length === 0 && c.free.includes(t);
                                        return (
                                            <td key={c.id} className="border-b border-l border-gray-100 p-1 align-top">
                                                {here.map(a => {
                                                    const g = statusGroupOf(a);
                                                    return (
                                                        <button key={a._id || a.id} type="button" onClick={() => onOpen(a)}
                                                            className="mb-1 block w-full rounded-md border-l-[3px] bg-gray-50 px-2 py-1 text-left last:mb-0 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                                            style={{ borderLeftColor: TYPE_COLOR[typeGroupOf(a)] }}
                                                            title={`${patientNameOf(a)} · ${STATUS_SINGLE[g]} · ${TYPE_LABEL[typeGroupOf(a)]}`}>
                                                            <span className={`block truncate text-[13px] font-semibold ${g === 'canceled' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{patientNameOf(a)}</span>
                                                            <span className="flex items-center gap-1 text-[11px] text-gray-600">
                                                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[g] }} aria-hidden />
                                                                {String(a.operationalStatus) === 'confirmed' ? 'Confirmada' : STATUS_SINGLE[g]} · {TYPE_LABEL[typeGroupOf(a)]}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                                {free && (
                                                    <button type="button" onClick={() => onSlot?.({ doctorId: c.id, doctorName: c.name, specialty: c.specialty, time: t })} disabled={!onSlot || isPastDay}
                                                        title={onSlot && !isPastDay ? 'Ver quem pode ocupar este horário' : undefined}
                                                        className="group block w-full rounded-md border border-dashed border-gray-300 px-2 py-1.5 text-left text-xs text-gray-500 hover:border-emerald-500 hover:text-emerald-700 disabled:cursor-default disabled:hover:border-gray-300 disabled:hover:text-gray-500">
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
