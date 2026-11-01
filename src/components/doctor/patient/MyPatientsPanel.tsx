// src/components/doctor/patient/MyPatientsPanel.tsx
// Aba Pacientes do Portal do Terapeuta ("Meus pacientes"). Substitui a PatientsTable, que exibia
// status/idade/convênio/relatórios que o back nunca mandava (todo paciente aparecia "Inativo",
// "Particular" e com 0 documentos). Mantém as ações de antes (ficha, anamnese, escolar, relatórios)
// e acrescenta próxima sessão, status de atendimento real, filtros rápidos e WhatsApp do responsável.
// Status vem do back: active = tem sessão futura; no_next = atendido nos últimos 60 dias sem
// agendamento; inactive = o resto.
import { CalendarPlus, ChevronLeft, ChevronRight, FileText, MessageCircle, MoreHorizontal, RefreshCw, School, Search, Stethoscope, UserPlus, UserRound } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchMyPatients, type MyPatientsSummary } from '../../../services/doctorService';
import { toDateString } from '../../../utils/dateUtils';
import { whatsappLink } from '../overview/agendaUtils';

type Patient = { _id: string; fullName: string; [k: string]: any };

interface Props {
    pendingEvolutionIds: Set<string>;
    /** muda quando um paciente é criado/editado, para recarregar a lista */
    refreshKey?: number;
    onOpenPatient: (p: Patient) => void;
    onCreateAnamnesis: (p: Patient) => void;
    onCreateSchoolReport: (p: Patient) => void;
    onViewReports: (p: Patient) => void;
    onRegisterEvolution: (p: Patient) => void;
    onSchedule: (p: Patient) => void;
    onAddNewPatient?: () => void;
}

const PAGE_SIZE = 20;
type Filter = '' | 'active' | 'no_next' | 'inactive' | 'birthday' | 'evolution';

const chipTone = {
    ok: 'border-green-200 bg-green-50 text-green-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    pur: 'border-purple-200 bg-purple-50 text-purple-800',
    neu: 'border-gray-300 bg-gray-50 text-gray-700',
};
export const Chip = ({ tone, children }: { tone: keyof typeof chipTone; children: React.ReactNode }) => (
    <span className={`inline-flex items-center rounded-full border px-2 py-px text-xs font-semibold ${chipTone[tone]}`}>{children}</span>
);

const btn = 'inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50';
const btnSoft = `${btn} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`;
const btnGhost = `${btn} border-gray-300 bg-white text-gray-700 hover:bg-gray-50`;
const btnIcon = `${btnGhost} w-10 px-0`;
const linkBtn = 'inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 text-sm text-gray-700 hover:bg-gray-100 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

export function ageLabel(dob?: string) {
    if (!dob) return null;
    const d = new Date(dob); // meia-noite UTC do dia pretendido
    const now = new Date();
    let age = now.getFullYear() - d.getUTCFullYear();
    if (now.getMonth() < d.getUTCMonth() || (now.getMonth() === d.getUTCMonth() && now.getDate() < d.getUTCDate())) age--;
    return age >= 0 ? `${age} ${age === 1 ? 'ano' : 'anos'}` : null;
}

