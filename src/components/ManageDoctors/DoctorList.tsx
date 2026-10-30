// Gestão > Profissionais: chips de status e especialidade com contagem, busca e duas vistas.
// Lista é o padrão (nome inteiro, números e ocupação lado a lado); os cartões continuam no botão
// "Cartões", sem a cor de fundo por especialidade (a especialidade já vem escrita).
import { Calendar, ClipboardList, LayoutGrid, List, Mail, Pencil, Phone, Power, RotateCcw, Search, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getSpecialtyLabel } from '../../constants/specialties';
import { getInitials } from '../../constants/specialtyColors';

const formatPhoneNumber = (phone?: string) => {
    if (!phone) return '—';
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
    ativo: { label: 'Ativo', cls: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200' },
    ferias: { label: 'Férias', cls: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-200' },
    afastado: { label: 'Afastado', cls: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200' },
    inativo: { label: 'Inativo', cls: 'border-gray-300 bg-gray-50 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300' },
};

const btn = 'inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';
const btnGhost = `${btn} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800`;
const btnSoft = `${btn} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200`;
const chipCls = (on: boolean) => `inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${on ? 'border-emerald-700 bg-emerald-50 text-emerald-900 dark:border-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-200' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200'}`;
const segCls = (on: boolean) => `inline-flex min-h-9 items-center gap-1.5 px-3 text-sm font-semibold ${on ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200' : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200'}`;

const numbersOf = (doctor: any) => ({
    occupancy: doctor.occupancy ?? null as number | null,
    maxSlots: doctor.maxSlots ?? 30,
    monthlySessions: doctor.monthlySessions ?? 0,
    weeklySessions: doctor.weeklySessions ?? 0,
    patients: doctor.patients ?? 0,
});

const OccupancyBar = ({ doctor }: { doctor: any }) => {
    const n = numbersOf(doctor);
    if (n.occupancy === null) return <span className="text-sm text-gray-500">—</span>;
    const pct = Math.min(100, Math.max(0, n.occupancy));
    return (
        <div className="min-w-0">
            <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Ocupação da semana">
                    <div className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">{pct}%</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">{n.weeklySessions} de {n.maxSlots} vagas na semana</p>
        </div>
    );
};

// Confirmação de inativar (mesmo texto de antes)
const ConfirmDeactivate = ({ doctor, onCancel, onConfirm }: { doctor: any; onCancel: () => void; onConfirm: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="inativar-titulo">
        <div className="w-full max-w-md rounded-xl bg-white p-6 text-left shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15"><Power className="text-red-700 dark:text-red-300" size={22} aria-hidden /></div>
                <h3 id="inativar-titulo" className="text-lg font-semibold text-gray-900 dark:text-gray-100">Inativar profissional</h3>
            </div>
            <p className="mb-2 text-gray-700 dark:text-gray-300">Tem certeza que deseja inativar <strong>{doctor.fullName}</strong>?</p>
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/15">
                <p className="text-sm text-amber-900 dark:text-amber-200"><strong>Atenção:</strong> ao inativar, o profissional não aparece mais nas listas de agendamento, mas todo o histórico é preservado.</p>
            </div>
            <div className="flex gap-3">
                <button type="button" onClick={onCancel} className={`${btnGhost} flex-1`}>Cancelar</button>
                <button type="button" onClick={onConfirm} className={`${btn} flex-1 border-red-700 bg-red-700 text-white hover:bg-red-800`}>Sim, inativar</button>
            </div>
        </div>
    </div>
);

interface ItemProps {
    doctor: any;
    onEdit: (doctor: any) => void;
    onViewAgenda?: (doctor: any) => void;
    onAskDeactivate?: (doctor: any) => void;
    onReactivate?: (doctor: any) => void;
    isInactive?: boolean;
}

const Actions = ({ doctor, onEdit, onViewAgenda, onAskDeactivate, onReactivate, isInactive }: ItemProps) => (
    isInactive ? (
        <button type="button" onClick={() => onReactivate?.(doctor)} className={btnSoft}><RotateCcw size={14} aria-hidden />Reativar</button>
    ) : (
        <>
            {onViewAgenda && <button type="button" onClick={() => onViewAgenda(doctor)} className={btnGhost}><Calendar size={14} aria-hidden />Agenda</button>}
            <button type="button" onClick={() => onEdit(doctor)} className={btnGhost} aria-label={`Editar ${doctor.fullName}`}><Pencil size={14} aria-hidden />Editar</button>
            {onAskDeactivate && (
                <button type="button" onClick={() => onAskDeactivate(doctor)} className={`${btn} border-transparent px-2 text-gray-600 hover:bg-red-50 hover:text-red-800 dark:text-gray-400 dark:hover:bg-red-500/15`} aria-label={`Inativar ${doctor.fullName}`} title="Inativar">
                    <Power size={15} aria-hidden />
                </button>
            )}
        </>
    )
);

const DoctorRow = (props: ItemProps) => {
    const { doctor, isInactive } = props;
    const n = numbersOf(doctor);
    const st = STATUS_CFG[doctor.status || (isInactive ? 'inativo' : 'ativo')] || STATUS_CFG.ativo;
    return (
        <li className="grid gap-x-4 gap-y-2 border-t border-gray-100 px-4 py-3 first:border-t-0 dark:border-gray-800 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_5rem_5rem_minmax(0,1.4fr)_minmax(0,1.6fr)_14rem] lg:items-center">
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">{getInitials(doctor.fullName)}</span>
                <div className="min-w-0">
                    <p className="font-semibold leading-snug text-gray-900 dark:text-gray-100">{doctor.fullName}</p>
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                        {doctor.licenseNumber && <span className="font-mono">{doctor.licenseNumber}</span>}
                        {st.label !== 'Ativo' && <span className={`rounded-full border px-1.5 text-xs font-semibold ${st.cls}`}>{st.label}</span>}
                    </p>
                </div>
            </div>
            <p className="text-sm text-gray-800 dark:text-gray-200">{getSpecialtyLabel(doctor.specialty)}</p>
            <p className="text-sm tabular-nums text-gray-800 dark:text-gray-200"><b className="text-gray-900 dark:text-gray-100">{n.patients}</b><span className="text-gray-600 lg:hidden dark:text-gray-400"> pacientes</span></p>
            <p className="text-sm tabular-nums text-gray-800 dark:text-gray-200"><b className="text-gray-900 dark:text-gray-100">{n.monthlySessions}</b><span className="text-gray-600 lg:hidden dark:text-gray-400"> sessões no mês</span></p>
            <OccupancyBar doctor={doctor} />
            <div className="min-w-0 text-sm text-gray-700 dark:text-gray-300">
                <p>{formatPhoneNumber(doctor.phoneNumber)}</p>
                <p className="truncate text-xs text-gray-600 dark:text-gray-400" title={doctor.email}>{doctor.email}</p>
            </div>
            <div className="flex gap-1.5 lg:justify-end"><Actions {...props} /></div>
        </li>
    );
};

const DoctorCard = (props: ItemProps) => {
    const { doctor, isInactive } = props;
    const n = numbersOf(doctor);
    const st = STATUS_CFG[doctor.status || (isInactive ? 'inativo' : 'ativo')] || STATUS_CFG.ativo;
    return (
        <div className={`flex min-w-0 flex-col rounded-xl border border-gray-200 bg-white text-left dark:border-gray-700 dark:bg-gray-900 ${isInactive ? 'opacity-80' : ''}`}>
            <div className="flex items-start gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">{getInitials(doctor.fullName)}</span>
                <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold leading-snug text-gray-900 dark:text-gray-100">{doctor.fullName}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                        <span className="rounded-full border border-gray-300 bg-gray-50 px-2 py-px text-xs font-semibold text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">{getSpecialtyLabel(doctor.specialty)}</span>
                        <span className={`rounded-full border px-2 py-px text-xs font-semibold ${st.cls}`}>{st.label}</span>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 pb-3">
                <div className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
                    <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100">{n.patients}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">pacientes</p>
                </div>
                <div className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
                    <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100">{n.monthlySessions}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">sessões no mês</p>
                </div>
            </div>
            <div className="px-4 pb-3"><OccupancyBar doctor={doctor} /></div>
            <div className="space-y-1.5 px-4 pb-3 text-sm text-gray-700 dark:text-gray-300">
                <p className="flex min-w-0 items-center gap-2"><Mail size={13} className="shrink-0 text-gray-500" aria-hidden /><span className="truncate" title={doctor.email}>{doctor.email || '—'}</span></p>
                <p className="flex items-center gap-2"><Phone size={13} className="shrink-0 text-gray-500" aria-hidden />{formatPhoneNumber(doctor.phoneNumber)}</p>
                <p className="flex items-center gap-2"><ClipboardList size={13} className="shrink-0 text-gray-500" aria-hidden /><span className="font-mono">{doctor.licenseNumber || '—'}</span></p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2 p-4 pt-1"><Actions {...props} /></div>
        </div>
    );
};

interface DoctorListProps {
    doctors: any[];
    onEdit: (doctor: any) => void;
    onViewAgenda?: (doctor: any) => void;
    onDeactivate?: (doctor: any) => void;
    onReactivate?: (doctor: any) => void;
}

type TabType = 'active' | 'inactive';
type ViewMode = 'list' | 'cards';
const VIEW_KEY = 'gestao.profissionais.view';

const DoctorList = ({ doctors, onEdit, onViewAgenda, onDeactivate, onReactivate }: DoctorListProps) => {
    const [activeTab, setActiveTab] = useState<TabType>('active');
    const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
    const [search, setSearch] = useState('');
    const [toDeactivate, setToDeactivate] = useState<any | null>(null);
    const [view, setView] = useState<ViewMode>(() => {
        try { return localStorage.getItem(VIEW_KEY) === 'cards' ? 'cards' : 'list'; } catch { return 'list'; }
    });
    const changeView = (v: ViewMode) => { setView(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ } };

    const handleViewAgendaClick = (doctor: any) => {
        onViewAgenda?.(doctor);
        // a agenda abre no fim da página
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
    };

    const activeDoctors = doctors.filter(d => d.active !== false);
    const inactiveDoctors = doctors.filter(d => d.active === false);
    const tabDoctors = activeTab === 'active' ? activeDoctors : inactiveDoctors;

    // especialidades da aba atual, com contagem, das maiores para as menores
    const specialties = useMemo(() => {
        const map = new Map<string, number>();
        tabDoctors.forEach(d => { if (d.specialty) map.set(d.specialty, (map.get(d.specialty) || 0) + 1); });
        return [...map.entries()].sort((a, b) => b[1] - a[1] || getSpecialtyLabel(a[0]).localeCompare(getSpecialtyLabel(b[0]), 'pt-BR'));
    }, [tabDoctors]);

    const q = norm(search.trim());
    const currentDoctors = tabDoctors
        .filter(d => !selectedSpecialty || d.specialty === selectedSpecialty)
        .filter(d => !q || norm(`${d.fullName || ''} ${d.email || ''} ${d.licenseNumber || ''}`).includes(q))
        .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'pt-BR'));

    const pickTab = (t: TabType) => { setActiveTab(t); setSelectedSpecialty(''); };
    const itemProps = (doctor: any): ItemProps => ({
        doctor,
        onEdit,
        onViewAgenda: activeTab === 'active' ? handleViewAgendaClick : undefined,
        onAskDeactivate: activeTab === 'active' && onDeactivate ? setToDeactivate : undefined,
        onReactivate: activeTab === 'inactive' ? onReactivate : undefined,
        isInactive: activeTab === 'inactive',
    });

    return (
        <div className="space-y-4 text-left">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Status">
                    <button type="button" aria-pressed={activeTab === 'active'} onClick={() => pickTab('active')} className={chipCls(activeTab === 'active')}>Ativos <b>{activeDoctors.length}</b></button>
                    <button type="button" aria-pressed={activeTab === 'inactive'} onClick={() => pickTab('inactive')} className={chipCls(activeTab === 'inactive')}>Inativos <b>{inactiveDoctors.length}</b></button>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <label className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
                        <span className="sr-only">Buscar profissional</span>
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden />
                        <input type="search" placeholder="Nome, e-mail ou registro" value={search} onChange={e => setSearch(e.target.value)}
                            className="min-h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100" />
                    </label>
                    <div className="inline-flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600" role="group" aria-label="Vista">
                        <button type="button" aria-pressed={view === 'list'} onClick={() => changeView('list')} className={segCls(view === 'list')}><List size={15} aria-hidden />Lista</button>
                        <button type="button" aria-pressed={view === 'cards'} onClick={() => changeView('cards')} className={`${segCls(view === 'cards')} border-l border-gray-300 dark:border-gray-600`}><LayoutGrid size={15} aria-hidden />Cartões</button>
                    </div>
                </div>
            </div>

            {specialties.length > 1 && (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Especialidade">
                    <button type="button" aria-pressed={!selectedSpecialty} onClick={() => setSelectedSpecialty('')} className={chipCls(!selectedSpecialty)}>Todas <b>{tabDoctors.length}</b></button>
                    {specialties.map(([s, count]) => (
                        <button key={s} type="button" aria-pressed={selectedSpecialty === s} onClick={() => setSelectedSpecialty(selectedSpecialty === s ? '' : s)} className={chipCls(selectedSpecialty === s)}>
                            {getSpecialtyLabel(s)} <b>{count}</b>
                        </button>
                    ))}
                </div>
            )}

            {currentDoctors.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
                    <User className="mx-auto mb-3 text-gray-400" size={36} aria-hidden />
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {q || selectedSpecialty ? 'Nenhum profissional encontrado' : activeTab === 'active' ? 'Nenhum profissional cadastrado' : 'Nenhum profissional inativo'}
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {q || selectedSpecialty ? 'Ajuste a busca ou o filtro de especialidade.' : activeTab === 'active' ? 'Adicione um novo profissional para começar.' : 'Os profissionais inativados aparecem aqui.'}
                    </p>
                </div>
            ) : view === 'list' ? (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_5rem_5rem_minmax(0,1.4fr)_minmax(0,1.6fr)_14rem] gap-x-4 border-b border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-400 lg:grid">
                        <span>Profissional</span><span>Especialidade</span><span>Pacientes</span><span>Sessões no mês</span><span>Ocupação da semana</span><span>Contato</span><span className="w-[200px]" />
                    </div>
                    <ul>{currentDoctors.map(d => <DoctorRow key={d._id} {...itemProps(d)} />)}</ul>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {currentDoctors.map(d => <DoctorCard key={d._id} {...itemProps(d)} />)}
                </div>
            )}

            {toDeactivate && (
                <ConfirmDeactivate
                    doctor={toDeactivate}
                    onCancel={() => setToDeactivate(null)}
                    onConfirm={() => { onDeactivate?.(toDeactivate); setToDeactivate(null); }}
                />
            )}
        </div>
    );
};

export default DoctorList;
