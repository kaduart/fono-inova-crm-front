/* import { useEffect, useState } from 'react';
import { exportCSV, exportPDF, getPayments, markAsPaid } from '../../services/paymentService';

interface PaymentsTableProps {
    filters: Record<string, any>;
}

export function PaymentsTable({ filters }: PaymentsTableProps) {
    const [payments, setPayments] = useState<any[]>([]);
    const userRole = localStorage.getItem('userRole');

    useEffect(() => {
        // Obtendo os pagamentos com base nos filtros
        getPayments(filters).then(res => setPayments(res.data));
    }, [filters]);

    const handleExportCSV = async () => {
        try {
            const res = await exportCSV(filters);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'pagamentos.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Erro ao exportar CSV:', err);
        }
    };

    const handleExportPDF = async () => {
        try {
            const res = await exportPDF(filters);
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'relatorio_pagamentos.pdf');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Erro ao exportar PDF:', err);
        }
    };

    const handleMarkAsPaid = async (id: string) => {
        try {
            await markAsPaid(id);
            // Atualiza a lista após marcar como pago
            const updated = await getPayments(filters);
            setPayments(updated.data);
            alert('Pagamento marcado como pago com sucesso!');
        } catch (err) {
            console.error('Erro ao marcar como pago:', err);
        }
    };

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-2">Pagamentos</h2>

            <div className="mb-4 space-x-2">
                <button
                    onClick={handleExportCSV}
                    className="bg-green-600 text-white px-3 py-1 rounded"
                >
                    Exportar CSV
                </button>
                <button
                    onClick={handleExportPDF}
                    className="bg-red-600 text-white px-3 py-1 rounded"
                >
                    Exportar PDF
                </button>
            </div>

            <table className="w-full table-auto border">
                <thead>
                    <tr>
                        <th className="px-2 py-1">Paciente</th>
                        <th className="px-2 py-1">Profissional</th>
                        <th className="px-2 py-1">Data</th>
                        <th className="px-2 py-1">Valor</th>
                        <th className="px-2 py-1">Status</th>
                        <th className="px-2 py-1">Método</th>
                        <th className="px-2 py-1">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {payments.map(p => (
                        <tr key={p._id} className="border-t">
                            <td className="px-2 py-1">{p.patientId?.name}</td>
                            <td className="px-2 py-1">{p.doctorId?.name}</td>
                            <td className="px-2 py-1">{new Date(p.sessionDate).toLocaleDateString()}</td>
                            <td className="px-2 py-1">R$ {p.value.toFixed(2)}</td>
                            <td className="px-2 py-1">
                                <span
                                    className={`px-2 py-1 rounded text-xs font-medium
                    ${p.status === 'paid' ? 'bg-green-100 text-green-800' :
                                            p.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'}`
                                    }
                                >
                                    {p.status.toUpperCase()}
                                </span>
                            </td>
                            <td className="px-2 py-1">{p.paymentMethod}</td>
                            <td className="px-2 py-1">
                                {(userRole === 'admin' || userRole === 'secretary') && p.status === 'pending' && (
                                    <button
                                        onClick={() => handleMarkAsPaid(p._id)}
                                        className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                                    >
                                        Marcar como Pago
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
 */