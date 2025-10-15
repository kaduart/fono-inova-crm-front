import { Button, Paper, Typography, useTheme } from '@mui/material';
import { ChevronDown, ChevronUp, DollarSign, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { usePixSocket } from '../../hooks/usePixSocket';
import {
    exportCSV,
    exportPDF,
    FinancialRecord,
    getPaymentCountFinancialRecord,
    getPayments,
    updatePayment
} from '../../services/paymentService';
import { formatDateToDMY } from '../../utils/dateFormat';
import { IDoctor, IPatient } from '../../utils/types/types';
import { AddPaymentModal } from './AddPaymentModal';
import DailyClosingReport from './DailyClosingReport';
import { EditPaymentModal } from './EditPaymentModal';
import { PaymentActionIcons } from './PaymentAction';
import { PaymentsFilters } from './PaymentsFilters';
import FinancialSummaryCard from './PaymentsSummary';

interface PaymentPageProps {
    patients?: IPatient[];
    doctors?: IDoctor[];
    initialPayments: any[];
    onMarkAsPaid: (payment: FinancialRecord) => void;
    onCancelPayment: (paymentId: string) => void;
}

const PaymentPage = ({ patients, doctors, initialPayments, onMarkAsPaid, onCancelPayment }: PaymentPageProps) => {
    const [allPayments, setAllPayments] = useState<FinancialRecord[]>([]);
    const [filteredPayments, setFilteredPayments] = useState<FinancialRecord[]>([]);
    const [financialRecord, setFinancialRecord] = useState<FinancialRecord[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [paymentToEdit, setPaymentToEdit] = useState<FinancialRecord | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [dailyReportOpen, setDailyReportOpen] = useState<boolean>(true);
    const [financialControlOpen, setFinancialControlOpen] = useState<boolean>(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);


    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [user, setUser] = useState<string | null>(null);

    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const patientParam = params.get("patient");

    // controle do modal de adicionar pagamento
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
    const theme = useTheme();


    useEffect(() => {
        const userString = localStorage.getItem('user') ?? '{}';
        const user = JSON.parse(userString);
        if (user) {
            setUserRole(user.role.trim().toLowerCase());
            setUser(user);
        }
    }, []);

    useEffect(() => {
        if (initialPayments) {
            setAllPayments(initialPayments);
        }
    }, [initialPayments]);

    // 🔹 Mantém sua função atual, usada quando quiser recarregar tudo (tabela + resumo)
    const loadPayments = async () => {
        setLoading(true);
        try {
            setError(null);

            const res = await getPayments();
            const financial = await getPaymentCountFinancialRecord();

            setAllPayments(res.data.data);
            setFinancialRecord(financial.data.data);
        } catch (error) {
            console.error("Erro ao carregar pagamentos:", error);
            setError(
                error instanceof Error ? error.message : "Erro ao carregar pagamentos"
            );
            toast.error("Erro ao carregar pagamentos");
        } finally {
            setLoading(false);
        }
    };

    // 🔹 NOVA FUNÇÃO: apenas atualiza o card financeiro (sem refazer toda a lista)
    const refreshFinancialSummary = async () => {
        try {
            const financial = await getPaymentCountFinancialRecord();
            setFinancialRecord(financial.data.data);
        } catch (error) {
            console.error("Erro ao atualizar resumo financeiro:", error);
        }
    };


    useEffect(() => {
        if (patientParam && allPayments.length > 0) {
            const filtered = allPayments.filter(p =>
                p.patient?.fullName?.toLowerCase().includes(patientParam.toLowerCase())
            );

            if (filtered.length > 0) {
                toast.info(`🔍 Exibindo pagamentos de ${patientParam}`);
                setFilteredPayments(filtered);
            } else {
                toast.warn(`Nenhum pagamento encontrado para ${patientParam}`);
            }
        } else if (!patientParam) {
            // Se não tiver query param, mostra todos normalmente
            setFilteredPayments(allPayments);
        }
    }, [patientParam, allPayments]);


    usePixSocket({ onPaymentRefresh: refreshFinancialSummary });

    useEffect(() => {
        loadPayments();
    }, []);

    const handleEditAmount = (paymentId: string) => {
        const payment = allPayments.find(p => p._id === paymentId);
        setPaymentToEdit(payment);
        setIsEditModalOpen(true);
    };

    const handleUpdateAmount = async (data: {
        _id: string;
        amount: number;
        date: string;
        specialty: string;
        paymentMethod: string;
        serviceType: string;
    }) => {
        try {
            await updatePayment(data._id, {
                amount: data.amount,
                date: data.date,
                specialty: data.specialty,
                serviceType: data.serviceType,
                paymentMethod: data.paymentMethod
            });

            loadPayments();
            toast.success('Pagamento atualizado com sucesso!');
        } catch (error) {
            toast.error('Erro ao atualizar pagamento');
            throw error;
        }
    };

    const handleExportCSV = async () => {
        try {
            const res = await exportCSV();
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'pagamentos.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Erro ao exportar CSV:', error);
            toast.error('Erro ao exportar CSV');
        }
    };

    const handleExportPDF = async () => {
        try {
            const res = await exportPDF();
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'relatorio_pagamentos.pdf');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
            toast.error('Erro ao exportar PDF');
        }
    };

    const getServiceTypeLabel = (type: string) => {
        switch (type) {
            case 'evaluation': return 'Avaliação';
            case 'session': return 'Sessão do Pacote';
            case 'package_session': return 'Sessão do Pacote';
            case 'individual_session': return 'Sessão Avulsa';
            case 'package': return 'Pacote';
            default: return type;
        }
    };
    console.log("Status ROLEEEEE:", user);
    const handleOpenPayment = () => { }

    return (
        <div className="space-y-4">

            <Paper
                elevation={2}
                sx={{
                    p: 3,
                    mb: 3,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}10)`,
                }}
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    {/* Ícone e Título */}
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(55, 171, 135, 0.15)' }}>
                            <DollarSign size={24} style={{ color: '#00B57A' }} />
                        </div>
                        <div>
                            <Typography variant="h4" fontWeight="bold" color="grey.800">
                                Painel Financeiro
                            </Typography>
                            <Typography variant="body2" color="grey.600">
                                Controle completo dos pagamentos: recebidos, pendentes e em processamento.
                            </Typography>
                        </div>
                    </div>

                    {/* Botão estilizado */}
                    <Button
                        variant="contained"
                        startIcon={<Plus size={18} />}
                        onClick={handleOpenPayment}
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            py: 1.5,
                            fontWeight: 'bold',
                            background: `linear-gradient(135deg, rgb(55,171,135), rgb(40,130,100))`,
                            '&:hover': {
                                background: `linear-gradient(135deg, rgb(60,180,140), rgb(35,115,90))`,
                                transform: 'translateY(-1px)',
                                boxShadow: 4,
                            },
                            transition: 'all 0.25s ease-in-out',
                        }}
                    >
                        Novo Registro
                    </Button>

                </div>
            </Paper>


            <div className="border rounded-lg overflow-hidden">
                <button
                    className={`flex justify-between items-center w-full p-4 text-left font-medium ${dailyReportOpen ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'
                        }`}
                    onClick={() => setDailyReportOpen(!dailyReportOpen)}
                >
                    <span className="text-lg font-bold">Relatório Diário</span>
                    {dailyReportOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {dailyReportOpen && (
                    <div className="p-4">
                        <DailyClosingReport />
                    </div>
                )}
            </div>

            <div className="border rounded-lg overflow-hidden">
                <button
                    className={`flex justify-between items-center w-full p-4 text-left font-medium ${financialControlOpen ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                        }`}
                    onClick={() => setFinancialControlOpen(!financialControlOpen)}
                >
                    <span className="text-lg font-bold">Controle Financeiro</span>
                    {financialControlOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {financialControlOpen && (
                    <div className="space-y-6 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                            {user && user.name?.includes('Ricardo Maia') && (
                                <FinancialSummaryCard data={financialRecord} />
                            )}

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleExportCSV}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Exportar CSV
                                </button>

                                <button
                                    onClick={handleExportPDF}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    Exportar PDF
                                </button>
                            </div>
                        </div>

                        {/* 🔹 BOTÃO DE LIMPAR FILTRO (novo) */}
                        {patientParam && (
                            <div className="flex justify-end mb-2">
                                <button
                                    onClick={() => {
                                        window.history.replaceState(null, "", "/financeiro");
                                        setFilteredPayments(allPayments);
                                        toast.info("Filtro de paciente removido");
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 transition-all"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    Limpar filtro de {patientParam}
                                </button>
                            </div>
                        )}

                        {/* 🔹 SEUS FILTROS */}
                        <PaymentsFilters
                            doctors={doctors || []}
                            payments={allPayments}
                            onFilter={setFilteredPayments}
                        />

                        {error ? (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-center">
                                <p>{error}</p>
                                <button
                                    onClick={loadPayments}
                                    className="mt-2 px-4 py-2 bg-red-100 rounded hover:bg-red-200 text-red-700 flex items-center gap-1 mx-auto"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Tentar novamente
                                </button>
                            </div>
                        ) : loading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : (

                            <div className="overflow-x-auto bg-white rounded-lg shadow">
                                <div className="flex items-center justify-end mb-4">
                                    <button
                                        onClick={() => {
                                            // se quiser selecionar um pacote específico, seta aqui
                                            setSelectedPackageId("68fabc1234abcd5678ef9012"); // ← só pra teste, depois pega do real package
                                            setIsAddModalOpen(true);
                                        }}
                                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-all"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Adicionar Pagamento
                                    </button>
                                </div>
                                <table className="w-full min-w-[800px]">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">Paciente</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">Profissional</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">Agendada Para:</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">Sessões</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">Tipo</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">Valor</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">Status</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">Método</th>
                                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[5%]">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {currentPayments.map(payment => (
                                            <tr key={payment._id}>
                                                <td className="px-2 py-2 text-left whitespace-nowrap text-sm text-gray-500 truncate max-w-[120px]" title={payment.patient?.fullName}>
                                                    {payment.patient?.fullName}
                                                </td>
                                                <td className="px-2 py-2 text-left whitespace-nowrap text-sm text-gray-500 truncate max-w-[120px]" title={payment.doctor?.fullName}>
                                                    {payment.doctor?.fullName}
                                                </td>
                                                <td className="px-2 py-2 text-left whitespace-nowrap text-sm text-gray-500">
                                                    {payment && payment.appointment
                                                        ? `${formatDateToDMY(payment.appointment.date)} às ${payment.appointment.time}`
                                                        : 'Pacote'}
                                                </td>
                                                <td className="px-2 py-2 text-left whitespace-nowrap text-sm text-gray-500">
                                                    {payment && payment.advancedSessions?.length > 0 ? payment.advancedSessions.length : '0'}
                                                </td>
                                                <td className="px-2 py-2 text-left whitespace-nowrap text-sm text-gray-500">
                                                    {getServiceTypeLabel(payment.serviceType)}
                                                </td>
                                                <td className="px-2 py-2 text-left whitespace-nowrap text-sm text-gray-500">
                                                    {payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </td>
                                                <td className="px-2 py-2 text-left whitespace-nowrap">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold 
            ${payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                            payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-red-100 text-red-800'}`}>
                                                        {payment.status === 'paid' ? 'PAGO' :
                                                            payment.status === 'pending' ? 'PENDENTE' : 'CANCELADO'}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-2 text-left whitespace-nowrap text-sm text-gray-500">
                                                    {payment.paymentMethod}
                                                </td>
                                                <td className="px-2 py-2 text-left whitespace-nowrap text-sm font-medium">
                                                    <PaymentActionIcons
                                                        payment={payment}
                                                        onMarkAsPaid={() => onMarkAsPaid(payment)}
                                                        onCancelPayment={onCancelPayment}
                                                        onEditAmount={handleEditAmount}
                                                        disabled={!(userRole && ['admin', 'secretary'].includes(userRole) && payment.status !== 'canceled')}
                                                    />
                                                </td>

                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={9} className="px-6 py-4">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm text-gray-500">Exibir:</span>
                                                        <select
                                                            value={itemsPerPage}
                                                            onChange={(e) => {
                                                                setItemsPerPage(Number(e.target.value));
                                                                setCurrentPage(1);
                                                            }}
                                                            className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-700"
                                                        >
                                                            <option value={5}>5</option>
                                                            <option value={10}>10</option>
                                                            <option value={20}>20</option>
                                                        </select>
                                                    </div>

                                                    <div className="flex items-center space-x-1">
                                                        <button
                                                            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                                            disabled={currentPage === 1}
                                                            className="px-2 py-1 border border-gray-300 rounded text-gray-600 text-sm hover:bg-gray-100 disabled:opacity-50"
                                                        >
                                                            Anterior
                                                        </button>
                                                        {Array.from({ length: totalPages }, (_, index) => {
                                                            const page = index + 1;
                                                            const isActive = currentPage === page;
                                                            return (
                                                                <button
                                                                    key={page}
                                                                    onClick={() => setCurrentPage(page)}
                                                                    className={`px-3 py-1 rounded border text-sm transition-all duration-150 ${isActive
                                                                        ? 'border-blue-500 text-blue-600 font-semibold bg-blue-50'
                                                                        : 'border-transparent text-gray-600 hover:border-gray-300 hover:bg-gray-100'
                                                                        }`}
                                                                >
                                                                    {page}
                                                                </button>
                                                            );
                                                        })}
                                                        <button
                                                            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                                            disabled={currentPage === totalPages}
                                                            className="px-2 py-1 border border-gray-300 rounded text-gray-600 text-sm hover:bg-gray-100 disabled:opacity-50"
                                                        >
                                                            Próxima
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        {isEditModalOpen && paymentToEdit && (
                            <EditPaymentModal
                                payment={paymentToEdit}
                                isOpen={isEditModalOpen}
                                onClose={() => setIsEditModalOpen(false)}
                                onSave={handleUpdateAmount}
                            />
                        )}
                    </div>
                )}
            </div>


            <div className="flex gap-4">
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    onClick={() => {
                        setDailyReportOpen(true);
                        setFinancialControlOpen(true);
                    }}
                >
                    <ChevronUp size={16} />
                    Expandir Todos
                </button>
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    onClick={() => {
                        setDailyReportOpen(false);
                        setFinancialControlOpen(false);
                    }}
                >
                    <ChevronDown size={16} />
                    Recolher Todos
                </button>
            </div>
            {isAddModalOpen && (
                <AddPaymentModal
                    packageId={selectedPackageId}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={loadPayments}
                />
            )}

        </div >
    );
};

export default PaymentPage;