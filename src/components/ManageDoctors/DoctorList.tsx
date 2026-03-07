import { Calendar, ClipboardList, Mail, Pencil, Phone, Power, RotateCcw, User, X } from 'lucide-react';
import { useState } from 'react';

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

    const handleDeactivateClick = () => {
        setShowConfirmModal(true);
    };

    const handleConfirmDeactivate = () => {
        onDeactivate?.(doctor);
        setShowConfirmModal(false);
    };

    return (
        <>
            <div 
                className={`bg-gradient-to-br rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md relative ${
                    isInactive 
                        ? 'from-gray-100 to-gray-200 border-gray-300 opacity-75' 
                        : 'from-gray-50 to-gray-100 border-gray-200'
                }`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Botão X no canto superior direito - apenas para ativos */}
                {!isInactive && onDeactivate && (
                    <button
                        onClick={handleDeactivateClick}
                        className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center transition-all duration-200 ${
                            isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                        }`}
                        title="Inativar profissional"
                    >
                        <X size={16} />
                    </button>
                )}

                {/* Badge de inativo */}
                {isInactive && (
                    <div className="absolute top-3 right-3 z-10 px-2 py-1 bg-gray-500 text-white text-xs font-medium rounded-full">
                        Inativo
                    </div>
                )}

                {/* Cabeçalho */}
                <div className="p-6 pb-4">
                    <div className="flex items-center gap-4 mb-6">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 border ${
                            isInactive 
                                ? 'bg-gray-200 border-gray-300' 
                                : 'bg-emerald-50 border-emerald-100'
                        }`}>
                            <User className={isInactive ? 'text-gray-500' : 'text-emerald-600'} size={24} />
                        </div>
                        <div className="min-w-0 pr-8">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {doctor.fullName}
                            </h3>
                            <p className={`text-sm font-medium mt-1 ${
                                isInactive ? 'text-gray-500' : 'text-emerald-600'
                            }`}>
                                {doctor.specialty}
                            </p>
                            {isInactive && doctor.deactivatedAt && (
                                <p className="text-xs text-gray-400 mt-1">
                                    Inativado em: {new Date(doctor.deactivatedAt).toLocaleDateString('pt-BR')}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Corpo - Informações */}
                <div className="px-6 pb-6 space-y-4">
                    {/* E-mail */}
                    <div className={`flex items-start gap-4 p-3 rounded-lg border transition-colors ${
                        isInactive 
                            ? 'bg-gray-50/50 border-gray-200' 
                            : 'bg-white/70 backdrop-blur-sm hover:bg-white/90 border-white/50'
                    }`}>
                        <div className={`p-2 rounded-lg shadow-xs flex-shrink-0 ${
                            isInactive ? 'bg-gray-100' : 'bg-white'
                        }`}>
                            <Mail className="text-gray-500" size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-gray-500 mb-1">E-mail</p>
                            <a
                                href={`mailto:${doctor.email}`}
                                className={`text-sm font-medium block truncate ${
                                    isInactive ? 'text-gray-500' : 'text-gray-700 hover:text-emerald-600'
                                } transition-colors`}
                            >
                                {doctor.email}
                            </a>
                        </div>
                    </div>

                    {/* Telefone */}
                    <div className={`flex items-start gap-4 p-3 rounded-lg border transition-colors ${
                        isInactive 
                            ? 'bg-gray-50/50 border-gray-200' 
                            : 'bg-white/70 backdrop-blur-sm hover:bg-white/90 border-white/50'
                    }`}>
                        <div className={`p-2 rounded-lg shadow-xs flex-shrink-0 ${
                            isInactive ? 'bg-gray-100' : 'bg-white'
                        }`}>
                            <Phone className="text-gray-500" size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-gray-500 mb-1">Telefone</p>
                            <a
                                href={`tel:${doctor.phoneNumber}`}
                                className={`text-sm font-medium block ${
                                    isInactive ? 'text-gray-500' : 'text-gray-700 hover:text-emerald-600'
                                } transition-colors`}
                            >
                                {formatPhoneNumber(doctor.phoneNumber)}
                            </a>
                        </div>
                    </div>

                    {/* Registro */}
                    <div className={`flex items-start gap-4 p-3 rounded-lg border transition-colors ${
                        isInactive 
                            ? 'bg-gray-50/50 border-gray-200' 
                            : 'bg-white/70 backdrop-blur-sm hover:bg-white/90 border-white/50'
                    }`}>
                        <div className={`p-2 rounded-lg shadow-xs flex-shrink-0 ${
                            isInactive ? 'bg-gray-100' : 'bg-white'
                        }`}>
                            <ClipboardList className="text-gray-500" size={18} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-gray-500 mb-1">Registro</p>
                            <span className={`text-sm font-mono block ${
                                isInactive ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                {doctor.licenseNumber}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Rodapé - Ações */}
                <div className="px-6 pb-6 pt-2">
                    <div className="flex gap-3">
                        {!isInactive ? (
                            // Ações para médicos ativos
                            <>
                                <button
                                    onClick={() => onEdit(doctor)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/80 hover:bg-white text-gray-700 rounded-lg transition-colors font-medium border border-white/50"
                                >
                                    <Pencil size={16} />
                                    Editar
                                </button>

                                {onViewAgenda && (
                                    <button
                                        onClick={() => onViewAgenda(doctor)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors font-medium border border-emerald-100"
                                    >
                                        <Calendar size={16} />
                                        Ver Agenda
                                    </button>
                                )}
                            </>
                        ) : (
                            // Ações para médicos inativos
                            <button
                                onClick={() => onReactivate?.(doctor)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors font-medium border border-emerald-200"
                            >
                                <RotateCcw size={16} />
                                Reativar Profissional
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Confirmação */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                <Power className="text-red-600" size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Inativar Profissional
                                </h3>
                            </div>
                        </div>

                        <p className="text-gray-600 mb-2">
                            Tem certeza que deseja inativar o profissional <strong>"{doctor.fullName}"</strong>?
                        </p>
                        
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                            <p className="text-sm text-amber-800">
                                <strong>Atenção:</strong> Ao inativar, o profissional não aparecerá mais nas listas de agendamento, 
                                mas todo o histórico financeiro e atendimentos serão preservados.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDeactivate}
                                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                            >
                                Sim, Inativar
                            </button>
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

    const currentDoctors = activeTab === 'active' ? activeDoctors : inactiveDoctors;

    return (
        <div className="space-y-6">
            {/* Tabs de navegação */}
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

            {/* Lista de médicos */}
            {currentDoctors.length === 0 ? (
                <div className={`rounded-lg shadow-sm p-8 text-center border ${
                    activeTab === 'active' 
                        ? 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200' 
                        : 'bg-gray-50 border-gray-200'
                }`}>
                    <User className="mx-auto text-gray-400" size={48} />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                        {activeTab === 'active' 
                            ? 'Nenhum profissional cadastrado' 
                            : 'Nenhum profissional inativo'}
                    </h3>
                    <p className="mt-1 text-gray-500">
                        {activeTab === 'active' 
                            ? 'Adicione um novo profissional para começar'
                            : 'Os profissionais inativados aparecerão aqui'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
