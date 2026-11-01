// Gestão > Pacientes: lista paginada no servidor (10 por vez), busca no back e chips de filtro.
// Lista é o padrão (nome inteiro, tipo, profissional, última/próxima sessão e saldo lado a lado);
// os cartões de antes continuam no botão "Cartões".
import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, LayoutGrid, List, Mail, Pencil, Phone, Search, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCoreRowModel, useReactTable, type RowSelectionState, type Updater } from '@tanstack/react-table';
import { toast } from '../../utils/toast';
import patientService from '../../services/patientService';
import { getSpecialtyLabel } from '../../constants/specialties';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatPhone(phone?: string) {
    if (!phone) return null;
    const d = phone.replace(/\D/g, '');
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return phone;
}

function resolveDate(field: any): string | null {
    if (!field) return null;
    if (typeof field === 'string') return field;
    if (typeof field === 'object' && field.date) return field.date;
    return null;
}

// datas de agendamento representam o DIA (UTC): compara pelo dia UTC
const dayDiff = (iso: string) => {
    const d = new Date(iso);
    const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const now = new Date();
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((day - today) / 86400000);
};
const shortDate = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const lastLabel = (iso: string | null) => {
    if (!iso) return null;
    const n = -dayDiff(iso);
    if (n <= 0) return 'hoje';
    if (n === 1) return 'ontem';
    return n < 60 ? `há ${n} dias` : shortDate(iso) + '/' + new Date(iso).getUTCFullYear();
};
const nextLabel = (iso: string | null, time?: string) => {
    if (!iso) return null;
    const n = dayDiff(iso);
    const d = n === 0 ? 'hoje' : n === 1 ? 'amanhã' : shortDate(iso);
    return time ? `${d} · ${time}` : d;
};
const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const ageOf = (iso?: string) => {
    if (!iso) return null;
    const b = new Date(iso);
    if (isNaN(b.getTime())) return null;
    const now = new Date();
    let a = now.getFullYear() - b.getUTCFullYear();
    if (now.getMonth() < b.getUTCMonth() || (now.getMonth() === b.getUTCMonth() && now.getDate() < b.getUTCDate())) a--;
    return a >= 0 && a < 120 ? (a === 1 ? '1 ano' : `${a} anos`) : null;
};

