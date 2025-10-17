// src/components/DailyClosingReport.tsx
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { Badge } from "lucide-react";
import { useEffect, useState } from "react";
import {
    BsCashCoin,
    BsCheckCircle,
    BsClock,
    BsClockHistory,
    BsXCircle
} from "react-icons/bs";
import { FiTrendingUp } from "react-icons/fi";
import usePayment from "../../hooks/usePayment";
import { formatDateBrazilian } from "../../utils/dateFormat";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import SummaryCard from "./SummaryCard";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

// 🎨 Cores para os status
const STATUS_COLORS = {
    confirmed: '#10B981',
    canceled: '#EF4444',
    scheduled: '#F59E0B',
    completed: '#3B82F6',
    paid: '#10B981',
    pending: '#F59E0B'
};

const DailyClosingReport = () => {
    const [dateFilter, setDateFilter] = useState(
        dayjs().tz("America/Sao_Paulo").format("YYYY-MM-DD")
    );
    const [activeTab, setActiveTab] = useState('timeline'); // 'timeline', 'financial', 'analytics'
    const { dailyClosing: report, loading, error, fetchDailyClosing } = usePayment();

    useEffect(() => {
        fetchDailyClosing(dateFilter);
    }, [dateFilter, fetchDailyClosing]);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(value || 0);

    // 📊 Dados para gráficos
    const getChartData = () => {
        if (!report?.summary) return [];

        return [
            { name: 'Realizadas', value: report.summary.attended?.count || 0, color: STATUS_COLORS.completed },
            { name: 'Canceladas', value: report.summary.canceled?.count || 0, color: STATUS_COLORS.canceled },
            { name: 'Agendadas', value: report.summary.pending?.count || 0, color: STATUS_COLORS.scheduled }
        ];
    };

    const getPaymentMethodData = () => {
        if (!report?.financial?.paymentMethods) return [];

        return Object.entries(report.financial.paymentMethods).map(([method, data]: [string, any]) => ({
            name: method.charAt(0).toUpperCase() + method.slice(1),
            value: data.amount,
            count: data.details?.length || 0
        }));
    };

    // 🕒 Agrupar sessões por horário para timeline
    const getTimelineSlots = () => {
        if (!report?.timelines?.appointments) return [];

        const slots = {};
        report.timelines.appointments.forEach(appointment => {
            const time = appointment.time.substring(0, 5); // Formata HH:MM
            if (!slots[time]) {
                slots[time] = [];
            }
            slots[time].push(appointment);
        });

        return Object.entries(slots)
            .sort(([timeA], [timeB]) => timeA.localeCompare(timeB))
            .map(([time, appointments]) => ({ time, appointments }));
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

    const hasData = !!report && (
        (report.summary?.scheduled?.count ?? 0) > 0 ||
        (report.timelines?.payments?.length ?? 0) > 0
    );

    if (!hasData) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                <div className="flex flex-col md:flex-row justify-between md:items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Fechamento Diário
                        </h1>
                        <p className="text-gray-600">Visão geral do dia na clínica</p>
                    </div>
                    <div className="mt-4 md:mt-0">
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

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

    const timelineSlots = getTimelineSlots();
    const chartData = getChartData();
    const paymentData = getPaymentMethodData();

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Fechamento Diário
                    </h1>
                    <p className="text-gray-600">
                        {formatDateBrazilian(dateFilter)} • Visão completa do dia
                    </p>
                </div>
                <div className="flex gap-4">
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* ABAS DE NAVEGAÇÃO */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: 'timeline', name: 'Timeline', icon: BsClock },
                        { id: 'financial', name: 'Financeiro', icon: BsCashCoin },
                        { id: 'analytics', name: 'Analytics', icon: FiTrendingUp }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
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

            {/* RESUMO GERAL */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SummaryCard
                    title="Sessões Realizadas"
                    value={report.summary.appointments?.attended || 0}
                    subtitle="Confirmadas e atendidas"
                    icon={<BsCheckCircle className="text-green-500 text-xl" />}
                    trend="positive"
                />
                <SummaryCard
                    title="Canceladas"
                    value={report.summary.appointments?.canceled || 0}
                    subtitle="Sessões canceladas"
                    icon={<BsXCircle className="text-red-500 text-xl" />}
                    trend="negative"
                />
                <SummaryCard
                    title="Agendadas / Pendentes"
                    value={report.summary.appointments?.pending || 0}
                    subtitle="Sessões aguardando atendimento"
                    icon={<BsClockHistory className="text-yellow-500 text-xl" />}
                    trend="neutral"
                />
                <SummaryCard
                    title="Total Recebido"
                    value={formatCurrency(report.summary.payments?.totalReceived || 0)}
                    subtitle="Valor líquido do dia"
                    icon={<BsCashCoin className="text-emerald-500 text-xl" />}
                    trend="positive"
                />
            </div>


            {/* CONTEÚDO DAS ABAS */}
            {activeTab === 'timeline' && (
                <TimelineView
                    timelineSlots={timelineSlots}
                    payments={report.timelines?.payments || []}
                    formatCurrency={formatCurrency}
                />
            )}

            {activeTab === 'financial' && (
                <FinancialView
                    financial={report.financial}
                    payments={report.timelines?.payments || []}
                    formatCurrency={formatCurrency}
                    paymentData={paymentData}
                />
            )}

            {activeTab === 'analytics' && (
                <AnalyticsView
                    chartData={chartData}
                    paymentData={paymentData}
                    summary={report.summary}
                    formatCurrency={formatCurrency}
                />
            )}
        </div>
    );
};

