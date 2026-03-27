// src/components/DailyClosingReport.tsx
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { useEffect, useMemo, useState } from "react";
import {
    BsArrowRight,
    BsCalendar3,
    BsCashCoin,
    BsCheckCircle,
    BsClock,
    BsClockHistory,
    BsExclamationTriangle,
    BsPeople,
    BsXCircle
} from "react-icons/bs";
import {
    FiDollarSign,
    FiTrendingUp
} from "react-icons/fi";
import {
    MdOutlineEmail,
    MdOutlineFileDownload
} from "react-icons/md";
import { TbCalendarStats } from "react-icons/tb";
import usePayment from "../../hooks/usePayment";
import { getPaymentTotals } from "../../services/paymentService";
import api from "../../services/api";
import { formatDateBrazilian } from "../../utils/dateFormat";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import SummaryCard from "./SummaryCard";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

// 🎯 TIPOS E INTERFACES
interface Appointment {
    id: string;
    patient: string;
    doctor: string;
    service: string;
    time: string;
    operationalStatus: string;
    clinicalStatus?: string;
    sessionValue: number;
    paidStatus?: string;
    paymentMethod?: string;
}

interface TimeSlot {
    time: string;
    appointments: Appointment[];
    count: number;
    stats: {
        confirmed: number;
        canceled: number;
        scheduled: number;
        revenue: number;
        professionals: string[];
        occupancy: number;
        confirmationRate: number;
    };
    alerts?: {
        conflicts: number;
        highValue: boolean;
        attentionNeeded: number;
        lowConfirmation: boolean;
        professionalOverload: boolean;
    };
}

interface ProfessionalSummary {
    name: string;
    appointments: Appointment[];
    confirmed: number;
    canceled: number;
    totalValue: number;
    efficiency: number;
    sessionCount: number;
}