const typeOf = (p: any): { label: string; cls: string } => {
    if (p.hasLiminarContract) return { label: 'Liminar', cls: 'border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-200' };
    if (p.healthPlan?.name) return { label: p.healthPlan.name, cls: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-200' };
    return { label: 'Particular', cls: 'border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300' };
};
const debtOf = (p: any) => Number(p.balance?.current ?? p.stats?.totalPendingParticularNet ?? 0);

const btn = 'inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50';
const btnGhost = `${btn} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800`;
const chipCls = (on: boolean) => `inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${on ? 'border-emerald-700 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-200' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200'}`;
const segCls = (on: boolean) => `inline-flex min-h-9 items-center gap-1.5 px-3 text-sm font-semibold ${on ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200'}`;

// ─── PatientCard (vista em cartões) ───────────────────────────────────────────

const PatientCard: React.FC<{ patient: any; onEdit: (p: any) => void }> = ({ patient, onEdit }) => {
    const navigate = useNavigate();
    const name = patient.fullName || patient.name || '';
    const id = patient._id || patient.patientId;
    const next = nextLabel(resolveDate(patient.nextAppointment), patient.nextAppointment?.time);
    const last = lastLabel(resolveDate(patient.lastAppointment));
    const phone = formatPhone(patient.phone);
    const t = typeOf(patient);
    const debt = debtOf(patient);

    return (
        <div className="flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white text-left dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-start gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">{getInitials(name)}</span>
                <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold leading-snug text-gray-900 dark:text-gray-100">{name}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                        <span className={`rounded-full border px-2 py-px text-xs font-semibold ${t.cls}`}>{t.label}</span>
                        {debt > 0 && <span className="rounded-full border border-red-200 bg-red-50 px-2 py-px text-xs font-semibold text-red-800 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-200">deve {brl(debt)}</span>}
                    </div>
                </div>
            </div>
            <div className="space-y-1 px-4 text-sm text-gray-700 dark:text-gray-300">
                <p>{next ? <>Próxima: <b className="font-semibold text-gray-900 dark:text-gray-100">{next}</b></> : last ? <>Última: {last}</> : 'Sem sessões'}</p>
                <p className="flex items-center gap-2"><Phone size={13} className="shrink-0 text-gray-500" aria-hidden />{phone ?? '—'}</p>
                {patient.email && <p className="flex min-w-0 items-center gap-2"><Mail size={13} className="shrink-0 text-gray-500" aria-hidden /><span className="truncate" title={patient.email}>{patient.email}</span></p>}
            </div>
            <div className="mt-auto flex gap-2 p-4">
                <button type="button" onClick={() => onEdit(patient)} className={`${btnGhost} flex-1`}><Pencil size={14} aria-hidden />Editar</button>
                <button type="button" onClick={() => navigate(`/patients/${id}`)} className={`${btnGhost} flex-1`}><ExternalLink size={14} aria-hidden />Ficha</button>
            </div>
        </div>
    );
};

// ─── Linha da lista ───────────────────────────────────────────────────────────

const PatientRow: React.FC<{ patient: any; onEdit: (p: any) => void; selected: boolean; onToggle: () => void }> = ({ patient, onEdit, selected, onToggle }) => {
    const navigate = useNavigate();
    const name = patient.fullName || patient.name || '';
    const id = patient._id || patient.patientId;
    const t = typeOf(patient);
    const debt = debtOf(patient);
    const last = lastLabel(resolveDate(patient.lastAppointment) || patient.stats?.lastAppointmentDate || null);
    const nextIso = resolveDate(patient.nextAppointment) || patient.stats?.nextAppointmentDate || null;
    const next = nextLabel(nextIso, patient.nextAppointment?.time);
    const age = ageOf(patient.dateOfBirth);
    const phone = formatPhone(patient.phone);
    const prof = patient.doctorName || patient.nextAppointment?.doctorName || patient.lastAppointment?.doctorName;

    return (
        <li className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 border-t border-gray-100 px-4 py-3 first:border-t-0 dark:border-gray-800 md:grid-cols-[auto_minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.6fr)_minmax(0,1.2fr)_auto] md:items-center ${selected ? 'bg-emerald-50/60 dark:bg-emerald-500/10' : ''}`}>
            <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Selecionar ${name}`}
                className="row-span-5 h-4 w-4 self-start rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 md:row-span-1 md:self-center" />
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">{getInitials(name)}</span>
                <div className="min-w-0">
                    <button type="button" onClick={() => navigate(`/patients/${id}`)} className="text-left font-semibold leading-snug text-gray-900 hover:underline dark:text-gray-100">{name}</button>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{[age, phone].filter(Boolean).join(' · ') || '—'}</p>
                </div>
            </div>
            <div className="col-start-2 flex flex-wrap items-center gap-1.5 md:col-start-auto">
                <span className={`rounded-full border px-2 py-px text-xs font-semibold ${t.cls}`}>{t.label}</span>
                {debt > 0 && <span className="rounded-full border border-red-200 bg-red-50 px-2 py-px text-xs font-semibold text-red-800 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-200">deve {brl(debt)}</span>}
            </div>
            <div className="col-start-2 min-w-0 md:col-start-auto text-sm text-gray-700 dark:text-gray-300">
                <p className="truncate">{prof || <span className="text-gray-500">sem profissional</span>}</p>
                {patient.specialty && <p className="truncate text-xs text-gray-600 dark:text-gray-400">{getSpecialtyLabel(patient.specialty)}</p>}
            </div>
            <div className="col-start-2 text-sm text-gray-700 dark:text-gray-300 md:col-start-auto">
                {next ? <p>Próxima: <b className="font-semibold text-gray-900 dark:text-gray-100">{next}</b></p>
                    : <p><span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-px text-xs font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200">sem próxima</span></p>}
                <p className="text-xs text-gray-600 dark:text-gray-400">{last ? `Última: ${last}` : 'Nenhuma sessão ainda'}</p>
            </div>
            <div className="col-start-2 flex gap-1.5 md:col-start-auto md:justify-end">
                <button type="button" onClick={() => navigate(`/patients/${id}`)} className={btnGhost}><ExternalLink size={14} aria-hidden />Ficha</button>
                <button type="button" onClick={() => onEdit(patient)} className={btnGhost} aria-label={`Editar ${name}`}><Pencil size={14} aria-hidden />Editar</button>
            </div>
        </li>
    );
};

