import { Archive, Pencil } from 'lucide-react';
import { ITherapyPackage } from '../../utils/types/types';

type Props = {
    packages: ITherapyPackage[];
    currentPage: number;
    totalPages: number;
    onEdit: (pkg: ITherapyPackage) => void;
    onInactivate: (id: string) => void;
    onPageChange: (page: number) => void;
};

function formatDate(d: any): string {
    if (!d) return '—';
    const s = typeof d === 'string' ? d : new Date(d).toISOString();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, day] = s.split('-');
        return `${day}/${m}/${y}`;
    }
    const obj = new Date(s);
    if (isNaN(obj.getTime())) return '—';
    return `${String(obj.getUTCDate()).padStart(2, '0')}/${String(obj.getUTCMonth() + 1).padStart(2, '0')}/${obj.getUTCFullYear()}`;
}

function formatCurrency(v: any): string {
    const n = Number(v);
    if (isNaN(n)) return '—';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    paid:           { label: 'Pago',       color: 'bg-green-100 text-green-700' },
    partially_paid: { label: 'Parcial',    color: 'bg-yellow-100 text-yellow-700' },
    unpaid:         { label: 'Pendente',   color: 'bg-red-100 text-red-700' },
    active:         { label: 'Ativo',      color: 'bg-blue-100 text-blue-700' },
    completed:      { label: 'Concluído',  color: 'bg-gray-100 text-gray-700' },
};

export default function TherapyPackageTable({ packages, currentPage, totalPages, onEdit, onInactivate, onPageChange }: Props) {
    if (!packages.length) return null;

    return (
        <div className="overflow-x-auto rounded-lg shadow-lg">
            <table className="min-w-full table-auto bg-white rounded-lg shadow-md text-sm">
                <thead className="bg-gray-200 text-gray-600">
                    <tr>
                        {/* 🎯 Nova coluna: Paciente */}
                        <th className="p-3 text-left font-semibold">Paciente</th>
                        <th className="p-3 text-left font-semibold">Profissional</th>
                        <th className="p-3 text-left font-semibold">Especialidade</th>
                        <th className="p-3 text-center font-semibold">Sessões</th>
                        <th className="p-3 text-right font-semibold">Vlr/Sessão</th>
                        <th className="p-3 text-right font-semibold">Total</th>
                        <th className="p-3 text-right font-semibold">Pago</th>
                        <th className="p-3 text-right font-semibold">Saldo</th>
                        <th className="p-3 text-center font-semibold">Status</th>
                        <th className="p-3 text-left font-semibold">Início</th>
                        <th className="p-3 text-left font-semibold">Ações</th>
                    </tr>
                </thead>
                <tbody className="text-gray-700">
                    {packages.map((pkg) => {
                        const doctor = (pkg as any).doctor;
                        const doctorName = doctor?.fullName || pkg.searchFields?.doctorName || '—';
                        // 🎯 Nome do paciente (searchFields como fallback)
                        const patientName = pkg.searchFields?.patientName || '—';
                        const firstSession = (pkg.sessions as any[]).find(s => s?.date);
                        const financialStatus = (pkg as any).financialStatus || (
                            pkg.balance <= 0 ? 'paid' :
                            pkg.totalPaid > 0 ? 'partially_paid' : 'unpaid'
                        );
                        const statusInfo = STATUS_LABELS[financialStatus] || STATUS_LABELS[pkg.status] || { label: financialStatus || pkg.status, color: 'bg-gray-100 text-gray-600' };

                        return (
                            <tr key={pkg._id} className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                                {/* 🎯 Nome do paciente */}
                                <td className="p-3 font-medium text-emerald-900">{patientName}</td>
                                <td className="p-3">{doctorName}</td>
                                <td className="p-3 capitalize">{pkg.sessionType}</td>
                                <td className="p-3 text-center">
                                    <span className={`font-semibold ${pkg.sessionsDone >= pkg.totalSessions ? 'text-green-600' : 'text-blue-600'}`}>
                                        {pkg.sessionsDone ?? 0}
                                    </span>
                                    <span className="text-gray-400"> / {pkg.totalSessions}</span>
                                </td>
                                <td className="p-3 text-right">{formatCurrency(pkg.sessionValue)}</td>
                                <td className="p-3 text-right font-medium">{formatCurrency(pkg.totalValue || pkg.totalSessions * pkg.sessionValue)}</td>
                                <td className="p-3 text-right text-green-700">{formatCurrency(pkg.totalPaid)}</td>
                                <td className="p-3 text-right">
                                    <span className={pkg.balance > 0 ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                                        {formatCurrency(pkg.balance)}
                                    </span>
                                </td>
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                        {statusInfo.label}
                                    </span>
                                </td>
                                <td className="p-3">{firstSession ? formatDate(firstSession.date) : '—'}</td>
                                <td className="p-3 flex items-center gap-3">
                                    <button onClick={() => onEdit(pkg)} className="text-blue-600 hover:text-blue-800" title="Editar">
                                        <Pencil size={16} />
                                    </button>
                                    {pkg.status === 'active' && pkg.paymentType === 'per-session' && (
                                        <button onClick={() => onInactivate(pkg._id)} className="text-amber-600 hover:text-amber-800" title="Inativar pacote">
                                            <Archive size={16} />
                                            <span className="sr-only">Inativar pacote</span>
                                        </button>
                                    )}
                                    {pkg.status === 'active' && ['full', 'partial', 'prepaid'].includes(pkg.paymentType || '') && (
                                        <button disabled className="cursor-not-allowed text-gray-300" title="Este pacote possui valor antecipado e exige transferência, crédito ou estorno antes do encerramento">
                                            <Archive size={16} />
                                            <span className="sr-only">Inativação indisponível</span>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="mt-4 flex items-center justify-between px-4 py-3 bg-gray-50 rounded-b-lg">
                <span className="text-sm text-gray-600">Página {currentPage} de {totalPages}</span>
                <div className="flex gap-2">
                    <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300">
                        Anterior
                    </button>
                    <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-sm bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300">
                        Próxima
                    </button>
                </div>
            </div>
        </div>
    );
}
