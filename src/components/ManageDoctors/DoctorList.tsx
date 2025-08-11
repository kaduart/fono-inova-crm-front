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
            <div className="p-5">
                {/* Cabeçalho com avatar */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <User className="text-emerald-600" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {doctor.fullName}
                        </h3>
                        <p className="text-sm text-emerald-600 font-medium">
                            {doctor.specialty}
                        </p>
                    </div>
                </div>

                {/* Informações de contato - Versão aprimorada */}
                <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="p-2 bg-white rounded-md shadow-xs">
                            <Mail className="text-gray-500" size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400 mb-1">E-mail</p>
                            <a
                                href={`mailto:${doctor.email}`}
                                className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors truncate block"
                            >
                                {doctor.email}
                            </a>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="p-2 bg-white rounded-md shadow-xs">
                            <Phone className="text-gray-500" size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400 mb-1">Telefone</p>
                            <a
                                href={`tel:${doctor.phoneNumber}`}
                                className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors"
                            >
                                {formatPhoneNumber(doctor.phoneNumber)}
                            </a>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="p-2 bg-white rounded-md shadow-xs">
                            <ClipboardList className="text-gray-500" size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-400 mb-1">Registro</p>
                            <span className="text-sm font-mono text-gray-600">
                                {doctor.licenseNumber}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Botões - Mantido igual */}
                <div className="flex space-x-2 border-t border-gray-100 pt-4">
                    <button
                        onClick={() => onEdit(doctor)}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors"
                    >
                        <Pencil size={16} className="mr-2" />
                        Editar
                    </button>
                    {onViewAgenda && (
                        <button
                            onClick={() => onViewAgenda(doctor)}
                            className="flex-1 flex items-center justify-center px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors"
                        >
                            <Calendar size={16} className="mr-2" />
                            VerAgenda
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