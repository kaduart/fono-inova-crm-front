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
    const [filters, setFilters] = useState({
        professional: 'all',
        status: 'all',
        service: 'all'
    });

    const { dailyClosing: report, loading, error, fetchDailyClosing } = usePayment();

    useEffect(() => {
        fetchDailyClosing(dateFilter);
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
            summary: {
                totalAppointments: summary.appointments?.total || 0,
                totalConfirmed: summary.appointments?.attended || 0, // 🔹 'attended' = confirmados
                totalCanceled: summary.appointments?.canceled || 0,
                totalRevenue: summary.appointments?.expectedValue || 0,
                totalPayments: payments.length,
                paymentRevenue: summary.payments?.totalReceived || 0
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Painel Diário
                    </h1>
                    <p className="text-gray-600">
                        {formatDateBrazilian(dateFilter)} • {processedData.summary.totalAppointments} sessões agendadas
                    </p>
                </div>
                <div className="flex gap-4">
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* ABAS DE NAVEGAÇÃO REFINADAS */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
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
                            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    subtitle="Valor total das sessões"
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

            {/* CONTEÚDO DAS ABAS */}
            {activeTab === 'overview' && (
                <OverviewView
                    data={processedData}
                    formatCurrency={formatCurrency}
                    onTimeSlotClick={handleTimeSlotClick}
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

// 🎨 COMPONENTE DE VISÃO GERAL
const OverviewView = ({ data, formatCurrency, onTimeSlotClick }: any) => {
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
                        <span className="text-sm font-medium text-green-700">Recebido Hoje</span>
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
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                                    {slot.count} sessões
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

                    {/* Estatísticas rápidas - mais visuais */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 text-sm">
                        <div className="text-center">
                            <div className="text-green-600 font-bold text-lg">{slot.stats.confirmed}</div>
                            <div className="text-gray-500 text-xs uppercase tracking-wide">Confirmadas</div>
                        </div>
                        <div className="text-center">
                            <div className="text-blue-600 font-bold text-lg">{slot.stats.scheduled}</div>
                            <div className="text-gray-500 text-xs uppercase tracking-wide">Agendadas</div>
                        </div>
                        <div className="text-center">
                            <div className="text-red-600 font-bold text-lg">{slot.stats.canceled}</div>
                            <div className="text-gray-500 text-xs uppercase tracking-wide">Canceladas</div>
                        </div>
                        <div className="text-center">
                            <div className="text-purple-600 font-bold text-lg">
                                {Math.round(slot.stats.confirmationRate)}%
                            </div>
                            <div className="text-gray-500 text-xs uppercase tracking-wide">Taxa</div>
                        </div>
                    </div>

                    {/* Sessões expandidas */}
                    {isExpanded && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="space-y-3">
                                {slot.appointments.map((appointment: any) => (
                                    <TimelineAppointmentItem
                                        key={appointment.id}
                                        appointment={appointment}
                                        formatCurrency={formatCurrency}
                                        onClick={onClick}
                                    />
                                ))}
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

    const statusConfig = getStatusConfig(appointment.operationalStatus);
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
                    <h4 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {appointment.patient}
                    </h4>
                    <p className="text-sm text-gray-600 truncate">
                        {appointment.doctor} • {appointment.service?.replace('_', ' ') || 'Sessão'}
                    </p>
                </div>
            </div>
            <div className="text-right">
                <div className="font-bold text-gray-900 text-lg">{formatCurrency(appointment.sessionValue)}</div>
                <div className="text-sm text-gray-500">{appointment.time}</div>
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

    return (
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
                        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                            <span className="text-gray-800 font-medium">Total Previsto:</span>
                            <span className="font-bold text-lg text-gray-900">
                                {formatCurrency(totalReceived + totalExpected)}
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