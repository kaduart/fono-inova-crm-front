import React from 'react';

interface Patient {
    _id: string;
    fullName: string;
    phone?: string;
    email?: string;
    dateOfBirth?: string;
}

interface PatientListProps {
    patients: Patient[];
    loading: boolean;
    onEdit: (patient: Patient) => void;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export const PatientList: React.FC<PatientListProps> = ({
    patients,
    loading,
    onEdit,
    page,
    totalPages,
    onPageChange
}) => {
    if (loading) {
        return (
            <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (patients.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                Nenhum paciente encontrado
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Nome
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Telefone
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ações
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {patients.map((patient) => (
                            <tr key={patient._id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                        {patient.fullName}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">
                                        {patient.phone || '-'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">
                                        {patient.email || '-'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                        onClick={() => onEdit(patient)}
                                        className="text-blue-600 hover:text-blue-900"
                                    >
                                        Editar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 py-4">
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1}
                        className="px-3 py-1 rounded border disabled:opacity-50"
                    >
                        Anterior
                    </button>
                    <span className="text-sm text-gray-600">
                        Página {page} de {totalPages}
                    </span>
                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page === totalPages}
                        className="px-3 py-1 rounded border disabled:opacity-50"
                    >
                        Próxima
                    </button>
                </div>
            )}
        </div>
    );
};

export default PatientList;
