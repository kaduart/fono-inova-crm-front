import { Calendar, ClipboardList, Filter, Mail, Pencil, Phone, Power, RotateCcw, User, UserCheck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getSpecialtyLabel } from '../../constants/specialties';
import { getSpecialtyColor, getInitials } from '../../constants/specialtyColors';

interface DoctorCardProps {
    doctor: any;
    onEdit: (doctor: any) => void;
    onViewAgenda?: (doctor: any) => void;
    onDeactivate?: (doctor: any) => void;
    onReactivate?: (doctor: any) => void;
    isInactive?: boolean;
}

const formatPhoneNumber = (phone?: string) => {
    if (!phone) return '-';
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};

const DoctorCard = ({ doctor, onEdit, onViewAgenda, onDeactivate, onReactivate, isInactive }: DoctorCardProps) => {
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleDeactivateClick = () => { setShowConfirmModal(true); };
    const handleConfirmDeactivate = () => { onDeactivate?.(doctor); setShowConfirmModal(false); };

    const color = getSpecialtyColor(doctor.specialty);
    const initials = getInitials(doctor.fullName);

    const specialtyBg: Record<string, string> = {
        fonoaudiologia: 'bg-teal-50/50 border-teal-200',
        psicologia:     'bg-purple-50/50 border-purple-200',
        fisioterapia:   'bg-orange-50/50 border-orange-200',
        terapia_ocupacional: 'bg-amber-50/50 border-amber-200',
        psicopedagogia: 'bg-sky-50/50 border-sky-200',
        neuroped:       'bg-blue-50/50 border-blue-200',
        psicomotricidade:'bg-pink-50/50 border-pink-200',
        musicoterapia:  'bg-rose-50/50 border-rose-200',
        neuropsicologia:'bg-indigo-50/50 border-indigo-200',
        pediatria:      'bg-cyan-50/50 border-cyan-200',
    };
    const cardTheme = specialtyBg[doctor.specialty] || 'bg-white border-gray-200';

    const status = doctor.status || (isInactive ? 'inativo' : 'ativo');
    const statusCfg: Record<string, { label: string; dot: string; text: string }> = {
        ativo:    { label: 'Ativo',    dot: 'bg-emerald-500', text: 'text-emerald-600' },
        ferias:   { label: 'Férias',   dot: 'bg-red-500',     text: 'text-red-500' },
        afastado: { label: 'Afastado', dot: 'bg-amber-500',   text: 'text-amber-600' },
        inativo:  { label: 'Inativo',  dot: 'bg-gray-400',    text: 'text-gray-400' },
    };
    const st = statusCfg[status] || statusCfg.ativo;

    const occupancy = doctor.occupancy ?? null;
    const maxSlots = doctor.maxSlots ?? 30;
    const monthlySessions = doctor.monthlySessions ?? 0;
    const weeklySessions = doctor.weeklySessions ?? 0;
    const patients = doctor.patients ?? 0;

    return (
        <>
            <div
                className={`relative rounded-xl border transition-all hover:shadow-md ${cardTheme} ${isInactive ? 'opacity-70' : ''}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* X */}
                {!isInactive && onDeactivate && (
                    <button
                        onClick={handleDeactivateClick}
                        className={`absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-white/80 hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-all shadow-sm ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
                        title="Inativar"
                    >
                        <X size={14} />
                    </button>
                )}

                {/* ─── Header (altura fixa) ─── */}
                <div className="p-4">
                    <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold border-2 ${color.bg} ${color.text} ${color.border}`}>
                            {initials}
                        </div>

                        <div className="min-w-0 flex-1 overflow-hidden">
                            {/* Linha 1: nome + status — NUNCA quebra */}
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-gray-900 truncate" title={doctor.fullName}>
                                    {doctor.fullName}
                                </h3>
                                <span className={`inline-flex items-center gap-1 text-2xs font-medium flex-shrink-0 ${st.text}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                    {st.label}
                                </span>
                            </div>
                            {/* Linha 2: especialidade */}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold mt-1 border ${color.bg} ${color.text} ${color.border}`}>
                                {getSpecialtyLabel(doctor.specialty)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ─── KPIs (altura fixa) ─── */}
                <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                    <div className="bg-white/70 rounded-lg px-2 py-2 text-center border border-white/60">
                        <p className="text-lg font-bold text-gray-800">{patients || '-'}</p>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">Pacientes</p>
                    </div>
                    <div className="bg-white/70 rounded-lg px-2 py-2 text-center border border-white/60">
                        <p className="text-lg font-bold text-gray-800">{monthlySessions || '-'}</p>
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">Sessões (mês)</p>
                    </div>
                </div>

                {/* ─── Ocupação (calculada sobre a semana atual, não o mês) ─── */}
                {occupancy !== null && (
                    <div className="px-4 pb-3">
                        <p className="text-2xs text-gray-500 font-medium mb-1">Ocupação da semana</p>
                        <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-[width] duration-500 ${occupancy >= 90 ? 'bg-emerald-500' : occupancy >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(occupancy, 100)}%` }}
                            />
                            <span className={`absolute inset-0 flex items-center justify-center text-3xs font-bold ${occupancy >= 50 ? 'text-white' : 'text-gray-700'}`}>
                                {occupancy}%
                            </span>
                        </div>
                        <p className="text-2xs text-gray-400 mt-1">{weeklySessions} de {maxSlots} vagas desta semana preenchidas</p>
                    </div>
                )}

                {/* ─── Contato (compacto, 3 linhas) ─── */}
                <div className="px-4 pb-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Mail size={13} className="text-gray-400 flex-shrink-0" />
                        <a href={`mailto:${doctor.email}`} className="truncate hover:text-emerald-600 transition-colors" title={doctor.email}>{doctor.email}</a>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Phone size={13} className="text-gray-400 flex-shrink-0" />
                        <a href={`tel:${doctor.phoneNumber}`} className="hover:text-emerald-600 transition-colors">{formatPhoneNumber(doctor.phoneNumber)}</a>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <ClipboardList size={13} className="text-gray-400 flex-shrink-0" />
                        <span className="font-mono text-gray-500">{doctor.licenseNumber || '-'}</span>
                    </div>
                </div>

                {/* ─── Ações ─── */}
                <div className="px-4 pb-4">
                    <div className="flex gap-2">
                        {!isInactive ? (
                            <>
                                <button onClick={() => onEdit(doctor)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-all text-xs font-semibold">
                                    <Pencil size={13} />
                                    Editar
                                </button>
                                {onViewAgenda && (
                                    <button onClick={() => onViewAgenda(doctor)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-all text-xs font-semibold">
                                        <Calendar size={13} />
                                        Agenda
                                    </button>
                                )}
                            </>
                        ) : (
                            <button onClick={() => onReactivate?.(doctor)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-all text-xs font-semibold border border-emerald-200">
                                <RotateCcw size={14} />
                                Reativar
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center"><Power className="text-red-600" size={24} /></div>
                            <h3 className="text-lg font-semibold text-gray-900">Inativar Profissional</h3>
                        </div>
                        <p className="text-gray-600 mb-2">Tem certeza que deseja inativar <strong>"{doctor.fullName}"</strong>?</p>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                            <p className="text-sm text-amber-800"><strong>Atenção:</strong> Ao inativar, o profissional não aparecerá mais nas listas de agendamento, mas todo o histórico será preservado.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirmModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium">Cancelar</button>
                            <button onClick={handleConfirmDeactivate} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">Sim, Inativar</button>
                        </div>
                    </div>
                </div>
            )}
        </>
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

const DoctorList = ({ doctors, onEdit, onViewAgenda, onDeactivate, onReactivate }: DoctorListProps) => {
    const [activeTab, setActiveTab] = useState<TabType>('active');
    const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');

    const handleViewAgendaClick = (doctor: any) => {
        onViewAgenda?.(doctor);

        // Rola até o final da página
        setTimeout(() => {
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    };

    // Separar médicos ativos e inativos
    const activeDoctors = doctors.filter(d => d.active !== false);
    const inactiveDoctors = doctors.filter(d => d.active === false);

    // Especialidades únicas para o filtro
    const specialties = useMemo(() => {
        const all = doctors
            .map(d => d.specialty)
            .filter((s): s is string => !!s)
            .sort((a, b) => a.localeCompare(b, 'pt-BR'));
        return Array.from(new Set(all));
    }, [doctors]);

    const currentDoctors = (activeTab === 'active' ? activeDoctors : inactiveDoctors).filter(
        d => !selectedSpecialty || d.specialty === selectedSpecialty
    );

    return (
        <div className="space-y-6">
            {/* Tabs de navegação + Filtro de especialidade */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                            activeTab === 'active'
                                ? 'bg-white text-emerald-700 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            <User size={16} />
                            Ativos
                            {activeDoctors.length > 0 && (
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs">
                                    {activeDoctors.length}
                                </span>
                            )}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('inactive')}
                        className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                            activeTab === 'inactive'
                                ? 'bg-white text-gray-700 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        <span className="flex items-center gap-2">
                            <Power size={16} />
                            Inativos
                            {inactiveDoctors.length > 0 && (
                                <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                                    {inactiveDoctors.length}
                                </span>
                            )}
                        </span>
                    </button>
                </div>

                {/* Filtro de Especialidade */}
                {specialties.length > 0 && (
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <Filter size={14} className="text-gray-400" />
                        </div>
                        <select
                            value={selectedSpecialty}
                            onChange={(e) => setSelectedSpecialty(e.target.value)}
                            className="pl-8 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none cursor-pointer min-w-[180px]"
                        >
                            <option value="">Todas as especialidades</option>
                            {specialties.map((s) => (
                                <option key={s} value={s}>
                                    {getSpecialtyLabel(s)}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>

            {/* Lista de médicos */}
            {currentDoctors.length === 0 ? (
                <div className={`rounded-lg shadow-sm p-8 text-center border ${
                    activeTab === 'active' 
                        ? 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200' 
                        : 'bg-gray-50 border-gray-200'
                }`}>
                    <User className="mx-auto text-gray-400" size={48} />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                        {selectedSpecialty
                            ? 'Nenhum profissional encontrado'
                            : activeTab === 'active'
                                ? 'Nenhum profissional cadastrado'
                                : 'Nenhum profissional inativo'}
                    </h3>
                    <p className="mt-1 text-gray-500">
                        {selectedSpecialty
                            ? `Não há profissionais ${activeTab === 'active' ? 'ativos' : 'inativos'} com a especialidade "${selectedSpecialty}"`
                            : activeTab === 'active'
                                ? 'Adicione um novo profissional para começar'
                                : 'Os profissionais inativados aparecerão aqui'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    {currentDoctors.map((doctor) => (
                        <DoctorCard
                            key={doctor._id}
                            doctor={doctor}
                            onEdit={onEdit}
                            onViewAgenda={activeTab === 'active' ? handleViewAgendaClick : undefined}
                            onDeactivate={activeTab === 'active' ? onDeactivate : undefined}
                            onReactivate={activeTab === 'inactive' ? onReactivate : undefined}
                            isInactive={activeTab === 'inactive'}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default DoctorList;