// ─── PatientList ──────────────────────────────────────────────────────────────

type TabType = 'active' | 'inactive' | 'lead';
type ViewMode = 'list' | 'cards';

interface PatientListProps {
    onEdit: (patient: any) => void;
    refreshSignal?: number;
}

const TABS: { key: TabType; label: string }[] = [
    { key: 'active', label: 'Ativos' },
    { key: 'inactive', label: 'Inativos' },
    { key: 'lead', label: 'Leads' },
];

const PAGE_SIZE = 10;
// status do PatientsView no back (o "lead" da tela é o "prospect" de lá)
const VIEW_STATUS: Record<TabType, string> = { active: 'active', inactive: 'inactive', lead: 'prospect' };
const VIEW_KEY = 'gestao.pacientes.view';
const SORT_KEY = 'gestao.pacientes.sort';
// Ordenação feita no back (PatientsView aceita sortBy, sempre decrescente).
const SORTS = [
    { key: '', label: 'Última sessão' },
    { key: 'stats.totalPendingParticularNet', label: 'Maior saldo devedor' },
];
// A tabela só controla a seleção; as células continuam no PatientRow.
const TABLE_COLUMNS = [{ id: 'select' }];

const PatientList: React.FC<PatientListProps> = ({ onEdit, refreshSignal = 0 }) => {
    const [patients, setPatients] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [counts, setCounts] = useState<Record<TabType | 'debt', number | null>>({ active: null, inactive: null, lead: null, debt: null });
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(0);
    const [activeTab, setActiveTab] = useState<TabType>('active');
    const [onlyDebt, setOnlyDebt] = useState(false);
    const [view, setView] = useState<ViewMode>(() => {
        try { return localStorage.getItem(VIEW_KEY) === 'cards' ? 'cards' : 'list'; } catch { return 'list'; }
    });
    const [sortBy, setSortBy] = useState<string>(() => {
        try { return localStorage.getItem(SORT_KEY) || ''; } catch { return ''; }
    });
    const changeSort = (v: string) => { setSortBy(v); setPage(0); try { localStorage.setItem(SORT_KEY, v); } catch { /* ignore */ } };
    // Seleção em lote (TanStack Table): vale entre páginas e filtros, para montar uma lista de contato.
    const [picked, setPicked] = useState<Record<string, any>>({});
    const rowId = (p: any) => String(p._id || p.patientId);
    const rowSelection: RowSelectionState = Object.fromEntries(Object.keys(picked).map(k => [k, true]));
    const onRowSelectionChange = (u: Updater<RowSelectionState>) => {
        const next = typeof u === 'function' ? u(rowSelection) : u;
        setPicked(prev => {
            const out = { ...prev };
            patients.forEach(p => { const id = rowId(p); if (next[id]) out[id] = p; else delete out[id]; });
            return out;
        });
    };
    const table = useReactTable({
        data: patients, columns: TABLE_COLUMNS, getRowId: rowId, getCoreRowModel: getCoreRowModel(),
        state: { rowSelection }, onRowSelectionChange, enableRowSelection: true,
    });
    const pickedList = Object.values(picked);
    const copyPhones = async () => {
        const phones = pickedList.map(p => formatPhone(p.phone)).filter(Boolean);
        if (!phones.length) { toast.info('Nenhum dos selecionados tem telefone'); return; }
        try { await navigator.clipboard.writeText(phones.join('\n')); toast.success(`${phones.length} telefone(s) copiados`); }
        catch { toast.error('Não consegui copiar. Tente de novo.'); }
    };
    const downloadCsv = () => {
        const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const rows = [['Nome', 'Telefone', 'E-mail', 'Tipo', 'Saldo devedor', 'Profissional'].map(esc).join(';'),
            ...pickedList.map(p => [p.fullName || p.name, formatPhone(p.phone) || '', p.email || '', typeOf(p).label,
                debtOf(p).toFixed(2).replace('.', ','), p.doctorName || p.nextAppointment?.doctorName || p.lastAppointment?.doctorName || ''].map(esc).join(';'))];
        const blob = new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = `pacientes-selecionados-${pickedList.length}.csv`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    const changeView = (v: ViewMode) => { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ } };

    // Busca no servidor depois de uma pausa na digitação. Antes a tela pedia 500 pacientes de uma
    // vez e filtrava no navegador; com o saldo de cada um calculado no back, passava dos 15s do
    // timeout e travava o back (as Secretárias caíam junto).
    useEffect(() => {
        const t = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 350);
        return () => clearTimeout(t);
    }, [search]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = await patientService.list({
                limit: PAGE_SIZE,
                skip: page * PAGE_SIZE,
                status: VIEW_STATUS[activeTab],
                hasDebt: onlyDebt,
                ...(sortBy ? { sortBy } : {}),
                ...(query ? { search: query } : {}),
            });
            setPatients(result.patients || []);
            setTotal(result.pagination?.total ?? (result.patients || []).length);
        } catch {
            toast.error('Erro ao carregar pacientes');
        } finally {
            setLoading(false);
        }
    }, [page, activeTab, onlyDebt, query, sortBy]);

    useEffect(() => {
        load();
    }, [load, refreshSignal]);

    // Contagem de cada chip: uma consulta de 1 item, só para ler o total
    useEffect(() => {
        let alive = true;
        const search = query ? { search: query } : {};
        const count = async (key: TabType | 'debt', opts: Record<string, any>) => {
            try {
                const r = await patientService.list({ limit: 1, ...opts, ...search });
                if (alive) setCounts(c => ({ ...c, [key]: r.pagination?.total ?? 0 }));
            } catch { /* a contagem fica "…" */ }
        };
        (Object.keys(VIEW_STATUS) as TabType[]).forEach(tab => count(tab, { status: VIEW_STATUS[tab] }));
        count('debt', { status: VIEW_STATUS[activeTab], hasDebt: true });
        return () => { alive = false; };
    }, [query, refreshSignal, activeTab]);

    const pickTab = (tab: TabType) => { setActiveTab(tab); setPage(0); };
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const shown = (n: number | null) => (n === null ? '…' : n);
    const tabLabel = TABS.find(t => t.key === activeTab)!.label.toLowerCase();

    return (
        <div className="space-y-4 text-left">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filtros de pacientes">
                    {TABS.map(({ key, label }) => (
                        <button key={key} type="button" aria-pressed={activeTab === key} onClick={() => pickTab(key)} className={chipCls(activeTab === key)}>
                            {label} <b>{shown(counts[key])}</b>
                        </button>
                    ))}
                    <span className="mx-1 hidden w-px self-stretch bg-gray-200 dark:bg-gray-700 sm:block" aria-hidden />
                    <button type="button" aria-pressed={onlyDebt} onClick={() => { setOnlyDebt(v => !v); setPage(0); }} className={chipCls(onlyDebt)}>
                        Com saldo devedor <b className={!onlyDebt && (counts.debt ?? 0) > 0 ? 'text-red-800 dark:text-red-300' : ''}>{shown(counts.debt)}</b>
                    </button>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <label className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
                        <span className="sr-only">Buscar paciente</span>
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden />
                        <input type="search" placeholder="Nome, telefone ou CPF" value={search} onChange={e => setSearch(e.target.value)}
                            className="min-h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
                    </label>
                    <label className="sr-only" htmlFor="pac-sort">Ordenar por</label>
                    <select id="pac-sort" value={sortBy} onChange={e => changeSort(e.target.value)}
                        className="min-h-10 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100">
                        {SORTS.map(o => <option key={o.key} value={o.key}>Ordenar: {o.label}</option>)}
                    </select>
                    <div className="inline-flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600" role="group" aria-label="Vista">
                        <button type="button" aria-pressed={view === 'list'} onClick={() => changeView('list')} className={segCls(view === 'list')}><List size={15} aria-hidden />Lista</button>
                        <button type="button" aria-pressed={view === 'cards'} onClick={() => changeView('cards')} className={`${segCls(view === 'cards')} border-l border-gray-300 dark:border-gray-600`}><LayoutGrid size={15} aria-hidden />Cartões</button>
                    </div>
                </div>
            </div>

            {pickedList.length > 0 && (
                <div className="sticky top-16 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-900/40 dark:text-emerald-100">
                    <b className="tabular-nums">{pickedList.length} selecionado(s)</b>
                    <span className="flex-1" />
                    <button type="button" onClick={copyPhones} className={btnGhost}><Phone size={14} aria-hidden />Copiar telefones</button>
                    <button type="button" onClick={downloadCsv} className={btnGhost}>Baixar planilha</button>
                    <button type="button" onClick={() => setPicked({})} className="px-2 text-sm underline">Limpar</button>
                </div>
            )}

            {loading && patients.length === 0 ? (
                <p className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">Carregando pacientes...</p>
            ) : patients.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
                    <User className="mx-auto mb-3 text-gray-400" size={36} aria-hidden />
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Nenhum paciente encontrado</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {query ? `Sem resultados para "${query}" em ${tabLabel}${onlyDebt ? ' com saldo devedor' : ''}.` : `Nenhum paciente em ${tabLabel}${onlyDebt ? ' com saldo devedor' : ''}.`}
                    </p>
                </div>
            ) : view === 'list' ? (
                <div className={`overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 ${loading ? 'opacity-60' : ''}`}>
                    <div className="hidden grid-cols-[auto_minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.6fr)_minmax(0,1.2fr)_auto] gap-x-4 border-b border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400 md:grid">
                        <input type="checkbox" aria-label="Selecionar todos desta página" checked={table.getIsAllRowsSelected()}
                            ref={el => { if (el) el.indeterminate = table.getIsSomeRowsSelected(); }}
                            onChange={table.getToggleAllRowsSelectedHandler()} className="h-4 w-4 self-center rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                        <span>Paciente</span><span>Tipo</span><span>Profissional</span><span>Sessões</span><span className="w-[164px]" />
                    </div>
                    <ul>{table.getRowModel().rows.map(r => <PatientRow key={r.id} patient={r.original} onEdit={onEdit} selected={r.getIsSelected()} onToggle={r.getToggleSelectedHandler() as () => void} />)}</ul>
                </div>
            ) : (
                <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
                    {patients.map(p => <PatientCard key={p._id || p.patientId} patient={p} onEdit={onEdit} />)}
                </div>
            )}

            {total > PAGE_SIZE && (
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>Mostrando {page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} de {total}</span>
                    <div className="flex items-center gap-2">
                        <button type="button" disabled={page === 0 || loading} onClick={() => setPage(p => Math.max(0, p - 1))} className={btnGhost}>
                            <ChevronLeft size={15} aria-hidden />Anterior
                        </button>
                        <span className="tabular-nums">{page + 1} de {pageCount}</span>
                        <button type="button" disabled={page + 1 >= pageCount || loading} onClick={() => setPage(p => p + 1)} className={btnGhost}>
                            Próxima<ChevronRight size={15} aria-hidden />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientList;
