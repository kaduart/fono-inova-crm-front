import { Button, Paper, Typography } from '@mui/material';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import { Patient360Modal } from '../../pages/Financial/components/Patient360Modal';
import { FinancialTableLoading } from '../../pages/Financial/components/FinancialLoading';
import api from '../../services/api';

// ─── Appointments card that reacts to the active period filter ───────────────
const STATUS_MAP: Record<string, { label: string; color: string }> = {
    confirmed: { label: 'Confirmado', color: 'bg-green-100 text-green-800' },
    scheduled: { label: 'Agendado', color: 'bg-blue-100 text-blue-800' },
    canceled:  { label: 'Cancelado',  color: 'bg-red-100 text-red-800' },
    missed:    { label: 'Faltou',     color: 'bg-orange-100 text-orange-800' },
    completed: { label: 'Realizado',  color: 'bg-purple-100 text-purple-800' },
};

function computeDateRange(period: string, customStart: string, customEnd: string): { start: string; end: string } | null {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    if (period === 'day') {
        return { start: fmt(now), end: fmt(now) };
    }
    if (period === 'week') {
        const day = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return { start: fmt(monday), end: fmt(sunday) };
    }
    if (period === 'month') {
        const s = new Date(now.getFullYear(), now.getMonth(), 1);
        const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start: fmt(s), end: fmt(e) };
    }
    if (period === 'last_week') {
        const day = now.getDay();
        const lastMonday = new Date(now);
        lastMonday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) - 7);
        const lastSunday = new Date(lastMonday);
        lastSunday.setDate(lastMonday.getDate() + 6);
        return { start: fmt(lastMonday), end: fmt(lastSunday) };
    }
    if (period === 'last_month') {
        const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const e = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: fmt(s), end: fmt(e) };
    }
    if (/^\d{4}-\d{2}$/.test(period)) {
        const [y, m] = period.split('-').map(Number);
        return { start: fmt(new Date(y, m - 1, 1)), end: fmt(new Date(y, m, 0)) };
    }
    if (period === 'custom' && customStart && customEnd) {
        return { start: customStart, end: customEnd };
    }
    return null;
}

