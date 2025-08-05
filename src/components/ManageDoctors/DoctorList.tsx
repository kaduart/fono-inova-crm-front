import { Calendar, Pencil, User } from 'lucide-react';

interface DoctorCardProps {
    doctor: any;
    onEdit: (doctor: any) => void;
    onViewAgenda?: (doctor: any) => void;
}

const DoctorCard = ({ doctor, onEdit, onViewAgenda }: DoctorCardProps) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
            <div className="p-5">
                <div className="flex items-center space-x-4 mb-4">
                    <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                            <User className="text-emerald-600" size={20} />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {doctor.fullName}
                        </h3>
                        <p className="text-sm text-emerald-600 font-medium">
                            {doctor.specialty}
                        </p>
                    </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-5">
                    <p className="flex items-center">
                        <span className="font-medium mr-2">Email:</span>
                        {doctor.email}
                    </p>
                    <p className="flex items-center">
                        <span className="font-medium mr-2">Telefone:</span>
                        {doctor.phoneNumber}
                    </p>
                    <p className="flex items-center">
                        <span className="font-medium mr-2">Registro:</span>
                        {doctor.licenseNumber}
                    </p>
                </div>

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
                            Agenda
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
                    onViewAgenda={onViewAgenda}
                />
            ))}
        </div>
    );
};

export default DoctorList;