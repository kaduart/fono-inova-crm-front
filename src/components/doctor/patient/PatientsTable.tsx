import { Eye, FileText, School, Search, Stethoscope, UserPlus } from 'lucide-react';
import { useState } from 'react';

interface Patient {
    _id: string;
    fullName: string;
    age: number;
    diagnosis?: string;
    healthPlan?: { name: string };
    phone?: string;
    lastAppointment?: string;
    status: string;
    reports?: any[];
}

interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    search: string;
}

interface PatientsTableProps {
    patients: any[];
    pagination?: PaginationInfo;
    onPageChange?: (page: number) => void;
    onSearchChange?: (search: string) => void;
    onPatientClick?: (patient: Patient) => void;
    onViewPatientDetails?: (patient: Patient) => void;
    onCreateAnamnesis?: (patient: Patient) => void;
    onCreateSchoolReport?: (patient: Patient) => void;
    onViewMedicalReports?: (patient: Patient) => void;
    onAddNewPatient?: () => void;
}

function getInitials(name: string) {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function getAvatarColor(name: string) {
    const colors = [
        'bg-emerald-500', 'bg-teal-500', 'bg-green-500',
        'bg-cyan-500', 'bg-blue-500', 'bg-violet-500'
    ];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
}

export default function PatientsTable({
    patients,
    pagination,
    onPageChange,
    onSearchChange,
    onPatientClick,
    onViewPatientDetails,
    onCreateAnamnesis,
    onCreateSchoolReport,
    onViewMedicalReports,
    onAddNewPatient
}: PatientsTableProps) {
    const [localSearch, setLocalSearch] = useState(pagination?.search || '');

    const filteredPatients = pagination
        ? patients
        : patients?.filter(p =>
            p.fullName.toLowerCase().includes(localSearch.toLowerCase()) ||
            (p.diagnosis && p.diagnosis.toLowerCase().includes(localSearch.toLowerCase()))
        );

    const handleSearch = (value: string) => {
        setLocalSearch(value);
        onSearchChange?.(value);
    };

    const getReportCounts = (patient: Patient) => ({
        anamnesis: patient.reports?.filter((r: any) => r.type === 'anamnesis').length || 0,
        school: patient.reports?.filter((r: any) => r.type === 'school').length || 0,
        medical: patient.reports?.filter((r: any) => r.type === 'medical').length || 0
    });

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mt-4 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="font-semibold text-gray-800 text-base">Gestão de Pacientes</span>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar pacientes..."
                            value={localSearch}
                            onChange={e => handleSearch(e.target.value)}
                            className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 w-60"
                        />
                    </div>
                    <button
                        onClick={onAddNewPatient}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        <UserPlus className="w-4 h-4" />
                        Novo Paciente
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full min-w-[750px]">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Paciente</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Diagnóstico</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Relatórios</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Última Consulta</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Status</th>
                            <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredPatients?.length > 0 ? (
                            filteredPatients.map(patient => {
                                const counts = getReportCounts(patient);
                                const avatarColor = getAvatarColor(patient.fullName);
                                return (
                                    <tr key={patient._id} className="hover:bg-gray-50 transition-colors">
                                        {/* Paciente */}
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={e => { e.stopPropagation(); onPatientClick?.(patient); }}
                                                    className={`w-9 h-9 ${avatarColor} rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 hover:opacity-90 transition-opacity`}
                                                >
                                                    {getInitials(patient.fullName)}
                                                </button>
                                                <div>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); onPatientClick?.(patient); }}
                                                        className="text-sm font-medium text-gray-800 hover:text-emerald-600 transition-colors text-left"
                                                    >
                                                        {patient.fullName}
                                                    </button>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {patient.healthPlan?.name || 'Particular'} • {patient.age} anos
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Diagnóstico */}
                                        <td className="px-4 py-3.5">
                                            <span className="text-sm text-gray-600">{patient.diagnosis || '—'}</span>
                                        </td>

                                        {/* Relatórios */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={() => onViewMedicalReports?.(patient)}
                                                    title="Anamneses"
                                                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                                                        counts.anamnesis > 0
                                                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    <Stethoscope className="w-3 h-3" />
                                                    {counts.anamnesis}
                                                </button>
                                                <button
                                                    onClick={() => onViewMedicalReports?.(patient)}
                                                    title="Relatórios Escolares"
                                                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                                                        counts.school > 0
                                                            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    <School className="w-3 h-3" />
                                                    {counts.school}
                                                </button>
                                                <button
                                                    onClick={() => onViewMedicalReports?.(patient)}
                                                    title="Relatórios Médicos"
                                                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                                                        counts.medical > 0
                                                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    <FileText className="w-3 h-3" />
                                                    {counts.medical}
                                                </button>
                                            </div>
                                        </td>

                                        {/* Última Consulta */}
                                        <td className="px-4 py-3.5">
                                            <span className="text-sm text-gray-600">
                                                {patient.lastAppointment
                                                    ? new Date(patient.lastAppointment).toLocaleDateString('pt-BR')
                                                    : '—'}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                patient.status === 'active'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {patient.status === 'active' ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>

                                        {/* Ações */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex flex-col gap-1.5">
                                                <button
                                                    onClick={() => onViewPatientDetails?.(patient)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 text-xs font-medium transition-colors"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    Ver Detalhes
                                                </button>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => onCreateAnamnesis?.(patient)}
                                                        className="flex items-center gap-1 px-2 py-1 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded text-xs transition-colors"
                                                    >
                                                        <Stethoscope className="w-3 h-3" />
                                                        Anamnese
                                                    </button>
                                                    <button
                                                        onClick={() => onCreateSchoolReport?.(patient)}
                                                        className="flex items-center gap-1 px-2 py-1 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded text-xs transition-colors"
                                                    >
                                                        <School className="w-3 h-3" />
                                                        Escolar
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-12 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                            <UserPlus className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            {patients?.length === 0 ? 'Nenhum paciente cadastrado' : 'Nenhum paciente encontrado'}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {localSearch ? 'Tente ajustar sua busca' : 'Adicione seu primeiro paciente'}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginação */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
                    <span className="text-xs text-gray-500">
                        Página {pagination.page} de {pagination.totalPages} ({pagination.total} pacientes)
                    </span>
                    <div className="flex gap-1">
                        <button
                            disabled={pagination.page <= 1}
                            onClick={() => onPageChange?.(pagination.page - 1)}
                            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Anterior
                        </button>
                        {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                            const page = Math.max(1, pagination.page - 2) + i;
                            if (page > pagination.totalPages) return null;
                            return (
                                <button
                                    key={page}
                                    onClick={() => onPageChange?.(page)}
                                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                                        page === pagination.page
                                            ? 'bg-emerald-600 text-white'
                                            : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    {page}
                                </button>
                            );
                        })}
                        <button
                            disabled={pagination.page >= pagination.totalPages}
                            onClick={() => onPageChange?.(pagination.page + 1)}
                            className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Próxima
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