// 🎨 COMPONENTE PRINCIPAL
const DailyClosingReport = () => {
    const [dateFilter, setDateFilter] = useState(dayjs().format("YYYY-MM-DD"));
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
    const [isTimeSlotModalOpen, setIsTimeSlotModalOpen] = useState(false);
    const [isNovosModalOpen, setIsNovosModalOpen] = useState(false);
    const [isRecorrentesModalOpen, setIsRecorrentesModalOpen] = useState(false);
    const [filters, setFilters] = useState({
        professional: 'all',
        status: 'all',
        service: 'all'
    });

    const { dailyClosing: report, loading, error, fetchDailyClosing } = usePayment();
    
    // 🏥 Dados de convênio
    const [insuranceData, setInsuranceData] = useState({
        totalInsuranceProduction: 0,
        totalInsuranceReceived: 0,
        totalInsurancePending: 0,
        countInsuranceTotal: 0,
        countInsuranceReceived: 0,
        countInsurancePending: 0,
    });
    const [loadingInsurance, setLoadingInsurance] = useState(false);

    useEffect(() => {
        fetchDailyClosing(dateFilter);
        
        // Buscar dados de convênio para a data
        const fetchInsuranceData = async () => {
            setLoadingInsurance(true);
            try {
                const startDate = new Date(dateFilter);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(dateFilter);
                endDate.setHours(23, 59, 59, 999);
                
                const response = await getPaymentTotals({
                    period: 'custom',
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                });
                
                if (response.success && response.data?.totals) {
                    const totals = response.data.totals;
                    setInsuranceData({
                        totalInsuranceProduction: totals.totalInsuranceProduction || 0,
                        totalInsuranceReceived: totals.totalInsuranceReceived || 0,
                        totalInsurancePending: totals.totalInsurancePending || 0,
                        countInsuranceTotal: totals.countInsuranceTotal || 0,
                        countInsuranceReceived: totals.countInsuranceReceived || 0,
                        countInsurancePending: totals.countInsurancePending || 0,
                    });
                }
            } catch (e) {
                console.error('Erro ao buscar dados de convênio:', e);
            } finally {
                setLoadingInsurance(false);
            }
        };
        
        fetchInsuranceData();
    }, [dateFilter, fetchDailyClosing]);

    // 🎯 PROCESSAMENTO DE DADOS OTIMIZADO
    const processedData = useMemo(() => {
        if (!report) return null;

        // 🎯 AGORA USAMOS OS DADOS DIRETOS DO BACKEND
        const timeSlots = report.timeSlots || [];
        const professionals = report.professionals || [];
        const payments = report.timelines?.payments || [];
        const financial = report.financial || {};
        const summary = report.summary || {};

        return {
            timeSlots: timeSlots.sort((a: any, b: any) => a.time.localeCompare(b.time)),
            professionals: professionals.sort((a: any, b: any) => b.sessionCount - a.sessionCount),
            payments,
            financial,
            newAppointments: (report.timelines?.appointments || []).filter((a: any) => a.patientType === 'novo' && a.operationalStatus !== 'canceled'),
            // 🔥 NOVO: Separar por isFirstAppointment
            appointmentsByType: {
                novos: report.appointmentsByType?.novos || [],
                recorrentes: report.appointmentsByType?.recorrentes || [],
            },
            summary: {
                totalAppointments: summary.appointments?.total || 0,
                totalConfirmed: summary.appointments?.attended || 0, // 🔹 'attended' = confirmados
                totalCanceled: summary.appointments?.canceled || 0,
                totalRevenue: summary.appointments?.expectedValue || 0,
                totalPayments: payments.length,
                paymentRevenue: summary.payments?.totalReceived || 0,
                // 🔥 NOVO: Contadores de novos vs recorrentes
                novosCount: summary.appointments?.novos || 0,
                recorrentesCount: summary.appointments?.recorrentes || 0,
            }
        };
    }, [report]);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value || 0);

    // 🎯 HANDLERS
    const handleTimeSlotClick = (slot: TimeSlot) => {
        setSelectedTimeSlot(slot);
        setIsTimeSlotModalOpen(true);
    };

    const handleQuickAction = (action: string, slot?: TimeSlot) => {
        switch (action) {
            case 'send_reminders':
                // Lógica para enviar lembretes
                console.log('Enviando lembretes para:', slot?.appointments.length, 'pacientes');
                break;
            case 'export_schedule':
                // Lógica para exportar
                console.log('Exportando agenda do período');
                break;
            case 'view_conflicts':
                // Lógica para ver conflitos
                console.log('Analisando conflitos de agenda');
                break;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <div className="text-red-700 font-medium text-lg mb-2">
                    Erro ao carregar dados
                </div>
                <p className="text-gray-600">{error}</p>
            </div>
        );
    }

    if (!processedData) {
        return (
            <div className="w-full mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-6 text-center">
                    <div className="text-yellow-700 font-medium text-lg mb-2">
                        Nenhum dado encontrado
                    </div>
                    <p className="text-gray-600">
                        Não há agendamentos nem pagamentos registrados nesta data.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-8">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                        Painel Diário
                    </h1>
                    <p className="text-sm text-gray-600">
                        {dayjs(dateFilter).format('DD/MM/YYYY')} • {processedData.summary.totalAppointments} sessões
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                    <select
                        value={filters.professional}
                        onChange={(e) => setFilters(f => ({ ...f, professional: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                        <option value="all">Todos profissionais</option>
                        {(processedData?.professionals || []).map((p: any) => (
                            <option key={p.name} value={p.name}>{p.name}</option>
                        ))}
                    </select>
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                        <option value="all">Todos os status</option>
                        <option value="confirmed">Confirmado</option>
                        <option value="scheduled">Agendado</option>
                        <option value="canceled">Cancelado</option>
                        <option value="missed">Faltou</option>
                    </select>
                </div>
            </div>

            {/* ABAS DE NAVEGAÇÃO REFINADAS */}
            <div className="border-b border-gray-200 overflow-x-auto">
                <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
                    {[
                        { id: 'overview', name: 'Visão Geral', icon: BsCalendar3 },
                        { id: 'timeline', name: 'Timeline', icon: BsClock },
                        { id: 'professionals', name: 'Equipe', icon: BsPeople },
                        { id: 'financial', name: 'Financeiro', icon: FiDollarSign },
                        { id: 'analytics', name: 'Analytics', icon: FiTrendingUp }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>

            {/* CARDS DE RESUMO COM MÉTRICAS AVANÇADAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <SummaryCard
                    title="Sessões Confirmadas"
                    value={processedData.summary.totalConfirmed}
                    subtitle={`de ${processedData.summary.totalAppointments} total`}
                    icon={<BsCheckCircle className="text-green-500 text-lg" />}
                    trend="positive"
                    percentage={Math.round((processedData.summary.totalConfirmed / processedData.summary.totalAppointments) * 100)}
                />
                <SummaryCard
                    title="Receita Prevista"
                    value={formatCurrency(processedData.summary.totalRevenue)}
                    subtitle={report?.summary?.insurance?.production > 0 
                        ? `Particular: ${formatCurrency(processedData.summary.totalRevenue - (report.summary.insurance.production || 0))} + Convênio: ${formatCurrency(report.summary.insurance.production)}`
                        : "Valor total das sessões"}
                    icon={<FiDollarSign className="text-emerald-500 text-lg" />}
                    trend="positive"
                />
                <SummaryCard
                    title="Taxa de Comparecimento"
                    value={`${Math.round(
                        (processedData.summary.totalConfirmed / processedData.summary.totalAppointments) * 100
                    )}%`}
                    subtitle="Eficiência de agendamentos"
                    icon={<TbCalendarStats className="text-blue-500 text-lg" />}
                />
                <SummaryCard
                    title="Pagamentos Hoje"
                    value={processedData.summary.totalPayments}
                    subtitle={formatCurrency(processedData.summary.paymentRevenue)}
                    icon={<BsCashCoin className="text-purple-500 text-lg" />}
                />
            </div>

            {/* 🔥 NOVO: CARDS DE PACIENTES NOVOS VS RECORRENTES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Card de Pacientes Novos */}
                <div 
                    className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => setIsNovosModalOpen(true)}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-700">Pacientes Novos</p>
                            <p className="text-2xl font-bold text-green-900">
                                {processedData.summary.novosCount}
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                                Primeiro agendamento
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full">
                            <BsPeople className="text-green-600 text-xl" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center text-xs text-green-700">
                        <span className="font-medium">
                            {Math.round((processedData.summary.novosCount / processedData.summary.totalAppointments) * 100)}%
                        </span>
                        <span className="ml-1">do total de agendamentos</span>
                    </div>
                </div>

                {/* Card de Pacientes Recorrentes */}
                <div 
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => setIsRecorrentesModalOpen(true)}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-700">Pacientes Recorrentes</p>
                            <p className="text-2xl font-bold text-blue-900">
                                {processedData.summary.recorrentesCount}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                                Retornos e acompanhamentos
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full">
                            <BsPeople className="text-blue-600 text-xl" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center text-xs text-blue-700">
                        <span className="font-medium">
                            {Math.round((processedData.summary.recorrentesCount / processedData.summary.totalAppointments) * 100)}%
                        </span>
                        <span className="ml-1">do total de agendamentos</span>
                    </div>
                </div>
            </div>

            {/* CONTEÚDO DAS ABAS */}
            {activeTab === 'overview' && (
                <OverviewView
                    data={processedData}
                    formatCurrency={formatCurrency}
                    onTimeSlotClick={handleTimeSlotClick}
                    insuranceData={insuranceData}
                    loadingInsurance={loadingInsurance}
                    filters={filters}
                    dateFilter={dateFilter}
                />
            )}

            {activeTab === 'timeline' && (
                <TimelineView
                    timeSlots={processedData.timeSlots}
                    formatCurrency={formatCurrency}
                    onTimeSlotClick={handleTimeSlotClick}
                />
            )}

            {activeTab === 'professionals' && (
                <ProfessionalsView
                    professionals={processedData.professionals}
                    formatCurrency={formatCurrency}
                />
            )}

            {activeTab === 'financial' && (
                <FinancialView
                    financial={processedData.financial}
                    payments={processedData.payments}
                    formatCurrency={formatCurrency}
                />
            )}

            {activeTab === 'analytics' && (
                <AnalyticsView
                    data={processedData}
                    formatCurrency={formatCurrency}
                />
            )}

            {/* MODAL DE PACIENTES NOVOS */}
            {isNovosModalOpen && (
                <PatientsModal
                    isOpen={isNovosModalOpen}
                    onClose={() => setIsNovosModalOpen(false)}
                    title="Pacientes Novos"
                    subtitle="Primeiro agendamento no sistema"
                    appointments={processedData.appointmentsByType?.novos || []}
                    color="green"
                    dateFilter={dateFilter}
                />
            )}

            {/* MODAL DE PACIENTES RECORRENTES */}
            {isRecorrentesModalOpen && (
                <PatientsModal
                    isOpen={isRecorrentesModalOpen}
                    onClose={() => setIsRecorrentesModalOpen(false)}
                    title="Pacientes Recorrentes"
                    subtitle="Retornos e acompanhamentos"
                    appointments={processedData.appointmentsByType?.recorrentes || []}
                    color="blue"
                    dateFilter={dateFilter}
                />
            )}

            {/* MODAL DE TIMESLOT */}
            {isTimeSlotModalOpen && selectedTimeSlot && (
                <TimeSlotModal
                    slot={selectedTimeSlot}
                    isOpen={isTimeSlotModalOpen}
                    onClose={() => setIsTimeSlotModalOpen(false)}
                    onQuickAction={handleQuickAction}
                    formatCurrency={formatCurrency}
                />
            )}
        </div>
    );
};

// 🆕 Card de agendamentos criados no dia
const NewAppointmentsCard = ({ appointments }: { appointments: any[] }) => {
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => appointments.length > 0 && setModalOpen(true)}
                className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col text-left hover:border-blue-300 hover:shadow-md transition-all w-full"
            >
                <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-gray-900">Agendamentos do Dia</span>
                    <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${appointments.length > 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {appointments.length}
                    </span>
                </div>
                <div className="space-y-1 mt-1">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Agendados:</span>
                        <span className="font-medium text-blue-600">{appointments.filter((a: any) => a.operationalStatus === 'scheduled').length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Pré-agendados:</span>
                        <span className="font-medium text-yellow-600">{appointments.filter((a: any) => a.operationalStatus === 'pre_agendado').length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Novos pacientes:</span>
                        <span className="font-medium text-emerald-600">{appointments.filter((a: any) => a.patientType === 'novo').length}</span>
                    </div>
                </div>
                {appointments.length > 0 && (
                    <p className="text-xs text-blue-500 mt-3 text-center">Clique para ver lista</p>
                )}
            </button>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-gray-800 text-lg">Agendamentos do Dia ({appointments.length})</h4>
                            <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
                        </div>
                        <div className="overflow-y-auto space-y-2">
                            {appointments.map((appt: any) => (
                                <div key={appt.id} className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold text-gray-800 text-sm">{appt.patient}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            appt.operationalStatus === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                            appt.operationalStatus === 'pre_agendado' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                            {appt.operationalStatus === 'scheduled' ? 'Agendado' :
                                             appt.operationalStatus === 'pre_agendado' ? 'Pré-agendado' :
                                             appt.operationalStatus}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {appt.phone || 'Sem telefone'} · {appt.date}{appt.time ? ` às ${appt.time}` : ''}
                                    </p>
                                    {appt.doctor && appt.doctor !== 'Não informado' && (
                                        <p className="text-xs text-gray-400 mt-0.5">{appt.doctor}</p>
                                    )}
                                    {appt.service && appt.service !== 'package_session' && (
                                        <p className="text-xs text-gray-400 mt-0.5">{appt.service}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// 🎨 COMPONENTE DE VISÃO GERAL
const OverviewView = ({ data, formatCurrency, onTimeSlotClick, insuranceData, loadingInsurance, filters, dateFilter }: any) => {
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

    // ==========================================================
    // 🔹 Agrupar horários em períodos do dia
    // ==========================================================
    const timePeriods = useMemo(() => {
        const periods = {
            manha: { start: '07:00', end: '12:00', slots: [] as any[], label: 'Manhã' },
            tarde: { start: '12:00', end: '19:00', slots: [] as any[], label: 'Tarde' },
        };

        data.timeSlots.forEach((slot: any) => {
            const hour = parseInt(slot.time.split(':')[0]);
            if (hour >= 7 && hour < 12) periods.manha.slots.push(slot);
            else if (hour >= 12 && hour < 19) periods.tarde.slots.push(slot);
        });

        return periods;
    }, [data.timeSlots]);

    // ==========================================================
    // 🔹 Filtro dinâmico baseado no período selecionado
    // ==========================================================
    const filteredSlots = useMemo(() => {
        if (!selectedPeriod) return data.timeSlots;
        if (selectedPeriod === 'manha') return timePeriods.manha.slots;
        if (selectedPeriod === 'tarde') return timePeriods.tarde.slots;
        return data.timeSlots;
    }, [selectedPeriod, data.timeSlots, timePeriods]);

    // ==========================================================
    // 🔹 Render
    // ==========================================================
    return (
        <div className="space-y-6">
            {/* VISÃO FINANCEIRA DO DIA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo Financeiro 💚</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* RECEBIDO HOJE */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-green-50 border border-green-100">
                        <span className="text-sm font-medium text-green-700">Recebido do Dia</span>
                        <span className="text-2xl font-bold text-green-700 mt-1">
                            {formatCurrency(data.financial?.totalReceived || 0)}
                        </span>
                    </div>

                    {/* A RECEBER */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-yellow-50 border border-yellow-100">
                        <span className="text-sm font-medium text-yellow-700">A Receber</span>
                        <span className="text-2xl font-bold text-yellow-700 mt-1">
                            {formatCurrency(data.financial?.totalRevenue || 0)}
                        </span>
                    </div>

                    {/* TOTAL PREVISTO */}
                    <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-blue-50 border border-blue-100">
                        <span className="text-sm font-medium text-blue-700">Total Previsto</span>
                        <span className="text-2xl font-bold text-blue-700 mt-1">
                            {formatCurrency(data.financial?.totalExpected || 0)}
                        </span>
                    </div>
                </div>

                {/* CARDS DE CONVÊNIOS - Usa dados do daily-closing ou fallback para /totals */}
                {((data.summary?.insurance?.production > 0) || insuranceData.totalInsuranceProduction > 0 || loadingInsurance) && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-500 mb-4">🏥 Convênios</h4>
                        
                        {/* NOVO: Dados do daily-closing */}
                        {data.summary?.insurance?.production > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
                                {/* PRODUÇÃO CONVÊNIOS */}
                                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-cyan-50 border border-cyan-100">
                                    <span className="text-sm font-medium text-cyan-700">Produção</span>
                                    <span className="text-xl font-bold text-cyan-700 mt-1">
                                        {formatCurrency(data.summary.insurance.production)}
                                    </span>
                                    <span className="text-xs text-cyan-600 mt-1">
                                        {data.summary.insurance.sessionsCount} atendimentos
                                    </span>
                                </div>

                                {/* RECEBIDOS */}
                                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                                    <span className="text-sm font-medium text-emerald-700">Recebidos</span>
                                    <span className="text-xl font-bold text-emerald-700 mt-1">
                                        {formatCurrency(data.summary.insurance.received)}
                                    </span>
                                    <span className="text-xs text-emerald-600 mt-1">
                                        no caixa
                                    </span>
                                </div>

                                {/* A RECEBER */}
                                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-violet-50 border border-violet-100">
                                    <span className="text-sm font-medium text-violet-700">A Receber</span>
                                    <span className="text-xl font-bold text-violet-700 mt-1">
                                        {formatCurrency(data.summary.insurance.pending)}
                                    </span>
                                    <span className="text-xs text-violet-600 mt-1">
                                        do convênio
                                    </span>
                                </div>

                                {/* GRAND TOTAL */}
                                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                                    <span className="text-sm font-medium text-blue-700">Total Geral</span>
                                    <span className="text-xl font-bold text-blue-700 mt-1">
                                        {formatCurrency(data.financial?.grandTotal || 0)}
                                    </span>
                                    <span className="text-xs text-blue-600 mt-1">
                                        caixa + convênio
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Fallback: Dados do /totals quando daily-closing não tem */}
                        {!data.summary?.insurance?.production && insuranceData.totalInsuranceProduction > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-cyan-50 border border-cyan-100">
                                    <span className="text-sm font-medium text-cyan-700">Produção</span>
                                    <span className="text-xl font-bold text-cyan-700 mt-1">
                                        {formatCurrency(insuranceData.totalInsuranceProduction)}
                                    </span>
                                    <span className="text-xs text-cyan-600 mt-1">
                                        {insuranceData.countInsuranceTotal} atendimentos
                                    </span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                                    <span className="text-sm font-medium text-emerald-700">Recebidos</span>
                                    <span className="text-xl font-bold text-emerald-700 mt-1">
                                        {formatCurrency(insuranceData.totalInsuranceReceived)}
                                    </span>
                                    <span className="text-xs text-emerald-600 mt-1">
                                        {insuranceData.countInsuranceReceived} recebidos
                                    </span>
                                </div>
                                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-violet-50 border border-violet-100">
                                    <span className="text-sm font-medium text-violet-700">A Receber</span>
                                    <span className="text-xl font-bold text-violet-700 mt-1">
                                        {formatCurrency(insuranceData.totalInsurancePending)}
                                    </span>
                                    <span className="text-xs text-violet-600 mt-1">
                                        {insuranceData.countInsurancePending} pendentes
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Lista de providers */}
                        {data.summary?.insurance?.byProvider && data.summary.insurance.byProvider.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <h5 className="text-xs font-medium text-gray-400 mb-2">Por Convênio:</h5>
                                <div className="flex flex-wrap gap-2">
                                    {data.summary.insurance.byProvider.map((provider: any) => (
                                        <div key={provider.provider} className="px-3 py-1 bg-cyan-50 border border-cyan-100 rounded-full text-sm">
                                            <span className="font-medium text-cyan-700">{provider.provider}</span>
                                            <span className="text-cyan-600 ml-2">{formatCurrency(provider.value)}</span>
                                            <span className="text-cyan-500 text-xs ml-1">({provider.sessions})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* PERÍODOS DO DIA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(timePeriods).map(([key, period]: [string, any]) => (
                    <TimePeriodCard
                        key={key}
                        period={period}
                        isSelected={selectedPeriod === key}
                        onSelect={() => setSelectedPeriod(selectedPeriod === key ? null : key)}
                        onTimeSlotClick={onTimeSlotClick}
                        formatCurrency={formatCurrency}
                    />
                ))}
                <NewAppointmentsCard appointments={data.newAppointments || []} />
            </div>

            {/* GRADE DE HORÁRIOS RÁPIDOS */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900">Horários do Dia</h3>
                    <div className="text-sm text-gray-500">
                        {filteredSlots.length} horários exibidos
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {filteredSlots.slice(0, 12).map((slot: any) => (
                        <TimeSlotCard
                            key={slot.time}
                            slot={slot}
                            onClick={() => onTimeSlotClick(slot)}
                            formatCurrency={formatCurrency}
                        />
                    ))}
                </div>
                {filteredSlots.length > 12 && (
                    <div className="text-center pt-4">
                        <span className="text-sm text-gray-500">
                            +{filteredSlots.length - 12} horários
                        </span>
                    </div>
                )}
            </div>

            {/* PRÉ-AGENDAMENTOS DO DIA */}
            <PreAgendamentosCard
                date={dateFilter}
                formatCurrency={formatCurrency}
            />

            {/* VISÃO RÁPIDA DOS PROFISSIONAIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {data.professionals.slice(0, 4).map((professional: any) => (
                    <ProfessionalQuickCard
                        key={professional.name}
                        professional={professional}
                        formatCurrency={formatCurrency}
                    />
                ))}
            </div>
        </div>
    );
};


// 🎨 CARD DE PRÉ-AGENDAMENTOS DO DIA
const urgencyBadge: Record<string, string> = {
    critica: 'bg-red-100 text-red-700',
    alta:    'bg-orange-100 text-orange-700',
    media:   'bg-yellow-100 text-yellow-700',
    baixa:   'bg-green-100 text-green-700',
};

const PreAgendamentosCard = ({ date, formatCurrency }: { date: string; formatCurrency: (v: number) => string }) => {
    const [expanded, setExpanded] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!date) return;
        setLoading(true);
        api.get(`/pre-agendamento?from=${date}&to=${date}&limit=50`)
            .then(r => setItems(r.data?.data || []))
            .catch(() => setItems([]))
            .finally(() => setLoading(false));
    }, [date]);

    if (!loading && items.length === 0) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200">
            <button
                className="w-full flex items-center justify-between p-5 text-left hover:bg-amber-50 transition-colors rounded-xl"
                onClick={() => setExpanded(v => !v)}
            >
                <div className="flex items-center gap-3">
                    <BsClockHistory className="text-amber-500 w-5 h-5" />
                    <div>
                        <h3 className="font-semibold text-gray-900">Pré-agendamentos do Dia</h3>
                        <p className="text-sm text-gray-500">
                            {loading ? 'Carregando...' : `${items.length} aguardando confirmação`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {items.length > 0 && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
                            {items.length}
                        </span>
                    )}
                    <BsArrowRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
                </div>
            </button>

            {expanded && (
                <div className="border-t border-amber-100 p-5 space-y-2 max-h-80 overflow-y-auto">
                    {items.map((pre: any) => (
                        <div
                            key={pre._id}
                            className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-500 w-12 shrink-0">
                                    {pre.time || pre.preferredTime || '—'}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">
                                        {pre.patientInfo?.fullName || '—'}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {pre.professionalName || pre.doctor?.fullName || '—'} · {pre.specialty}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-3 shrink-0">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${urgencyBadge[pre.urgency] || 'bg-gray-100 text-gray-600'}`}>
                                    {pre.urgency || '—'}
                                </span>
                                <span className="text-sm font-semibold text-gray-700">
                                    {formatCurrency(pre.sessionValue ?? pre.suggestedValue ?? 0)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// 🎨 CARD DE PERÍODO DO DIA
const TimePeriodCard = ({ period, isSelected, onSelect, onTimeSlotClick, formatCurrency }: any) => {
    const stats = useMemo(() => {
        const allAppointments = period.slots.flatMap((slot: any) => slot.appointments);
        return {
            total: allAppointments.length,
            confirmed: allAppointments.filter((a: any) => a.operationalStatus === 'confirmed').length,
            revenue: allAppointments.reduce((sum: number, a: any) => sum + (a.sessionValue || 0), 0),
            professionals: [...new Set(allAppointments.map((a: any) => a.doctor))].length
        };
    }, [period.slots]);

    return (
        <div
            className={`bg-white rounded-2xl shadow-sm border-2 p-6 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] ${isSelected
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-blue-300 hover:shadow'
                }`}
            onClick={onSelect}
        >
            <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-gray-900 text-lg">{period.label}</h3>
                <div className="text-2xl font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                    {stats.total}
                </div>
            </div>

            <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600 flex items-center gap-2">
                        <BsCheckCircle className="text-green-500 w-4 h-4" />
                        Confirmadas:
                    </span>
                    <span className="font-semibold text-green-600">{stats.confirmed}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600 flex items-center gap-2">
                        <FiDollarSign className="text-emerald-500 w-4 h-4" />
                        Receita:
                    </span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(stats.revenue)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600 flex items-center gap-2">
                        <BsPeople className="text-blue-500 w-4 h-4" />
                        Profissionais:
                    </span>
                    <span className="font-semibold">{stats.professionals}</span>
                </div>
            </div>

            {isSelected && period.slots.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap gap-2">
                        {period.slots.slice(0, 6).map((slot: any) => (
                            <button
                                key={slot.time}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTimeSlotClick(slot);
                                }}
                                className="px-3 py-2 bg-white border border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded-lg text-sm text-gray-700 transition-all duration-200 hover:text-blue-700 hover:shadow-sm"
                            >
                                {slot.time}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// 🎨 CARD DE TIMESLOT COMPACTO
const TimeSlotCard = ({ slot, onClick, formatCurrency }: any) => {
    const hasAlerts = slot.alerts && Object.values(slot.alerts).some((alert: any) => alert);
console.log('sssssssssslot', slot)
    // Determinar a cor baseada no status predominante das sessões
    const getCardStyle = () => {
        const total = slot.count;
        const confirmed = slot.stats.confirmed;
        const canceled = slot.stats.canceled;
        const scheduled = slot.stats.scheduled;

        // Se mais de 50% estão cancelados - VERMELHO
        if (canceled > total * 0.5) {
            return {
                background: 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
                hover: 'hover:from-gray-100 hover:to-gray-200',
                text: 'text-gray-900',
                accent: 'from-gray-400 to-gray-500',
                status: 'Cancelado'
            };
        }

        // Se todos estão confirmados - VERDE
        if (confirmed === total && total > 0) {
            return {
                background: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
                hover: 'hover:from-green-100 hover:to-green-200',
                text: 'text-green-900',
                accent: 'from-green-400 to-green-500',
                status: 'Confirmado'
            };
        }

        // Se maioria confirmada (>70%) - AZUL (estável)
        if (confirmed >= total * 0.7) {
            return {
                background: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
                hover: 'hover:from-blue-100 hover:to-blue-200',
                text: 'text-blue-900',
                accent: 'from-blue-400 to-blue-500',
                status: 'Estável'
            };
        }

        // Se muitos agendamentos pendentes - AMARELO
        if (scheduled > confirmed) {
            return {
                background: 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200',
                hover: 'hover:from-yellow-100 hover:to-yellow-200',
                text: 'text-yellow-900',
                accent: 'from-yellow-400 to-yellow-500',
                status: 'Agendado'
            };
        }

        // Alertas específicos - LARANJA
        if (hasAlerts) {
            return {
                background: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200',
                hover: 'hover:from-orange-100 hover:to-orange-200',
                text: 'text-orange-900',
                accent: 'from-orange-400 to-orange-500',
                status: 'atenção'
            };
        }

        // Padrão - CINZA (neutro)
        return {
            background: 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
            hover: 'hover:from-gray-100 hover:to-gray-200',
            text: 'text-gray-900',
            accent: 'from-gray-400 to-gray-500',
            status: 'agendado'
        };
    };

    const cardStyle = getCardStyle();

    return (
        <button
            onClick={onClick}
            className={`w-full rounded-xl p-4 text-left transition-all duration-300 group transform hover:-translate-y-1 hover:shadow-xl border ${cardStyle.background} ${cardStyle.hover} ${cardStyle.text} relative overflow-hidden`}
        >
            {/* Barra superior colorida indicando status */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${cardStyle.accent}`} />

            {/* Header com horário e badge de status */}
            <div className="flex justify-between items-start mb-3 pt-1">
                <div className="font-bold text-sm">
                    {slot.time}
                </div>
                <div className={`text-xs px-2 py-1 rounded-full bg-white bg-opacity-70 backdrop-blur-sm ${cardStyle.text} font-medium`}>
                    {cardStyle.status}
                </div>
            </div>

            {/* Conteúdo principal */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-xs opacity-80">
                        {slot.count} sessão{slot.count !== 1 ? 's' : ''}
                    </span>
                    <span className="font-semibold text-sm">
                        {formatCurrency(slot.stats.revenue)}
                    </span>
                </div>

                {/* Status badges com cores condizentes */}
                <div className="flex gap-1 justify-center pt-1">
                    {slot.stats.confirmed > 0 && (
                        <div className="flex items-center gap-1 bg-white bg-opacity-60 px-2 py-1 rounded-full backdrop-blur-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-xs font-medium">{slot.stats.confirmed}</span>
                        </div>
                    )}
                    {slot.stats.scheduled > 0 && (
                        <div className="flex items-center gap-1 bg-white bg-opacity-60 px-2 py-1 rounded-full backdrop-blur-sm">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                            <span className="text-xs font-medium">{slot.stats.scheduled}</span>
                        </div>
                    )}
                    {slot.stats.canceled > 0 && (
                        <div className="flex items-center gap-1 bg-white bg-opacity-60 px-2 py-1 rounded-full backdrop-blur-sm">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            <span className="text-xs font-medium">{slot.stats.canceled}</span>
                        </div>
                    )}
                </div>

                {/* Taxa de confirmação sutil */}
                {slot.stats.confirmationRate > 0 && (
                    <div className="text-center pt-1">
                        <div className="text-xs opacity-70">
                            {Math.round(slot.stats.confirmationRate)}% confirmação
                        </div>
                    </div>
                )}
            </div>
        </button>
    );
};

// 🎨 COMPONENTES RESTANTES (ProfessionalQuickCard, TimelineView, ProfessionalsView, etc.)
// [Estes seriam implementados de forma similar com a mesma qualidade...]

// 🎨 MODAL DE TIMESLOT (EXEMPLO DE IMPLEMENTAÇÃO)
const TimeSlotModal = ({ slot, isOpen, onClose, onQuickAction, formatCurrency }: any) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            {slot.time} • {slot.count} sessões
                        </h2>
                        <p className="text-gray-600">
                            Período detalhado - {formatCurrency(slot.stats.revenue)} previstos
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                        ×
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Conteúdo do modal rico */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <h3 className="font-semibold text-gray-900 mb-4">Sessões do Período</h3>
                            <div className="space-y-3">
                                {slot.appointments.map((appointment: any) => (
                                    <AppointmentCard
                                        key={appointment.id}
                                        appointment={appointment}
                                        formatCurrency={formatCurrency}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Estatísticas rápidas */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 mb-3">Resumo do Período</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Taxa de Confirmação:</span>
                                        <span className="font-medium">{Math.round(slot.stats.confirmationRate)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Ocupação:</span>
                                        <span className="font-medium">{Math.round(slot.stats.occupancy)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Profissionais:</span>
                                        <span className="font-medium">{slot.stats.professionals.length}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Ações rápidas */}
                            <div className="space-y-2">
                                <button
                                    onClick={() => onQuickAction('send_reminders', slot)}
                                    className="w-full flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    <MdOutlineEmail className="w-4 h-4" />
                                    Enviar Lembretes
                                </button>
                                <button
                                    onClick={() => onQuickAction('export_schedule')}
                                    className="w-full flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    <MdOutlineFileDownload className="w-4 h-4" />
                                    Exportar Agenda
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 🎨 CARD DE APPOINTMENT PARA MODAL
const AppointmentCard = ({ appointment, formatCurrency }: any) => {
    const getStatusConfig = (status: string) => {
        const configs: any = {
            confirmed: { color: 'bg-green-100 text-green-800 border-green-200', icon: BsCheckCircle },
            canceled: { color: 'bg-red-100 text-red-800 border-red-200', icon: BsXCircle },
            scheduled: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: BsClockHistory }
        };
        return configs[status] || configs.scheduled;
    };

    const statusConfig = getStatusConfig(appointment.operationalStatus);
    const Icon = statusConfig.icon;

    return (
        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-4 flex-1">
                <div className={`p-2 rounded-lg ${statusConfig.color}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{appointment.patient}</h4>
                    <p className="text-sm text-gray-600">
                        {appointment.doctor} • {appointment.service}
                    </p>
                </div>
            </div>
            <div className="text-right">
                <div className="font-semibold text-gray-900">{formatCurrency(appointment.sessionValue)}</div>
                <div className="text-sm text-gray-500">{appointment.time}</div>
            </div>
        </div>
    );
};

// 🎨 TIMELINE VIEW - Visão vertical completa da timeline
const TimelineView = ({ timeSlots, formatCurrency, onTimeSlotClick }: any) => {
    const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());

    const toggleSlot = (time: string) => {
        const newExpanded = new Set(expandedSlots);
        if (newExpanded.has(time)) {
            newExpanded.delete(time);
        } else {
            newExpanded.add(time);
        }
        setExpandedSlots(newExpanded);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Timeline Completa do Dia</h2>
                        <p className="text-gray-600">
                            {timeSlots.length} horários • {timeSlots.reduce((sum: number, slot: any) => sum + slot.count, 0)} sessões
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium">
                            Expandir Todos
                        </button>
                        <button className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                            Recolher Todos
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="relative">
                    {/* Linha vertical da timeline */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                    <div className="space-y-6">
                        {timeSlots.map((slot: any, index: number) => (
                            <TimelineSlot
                                key={slot.time}
                                slot={slot}
                                isExpanded={expandedSlots.has(slot.time)}
                                onToggle={() => toggleSlot(slot.time)}
                                onClick={() => onTimeSlotClick(slot)}
                                formatCurrency={formatCurrency}
                                isFirst={index === 0}
                                isLast={index === timeSlots.length - 1}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// 🎨 SLOT INDIVIDUAL DA TIMELINE
const TimelineSlot = ({ slot, isExpanded, onToggle, onClick, formatCurrency, isFirst, isLast }: any) => {
    // 🐛 DEBUG: Log do slot completo
    console.log('[TimelineSlot] Renderizando slot:', {
        time: slot.time,
        count: slot.count,
        appointmentsCount: slot.appointments?.length,
        appointments: slot.appointments?.map((a: any) => ({
            id: a.id,
            patient: a.patient,
            doctor: a.doctor,
            service: a.service,
            sessionValue: a.sessionValue,
            isPackage: a.isPackage,
            isConvenio: a.isConvenio,
            insuranceValue: a.insuranceValue
        }))
    });

    // Calcular cor da ocupação baseada no percentual
    const getOccupancyColor = (occupancy: number) => {
        if (occupancy >= 80) return 'bg-red-500';
        if (occupancy >= 50) return 'bg-amber-500';
        if (occupancy >= 30) return 'bg-blue-500';
        return 'bg-green-500';
    };
    
    const occupancyColor = getOccupancyColor(slot.stats.occupancy);

    return (
        <div className="relative flex gap-6 group">
            {/* Marcador do horário - mais elegante */}
            <div className={`flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center z-10 shadow-lg ${isFirst ? 'mt-1' : isLast ? 'mb-1' : ''}`}>
                <span className="text-white text-sm font-bold">{slot.time}</span>
            </div>

            {/* Conteúdo - card mais refinado */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md">
                <div className="p-5">
                    {/* Header do slot */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <h3 className="font-bold text-gray-900 text-lg">{slot.time}</h3>
                            <div className="flex gap-2 flex-wrap">
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                                    {slot.count} sessões
                                </span>
                                {/* 🆕 Badge de Ocupação */}
                                <span className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center gap-1 ${occupancyColor.replace('bg-', 'bg-opacity-10 bg-').replace('500', '100')} ${occupancyColor.replace('bg-', 'text-').replace('500', '700')} border-current`}>
                                    <div className={`w-2 h-2 rounded-full ${occupancyColor}`} />
                                    {slot.stats.occupancy}% ocupado
                                </span>
                                {slot.alerts?.lowConfirmation && (
                                    <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium border border-amber-200 flex items-center gap-1">
                                        <BsExclamationTriangle className="w-3 h-3" />
                                        Baixa confirmação
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="font-bold text-emerald-600 text-lg">
                                {formatCurrency(slot.stats.revenue)}
                            </span>
                            <button
                                onClick={onToggle}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                            >
                                <BsArrowRight className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* 🆕 Barra de progresso da ocupação */}
                    <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Ocupação do horário</span>
                            <span>{slot.stats.occupancy}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${occupancyColor} transition-all duration-500`}
                                style={{ width: `${Math.min(100, slot.stats.occupancy)}%` }}
                            />
                        </div>
                    </div>

                    {/* Estatísticas rápidas - mais visuais */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 text-sm">
                        <div className="text-center p-2 bg-green-50 rounded-lg">
                            <div className="text-green-600 font-bold text-lg">{slot.stats.confirmed}</div>
                            <div className="text-gray-500 text-xs uppercase tracking-wide">Confirmadas</div>
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded-lg">
                            <div className="text-blue-600 font-bold text-lg">{slot.stats.scheduled}</div>
                            <div className="text-gray-500 text-xs uppercase tracking-wide">Agendadas</div>
                        </div>
                        <div className="text-center p-2 bg-red-50 rounded-lg">
                            <div className="text-red-600 font-bold text-lg">{slot.stats.canceled}</div>
                            <div className="text-gray-500 text-xs uppercase tracking-wide">Canceladas</div>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded-lg">
                            <div className="text-purple-600 font-bold text-lg">
                                {Math.round(slot.stats.confirmationRate)}%
                            </div>
                            <div className="text-gray-500 text-xs uppercase tracking-wide">Taxa Conf.</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded-lg">
                            <div className="text-gray-600 font-bold text-lg">
                                {slot.stats.professionals?.length || 0}
                            </div>
                            <div className="text-gray-500 text-xs uppercase tracking-wide">Profissionais</div>
                        </div>
                    </div>

                    {/* Sessões expandidas */}
                    {isExpanded && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            {/* 🆕 Header mostrando múltiplos profissionais */}
                            {slot.stats.professionals?.length > 1 && (
                                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <p className="text-sm text-blue-700">
                                        <strong>{slot.stats.professionals.length} profissionais</strong> neste horário: {slot.stats.professionals.join(', ')}
                                    </p>
                                </div>
                            )}
                            <div className="space-y-3">
                                {slot.appointments.map((appointment: any, index: number) => {
                                    console.log(`[TimelineSlot] Renderizando appointment ${index + 1}/${slot.appointments.length}:`, appointment.patient, appointment.service);
                                    return (
                                        <TimelineAppointmentItem
                                            key={appointment.id}
                                            appointment={appointment}
                                            formatCurrency={formatCurrency}
                                            onClick={onClick}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
// 🎨 ITEM DE APPOINTMENT NA TIMELINE
const TimelineAppointmentItem = ({ appointment, formatCurrency, onClick }: any) => {
    // Debug log
    console.log('[TimelineAppointmentItem] appointment:', {
        id: appointment.id,
        patient: appointment.patient,
        sessionValue: appointment.sessionValue,
        isPackage: appointment.isPackage,
        isConvenio: appointment.isConvenio,
        insuranceProvider: appointment.insuranceProvider,
        insuranceValue: appointment.insuranceValue,
        service: appointment.service
    });

    const getStatusConfig = (status: string) => {
        const configs: any = {
            confirmed: {
                color: 'bg-green-50 text-green-700 border-green-200',
                icon: BsCheckCircle,
                bgColor: 'bg-green-500'
            },
            canceled: {
                color: 'bg-red-50 text-red-700 border-red-200',
                icon: BsXCircle,
                bgColor: 'bg-red-500'
            },
            scheduled: {
                color: 'bg-blue-50 text-blue-700 border-blue-200',
                icon: BsClockHistory,
                bgColor: 'bg-blue-500'
            }
        };
        return configs[status] || configs.scheduled;
    };

    // Determinar o tipo de sessão e configurações visuais
    const getSessionTypeConfig = () => {
        if (appointment.isConvenio) {
            return {
                label: 'Convênio',
                badgeColor: 'bg-cyan-100 text-cyan-700 border-cyan-200',
                icon: '🏥',
                value: appointment.insuranceValue || appointment.sessionValue || 0
            };
        }
        if (appointment.isPackage) {
            return {
                label: 'Pacote',
                badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
                icon: '📦',
                value: appointment.sessionValue || 0
            };
        }
        return {
            label: 'Individual',
            badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
            icon: '📋',
            value: appointment.sessionValue || 0
        };
    };

    const statusConfig = getStatusConfig(appointment.operationalStatus);
    const sessionType = getSessionTypeConfig();
    const Icon = statusConfig.icon;

    return (
        <div
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md cursor-pointer transition-all duration-200 group hover:border-gray-300"
            onClick={onClick}
        >
            <div className="flex items-center gap-4 flex-1">
                <div className={`p-2 rounded-lg ${statusConfig.color} border`}>
                    <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    {/* Linha 1: Paciente + Badge do tipo */}
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {appointment.patient}
                        </h4>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${sessionType.badgeColor}`}>
                            {sessionType.icon} {sessionType.label}
                        </span>
                    </div>
                    
                    {/* Linha 2: Profissional + Serviço */}
                    <p className="text-sm text-gray-600 truncate">
                        <span className="font-medium">{appointment.doctor}</span>
                        <span className="text-gray-400 mx-1">•</span>
                        <span className="text-gray-500">{appointment.service?.replace(/_/g, ' ') || 'Sessão'}</span>
                    </p>
                    
                    {/* Linha 3: Info adicional (convênio ou método de pagamento) */}
                    {appointment.isConvenio ? (
                        appointment.insuranceProvider && (
                            <p className="text-xs text-cyan-600 mt-1 font-medium">
                                🏥 {appointment.insuranceProvider}
                            </p>
                        )
                    ) : (
                        appointment.paymentMethod && (
                            <p className="text-xs text-gray-500 mt-1">
                                {appointment.paymentMethod === 'pix' && '💳 PIX'}
                                {appointment.paymentMethod === 'dinheiro' && '💵 Dinheiro'}
                                {appointment.paymentMethod === 'credit_card' && '💳 Cartão Crédito'}
                                {appointment.paymentMethod === 'debit_card' && '💳 Cartão Débito'}
                                {appointment.paymentMethod === 'cartão' && '💳 Cartão'}
                            </p>
                        )
                    )}
                </div>
            </div>
            
            {/* Coluna da direita: Valor + Status de pagamento */}
            <div className="text-right ml-4">
                <div className={`font-bold text-lg ${sessionType.value > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                    {formatCurrency(sessionType.value)}
                </div>
                <div className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${
                    appointment.paidStatus === 'Pago no dia' ? 'bg-green-100 text-green-700' :
                    appointment.paidStatus === 'Pago antes' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                }`}>
                    {appointment.paidStatus || 'Pendente'}
                </div>
            </div>
        </div>
    );
};

// 🎨 PROFESSIONALS VIEW - Visão detalhada por profissional
const ProfessionalsView = ({ professionals, formatCurrency }: any) => {
    const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);

    const selectedProf = selectedProfessional
        ? professionals.find((p: any) => p.name === selectedProfessional)
        : null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Lista de Profissionais */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Equipe</h3>
                    <div className="space-y-2">
                        {professionals.map((professional: any) => (
                            <ProfessionalListItem
                                key={professional.name}
                                professional={professional}
                                isSelected={selectedProfessional === professional.name}
                                onSelect={() => setSelectedProfessional(
                                    selectedProfessional === professional.name ? null : professional.name
                                )}
                                formatCurrency={formatCurrency}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Detalhes do Profissional Selecionado */}
            <div className="lg:col-span-3">
                {selectedProf ? (
                    <ProfessionalDetailView
                        professional={selectedProf}
                        formatCurrency={formatCurrency}
                    />
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                        <BsPeople className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="font-semibold text-gray-900 mb-2">Selecione um profissional</h3>
                        <p className="text-gray-600">
                            Clique em um profissional para ver detalhes completos
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// 🎨 ITEM DA LISTA DE PROFISSIONAIS
const ProfessionalListItem = ({ professional, isSelected, onSelect, formatCurrency }: any) => {
    return (
        <button
            onClick={onSelect}
            className={`w-full text-left p-3 rounded-lg border transition-all ${isSelected
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900">{professional.name}</h4>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    {professional.sessionCount}
                </span>
            </div>

            <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-600">Eficiência:</span>
                    <span className="font-medium text-green-600">{Math.round(professional.efficiency)}%</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Receita:</span>
                    <span className="font-medium text-emerald-600">
                        {formatCurrency(professional.totalValue)}
                    </span>
                </div>
            </div>
        </button>
    );
};

// 🎨 VISAO DETALHADA DO PROFISSIONAL
const ProfessionalDetailView = ({ professional, formatCurrency }: any) => {
    const stats = useMemo(() => {
        const statusCounts = professional.appointments.reduce((counts: any, appointment: any) => {
            counts[appointment.operationalStatus] = (counts[appointment.operationalStatus] || 0) + 1;
            return counts;
        }, {});

        const services = professional.appointments.reduce((services: any, appointment: any) => {
            const service = appointment.service || 'Não informado';
            services[service] = (services[service] || 0) + 1;
            return services;
        }, {});

        return { statusCounts, services };
    }, [professional.appointments]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">{professional.name}</h2>
                        <p className="text-gray-600">
                            {professional.sessionCount} sessões • {Math.round(professional.efficiency)}% eficiência
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-emerald-600">
                            {formatCurrency(professional.totalValue)}
                        </div>
                        <div className="text-sm text-gray-600">Receita total</div>
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <StatCard
                        title="Sessões Confirmadas"
                        value={professional.confirmed}
                        color="green"
                        subtitle={`${Math.round((professional.confirmed / professional.sessionCount) * 100)}% do total`}
                    />
                    <StatCard
                        title="Sessões Canceladas"
                        value={professional.canceled}
                        color="red"
                        subtitle={`${Math.round((professional.canceled / professional.sessionCount) * 100)}% do total`}
                    />
                    <StatCard
                        title="Ticket Médio"
                        value={formatCurrency(
                            professional.confirmed > 0 ? professional.totalValue / professional.confirmed : 0
                        )}
                        color="blue"
                        subtitle="Por sessão confirmada"
                    />
                </div>

                {/* Lista de Sessões */}
                <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Sessões do Dia</h3>
                    <div className="space-y-2">
                        {professional.appointments.map((appointment: any) => (
                            <ProfessionalAppointmentItem
                                key={appointment.id}
                                appointment={appointment}
                                formatCurrency={formatCurrency}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// 🎨 FINANCIAL VIEW - Visão financeira detalhada
const FinancialView = ({ financial, payments, formatCurrency }: any) => {
    const paymentMethods = financial?.paymentMethods || {};
    const totalReceived = financial?.totalReceived || 0;
    const totalExpected = financial?.totalExpected || 0;
    
    // 📦 Dados de pacotes
    const packages = financial?.packages || { total: 0, details: [] };
    const hasPackages = packages.total > 0;

    return (
        <div className="space-y-6">
            {/* 📦 CARDS DE PACOTES */}
            {hasPackages && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            📦 Pacotes Vendidos
                        </h3>
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                            {packages.details.length} pacotes
                        </span>
                    </div>
                    
                    {/* Total de pacotes */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div className="flex flex-col items-center p-4 rounded-lg bg-purple-50 border border-purple-100">
                            <span className="text-sm font-medium text-purple-700">Total Vendido</span>
                            <span className="text-2xl font-bold text-purple-700">
                                {formatCurrency(packages.total)}
                            </span>
                        </div>
                        <div className="flex flex-col items-center p-4 rounded-lg bg-blue-50 border border-blue-100">
                            <span className="text-sm font-medium text-blue-700">Total de Sessões</span>
                            <span className="text-2xl font-bold text-blue-700">
                                {packages.details.reduce((sum: number, p: any) => sum + (p.sessions || 0), 0)}
                            </span>
                        </div>
                        <div className="flex flex-col items-center p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                            <span className="text-sm font-medium text-emerald-700">Valor Médio/Sessão</span>
                            <span className="text-2xl font-bold text-emerald-700">
                                {formatCurrency(
                                    packages.total / 
                                    Math.max(1, packages.details.reduce((sum: number, p: any) => sum + (p.sessions || 0), 0))
                                )}
                            </span>
                        </div>
                    </div>
                    
                    {/* Lista de pacotes */}
                    <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Detalhes dos Pacotes</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {packages.details.map((pkg: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{pkg.patient}</p>
                                        <p className="text-xs text-gray-500">
                                            {pkg.sessions} sessões • {formatCurrency(pkg.sessionValue)}/sessão
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900">{formatCurrency(pkg.value)}</p>
                                        <p className="text-xs text-gray-500 capitalize">{pkg.method}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Movimentação Financeira</h2>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {payments.map((payment: any) => (
                                    <FinancialPaymentItem
                                        key={payment.id}
                                        payment={payment}
                                        formatCurrency={formatCurrency}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Resumo Financeiro */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Resumo do Dia</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Total Recebido:</span>
                                <span className="font-semibold text-green-600">
                                    {formatCurrency(totalReceived)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">A Receber:</span>
                                <span className="font-semibold text-amber-600">
                                    {formatCurrency(totalExpected)}
                                </span>
                            </div>
                            {hasPackages && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">📦 Pacotes:</span>
                                    <span className="font-semibold text-purple-600">
                                        {formatCurrency(packages.total)}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                                <span className="text-gray-800 font-medium">Total Previsto:</span>
                                <span className="font-bold text-lg text-gray-900">
                                    {formatCurrency(totalExpected + (hasPackages ? 0 : 0))}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Métodos de Pagamento */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Por Método</h3>
                        <div className="space-y-3">
                            {Object.entries(paymentMethods).map(([method, data]: [string, any]) => (
                                <div key={method} className="flex justify-between items-center">
                                    <span className="text-gray-600 capitalize">{method}:</span>
                                    <div className="text-right">
                                        <div className="font-semibold text-gray-900">
                                            {formatCurrency(data.amount || 0)}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {data.details?.length || 0} transações
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 🎨 ANALYTICS VIEW - Visão analítica com métricas
const AnalyticsView = ({ data, formatCurrency }: any) => {
    const metrics = useMemo(() => {
        const totalSessions = data.summary.totalAppointments;
        const confirmationRate = totalSessions > 0 ?
            (data.summary.totalConfirmed / totalSessions) * 100 : 0;

        const avgSessionValue = data.summary.totalConfirmed > 0 ?
            data.summary.totalRevenue / data.summary.totalConfirmed : 0;

        const professionalEfficiency = data.professionals.reduce((sum: number, prof: any) =>
            sum + prof.efficiency, 0) / data.professionals.length;

        return {
            confirmationRate: Math.round(confirmationRate),
            avgSessionValue,
            professionalEfficiency: Math.round(professionalEfficiency),
            occupancyRate: Math.round(
                data.timeSlots.reduce((sum: number, slot: any) => sum + slot.stats.occupancy, 0) /
                data.timeSlots.length
            )
        };
    }, [data]);

    return (
        <div className="space-y-6">
            {/* Métricas Principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    title="Taxa de Confirmação"
                    value={`${metrics.confirmationRate}%`}
                    subtitle="Sessões confirmadas"
                    trend="positive"
                />
                <MetricCard
                    title="Ticket Médio"
                    value={formatCurrency(metrics.avgSessionValue)}
                    subtitle="Por sessão confirmada"
                    trend="neutral"
                />
                <MetricCard
                    title="Eficiência da Equipe"
                    value={`${metrics.professionalEfficiency}%`}
                    subtitle="Média dos profissionais"
                    trend="positive"
                />
                <MetricCard
                    title="Taxa de Ocupação"
                    value={`${metrics.occupancyRate}%`}
                    subtitle="Utilização dos horários"
                    trend="neutral"
                />
            </div>

            {/* Análises Detalhadas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Profissionais */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Top Profissionais</h3>
                    <div className="space-y-3">
                        {data.professionals.slice(0, 5).map((professional: any, index: number) => (
                            <div key={professional.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                                        {index + 1}
                                    </span>
                                    <span className="font-medium text-gray-900">{professional.name}</span>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold text-gray-900">
                                        {formatCurrency(professional.totalValue)}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {professional.sessionCount} sessões
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Horários de Pico */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Horários de Pico</h3>
                    <div className="space-y-3">
                        {data.timeSlots
                            .sort((a: any, b: any) => b.count - a.count)
                            .slice(0, 5)
                            .map((slot: any, index: number) => (
                                <div key={slot.time} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium text-gray-900">{slot.time}</span>
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                            {slot.count} sessões
                                        </span>
                                    </div>
                                    <div className="font-semibold text-emerald-600">
                                        {formatCurrency(slot.stats.revenue)}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ProfessionalQuickCard para Overview
const ProfessionalQuickCard = ({ professional, formatCurrency }: any) => {
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 truncate">{professional.name}</h4>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    {professional.sessionCount}
                </span>
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-600">Confirmadas:</span>
                    <span className="font-medium text-green-600">{professional.confirmed}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Eficiência:</span>
                    <span className="font-medium text-blue-600">{Math.round(professional.efficiency)}%</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600">Receita:</span>
                    <span className="font-medium text-emerald-600">
                        {formatCurrency(professional.totalValue)}
                    </span>
                </div>
            </div>
        </div>
    );
};

// FinancialPaymentItem
const FinancialPaymentItem = ({ payment, formatCurrency }: any) => {
    const getMethodColor = (method: string) => {
        const colors: any = {
            pix: 'bg-green-100 text-green-800 border-green-200',
            cartão: 'bg-blue-100 text-blue-800 border-blue-200',
            dinheiro: 'bg-gray-100 text-gray-800 border-gray-200'
        };
        return colors[method] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    return (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-4 flex-1">
                <div className={`p-2 rounded-lg ${getMethodColor(payment.method)}`}>
                    <BsCashCoin className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{payment.patient}</h4>
                    <p className="text-sm text-gray-600 capitalize">
                        {payment.type?.replace('_', ' ') || 'Pagamento'} • {payment.doctor}
                    </p>
                </div>
            </div>
            <div className="text-right">
                <div className="font-semibold text-emerald-600">
                    {formatCurrency(payment.value || 0)}
                </div>
                <div className="text-sm text-gray-500 capitalize">{payment.method}</div>
            </div>
        </div>
    );
};

// ProfessionalAppointmentItem
const ProfessionalAppointmentItem = ({ appointment, formatCurrency }: any) => {
    const getStatusColor = (status: string) => {
        const colors: any = {
            confirmed: 'bg-green-100 text-green-800',
            canceled: 'bg-red-100 text-red-800',
            scheduled: 'bg-yellow-100 text-yellow-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 flex-1">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(appointment.operationalStatus)}`}>
                    {appointment.operationalStatus}
                </span>
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{appointment.patient}</h4>
                    <p className="text-sm text-gray-600 truncate">
                        {appointment.service?.replace('_', ' ') || 'Sessão'} • {appointment.time}
                    </p>
                </div>
            </div>
            <div className="font-semibold text-gray-900">
                {formatCurrency(appointment.sessionValue)}
            </div>
        </div>
    );
};

// StatCard para métricas
const StatCard = ({ title, value, color, subtitle }: any) => {
    const colorClasses: any = {
        green: 'text-green-600',
        red: 'text-red-600',
        blue: 'text-blue-600',
        yellow: 'text-yellow-600'
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className={`text-2xl font-bold ${colorClasses[color] || 'text-gray-600'}`}>
                {value}
            </div>
            <div className="font-medium text-gray-600 mt-1">{title}</div>
            {subtitle && (
                <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
            )}
        </div>
    );
};

// 🔥 NOVO: Componente de lista de agendamentos (Novos/Recorrentes)
const AppointmentsListView = ({ 
    title, 
    subtitle, 
    appointments, 
    color 
}: { 
    title: string; 
    subtitle: string; 
    appointments: any[]; 
    color: 'green' | 'blue';
}) => {
    const colors = {
        green: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            text: 'text-green-900',
            subtitle: 'text-green-600',
            badge: 'bg-green-100 text-green-700'
        },
        blue: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-900',
            subtitle: 'text-blue-600',
            badge: 'bg-blue-100 text-blue-700'
        }
    };

    const theme = colors[color];

    if (!appointments || appointments.length === 0) {
        return (
            <div className={`${theme.bg} border ${theme.border} rounded-xl p-8 text-center`}>
                <p className={`text-lg font-medium ${theme.text}`}>{title}</p>
                <p className={`text-sm ${theme.subtitle} mt-1`}>{subtitle}</p>
                <p className="text-gray-500 mt-4">Nenhum agendamento encontrado nesta data.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className={`${theme.bg} border ${theme.border} rounded-xl p-4`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className={`text-lg font-bold ${theme.text}`}>{title}</h3>
                        <p className={`text-sm ${theme.subtitle}`}>{subtitle}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${theme.badge}`}>
                        {appointments.length} pacientes
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-700">Horário</th>
                                <th className="px-4 py-3 font-medium text-gray-700">Paciente</th>
                                <th className="px-4 py-3 font-medium text-gray-700">Especialidade</th>
                                <th className="px-4 py-3 font-medium text-gray-700">Profissional</th>
                                <th className="px-4 py-3 font-medium text-gray-700">Tipo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {appointments.map((apt: any) => (
                                <tr key={apt.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-900 font-medium">
                                        {apt.time || '--:--'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="font-medium text-gray-900">{apt.patient}</p>
                                            {apt.phone && (
                                                <p className="text-xs text-gray-500">{apt.phone}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 capitalize">
                                        {apt.specialty}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {apt.doctor}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                            apt.serviceType === 'package_session' 
                                                ? 'bg-purple-100 text-purple-700' 
                                                : 'bg-gray-100 text-gray-700'
                                        }`}>
                                            {apt.serviceType === 'package_session' ? 'Pacote' : 'Avulso'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// 🔥 NOVO: Modal de Pacientes (Novos/Recorrentes)
const PatientsModal = ({
    isOpen,
    onClose,
    title,
    subtitle,
    appointments,
    color,
    dateFilter
}: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle: string;
    appointments: any[];
    color: 'green' | 'blue';
    dateFilter: string;
}) => {
    const colors = {
        green: {
            headerBg: 'bg-gradient-to-r from-green-600 to-emerald-600',
            badge: 'bg-green-100 text-green-700',
            emptyBg: 'bg-green-50',
            emptyBorder: 'border-green-200',
            emptyText: 'text-green-800'
        },
        blue: {
            headerBg: 'bg-gradient-to-r from-blue-600 to-indigo-600',
            badge: 'bg-blue-100 text-blue-700',
            emptyBg: 'bg-blue-50',
            emptyBorder: 'border-blue-200',
            emptyText: 'text-blue-800'
        }
    };

    const theme = colors[color];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={`${theme.headerBg} text-white px-6 py-4 rounded-t-2xl`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold">{title}</h3>
                            <p className="text-sm text-white/80">{subtitle}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${theme.badge}`}>
                                {appointments.length} paciente{appointments.length !== 1 ? 's' : ''}
                            </span>
                            <button 
                                onClick={onClose}
                                className="text-white/80 hover:text-white text-2xl leading-none transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                    <p className="text-xs text-white/70 mt-2">Data: {dayjs(dateFilter).format('DD/MM/YYYY')}</p>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-6 flex-1">
                    {appointments.length === 0 ? (
                        <div className={`${theme.emptyBg} border ${theme.emptyBorder} rounded-xl p-8 text-center`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-16 w-16 mx-auto mb-4 ${theme.emptyText} opacity-50`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <p className={`text-lg font-medium ${theme.emptyText}`}>Nenhum paciente encontrado</p>
                            <p className="text-gray-500 mt-1">Não há {title.toLowerCase()} para esta data.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {appointments.map((apt: any) => (
                                <div key={apt.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 truncate">{apt.patient}</p>
                                            {apt.phone && (
                                                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                                                    </svg>
                                                    {apt.phone}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ml-2 shrink-0 ${
                                            apt.serviceType === 'package_session' 
                                                ? 'bg-purple-100 text-purple-700' 
                                                : 'bg-gray-100 text-gray-700'
                                        }`}>
                                            {apt.serviceType === 'package_session' ? 'Pacote' : 'Avulso'}
                                        </span>
                                    </div>
                                    
                                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                                        <span className="flex items-center gap-1 text-gray-600 bg-white px-2 py-1 rounded-lg border border-gray-200">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                            </svg>
                                            {apt.time || '--:--'}
                                        </span>
                                        <span className="text-gray-500 capitalize bg-white px-2 py-1 rounded-lg border border-gray-200">
                                            {apt.specialty}
                                        </span>
                                    </div>
                                    
                                    <div className="mt-2 text-sm text-gray-600 flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        {apt.doctor}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-2xl">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                            Total de <strong>{appointments.length}</strong> paciente{appointments.length !== 1 ? 's' : ''}
                        </p>
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// MetricCard para Analytics
const MetricCard = ({ title, value, subtitle, trend }: any) => {
    const trendColors: any = {
        positive: 'text-green-600',
        negative: 'text-red-600',
        neutral: 'text-blue-600'
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className={`text-2xl font-bold ${trendColors[trend] || 'text-gray-600'}`}>
                {value}
            </div>
            <div className="font-medium text-gray-600 mt-1">{title}</div>
            {subtitle && (
                <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
            )}
        </div>
    );
};
export default DailyClosingReport;