export function dayDiff(iso: string) {
    const [y, m, d] = toDateString(iso).split('-').map(Number);
    const now = new Date();
    return Math.round((new Date(y, m - 1, d).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
}

export function lastLabel(iso?: string | null) {
    if (!iso) return '—';
    const n = -dayDiff(iso);
    if (n <= 0) return 'hoje';
    if (n === 1) return 'ontem';
    return `há ${n} dias`;
}

export function nextLabel(apt?: { date: string; time?: string } | null) {
    if (!apt) return null;
    const n = dayDiff(apt.date);
    const time = apt.time ? ` · ${apt.time}` : '';
    if (n === 0) return `hoje${time}`;
    if (n === 1) return `amanhã${time}`;
    const [y, m, d] = toDateString(apt.date).split('-').map(Number);
    const label = new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');
    return `${label}${time}`;
}

export function billingChip(p: Patient) {
    if (p.billingType === 'liminar' || p.hasLiminar) return <Chip tone="pur">Liminar</Chip>;
    if (p.billingType === 'convenio') return <Chip tone="info">{p.insuranceProvider || 'Convênio'}</Chip>;
    if (p.billingType === 'particular') return <Chip tone="neu">Particular</Chip>;
    return p.insuranceProvider ? <Chip tone="info">{p.insuranceProvider}</Chip> : null;
}

function careChip(p: Patient) {
    if (p.careStatus === 'active') return <Chip tone="ok">Em atendimento</Chip>;
    if (p.careStatus === 'no_next') return <Chip tone="warn">Sem próxima sessão</Chip>;
    return <Chip tone="neu">Inativo</Chip>;
}

function birthdayLabel(dob?: string) {
    if (!dob) return '';
    const d = new Date(dob);
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();

function RowMenu({ patient, onRegisterEvolution, onSchedule, onViewReports }: {
    patient: Patient; onRegisterEvolution: (p: Patient) => void; onSchedule: (p: Patient) => void; onViewReports: (p: Patient) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
    }, [open]);
    const item = 'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none';
    const pick = (fn: (p: Patient) => void) => () => { setOpen(false); fn(patient); };
    return (
        <div className="relative" ref={ref}>
            <button type="button" className={btnIcon} aria-label={`Mais ações para ${patient.fullName}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
                <MoreHorizontal className="h-4 w-4" aria-hidden />
            </button>
            {open && (
                <div role="menu" className="absolute right-0 top-11 z-20 min-w-[210px] rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
                    <button role="menuitem" type="button" className={item} onClick={pick(onRegisterEvolution)}><FileText className="h-4 w-4" aria-hidden />Registrar evolução</button>
                    <button role="menuitem" type="button" className={item} onClick={pick(onSchedule)}><CalendarPlus className="h-4 w-4" aria-hidden />Agendar sessão</button>
                    <button role="menuitem" type="button" className={item} onClick={pick(onViewReports)}><FileText className="h-4 w-4" aria-hidden />Ver relatórios</button>
                </div>
            )}
        </div>
    );
}

export default function MyPatientsPanel({
    pendingEvolutionIds, refreshKey = 0, onOpenPatient, onCreateAnamnesis, onCreateSchoolReport,
    onViewReports, onRegisterEvolution, onSchedule, onAddNewPatient,
}: Props) {
    const [search, setSearch] = useState('');
    const [debounced, setDebounced] = useState('');
    const [filter, setFilter] = useState<Filter>('');
    const [sort, setSort] = useState('next');
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState<Patient[]>([]);
    const [meta, setMeta] = useState<{ total: number; totalPages: number; summary?: MyPatientsSummary }>({ total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300);
        return () => clearTimeout(t);
    }, [search]);

    const pendingIds = useMemo(() => [...pendingEvolutionIds], [pendingEvolutionIds]);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        setError(false);
        const evolutionOnly = filter === 'evolution';
        fetchMyPatients({
            page, limit: PAGE_SIZE, search: debounced, sort,
            care: evolutionOnly ? '' : filter,
            ids: evolutionOnly ? (pendingIds.length ? pendingIds : ['none']) : undefined,
        })
            .then(res => { if (alive) { setRows(res.data); setMeta(res.meta); } })
            .catch(() => { if (alive) setError(true); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [page, debounced, sort, filter, pendingIds, refreshKey, retry]);

    const summary = meta.summary;
    const filters: { key: Filter; label: string; count?: number; warn?: boolean }[] = [
        { key: '', label: 'Todos', count: summary?.total },
        { key: 'active', label: 'Em atendimento', count: summary?.active },
        { key: 'no_next', label: 'Sem próxima sessão', count: summary?.no_next, warn: true },
        { key: 'evolution', label: 'Evolução pendente', count: pendingEvolutionIds.size, warn: true },
        { key: 'birthday', label: 'Aniversário no mês', count: summary?.birthday },
        { key: 'inactive', label: 'Inativos', count: summary?.inactive },
    ];
    const sortLabel: Record<string, string> = { next: 'pela próxima sessão', last: 'pela última sessão', name: 'por nome' };

    const pickFilter = (f: Filter) => { setFilter(f); setPage(1); };
    const from = meta.total ? (page - 1) * PAGE_SIZE + 1 : 0;
    const to = Math.min(page * PAGE_SIZE, meta.total);

    const meta1 = (p: Patient) => [ageLabel(p.dateOfBirth), p.legalGuardian && `Resp.: ${p.legalGuardian}`].filter(Boolean).join(' · ');
    const tags = (p: Patient) => (
        <div className="mt-1 flex flex-wrap gap-1">
            {billingChip(p)}
            {careChip(p)}
            {pendingEvolutionIds.has(p._id) && <Chip tone="warn">Evolução pendente</Chip>}
            {p.birthdayThisMonth && <Chip tone="ok">Aniversário {birthdayLabel(p.dateOfBirth)}</Chip>}
        </div>
    );
    const nextCell = (p: Patient) => {
        const label = nextLabel(p.nextAppointment);
        return label
            ? <span className="font-medium tabular-nums text-gray-900">{label}</span>
            : <Chip tone={p.careStatus === 'no_next' ? 'warn' : 'neu'}>Sem agendamento</Chip>;
    };
    const docLinks = (p: Patient) => (
        <div className="flex flex-wrap gap-x-1">
            <button type="button" className={linkBtn} onClick={() => onCreateAnamnesis(p)}><Stethoscope className="h-3.5 w-3.5" aria-hidden />Anamnese</button>
            <button type="button" className={linkBtn} onClick={() => onCreateSchoolReport(p)}><School className="h-3.5 w-3.5" aria-hidden />Escolar</button>
        </div>
    );
    const actions = (p: Patient) => {
        const wa = whatsappLink(p.phone);
        return (
            <div className="flex items-center gap-1.5 md:justify-end">
                <button type="button" className={btnSoft} onClick={() => onOpenPatient(p)}><UserRound className="h-4 w-4" aria-hidden />Ver ficha</button>
                {wa && (
                    <a href={wa} target="_blank" rel="noreferrer" className={btnIcon} aria-label={`WhatsApp de ${p.fullName}`} title={p.phone}>
                        <MessageCircle className="h-4 w-4" aria-hidden />
                    </a>
                )}
                <RowMenu patient={p} onRegisterEvolution={onRegisterEvolution} onSchedule={onSchedule} onViewReports={onViewReports} />
            </div>
        );
    };
    const nameBtn = (p: Patient) => (
        <button type="button" onClick={() => onOpenPatient(p)} className="text-left text-base font-semibold text-gray-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            {p.fullName}
        </button>
    );
    const avatar = (p: Patient) => (
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-800">{initials(p.fullName)}</span>
    );

    return (
        <div className="space-y-3 text-left">
            <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="my-patients-search" className="sr-only">Buscar paciente</label>
                <div className="flex min-h-11 min-w-0 flex-[1_1_280px] items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500">
                    <Search className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                    <input
                        id="my-patients-search" type="search" value={search} autoComplete="off"
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nome, responsável ou telefone"
                        className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-gray-900 outline-none placeholder:text-gray-500 focus:ring-0"
                    />
                </div>
                <label htmlFor="my-patients-sort" className="sr-only">Ordenar</label>
                <select id="my-patients-sort" value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                    <option value="next">Ordenar: próxima sessão</option>
                    <option value="last">Ordenar: última sessão</option>
                    <option value="name">Ordenar: nome (A–Z)</option>
                </select>
{onAddNewPatient && (
                <button type="button" onClick={onAddNewPatient} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-700 px-3 text-sm font-medium text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1">
                    <UserPlus className="h-4 w-4" aria-hidden />Novo paciente
                </button>
                )}
            </div>

            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Filtros rápidos">
                {filters.map(f => {
                    const on = filter === f.key;
                    return (
                        <button
                            key={f.key || 'all'} type="button" aria-pressed={on} onClick={() => pickFilter(f.key)}
                            className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${on ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            {f.label}
                            {typeof f.count === 'number' && <b className={`tabular-nums ${f.warn && f.count > 0 && !on ? 'text-amber-800' : 'text-gray-900'}`}>{f.count}</b>}
                        </button>
                    );
                })}
            </div>

            <section aria-labelledby="my-patients-title" className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
                    <h2 id="my-patients-title" className="text-base font-semibold text-gray-900">Meus pacientes</h2>
                    {!error && <span className="text-sm text-gray-600">{meta.total} {meta.total === 1 ? 'paciente' : 'pacientes'} · ordenados {sortLabel[sort]}</span>}
                </div>

                {error ? (
                    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 px-4 py-6">
                        <div>
                            <p className="font-semibold text-red-900">Não foi possível carregar seus pacientes.</p>
                            <p className="text-sm text-red-800">Verifique a conexão e tente de novo.</p>
                        </div>
                        <button type="button" onClick={() => setRetry(r => r + 1)} className={btnGhost}><RefreshCw className="h-4 w-4" aria-hidden />Tentar de novo</button>
                    </div>
                ) : loading && rows.length === 0 ? (
                    <div className="space-y-px" aria-busy="true">{[0, 1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse bg-gray-50" />)}</div>
                ) : rows.length === 0 ? (
                    <div className="px-4 py-8">
                        <p className="font-medium text-gray-800">{debounced || filter ? 'Nenhum paciente encontrado com esse filtro.' : 'Você ainda não tem pacientes.'}</p>
                        <p className="text-sm text-gray-600">{debounced || filter ? 'Tente outro nome ou limpe o filtro.' : 'Os pacientes aparecem aqui assim que a recepção agenda uma sessão com você.'}</p>
                    </div>
                ) : (
                    <div className={loading ? 'opacity-60 transition-opacity' : ''} aria-busy={loading}>
                        {/* computador: tabela */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600">
                                        <th scope="col" className="px-4 py-2.5">Paciente</th>
                                        <th scope="col" className="px-3 py-2.5">Queixa principal</th>
                                        <th scope="col" className="px-3 py-2.5 whitespace-nowrap">Última sessão</th>
                                        <th scope="col" className="px-3 py-2.5 whitespace-nowrap">Próxima sessão</th>
                                        <th scope="col" className="px-3 py-2.5">Documentos</th>
                                        <th scope="col" className="px-4 py-2.5 text-right"><span className="sr-only">Ações</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(p => (
                                        <tr key={p._id} className="border-b border-gray-100 align-top last:border-b-0">
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2.5">
                                                    {avatar(p)}
                                                    <div className="min-w-0">
                                                        {nameBtn(p)}
                                                        {meta1(p) && <p className="text-xs text-gray-600">{meta1(p)}</p>}
                                                        {tags(p)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-gray-800">{p.mainComplaint || '—'}</td>
                                            <td className="px-3 py-3 text-sm tabular-nums text-gray-800 whitespace-nowrap">{lastLabel(p.lastAppointment)}</td>
                                            <td className="px-3 py-3 text-sm whitespace-nowrap">{nextCell(p)}</td>
                                            <td className="px-3 py-3">{docLinks(p)}</td>
                                            <td className="px-4 py-3">{actions(p)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* celular: cartões */}
                        <ul className="md:hidden">
                            {rows.map(p => (
                                <li key={p._id} className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 last:border-b-0">
                                    <div className="flex gap-2.5">
                                        {avatar(p)}
                                        <div className="min-w-0">
                                            {nameBtn(p)}
                                            {meta1(p) && <p className="text-xs text-gray-600">{meta1(p)}</p>}
                                            {tags(p)}
                                        </div>
                                    </div>
                                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                                        <dt className="text-gray-600">Queixa</dt><dd className="text-gray-800">{p.mainComplaint || '—'}</dd>
                                        <dt className="text-gray-600">Última sessão</dt><dd className="tabular-nums text-gray-800">{lastLabel(p.lastAppointment)}</dd>
                                        <dt className="text-gray-600">Próxima sessão</dt><dd>{nextCell(p)}</dd>
                                    </dl>
                                    {docLinks(p)}
                                    {actions(p)}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {!error && meta.totalPages > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-4 py-2.5 text-sm text-gray-600">
                        <span className="tabular-nums">Mostrando {from}–{to} de {meta.total}</span>
                        <div className="flex gap-1.5">
                            <button type="button" className={btnGhost} disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" aria-hidden />Anterior</button>
                            <button type="button" className={btnGhost} disabled={page >= meta.totalPages || loading} onClick={() => setPage(p => p + 1)}>Próxima<ChevronRight className="h-4 w-4" aria-hidden /></button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