const AppointmentsPeriodCard = ({
    selectedPeriod,
    customStartDate,
    customEndDate,
}: {
    selectedPeriod: string;
    customStartDate: string;
    customEndDate: string;
}) => {
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loadingAppts, setLoadingAppts] = useState(false);

    const dateRange = useMemo(
        () => computeDateRange(selectedPeriod, customStartDate, customEndDate),
        [selectedPeriod, customStartDate, customEndDate]
    );

    useEffect(() => {
        if (!dateRange) return;
        setLoadingAppts(true);
        api.get('/appointments', { params: { startDate: dateRange.start, endDate: dateRange.end } })
            .then(res => {
                const data = res.data?.data || res.data || [];
                setAppointments(Array.isArray(data) ? data.filter((a: any) => a.operationalStatus !== 'pre_agendado') : []);
            })
            .catch(() => setAppointments([]))
            .finally(() => setLoadingAppts(false));
    }, [dateRange]);

    if (!dateRange) return null;

    const counts = appointments.reduce((acc, a) => {
        const s = a.operationalStatus || 'scheduled';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-blue-800 text-sm">Agendamentos do Período</h3>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    {appointments.length} agendamento{appointments.length !== 1 ? 's' : ''}
                </span>
            </div>

            {loadingAppts ? (
                <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                </div>
            ) : appointments.length === 0 ? (
                <p className="text-xs text-blue-600 text-center py-2">Nenhum agendamento no período</p>
            ) : (
                <>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {Object.entries(counts).map(([status, count]) => (
                            <span
                                key={status}
                                className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_MAP[status]?.color || 'bg-gray-100 text-gray-700'}`}
                            >
                                {STATUS_MAP[status]?.label || status}: {count as number}
                            </span>
                        ))}
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                        {appointments.slice(0, 8).map((a: any) => (
                            <div key={a._id} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-2 border border-blue-100">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-gray-500 shrink-0">{a.date} {a.time}</span>
                                    <span className="font-medium text-gray-800 truncate">
                                        {a.patient?.fullName || 'Paciente'}
                                    </span>
                                </div>
                                <span className={`ml-2 shrink-0 text-xs px-2 py-0.5 rounded-full ${STATUS_MAP[a.operationalStatus]?.color || 'bg-gray-100 text-gray-700'}`}>
                                    {STATUS_MAP[a.operationalStatus]?.label || a.operationalStatus}
                                </span>
                            </div>
                        ))}
                        {appointments.length > 8 && (
                            <p className="text-xs text-center text-blue-500 pt-1">
                                +{appointments.length - 8} mais
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────

interface PaymentPageProps {
    patients?: IPatient[];
    doctors?: IDoctor[];
    initialPayments: any[];
    onMarkAsPaid: (payment: FinancialRecord) => void;
    registerAppointmentAndPayemntFuture: (payment: FinancialRecord) => void;
    onCancelPayment: (paymentId: string) => void;
}

const PaymentPage = ({ patients, doctors, initialPayments, onMarkAsPaid, onCancelPayment, registerAppointmentAndPayemntFuture }: PaymentPageProps) => {
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
    const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'all' | 'last_week' | 'last_month' | 'custom'>('month');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');

    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);

    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const patientParam = params.get("patient");

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
    const [selectedPatient360Id, setSelectedPatient360Id] = useState<string | null>(null);
    const [is360ModalOpen, setIs360ModalOpen] = useState(false);

    const {
        payments,
        fetchPayments,
        paymentTotals,
        fetchPaymentTotals,
    } = usePayment();

    // 🔹 Carregar dados iniciais - apenas se não tiver initialPayments
    useEffect(() => {
        // Se já temos initialPayments, não precisamos carregar tudo de novo
        if (initialPayments && initialPayments.length > 0) {
            return;
        }

        const loadData = async () => {
            try {
                await fetchPayments();
                await fetchPaymentTotals({ period: 'month' });
            } catch (err) {
                toast.error('Erro ao carregar dados financeiros');
            }
        };
        loadData();
    }, [fetchPayments, fetchPaymentTotals, initialPayments]);

    // 🔹 Carregar role do usuário
    useEffect(() => {
        const userString = localStorage.getItem('user') ?? '{}';

        try {
            const parsedUser = JSON.parse(userString);

            if (parsedUser) {
                setUserRole(parsedUser.role?.trim().toLowerCase() ?? null);
                setUser(parsedUser);
            }
        } catch (e) {
            console.error('Erro ao ler usuário do localStorage', e);
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
        onPaymentRefresh: () => {
            fetchPaymentTotals({ period: 'month' });
            getPayments().then(res => {
                const data = res.data?.data || res.data;
                if (data) setAllPayments(data);
            }).catch(() => {});
        },
    });

    // 🔹 Carregar todos os pagamentos - apenas se não tiver initialPayments
    useEffect(() => {
        // Se já temos initialPayments, não precisamos carregar novamente
        if (initialPayments && initialPayments.length > 0) {
            setAllPayments(initialPayments);
            return;
        }

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
    }, [fetchPaymentTotals, initialPayments]);

    const handleEditAmount = (paymentId: string) => {
        const payment = allPayments.find(p => p._id === paymentId);
        setPaymentToEdit(payment);
        setIsEditModalOpen(true);
    };

    const handleUpdateAmount = async (data: {
        id: string;
        amount: number;
        date: string;
        status: string;
        paymentMethod: string;
        serviceType: string;
        specialty: string;
    }) => {
        try {
            const response = await updatePayment(data.id, {
                amount: data.amount,
                date: data.date,
                status: data.status,
                serviceType: data.serviceType,
                paymentMethod: data.paymentMethod,
                specialty: data.specialty,
            });

            // ✅ Normaliza a resposta (mesmo padrão do usePayment)
            const updated = response.data?.data ?? response.data ?? response;

            // ✅ Atualiza os estados locais com o pagamento atualizado
            setAllPayments(prev => prev.map(p => p._id === data.id ? updated : p));
            setFilteredPayments(prev => prev.map(p => p._id === data.id ? updated : p));

            // ✅ Fecha modal
            setIsEditModalOpen(false);
            setPaymentToEdit(undefined);

            toast.success('💚 Pagamento atualizado!');

        } catch (error) {
            console.error('Erro ao atualizar pagamento:', error);
            toast.error('Erro ao atualizar pagamento');
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
            'tongue_tie_test': 'Teste da Linguinha',
            'neuropsych_evaluation': 'Aval. Neuropsicóliga',
            'individual_session': 'Sessão Avulsa',
            'package': 'Pacote'
        };
        return types[type] || type;
    };

    const handleOpen360 = (patientId: string) => {
        setSelectedPatient360Id(patientId);
        setIs360ModalOpen(true);
    };

    return (
        <div className="space-y-6 p-4">

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
                        {user && (
                            <div className="mb-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <label className="text-sm font-medium text-gray-700">Período:</label>
                                    
                                    {/* 🔹 CHIPS DE FILTRO RÁPIDO */}
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { key: 'day', label: 'Hoje', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
                                            { key: 'week', label: 'Esta Semana', color: 'bg-green-100 text-green-800 hover:bg-green-200' },
                                            { key: 'month', label: 'Este Mês', color: 'bg-purple-100 text-purple-800 hover:bg-purple-200' },
                                            { key: 'last_week', label: 'Semana Passada', color: 'bg-orange-100 text-orange-800 hover:bg-orange-200' },
                                            { key: 'last_month', label: 'Mês Passado', color: 'bg-pink-100 text-pink-800 hover:bg-pink-200' },
                                        ].map((chip) => (
                                            <button
                                                key={chip.key}
                                                onClick={() => {
                                                    setSelectedPeriod(chip.key as any);
                                                    // Trigger the same logic as select onChange
                                                    if (chip.key === 'last_week') {
                                                        const now = new Date();
                                                        const dayOfWeek = now.getDay();
                                                        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                                                        const lastMonday = new Date(now);
                                                        lastMonday.setDate(now.getDate() - diffToMonday - 7);
                                                        lastMonday.setHours(0, 0, 0, 0);
                                                        const lastSunday = new Date(lastMonday);
                                                        lastSunday.setDate(lastMonday.getDate() + 6);
                                                        lastSunday.setHours(23, 59, 59, 999);
                                                        fetchPaymentTotals({
                                                            period: 'custom',
                                                            startDate: lastMonday.toISOString(),
                                                            endDate: lastSunday.toISOString()
                                                        });
                                                    } else if (chip.key === 'last_month') {
                                                        const now = new Date();
                                                        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                                        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                                                        lastDayLastMonth.setHours(23, 59, 59, 999);
                                                        fetchPaymentTotals({
                                                            period: 'custom',
                                                            startDate: firstDayLastMonth.toISOString(),
                                                            endDate: lastDayLastMonth.toISOString()
                                                        });
                                                    } else {
                                                        fetchPaymentTotals({ period: chip.key as any });
                                                    }
                                                }}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                                    selectedPeriod === chip.key 
                                                        ? 'ring-2 ring-offset-1 ring-green-500 ' + chip.color 
                                                        : chip.color
                                                }`}
                                            >
                                                {chip.label}
                                            </button>
                                        ))}
                                    </div>

                                    <select
                                        className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                        value={selectedPeriod}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setSelectedPeriod(value);

                                            // 🔹 Se for mês específico (formato YYYY-MM)
                                            if (/^\d{4}-\d{2}$/.test(value)) {
                                                const [year, month] = value.split('-').map(Number);
                                                const startDate = new Date(year, month - 1, 1).toISOString();
                                                const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

                                                fetchPaymentTotals({
                                                    period: 'custom',
                                                    startDate,
                                                    endDate
                                                });
                                            } else if (value === 'last_week') {
                                                // 🔹 Semana Passada
                                                const now = new Date();
                                                const dayOfWeek = now.getDay();
                                                const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                                                const lastMonday = new Date(now);
                                                lastMonday.setDate(now.getDate() - diffToMonday - 7);
                                                lastMonday.setHours(0, 0, 0, 0);
                                                const lastSunday = new Date(lastMonday);
                                                lastSunday.setDate(lastMonday.getDate() + 6);
                                                lastSunday.setHours(23, 59, 59, 999);
                                                
                                                fetchPaymentTotals({
                                                    period: 'custom',
                                                    startDate: lastMonday.toISOString(),
                                                    endDate: lastSunday.toISOString()
                                                });
                                            } else if (value === 'last_month') {
                                                // 🔹 Mês Passado
                                                const now = new Date();
                                                const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                                const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                                                lastDayLastMonth.setHours(23, 59, 59, 999);
                                                
                                                fetchPaymentTotals({
                                                    period: 'custom',
                                                    startDate: firstDayLastMonth.toISOString(),
                                                    endDate: lastDayLastMonth.toISOString()
                                                });
                                            } else if (value === 'custom') {
                                                // 🔹 Período Customizado - não faz nada até preencher datas
                                                return;
                                            } else {
                                                // 🔹 Filtros padrão (day, week, month, year, all)
                                                fetchPaymentTotals({ period: value as 'day' | 'week' | 'month' | 'year' | 'all' });
                                            }
                                        }}
                                    >
                                        <optgroup label="Períodos Rápidos">
                                            <option value="day">Hoje</option>
                                            <option value="week">Esta Semana</option>
                                            <option value="month">Este Mês</option>
                                            <option value="last_week">📅 Semana Passada</option>
                                            <option value="last_month">📅 Mês Passado</option>
                                            <option value="year">Este Ano</option>
                                            <option value="all">Todo Período</option>
                                            <option value="custom">📆 Período Customizado</option>
                                        </optgroup>
                                        <optgroup label="Últimos 12 Meses">
                                            {(() => {
                                                const months = [];
                                                const now = new Date();
                                                const monthNames = [
                                                    'Janeiro', 'Fevereiro', 'Março', 'Abril',
                                                    'Maio', 'Junho', 'Julho', 'Agosto',
                                                    'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                                                ];

                                                for (let i = 0; i < 12; i++) {
                                                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                                                    const year = d.getFullYear();
                                                    const month = d.getMonth();
                                                    const value = `${year}-${String(month + 1).padStart(2, '0')}`;
                                                    const label = `${monthNames[month]} ${year}`;

                                                    months.push(
                                                        <option key={value} value={value}>
                                                            {label}
                                                        </option>
                                                    );
                                                }
                                                return months;
                                            })()}
                                        </optgroup>
                                    </select>

                                    {/* 🔹 Inputs de Período Customizado */}
                                    {selectedPeriod === 'custom' && (
                                        <div className="flex items-center gap-2 ml-2">
                                            <input
                                                type="date"
                                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                                value={customStartDate}
                                                onChange={(e) => setCustomStartDate(e.target.value)}
                                                placeholder="Data Inicial"
                                            />
                                            <span className="text-gray-500">até</span>
                                            <input
                                                type="date"
                                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                                value={customEndDate}
                                                onChange={(e) => setCustomEndDate(e.target.value)}
                                                placeholder="Data Final"
                                            />
                                            <button
                                                onClick={() => {
                                                    if (customStartDate && customEndDate) {
                                                        const start = new Date(customStartDate);
                                                        start.setHours(0, 0, 0, 0);
                                                        const end = new Date(customEndDate);
                                                        end.setHours(23, 59, 59, 999);
                                                        fetchPaymentTotals({
                                                            period: 'custom',
                                                            startDate: start.toISOString(),
                                                            endDate: end.toISOString()
                                                        });
                                                    } else {
                                                        toast.warning('Selecione as datas inicial e final');
                                                    }
                                                }}
                                                disabled={!customStartDate || !customEndDate}
                                                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Aplicar
                                            </button>
                                        </div>
                                    )}

                                    {loading && (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                                    )}
                                </div>

                                {paymentTotals && (
                                    <FinancialSummaryCard
                                        data={{
                                            totalReceived: paymentTotals.totalReceived || 0,
                                            totalPending: paymentTotals.totalPending || 0,
                                            countReceived: paymentTotals.countReceived || 0,
                                            countPending: paymentTotals.countPending || 0,
                                            // 💰 Particular (separado)
                                            particularReceived: paymentTotals.particularReceived || 0,
                                            particularPending: paymentTotals.particularPending || 0,
                                            particularCountReceived: paymentTotals.particularCountReceived || 0,
                                            particularCountPending: paymentTotals.particularCountPending || 0,
                                            // 🏥 Convênios
                                            totalInsuranceProduction: paymentTotals.totalInsuranceProduction || 0,
                                            totalInsuranceReceived: paymentTotals.totalInsuranceReceived || 0,
                                            totalInsurancePending: paymentTotals.totalInsurancePending || 0,
                                            countInsuranceTotal: paymentTotals.countInsuranceTotal || 0,
                                            countInsuranceReceived: paymentTotals.countInsuranceReceived || 0,
                                            countInsurancePending: paymentTotals.countInsurancePending || 0,
                                            totalCombined: paymentTotals.totalCombined || 0,
                                        }}
                                    />
                                )}

                                <AppointmentsPeriodCard
                                    selectedPeriod={selectedPeriod}
                                    customStartDate={customStartDate}
                                    customEndDate={customEndDate}
                                />

                                {!paymentTotals && !loading && (
                                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                                        <p className="text-yellow-700 text-sm">
                                            Selecione um período acima para visualizar o resumo financeiro.
                                        </p>
                                    </div>
                                )}
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
                                    onClick={fetchPayments}
                                    sx={{ mt: 2 }}
                                >
                                    Tentar novamente
                                </Button>
                            </Paper>
                        ) : loading ? (
                            <FinancialTableLoading rowCount={8} colSpan={1} />
                        ) : (
                            <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'grey.200' }}>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[700px]">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Paciente</th>
                                                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Profissional</th>
                                                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Agendamento</th>
                                                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Sessões</th>
                                                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Tipo</th>
                                                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Valor</th>
                                                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Método</th>
                                                <th className="px-2 py-2 sm:px-4 sm:py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {currentPayments.map(payment => (
                                                <tr key={payment._id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-sm text-gray-900 max-w-[120px] truncate" title={payment.patient?.fullName}>
                                                        <span
                                                            className="cursor-pointer hover:text-blue-600 hover:underline font-medium"
                                                            onClick={() => payment.patient?._id && handleOpen360(payment.patient._id)}
                                                        >
                                                            {payment.patient?.fullName}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-sm text-gray-600 max-w-[120px] truncate hidden sm:table-cell" title={payment.doctor?.fullName}>
                                                        {payment.doctor?.fullName}
                                                    </td>
                                                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-sm text-gray-600 hidden md:table-cell">
                                                        {payment && payment.appointment
                                                            ? `${formatDateToDMY(payment.appointment.date)} às ${payment.appointment.time}`
                                                            : 'Pacote'}
                                                    </td>
                                                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-sm text-gray-600 text-center hidden lg:table-cell">
                                                        {payment && payment.advancedSessions?.length > 0 ? payment.advancedSessions.length : '0'}
                                                    </td>
                                                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-sm text-gray-600 hidden lg:table-cell">
                                                        {getServiceTypeLabel(payment.serviceType)}
                                                    </td>
                                                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-sm font-semibold text-gray-900">
                                                        {payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                    </td>
                                                    <td className="px-2 py-2 sm:px-4 sm:py-3">
                                                        <span
                                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${payment.status === 'paid'
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
                                                    <td className="px-2 py-2 sm:px-4 sm:py-3 text-sm text-gray-600 hidden sm:table-cell">
                                                        {payment.paymentMethod}
                                                    </td>
                                                    <td className="px-2 py-2 sm:px-4 text-sm font-medium">
                                                        <PaymentActionIcons
                                                            payment={payment}
                                                            onMarkAsPaid={() => onMarkAsPaid(payment)}
                                                            registerAppointmentAndPayemntFuture={() => registerAppointmentAndPayemntFuture(payment)}
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

            {selectedPatient360Id && (
                <Patient360Modal
                    patientId={selectedPatient360Id}
                    open={is360ModalOpen}
                    onClose={() => setIs360ModalOpen(false)}
                />
            )}
        </div>
    );
};

export default PaymentPage;