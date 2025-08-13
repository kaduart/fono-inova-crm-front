import { Calendar, ClipboardList, Mail, Pencil, Phone, User } from 'lucide-react';

interface DoctorCardProps {
    doctor: any;
    onEdit: (doctor: any) => void;
    onViewAgenda?: (doctor: any) => void;
}

const formatPhoneNumber = (phone) => {
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};

const DoctorCard = ({ doctor, onEdit, onViewAgenda }: DoctorCardProps) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
            {/* Cabeçalho */}
            <div className="p-6 pb-4">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 border border-emerald-100">
                        <User className="text-emerald-600" size={24} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {doctor.fullName}
                        </h3>
                        <p className="text-sm text-emerald-600 font-medium mt-1">
                            {doctor.specialty}
                        </p>
                    </div>
                </div>
            </div>

            {/* Corpo - Informações */}
            <div className="px-6 pb-6 space-y-4">
                {/* E-mail */}
                <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="p-2 bg-white rounded-lg shadow-xs flex-shrink-0">
                        <Mail className="text-gray-500" size={18} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-gray-500 mb-1">E-mail</p>
                        <a
                            href={`mailto:${doctor.email}`}
                            className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors block truncate"
                        >
                            {doctor.email}
                        </a>
                    </div>
                </div>

                {/* Telefone */}
                <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="p-2 bg-white rounded-lg shadow-xs flex-shrink-0">
                        <Phone className="text-gray-500" size={18} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-gray-500 mb-1">Telefone</p>
                        <a
                            href={`tel:${doctor.phoneNumber}`}
                            className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors block"
                        >
                            {formatPhoneNumber(doctor.phoneNumber)}
                        </a>
                    </div>
                </div>

                {/* Registro */}
                <div className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="p-2 bg-white rounded-lg shadow-xs flex-shrink-0">
                        <ClipboardList className="text-gray-500" size={18} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-gray-500 mb-1">Registro</p>
                        <span className="text-sm font-mono text-gray-600 block">
                            {doctor.licenseNumber}
                        </span>
                    </div>
                </div>
            </div>

            {/* Rodapé - Ações */}
            <div className="px-6 pb-6 pt-2">
                <div className="flex gap-3">
                    <button
                        onClick={() => onEdit(doctor)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors font-medium"
                    >
                        <Pencil size={16} />
                        Editar
                    </button>

                    {onViewAgenda && (
                        <button
                            onClick={() => onViewAgenda(doctor)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors font-medium"
                        >
                            <Calendar size={16} />
                            Ver Agenda
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

interface DoctorListProps {
    doctors: any[];
    onEdit: (doctor: any) => void;
    onViewAgenda?: (doctor: any) => void;
}

const DoctorList = ({ doctors, onEdit, onViewAgenda }: DoctorListProps) => {
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

    if (!doctors.length) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <User className="mx-auto text-gray-400" size={48} />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                    Nenhum profissional cadastrado
                </h3>
                <p className="mt-1 text-gray-500">
                    Adicione um novo profissional para começar
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor) => (
                <DoctorCard
                    key={doctor._id}
                    doctor={doctor}
                    onEdit={onEdit}
                    onViewAgenda={handleViewAgendaClick}
                />
            ))}
        </div>
    );
};

export default DoctorList;