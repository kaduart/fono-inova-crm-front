import { Pencil, Trash2 } from 'lucide-react';
import { TherapyPackageData } from '../../utils/types/types';

type Props = {
    packages: TherapyPackageData[];
    currentPage: number;
    totalPages: number;
    onEdit: (pkg: TherapyPackageData) => void;
    onDelete: (id: string) => void;
    onPageChange: (page: number) => void;
};

export default function TherapyPackageTable({ packages, currentPage, totalPages, onEdit, onDelete, onPageChange }: Props) {
    return (
        <div className="overflow-x-auto rounded-lg shadow-lg">
            <table className="min-w-full table-auto bg-white rounded-lg shadow-md">
                <thead className="bg-gray-200 text-gray-600">
                    <tr>
                        <th className="p-4 text-left font-semibold text-sm">Paciente</th>
                        <th className="p-4 text-left font-semibold text-sm">Tipo</th>
                        <th className="p-4 text-left font-semibold text-sm">Sessões</th>
                        <th className="p-4 text-left font-semibold text-sm">Última Sessão</th>
                        <th className="p-4 text-left font-semibold text-sm">Pagamentos</th>
                        <th className="p-4 text-left font-semibold text-sm">Ações</th>
                    </tr>
                </thead>
                <tbody className="text-gray-700">
                    {packages.map((pkg) => {
                        const lastSession = pkg.sessions.length ? pkg.sessions[pkg.sessions.length - 1] : null;

                        return (
                            <tr key={pkg.id} className="border-t border-gray-200 hover:bg-gray-50 transition-colors duration-200">
                                <td className="p-4">{pkg.patientId.fullName}</td>
                                <td className="p-4">{pkg.sessionType}</td>
                                <td className="p-4">{pkg.sessionsDone} / {pkg.totalSessions}</td>
                                <td className="p-4">
                                    {lastSession
                                        ? `${new Date(lastSession.date).toLocaleDateString()} - ${lastSession.professional} (${lastSession.sessionType})`
                                        : <span className="italic text-gray-400">Nenhuma</span>
                                    }
                                </td>
                                <td className="p-4">{pkg.payments.length}</td>
                                <td className="p-4 flex items-center gap-3">
                                    <button
                                        onClick={() => onEdit(pkg)}
                                        className="text-blue-600 hover:text-blue-800 transition-colors duration-200"
                                        title="Editar"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(pkg.id)}
                                        className="text-red-600 hover:text-red-800 transition-colors duration-200"
                                        title="Excluir"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <div className="mt-6 flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg shadow-inner">
                <div className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 text-sm bg-gray-300 text-gray-700 border rounded-lg disabled:opacity-50 hover:bg-gray-400 transition-colors duration-200"
                    >
                        Anterior
                    </button>
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 text-sm bg-gray-300 text-gray-700 border rounded-lg disabled:opacity-50 hover:bg-gray-400 transition-colors duration-200"
                    >
                        Próxima
                    </button>
                </div>
            </div>
        </div>
    );
}
