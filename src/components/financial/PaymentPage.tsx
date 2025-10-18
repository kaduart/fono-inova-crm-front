import { Button, Paper, Typography, useTheme } from '@mui/material';
import { ChevronDown, ChevronUp, DollarSign, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import usePayment from '../../hooks/usePayment';
import { usePixSocket } from '../../hooks/usePixSocket';
import {
    exportCSV,
    exportPDF,
    FinancialRecord,
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
    const [loading, setLoading] = useState<boolean>(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [paymentToEdit, setPaymentToEdit] = useState<FinancialRecord | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [dailyReportOpen, setDailyReportOpen] = useState<boolean>(true);
    const [financialControlOpen, setFinancialControlOpen] = useState<boolean>(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all'>('month');

    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [user, setUser] = useState<string | null>(null);

    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const patientParam = params.get("patient");

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
    const theme = useTheme();

    const {
        payments,
        fetchPayments,
        paymentTotals,
        fetchPaymentTotals,
    } = usePayment();

    // 🔹 Carregar dados iniciais
    useEffect(() => {
        const loadData = async () => {
            try {
                await fetchPayments();
                await fetchPaymentTotals({ period: 'month' });
            } catch (err) {
                toast.error('Erro ao carregar dados financeiros');
            }
        };
        loadData();
    }, [fetchPayments, fetchPaymentTotals]);

    // 🔹 Carregar role do usuário
    useEffect(() => {
        const userString = localStorage.getItem('user') ?? '{}';
        const user = JSON.parse(userString);
        if (user) {
            setUserRole(user.role.trim().toLowerCase());
            setUser(user);
        }
    }, []);

    // 🔹 Atualizar pagamentos iniciais
    useEffect(() => {
        if (initialPayments) {
            setAllPayments(initialPayments);
        }
    }, [initialPayments]);

    // 🔹 Filtrar por paciente na URL
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
            setFilteredPayments(allPayments);
        }
    }, [patientParam, allPayments]);

    // 🔹 Socket para atualizações em tempo real
    usePixSocket({
        onPaymentRefresh: () => fetchPaymentTotals({ period: 'month' }),
    });

    // 🔹 Carregar todos os pagamentos
    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            try {
                const res = await getPayments();
                setAllPayments(res.data.data);
                await fetchPaymentTotals({ period: 'month' });
            } catch (err) {
                console.error("Erro ao carregar dados:", err);
                toast.error("Erro ao carregar dados financeiros");
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, [fetchPaymentTotals]);

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

    const [selectedPackage, setSelectedPackage] = useState<any>(null);

    const addPayment = async (newPaymentData?: any) => {
        if (!newPaymentData) return;

        setSelectedPackage((prev: any) => ({
            ...prev,
            payments: [...(prev?.payments || []), newPaymentData.payment],
            totalPaid: newPaymentData.updatedPackage?.totalPaid,
            balance: newPaymentData.updatedPackage?.balance,
            financialStatus: newPaymentData.updatedPackage?.financialStatus
        }));

        toast.success("Pacote atualizado com o novo pagamento 💚");
    };

    const getServiceTypeLabel = (type: string) => {
        const types: { [key: string]: string } = {
            'evaluation': 'Avaliação',
            'session': 'Sessão do Pacote',
            'package_session': 'Sessão do Pacote',
            'individual_session': 'Sessão Avulsa',
            'package': 'Pacote'
        };
        return types[type] || type;
    };

    const handleOpenPayment = () => {
        // Implementar abertura do modal de pagamento
    };

    return (
        <div className="space-y-6 p-4">
            {/* 🔹 HEADER PRINCIPAL */}
            <Paper
                elevation={2}
                sx={{
                    p: 4,
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}10)`,
                    border: `1px solid ${theme.palette.divider}`,
                }}
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div
                            className="p-3 rounded-2xl"
                            style={{
                                backgroundColor: 'rgba(55, 171, 135, 0.15)',
                                backdropFilter: 'blur(10px)'
                            }}
                        >
                            <DollarSign size={28} style={{ color: '#00B57A' }} />
                        </div>
                        <div>
                            <Typography
                                variant="h4"
                                fontWeight="bold"
                                color="grey.800"
                                gutterBottom
                            >
                                Painel Financeiro
                            </Typography>
                            <Typography
                                variant="body1"
                                color="grey.600"
                                sx={{ opacity: 0.8 }}
                            >
                                Controle completo dos pagamentos: recebidos, pendentes e em processamento
                            </Typography>
                        </div>
                    </div>

                    <Button
                        variant="contained"
                        startIcon={<Plus size={20} />}
                        onClick={handleOpenPayment}
                        sx={{
                            borderRadius: 3,
                            px: 4,
                            py: 1.5,
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            background: `linear-gradient(135deg, rgb(55,171,135), rgb(40,130,100))`,
                            '&:hover': {
                                background: `linear-gradient(135deg, rgb(60,180,140), rgb(35,115,90))`,
                                transform: 'translateY(-2px)',
                                boxShadow: 6,
                            },
                            transition: 'all 0.3s ease-in-out',
                        }}
                    >
                        Novo Registro
                    </Button>
                </div>
            </Paper>

            {/* 🔹 SEÇÃO RELATÓRIO DIÁRIO */}
            <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <button
                    className={`flex justify-between items-center w-full p-4 text-left font-semibold transition-colors ${dailyReportOpen
                            ? 'bg-blue-50 text-blue-800 border-b border-blue-100'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                    onClick={() => setDailyReportOpen(!dailyReportOpen)}
                >
                    <span className="text-lg font-bold">📊 Relatório Diário</span>
                    {dailyReportOpen ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                </button>
                {dailyReportOpen && (
                    <div className="p-4 bg-white">
                        <DailyClosingReport />
                    </div>
                )}
            </Paper>

            {/* 🔹 SEÇÃO CONTROLE FINANCEIRO */}
            <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <button
                    className={`flex justify-between items-center w-full p-4 text-left font-semibold transition-colors ${financialControlOpen
                            ? 'bg-green-50 text-green-800 border-b border-green-100'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                    onClick={() => setFinancialControlOpen(!financialControlOpen)}
                >
                    <span className="text-lg font-bold">💰 Controle Financeiro</span>
                    {financialControlOpen ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                </button>

                {financialControlOpen && (
                    <div className="space-y-6 p-4 bg-white">
                        {/* 🔹 RESUMO FINANCEIRO */}
                        {user && user.name?.includes('Ricardo Maia') && paymentTotals && (
                            <div className="mb-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <label className="text-sm font-medium text-gray-700">Período:</label>
                                    <select
                                        className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        value={selectedPeriod}
                                        onChange={(e) => {
                                            const value = e.target.value as 'day' | 'week' | 'month' | 'year' | 'all';
                                            setSelectedPeriod(value);
                                            fetchPaymentTotals({ period: value });
                                        }}
                                    >
                                        <option value="day">Hoje</option>
                                        <option value="week">Esta Semana</option>
                                        <option value="month">Este Mês</option>
                                        <option value="year">Este Ano</option>
                                        <option value="all">Todo Período</option>
                                    </select>
                                </div>
                                <FinancialSummaryCard
                                    data={{
                                        totalReceived: paymentTotals.totalReceived || 0,
                                        totalPending: paymentTotals.totalPending || 0,
                                        countReceived: paymentTotals.countReceived || 0,
                                        countPending: paymentTotals.countPending || 0,
                                    }}
                                />
                            </div>
                        )}

                        {/* 🔹 BOTÕES DE EXPORTAÇÃO */}
                        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-2xl">
                            <Typography variant="h6" fontWeight="600" color="grey.800">
                                Exportar Relatórios
                            </Typography>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outlined"
                                    startIcon={
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    }
                                    onClick={handleExportCSV}
                                    disabled={loading}
                                    sx={{
                                        borderRadius: 2,
                                        px: 3,
                                        py: 1,
                                        fontWeight: 600,
                                    }}
                                >
                                    Exportar CSV
                                </Button>

                                <Button
                                    variant="outlined"
                                    startIcon={
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    }
                                    onClick={handleExportPDF}
                                    disabled={loading}
                                    sx={{
                                        borderRadius: 2,
                                        px: 3,
                                        py: 1,
                                        fontWeight: 600,
                                        borderColor: 'grey.300',
                                        color: 'grey.700',
                                        '&:hover': {
                                            borderColor: 'grey.400',
                                            backgroundColor: 'grey.50'
                                        }
                                    }}
                                >
                                    Exportar PDF
                                </Button>
                            </div>
                        </div>

                        {/* 🔹 FILTROS */}
                        {patientParam && (
                            <div className="flex justify-end">
                                <Button
                                    variant="outlined"
                                    startIcon={
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    }
                                    onClick={() => {
                                        window.history.replaceState(null, "", "/financeiro");
                                        setFilteredPayments(allPayments);
                                        toast.info("Filtro de paciente removido");
                                    }}
                                    sx={{
                                        borderRadius: 2,
                                        px: 3,
                                        py: 1,
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    Limpar filtro de {patientParam}
                                </Button>
                            </div>
                        )}

                        <PaymentsFilters
                            doctors={doctors || []}
                            payments={allPayments}
                            onFilter={setFilteredPayments}
                        />

                        {/* 🔹 TABELA DE PAGAMENTOS */}
                        {error ? (
                            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'error.light', color: 'error.dark' }}>
                                <Typography variant="body1" gutterBottom>{error}</Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<RefreshCw size={16} />}
                                    onClick={loadPayments}
                                    sx={{ mt: 2 }}
                                >
                                    Tentar novamente
                                </Button>
                            </Paper>
                        ) : loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                            </div>
                        ) : (
                            <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'grey.200' }}>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[1000px]">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Paciente</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Profissional</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Agendamento</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sessões</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tipo</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Valor</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Método</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {currentPayments.map(payment => (
                                                <tr key={payment._id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[150px] truncate" title={payment.patient?.fullName}>
                                                        {payment.patient?.fullName}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate" title={payment.doctor?.fullName}>
                                                        {payment.doctor?.fullName}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {payment && payment.appointment
                                                            ? `${formatDateToDMY(payment.appointment.date)} às ${payment.appointment.time}`
                                                            : 'Pacote'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600 text-center">
                                                        {payment && payment.advancedSessions?.length > 0 ? payment.advancedSessions.length : '0'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {getServiceTypeLabel(payment.serviceType)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                                        {payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${payment.status === 'paid'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : payment.status === 'partial'
                                                                        ? 'bg-orange-100 text-orange-800'
                                                                        : payment.status === 'pending'
                                                                            ? 'bg-yellow-100 text-yellow-800'
                                                                            : 'bg-red-100 text-red-800'
                                                                }`}
                                                        >
                                                            {payment.status === 'paid'
                                                                ? 'PAGO'
                                                                : payment.status === 'partial'
                                                                    ? 'PARCIAL'
                                                                    : payment.status === 'pending'
                                                                        ? 'PENDENTE'
                                                                        : 'CANCELADO'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {payment.paymentMethod}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium">
                                                        <PaymentActionIcons
                                                            payment={payment}
                                                            onMarkAsPaid={() => onMarkAsPaid(payment)}
                                                            onCancelPayment={onCancelPayment}
                                                            onEditAmount={handleEditAmount}
                                                            onAddPaymentToPackage={(pkg) => {
                                                                setSelectedPackage(pkg);
                                                                setSelectedPackageId(pkg._id);
                                                                setIsAddModalOpen(true);
                                                            }}
                                                            disabled={!(userRole && ['admin', 'secretary'].includes(userRole) && payment.status !== 'canceled')}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* 🔹 PAGINAÇÃO */}
                                <div className="px-6 py-4 border-t border-gray-200">
                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center space-x-2">
                                            <Typography variant="body2" color="grey.600">
                                                Itens por página:
                                            </Typography>
                                            <select
                                                value={itemsPerPage}
                                                onChange={(e) => {
                                                    setItemsPerPage(Number(e.target.value));
                                                    setCurrentPage(1);
                                                }}
                                                className="border border-gray-300 rounded-lg px-3 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                                            >
                                                <option value={5}>5</option>
                                                <option value={10}>10</option>
                                                <option value={20}>20</option>
                                                <option value={50}>50</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <Button
                                                variant="outlined"
                                                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                                disabled={currentPage === 1}
                                                size="small"
                                            >
                                                Anterior
                                            </Button>

                                            {Array.from({ length: totalPages }, (_, index) => {
                                                const page = index + 1;
                                                const isActive = currentPage === page;
                                                return (
                                                    <Button
                                                        key={page}
                                                        variant={isActive ? "contained" : "outlined"}
                                                        onClick={() => setCurrentPage(page)}
                                                        size="small"
                                                        sx={{
                                                            minWidth: '40px',
                                                            height: '40px',
                                                            fontWeight: isActive ? 'bold' : 'normal'
                                                        }}
                                                    >
                                                        {page}
                                                    </Button>
                                                );
                                            })}

                                            <Button
                                                variant="outlined"
                                                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                                disabled={currentPage === totalPages}
                                                size="small"
                                            >
                                                Próxima
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Paper>
                        )}
                    </div>
                )}
            </Paper>

            {/* 🔹 BOTÕES DE CONTROLE DE VISUALIZAÇÃO */}
            <div className="flex gap-3 justify-center">
                <Button
                    variant="outlined"
                    startIcon={<ChevronUp size={18} />}
                    onClick={() => {
                        setDailyReportOpen(true);
                        setFinancialControlOpen(true);
                    }}
                    sx={{ borderRadius: 2 }}
                >
                    Expandir Todos
                </Button>
                <Button
                    variant="outlined"
                    startIcon={<ChevronDown size={18} />}
                    onClick={() => {
                        setDailyReportOpen(false);
                        setFinancialControlOpen(false);
                    }}
                    sx={{ borderRadius: 2 }}
                >
                    Recolher Todos
                </Button>
            </div>

            {/* 🔹 MODAIS */}
            {isEditModalOpen && paymentToEdit && (
                <EditPaymentModal
                    payment={paymentToEdit}
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleUpdateAmount}
                />
            )}

            {isAddModalOpen && (
                <AddPaymentModal
                    packageData={selectedPackage}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={addPayment}
                />
            )}
        </div>
    );
};

export default PaymentPage;