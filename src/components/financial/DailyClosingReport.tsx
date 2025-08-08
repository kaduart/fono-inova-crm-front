// src/components/DailyClosingReport.tsx
import { format } from 'date-fns';
import dayjs from 'dayjs';
import { BanIcon, CalendarIcon, CheckCircleIcon, ScaleIcon, TrendingUpIcon, UsersIcon, XCircleIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { BsCurrencyDollar } from 'react-icons/bs';
import usePayment from '../../hooks/usePayment';
import { formatCurrency } from '../../utils/format';
import { LoadingSpinner } from '../ui/LoadingSpinner';

import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { FiCreditCard, FiDollarSign, FiList } from 'react-icons/fi';

// Ativando os plugins
dayjs.extend(utc);
dayjs.extend(timezone);

type PaymentType = "session" | "evaluation" | "package_session" | "individual_session";

// Tipos TypeScript atualizados
type PaymentMethod = 'dinheiro' | 'pix' | 'cartão';

type ProfessionalSummary = {
    doctorId: string;
    doctorName: string;
    specialty: string;
    scheduled: number;
    scheduledValue: number;
    completed: number;
    completedValue: number;
    absences: number;
    payments: {
        total: number;
        methods: Record<PaymentMethod, number>;
    };
};

type DailyClosingReport = {
    date: string;
    period: {
        start: string;
        end: string;
    };
    totals: {
        scheduled: {
            count: number;
            value: number;
        };
        completed: {
            count: number;
            value: number;
        };
        payments: {
            count: number;
            value: number;
            methods: Record<PaymentMethod, number>;
        };
        absences: {
            count: number;
            estimatedLoss: number;
        };
    };
    byProfessional: ProfessionalSummary[];
};

const DailyClosingReport = () => {
    const {
        dailyClosing: report,
        loading,
        error,
        fetchDailyClosing
    } = usePayment();

    const [detailsType, setDetailsType] = useState<'scheduled' | 'completed' | 'payments' | 'absences' | null>(null);
    const [dateFilter, setDateFilter] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        fetchDailyClosing(dateFilter);
    }, [dateFilter, fetchDailyClosing]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };


    function translatePaymentType(type: string): string {
        const translations: Record<PaymentType, string> = {
            session: "Sessão",
            evaluation: "Avaliação",
            package_session: "Pacote",
            individual_session: "Sessão Avulsa",
        };

        if (type in translations) {
            return translations[type as PaymentType];
        }

        return "Tipo desconhecido";
    }

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDateFilter(e.target.value);
    };

    const renderDateSelector = () => (
        <div className="mb-6">
            <label className="block text-sm font-medium text-white-700 mb-1">
                Selecione a data:
            </label>
            <input
                type="date"
                value={dateFilter}
                onChange={handleDateChange}
                className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>
    );

    const renderProfessionalSummary = () => {
        if (!report) return null;

        return (
            <div className="mt-8">
                <h3 className="text-xl font-bold mb-4 text-gray-700">Resumo por Profissional</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Profissional</th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Especialidade</th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Agendadas</th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Realizadas</th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Faltas</th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Pagamentos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {report.byProfessional.map((professional) => (
                                <tr key={professional.doctorId} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4 text-gray-800 font-medium">{professional.doctorName}</td>
                                    <td className="py-3 px-4 text-gray-600">{professional.specialty}</td>
                                    <td className="py-3 px-4">
                                        <div className="font-medium">{professional.scheduled.count}</div>
                                        <div className="text-xs text-gray-500">{formatCurrency(professional.scheduled.value)}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="font-medium">{professional.completed.count}</div>
                                        <div className="text-xs text-gray-500">{formatCurrency(professional.completed.value)}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${professional.absences.count > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                            {professional.absences.count}
                                        </span>
                                        {professional.absences.count > 0 && (
                                            <div className="text-xs text-gray-500 mt-1">Perda: {formatCurrency(professional.absences.estimatedLoss)}</div>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="font-medium text-gray-800">{formatCurrency(professional.payments.total)}</div>
                                        <div className="grid grid-cols-1 gap-1 mt-1">
                                            <div className="flex items-center text-xs">
                                                <span className="w-16 text-gray-500">Dinheiro:</span>
                                                <span className="font-medium">{formatCurrency(professional.payments.methods.dinheiro)}</span>
                                            </div>
                                            <div className="flex items-center text-xs">
                                                <span className="w-16 text-gray-500">PIX:</span>
                                                <span className="font-medium">{formatCurrency(professional.payments.methods.pix)}</span>
                                            </div>
                                            <div className="flex items-center text-xs">
                                                <span className="w-16 text-gray-500">Cartão:</span>
                                                <span className="font-medium">{formatCurrency(professional.payments.methods.cartão)}</span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderDetailsButtons = () => {
        if (!report) return null;

        const buttonClasses = "py-2 px-4 rounded-lg font-medium transition-all transform hover:scale-105 focus:outline-none shadow-md";

        return (
            <div className="mt-8 flex flex-wrap gap-3">
                <button
                    className={`${buttonClasses} bg-blue-500 text-white hover:bg-blue-600`}
                    onClick={() => setDetailsType('scheduled')}
                >
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        <span>Agendamentos</span>
                    </div>
                </button>
                <button
                    className={`${buttonClasses} bg-green-500 text-white hover:bg-green-600`}
                    onClick={() => setDetailsType('completed')}
                >
                    <div className="flex items-center gap-2">
                        <CheckCircleIcon className="h-4 w-4" />
                        <span>Sessões Realizadas</span>
                    </div>
                </button>
                <button
                    className={`${buttonClasses} bg-purple-500 text-white hover:bg-purple-600`}
                    onClick={() => setDetailsType('payments')}
                >
                    <div className="flex items-center gap-2">
                        <BsCurrencyDollar className="h-4 w-4" />
                        <span>Pagamentos</span>
                    </div>
                </button>
                <button
                    className={`${buttonClasses} bg-red-500 text-white hover:bg-red-600`}
                    onClick={() => setDetailsType('absences')}
                >
                    <div className="flex items-center gap-2">
                        <XCircleIcon className="h-4 w-4" />
                        <span>Faltas/Cancelamentos</span>
                    </div>
                </button>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-3 text-gray-600">Carregando fechamento diário...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <div className="text-red-500 font-medium text-xl mb-2">Erro ao carregar dados</div>
                <p className="text-red-700">{error}</p>
                <button
                    className="mt-4 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg"
                    onClick={() => window.location.reload()}
                >
                    Tentar novamente
                </button>
            </div>
        );
    }



    if (!report) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <div className="text-yellow-700 font-medium text-lg mb-2">Nenhum dado disponível</div>
                <p className="text-gray-600">Não encontramos informações para esta data.</p>
                <div className="mt-4">
                    {renderDateSelector()}
                </div>
            </div>
        );
    }

    const formatDateBrazilian = (date: string | Date) => {
        return dayjs.utc(date).tz("America/Sao_Paulo").format("DD/MM/YYYY HH:mm");
    };

    console.log('reportttttttttt', report)
    console.log('reportttttttttt', report.totals.scheduled)
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Cabeçalho moderno */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Relatório Diário</h1>
                    <p className="text-gray-600 mt-1">
                        Resumo completo das atividades e finanças do dia
                    </p>
                </div>
                <div className="mt-4 md:mt-0">
                    {renderDateSelector()}
                </div>
            </div>

            {
                report.financialSummary.otherPayments?.total > 0 ? (
                    <>
                        < div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8 border border-gray-200">
                            {/* Cabeçalho com gradiente sutil */}
                            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                                    <BsCurrencyDollar className="h-5 w-5 text-indigo-600 mr-2" />
                                    Pagamentos Diretos
                                </h2>
                            </div>

                            <div className="p-6">
                                {/* Grid de Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    {/* Card Total Recebido - Mais destacado */}
                                    <div className="bg-blue-50 rounded-lg p-5 border border-blue-100">
                                        <div className="flex items-center gap-4">
                                            {/* Ícone */}
                                            <div className="bg-blue-100 p-3 rounded-full flex-shrink-0">
                                                <BsCurrencyDollar className="h-6 w-6 text-blue-600" />
                                            </div>

                                            {/* Textos */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-blue-800 truncate">Total Recebido</p>
                                                <p className="text-2xl font-bold text-blue-900 truncate">
                                                    R$ {report.financialSummary.otherPayments?.total?.toFixed(2).replace('.', ',') || '0,00'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Card Métodos de Pagamento */}
                                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
                                        <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                                            <FiCreditCard className="h-4 w-4 text-gray-500 mr-2" />
                                            Por Método
                                        </h3>
                                        <div className="space-y-3">
                                            {Object.entries(report.financialSummary.otherPayments?.byMethod || {}).map(([method, value]) => (
                                                <div key={method} className="flex justify-between items-center">
                                                    <span className="capitalize flex items-center text-sm">
                                                        {method === 'pix' ? (
                                                            <FiDollarSign className="h-4 w-4 text-green-500 mr-2" />
                                                        ) : method === 'cartão' ? (
                                                            <FiCreditCard className="h-4 w-4 text-indigo-500 mr-2" />
                                                        ) : (
                                                            <FiDollarSign className="h-4 w-4 text-blue-500 mr-2" />
                                                        )}
                                                        {method}
                                                    </span>
                                                    <span className="font-medium text-sm">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Card Tipos de Serviço */}
                                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
                                        <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                                            <FiList className="h-4 w-4 text-gray-500 mr-2" />
                                            Por Tipo
                                        </h3>
                                        <div className="space-y-3">
                                            {Object.entries(report.financialSummary.otherPayments?.byType || {}).map(([type, value]) => (
                                                <div key={type} className="flex justify-between items-center">
                                                    <span className="capitalize text-sm">
                                                        {type.replace('_', ' ')}
                                                    </span>
                                                    <span className="font-medium text-sm">R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Tabela de Detalhes - Estilo mais clean */}
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profissional</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {report.financialSummary.otherPayments?.details?.map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {item.patient}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                        {item.doctor.fullName}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize">
                                                        {translatePaymentType(item.type)}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.method === 'pix' ? 'bg-green-100 text-green-800' :
                                                            item.method === 'cartão' ? 'bg-indigo-100 text-indigo-800' :
                                                                'bg-blue-100 text-blue-800'
                                                            }`}>
                                                            {item.method}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                        {formatDateBrazilian(item.createdAt)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Relatório Principal - Design Atualizado */}
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                            {/* Header modernizado */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
                                <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                                    <div className="flex items-center">
                                        <div className="bg-white/20 p-2 rounded-lg mr-3">
                                            <CalendarIcon className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">
                                                Fechamento Diário
                                            </h2>
                                            <p className="text-blue-100 text-sm mt-1">
                                                {new Date(report.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-4 md:mt-0">
                                        <div className="bg-white/10 rounded-lg px-4 py-2">
                                            <span className="text-white font-medium">
                                                Total Recebido: <span className="text-blue-100">R$ {report.financialSummary.totalRecebido.toFixed(2)}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Totais Gerais */}
                            <div className="px-6 py-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                                    {/* Agendadas */}
                                    <DashboardCard
                                        icon={<CalendarIcon className="h-6 w-6 text-blue-500" />}
                                        title="Agendadas"
                                        value={report.totals.scheduled.count}
                                        secondaryText={`Valor: ${formatCurrency(report.totals.scheduled.value)}`}
                                        color="blue"
                                    />

                                    {/* Realizadas */}
                                    <DashboardCard
                                        icon={<CheckCircleIcon className="h-6 w-6 text-green-500" />}
                                        title="Realizadas"
                                        value={report.totals.completed.count}
                                        secondaryText={`Valor: ${formatCurrency(report.totals.completed.value)}`}
                                        color="green"
                                    />

                                    {/* Pagamentos */}
                                    <DashboardCard
                                        icon={<BsCurrencyDollar className="h-6 w-6 text-purple-500" />}
                                        title="Pagamentos"
                                        value={report.totals.payments.total}
                                        secondaryText={`A receber: ${formatCurrency(report.financialSummary.totalAReceber)}`}
                                        color="purple"
                                    />

                                    {/* Faltas */}
                                    <DashboardCard
                                        icon={<XCircleIcon className="h-6 w-6 text-red-500" />}
                                        title="Faltas"
                                        value={report.totals.absences.count}
                                        secondaryText={`Perda: ${formatCurrency(report.totals.absences.estimatedLoss)}`}
                                        color="red"
                                    />
                                </div>

                                {/* Métricas */}
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <MetricCard
                                        title="Taxa de comparecimento"
                                        value={`${Math.round((report.totals.completed.count / report.totals.scheduled.count) * 100 || 0)}%`}
                                        icon={<TrendingUpIcon className="h-5 w-5 text-green-500" />}
                                    />
                                    <MetricCard
                                        title="Média por sessão"
                                        value={formatCurrency(report.totals.completed.value / report.totals.completed.count || 0)}
                                        icon={<ScaleIcon className="h-5 w-5 text-blue-500" />}
                                    />
                                    <MetricCard
                                        title="Sessões canceladas"
                                        value={report.totals.canceled?.count || 0}
                                        icon={<BanIcon className="h-5 w-5 text-red-500" />}
                                    />
                                    <MetricCard
                                        title="Pacientes atendidos"
                                        value={report.totals.uniquePatients || 0}
                                        icon={<UsersIcon className="h-5 w-5 text-indigo-500" />}
                                    />
                                </div>
                            </div>

                            {/* Detalhes por profissional */}
                            <div className="px-6 pb-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Por Profissional</h3>
                                <div className="space-y-4">
                                    {report.byProfessional.map((professional) => (
                                        <ProfessionalCard
                                            key={professional.doctorId}
                                            professional={professional}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <p>Sem dados para exibir</p>
                )}
        </div >
    );
};

const ProfessionalCard = ({ professional }) => (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h4 className="font-medium text-gray-800">
                {professional.doctorName} - {professional.specialty}
            </h4>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
                <p className="text-sm text-gray-600">Agendadas</p>
                <p className="font-medium">{professional.scheduled.count}</p>
            </div>
            <div>
                <p className="text-sm text-gray-600">Realizadas</p>
                <p className="font-medium text-green-600">{professional.completed.count}</p>
            </div>
            <div>
                <p className="text-sm text-gray-600">Faltas</p>
                <p className="font-medium text-red-600">{professional.absences.count}</p>
            </div>
            <div>
                <p className="text-sm text-gray-600">Recebido</p>
                <p className="font-medium text-blue-600">
                    {formatCurrency(professional.payments.total)}
                </p>
            </div>
        </div>
    </div>
);

// Componente de Card para Métricas
const MetricCard = ({ title, value, icon }) => (
    <div className="text-center">
        <div className="flex items-center justify-center">
            {icon}
            <div className="text-sm text-gray-600 ml-2">{title}</div>
        </div>
        <div className="text-xl font-bold mt-1">{value}</div>
    </div>
);

// Componente de Card para Dashboard
const DashboardCard = ({ icon, title, value, secondaryText, color }) => {
    const colors = {
        blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-800' },
        green: { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-800' },
        purple: { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-800' },
        red: { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-800' },
    };

    return (
        <div className={`${colors[color].bg} rounded-xl p-5 border ${colors[color].border} shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex items-start">
                <div className={`${colors[color].bg} p-3 rounded-lg mr-4`}>
                    {icon}
                </div>
                <div>
                    <h3 className={`font-medium ${colors[color].text}`}>{title}</h3>
                    <p className="text-2xl font-bold mt-1 text-gray-800">
                        {value}
                    </p>
                    <div className="mt-2 text-sm text-gray-600">
                        {secondaryText}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Componente para visualização detalhada
const DetailsView = ({ type, date, onClose }: {
    type: 'scheduled' | 'completed' | 'payments' | 'absences';
    date: string;
    onClose: () => void;
}) => {
    const {
        dailySessions,
        dailyPayments,
        dailyAbsences,
        fetchDailyScheduledSessions,
        fetchDailyCompletedSessions,
        fetchDailyPayments,
        fetchDailyAbsences,
        loading: detailsLoading,
        error: detailsError
    } = usePayment();

    const [data, setData] = useState<any[]>([]);
    const [localLoading, setLocalLoading] = useState(true);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchDetails = async () => {
            try {
                setLocalLoading(true);
                setLocalError(null);

                let res: any;
                switch (type) {
                    case "scheduled":
                        res = await fetchDailyScheduledSessions(date);
                        break;
                    case "completed":
                        res = await fetchDailyCompletedSessions(date);
                        break;
                    case "payments":
                        res = await fetchDailyPayments(date);
                        break;
                    case "absences":
                        res = await fetchDailyAbsences(date);
                        break;
                    default:
                        res = null;
                }

                if (isMounted) {
                    // atualize seu estado com 'res'
                    // ex: setState(res)
                }
            } catch (err) {
                if (isMounted) {
                    setLocalError("Erro ao carregar detalhes");
                }
                console.error(err);
            } finally {
                if (isMounted) {
                    setLocalLoading(false);
                }
            }
        };

        fetchDetails();

        return () => {
            isMounted = false; // evita atualização após desmontagem
        };
    }, [type, date]);


    useEffect(() => {
        // Atualizar os dados baseados no tipo
        switch (type) {
            case 'scheduled':
            case 'completed':
                setData(dailySessions);
                break;
            case 'payments':
                setData(dailyPayments);
                break;
            case 'absences':
                setData(dailyAbsences);
                break;
            default:
                setData([]);
        }
    }, [type, dailySessions, dailyPayments, dailyAbsences]);

    const getTitle = () => {
        switch (type) {
            case 'scheduled': return 'Agendamentos Completos';
            case 'completed': return 'Sessões Realizadas';
            case 'payments': return 'Pagamentos Detalhados';
            case 'absences': return 'Faltas e Cancelamentos';
            default: return 'Detalhes';
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (dateString: string | Date) => {
        return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    };

    const isLoading = localLoading || detailsLoading;
    const hasError = localError || detailsError;

    return (
        <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">{getTitle()}</h3>
                <button
                    className="text-gray-500 hover:text-gray-700 text-lg bg-gray-100 hover:bg-gray-200 rounded-full p-2"
                    onClick={onClose}
                >
                    &times;
                </button>
            </div>

            {isLoading && (
                <LoadingSpinner />
            )}

            {hasError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-600">
                    {localError || detailsError}
                </div>
            )}

            {!isLoading && !hasError && data.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                {type === 'scheduled' ? (
                                    <>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Paciente</th>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Profissional</th>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Data/Hora</th>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Valor</th>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Status</th>
                                    </>
                                ) : type === 'completed' ? (
                                    <>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Paciente</th>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Profissional</th>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Data/Hora</th>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Valor</th>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Duração</th>
                                    </>
                                ) : type === 'payments' ? (
                                    <>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Paciente</th>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Profissional</th>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Valor</th>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Método</th>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Data</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Paciente</th>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Profissional</th>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Data</th>
                                        <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Confirmada</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data.map((item, index) => (
                                <tr key={item.id || `${item.type}-${index}`} className="hover:bg-gray-50 transition-colors">
                                    {type === 'scheduled' ? (
                                        <>
                                            <td className="py-3 px-4 text-gray-800 font-medium">{item.patient || 'N/A'}</td>
                                            <td className="py-3 px-4 text-gray-600">{item.doctor || 'N/A'}</td>
                                            <td className="py-3 px-4">
                                                <div className="font-medium">{formatDate(item.date)}</div>
                                            </td>
                                            <td className="py-3 px-4 font-medium text-blue-600">{formatCurrency(item.value)}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    item.status === 'canceled' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </>
                                    ) : type === 'completed' ? (
                                        <>
                                            <td className="py-3 px-4 text-gray-800 font-medium">{item.patient || 'N/A'}</td>
                                            <td className="py-3 px-4 text-gray-600">{item.doctor || 'N/A'}</td>
                                            <td className="py-3 px-4">
                                                <div className="font-medium">{formatDate(item.date)}</div>
                                            </td>
                                            <td className="py-3 px-4 font-medium text-green-600">{formatCurrency(item.value)}</td>
                                            <td className="py-3 px-4">{item.duration || 40} min</td>
                                        </>
                                    ) : type === 'payments' ? (
                                        <>
                                            <td className="py-3 px-4 text-gray-800 font-medium">{item.patient || 'N/A'}</td>
                                            <td className="py-3 px-4 text-gray-600">{item.doctor || 'N/A'}</td>
                                            <td className="py-3 px-4 font-medium text-purple-600">{formatCurrency(item.amount)}</td>
                                            <td className="py-3 px-4 capitalize">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.paymentMethod === 'dinheiro' ? 'bg-green-100 text-green-800' :
                                                    item.paymentMethod === 'pix' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-purple-100 text-purple-800'
                                                    }`}>
                                                    {item.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-medium">{formatDate(item.date)}</div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="py-3 px-4 text-gray-800 font-medium">{item.patient || 'N/A'}</td>
                                            <td className="py-3 px-4 text-gray-600">{item.doctor || 'N/A'}</td>
                                            <td className="py-3 px-4">
                                                <div className="font-medium">{formatDate(item.date)}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.confirmedAbsence ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {item.confirmedAbsence ? 'Sim' : 'Não'}
                                                </span>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {!isLoading && !hasError && data.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <div className="text-yellow-700 font-medium">Nenhum registro encontrado</div>
                    <p className="text-gray-600 mt-1">Não há dados disponíveis para este tipo de detalhe.</p>
                </div>
            )}
        </div>
    );
};

export default DailyClosingReport;