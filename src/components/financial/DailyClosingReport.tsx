// src/components/DailyClosingReport.tsx
import { format } from 'date-fns';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import {
    BanIcon,
    CalendarIcon,
    CheckCircleIcon,
    TrendingUpIcon,
    XCircleIcon
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { BsCurrencyDollar } from 'react-icons/bs';
import { FiCreditCard, FiDollarSign } from 'react-icons/fi';
import usePayment from '../../hooks/usePayment';
import { LoadingSpinner } from '../ui/LoadingSpinner';

dayjs.extend(utc);
dayjs.extend(timezone);

const DailyClosingReport = () => {
    const [dateFilter, setDateFilter] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [detailsType, setDetailsType] = useState<'scheduled' | 'attended' | 'canceled' | 'pending' | null>(null);

    const {
        dailyClosing: report,
        loading,
        error,
        fetchDailyClosing
    } = usePayment();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDateFilter(e.target.value);
    };

    useEffect(() => {
        fetchDailyClosing(dateFilter);
    }, [dateFilter, fetchDailyClosing]);

    const renderDateSelector = () => (
        <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
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

    const renderSummaryCards = () => {
        if (!report?.summary) return null;

        const summary = report.summary;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                <DashboardCard
                    icon={<CalendarIcon className="h-6 w-6 text-blue-500" />}
                    title="Agendadas"
                    value={summary.scheduled.count}
                    secondaryText={`Valor: ${formatCurrency(summary.scheduled.value)}`}
                    color="blue"
                />
                <DashboardCard
                    icon={<CheckCircleIcon className="h-6 w-6 text-green-500" />}
                    title="Atendidas"
                    value={summary.attended.count}
                    secondaryText={`Valor: ${formatCurrency(summary.attended.value)}`}
                    color="green"
                />
                <DashboardCard
                    icon={<XCircleIcon className="h-6 w-6 text-red-500" />}
                    title="Canceladas"
                    value={summary.canceled.count}
                    secondaryText={`Valor: ${formatCurrency(summary.canceled.value)}`}
                    color="red"
                />
                <DashboardCard
                    icon={<BanIcon className="h-6 w-6 text-yellow-500" />}
                    title="Pendentes"
                    value={summary.pending.count}
                    secondaryText={`Valor: ${formatCurrency(summary.pending.value)}`}
                    color="yellow"
                />
            </div>
        );
    };

    const renderFinancialSummary = () => {
        if (!report?.financial) return null;

        const financial = report.financial;
        return (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8 border border-gray-200">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                        <BsCurrencyDollar className="h-5 w-5 text-indigo-600 mr-2" />
                        Resumo Financeiro
                    </h2>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 rounded-lg p-5 border border-blue-100">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-100 p-3 rounded-full flex-shrink-0">
                                <BsCurrencyDollar className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-blue-800">Total Recebido</p>
                                <p className="text-2xl font-bold text-blue-900">
                                    {formatCurrency(financial.totalReceived)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-5 border border-green-100">
                        <div className="flex items-center gap-4">
                            <div className="bg-green-100 p-3 rounded-full flex-shrink-0">
                                <TrendingUpIcon className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-green-800">Total Esperado</p>
                                <p className="text-2xl font-bold text-green-900">
                                    {formatCurrency(financial.totalExpected)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
                        <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                            <FiCreditCard className="h-4 w-4 text-gray-500 mr-2" />
                            Por Método
                        </h3>
                        <div className="space-y-3">
                            {Object.entries(financial.paymentMethods).map(([method, data]) => (
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
                                    <span className="font-medium text-sm">
                                        {formatCurrency(data.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderProfessionalSummary = () => {
        if (!report?.byProfessional) return null;

        return (
            <div className="mt-8">
                <h3 className="text-xl font-bold mb-4 text-gray-700">Resumo por Profissional</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Profissional</th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Especialidade</th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Atendidos</th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Cancelados</th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Recebido</th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Taxa Atend.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {report.byProfessional.map((professional) => (
                                <tr key={professional.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4 text-gray-800 font-medium">{professional.name}</td>
                                    <td className="py-3 px-4 text-gray-600">{professional.specialty}</td>
                                    <td className="py-3 px-4">
                                        {professional.appointments.filter(a => a.status === 'confirmado').length}
                                    </td>
                                    <td className="py-3 px-4">
                                        {professional.appointments.filter(a => a.status === 'cancelado').length}
                                    </td>
                                    <td className="py-3 px-4 font-medium text-green-600">
                                        {formatCurrency(professional.financial.received)}
                                    </td>
                                    <td className="py-3 px-4">
                                        {professional.metrics.attendanceRate}
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
        if (!report?.summary) return null;

        const buttonClasses = "py-2 px-4 rounded-lg font-medium transition-all transform hover:scale-105 focus:outline-none shadow-md";

        return (
            <div className="mt-8 flex flex-wrap gap-3">
                <button
                    className={`${buttonClasses} bg-blue-500 text-white hover:bg-blue-600`}
                    onClick={() => setDetailsType('scheduled')}
                >
                    <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        <span>Agendamentos ({report.summary.scheduled.count})</span>
                    </div>
                </button>
                <button
                    className={`${buttonClasses} bg-green-500 text-white hover:bg-green-600`}
                    onClick={() => setDetailsType('attended')}
                >
                    <div className="flex items-center gap-2">
                        <CheckCircleIcon className="h-4 w-4" />
                        <span>Atendidos ({report.summary.attended.count})</span>
                    </div>
                </button>
                <button
                    className={`${buttonClasses} bg-red-500 text-white hover:bg-red-600`}
                    onClick={() => setDetailsType('canceled')}
                >
                    <div className="flex items-center gap-2">
                        <XCircleIcon className="h-4 w-4" />
                        <span>Cancelados ({report.summary.canceled.count})</span>
                    </div>
                </button>
                <button
                    className={`${buttonClasses} bg-yellow-500 text-white hover:bg-yellow-600`}
                    onClick={() => setDetailsType('pending')}
                >
                    <div className="flex items-center gap-2">
                        <BanIcon className="h-4 w-4" />
                        <span>Pendentes ({report.summary.pending.count})</span>
                    </div>
                </button>
            </div>
        );
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

    const renderDetailsView = () => {
        if (!report?.summary || !detailsType) return null;

        const detailsData = report.summary[detailsType].details;

        return (
            <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800">
                        {detailsType === 'scheduled' && 'Agendamentos'}
                        {detailsType === 'attended' && 'Atendimentos Confirmados'}
                        {detailsType === 'canceled' && 'Cancelamentos'}
                        {detailsType === 'pending' && 'Pendentes'}
                    </h3>
                    <button
                        className="text-gray-500 hover:text-gray-700 text-lg bg-gray-100 hover:bg-gray-200 rounded-full p-2"
                        onClick={() => setDetailsType(null)}
                    >
                        &times;
                    </button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Paciente</th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Serviço</th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Valor</th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Método</th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Status</th>
                                <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Data/Hora</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {detailsData.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4 text-gray-800 font-medium">{item.patient}</td>
                                    <td className="py-3 px-4 text-gray-600">{getServiceTypeLabel(item.service)}</td>
                                    <td className="py-3 px-4 font-medium">
                                        {formatCurrency(item.value)}
                                    </td>
                                    <td className="py-3 px-4 capitalize">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.method === 'pix' ? 'bg-green-100 text-green-800' :
                                            item.method === 'cartão' ? 'bg-indigo-100 text-indigo-800' :
                                                'bg-blue-100 text-blue-800'
                                            }`}>
                                            {item.method}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'confirmado' ? 'bg-green-100 text-green-800' :
                                            item.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-gray-500">
                                        {item.date} {item.time}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Relatório Diário</h1>
                    <p className="text-gray-600 mt-1">
                        Resumo completo das atividades e finanças
                    </p>
                </div>
                <div className="mt-4 md:mt-0">
                    {renderDateSelector()}
                </div>
            </div>

            {loading && (
                <div className="flex justify-center items-center h-64">
                    <LoadingSpinner />
                    <p className="mt-3 text-gray-600">Carregando fechamento diário...</p>
                </div>
            )}

            {error && (
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
            )}

            {!loading && !error && report && (
                <>
                    {renderSummaryCards()}
                    {renderFinancialSummary()}
                    {renderProfessionalSummary()}
                    {renderDetailsButtons()}
                    {detailsType && renderDetailsView()}
                </>
            )}

            {!loading && !error && !report && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <div className="text-yellow-700 font-medium text-lg mb-2">Nenhum dado disponível</div>
                    <p className="text-gray-600">Não encontramos informações para esta data.</p>
                </div>
            )}
        </div>
    );
};

const DashboardCard = ({
    icon,
    title,
    value,
    secondaryText,
    color
}: {
    icon: React.ReactNode;
    title: string;
    value: number | string;
    secondaryText: string;
    color: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}) => {
    const colors = {
        blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-800' },
        green: { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-800' },
        red: { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-800' },
        yellow: { bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-yellow-800' },
        purple: { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-800' },
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

export default DailyClosingReport;