// 🎨 COMPONENTE DE TIMELINE
// 🎨 TIMELINE VIEW (atualizada)
const TimelineView = ({ timelineSlots, payments, formatCurrency }: any) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* TIMELINE DE SESSÕES */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow border border-gray-200">
                    <div className="bg-blue-50 px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                            <BsClock className="text-blue-600" />
                            Timeline de Sessões
                        </h2>
                    </div>
                    <div className="p-6">
                        {timelineSlots.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                Nenhuma sessão agendada para este dia
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {timelineSlots.map((slot: any, index: number) => (
                                    <TimelineSlot key={index} slot={slot} formatCurrency={formatCurrency} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CAIXA RÁPIDO */}
            <div className="space-y-6">
                <div className="bg-white rounded-xl shadow border border-gray-200">
                    <div className="bg-emerald-50 px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-emerald-800 flex items-center gap-2">
                            <BsCashCoin className="text-emerald-600" />
                            Caixa do Dia
                        </h2>
                    </div>
                    <div className="p-6">
                        {payments.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">
                                Nenhum pagamento registrado
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {payments.slice(0, 5).map((payment: any) => (
                                    <PaymentItem key={payment.id} payment={payment} formatCurrency={formatCurrency} />
                                ))}
                                {payments.length > 5 && (
                                    <div className="text-center pt-2">
                                        <span className="text-sm text-gray-500">
                                            +{payments.length - 5} pagamentos
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ESTATÍSTICAS RÁPIDAS */}
                <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Resumo Rápido</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Total de Sessões:</span>
                            <span className="font-medium">{timelineSlots.reduce((total: number, slot: any) => total + slot.appointments.length, 0)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Horários Ocupados:</span>
                            <span className="font-medium">{timelineSlots.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Pagamentos:</span>
                            <span className="font-medium">{payments.length}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 🎨 SLOT DA TIMELINE
const TimelineSlot = ({ slot, formatCurrency }) => {
    return (
        <div className="border-l-4 border-blue-200 pl-4 ml-2">
            <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                    {slot.time}
                </div>
                <div className="text-sm text-gray-500">
                    {slot.appointments.length} sessão{slot.appointments.length > 1 ? 'es' : ''}
                </div>
            </div>
            <div className="space-y-3">
                {slot.appointments.map((appointment) => (
                    <AppointmentCard key={appointment.id} appointment={appointment} formatCurrency={formatCurrency} />
                ))}
            </div>
        </div>
    );
};

// 🎨 CARD DE AGENDAMENTO
// 🎨 CARD DE AGENDAMENTO (corrigido)
const AppointmentCard = ({ appointment, formatCurrency }) => {
    const getStatusConfig = (appointment) => {
        // 🔹 Combina clinicalStatus + operationalStatus para refletir situação real
        const { operationalStatus, clinicalStatus } = appointment;

        // 🔹 Status principais (combinados para clareza visual)
        if (clinicalStatus === 'completed')
            return { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Concluído', icon: BsCheckCircle };
        if (clinicalStatus === 'in_progress')
            return { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', label: 'Em andamento', icon: BsClock };
        if (clinicalStatus === 'missed')
            return { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Faltou', icon: BsClockHistory };
        if (operationalStatus === 'confirmed')
            return { color: 'bg-green-100 text-green-800 border-green-200', label: 'Confirmado', icon: BsCheckCircle };
        if (operationalStatus === 'canceled')
            return { color: 'bg-red-100 text-red-800 border-red-200', label: 'Cancelado', icon: BsXCircle };
        if (operationalStatus === 'paid')
            return { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Pago', icon: BsCashCoin };
        if (operationalStatus === 'scheduled')
            return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Agendado', icon: BsClockHistory };

        // 🔹 Default
        return { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Indefinido', icon: BsClock };
    };

    const statusConfig = getStatusConfig(appointment);
    const Icon = statusConfig.icon;

    return (
        <div
            className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow 
            ${appointment.operationalStatus === 'canceled' ? 'opacity-60' : ''}`}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{appointment.patient}</h3>
                    <p className="text-sm text-gray-600 capitalize">
                        {appointment.service.replace('_', ' ')} • {appointment.doctor}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                        {statusConfig.label}
                    </span>
                </div>
            </div>

            <div className="flex justify-between items-center mt-3">
                <div className="text-sm text-gray-500">
                    {formatCurrency(appointment.sessionValue)}
                </div>
                <div className="text-sm">
                    <Badge status={appointment.paidStatus} />
                </div>
            </div>
        </div>
    );
};


// 🎨 COMPONENTES RESTANTES (FinancialView, AnalyticsView, etc.)
// 🎨 PAYMENT ITEM (item de pagamento) - ADICIONE ESTE COMPONENTE
const PaymentItem = ({ payment, formatCurrency }: any) => {
    const getMethodColor = (method: string) => {
        const colors: any = {
            pix: 'bg-green-100 text-green-700 border-green-200',
            cartão: 'bg-indigo-100 text-indigo-700 border-indigo-200',
            dinheiro: 'bg-blue-100 text-blue-700 border-blue-200'
        };
        return colors[method] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 truncate">
                        {payment.patient}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getMethodColor(payment.method)}`}>
                        {payment.method}
                    </span>
                </div>
                <div className="text-sm text-gray-600 capitalize">
                    {payment.type?.replace('_', ' ') || 'Pagamento'} • {payment.doctor}
                </div>
            </div>
            <div className="text-right">
                <div className="font-semibold text-emerald-700">
                    {formatCurrency(payment.value || 0)}
                </div>
                <div className="text-xs text-gray-500">
                    {payment.time || ''}
                </div>
            </div>
        </div>
    );
};

export default DailyClosingReport;