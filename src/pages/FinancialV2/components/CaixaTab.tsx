import { useState, useMemo, useEffect } from 'react';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import API from '../../../services/api';
import { Card, CardContent, Typography, Box, Button, ButtonGroup, Chip, LinearProgress, Divider } from '@mui/material';
import { TrendingUp, TrendingDown, Pix as PixIcon, CreditCard, Money } from '@mui/icons-material';
import { formatCurrency } from '../../../utils/format';
import { FinancialLoading } from './FinancialLoading';
import { ExtratoModal } from './ExtratoModal';
import { FinancialCharts } from './FinancialCharts';
import { useFinancialV2, useChartData } from '../hooks/useFinancialV2';
import { usePaymentsContext } from '../../../contexts/PaymentsContext';

interface CashFlowData {
    period: { start: string; end: string; days: number };
    summary: {
        totalEntradas: number;
        totalTransacoes: number;
        porMetodo: { pix: number; cartao: number; dinheiro: number; outros: number };
        porTipo: { particular: number; pacote: number; convenio: number; outros: number };
    };
    comparison: { variation: number; trend: 'up' | 'down' };
}

type PeriodMode = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const fetchCashFlow = async (startDate: string, endDate: string): Promise<CashFlowData> => {
    const response = await API.get('/v2/cashflow', { params: { startDate, endDate } });
    return response.data.data;
};

export const CaixaTab = () => {
    const [mode, setMode] = useState<PeriodMode>('today');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [modalOpen, setModalOpen] = useState(false);
    
    const { stats, loadPayments, isLoading: isLoadingPayments, currentMonth } = usePaymentsContext();

    const { startDate, endDate, label, isSingleDay } = useMemo(() => {
        const today = dayjs();
        switch (mode) {
            case 'today':
                return { startDate: today.format('YYYY-MM-DD'), endDate: today.format('YYYY-MM-DD'), label: 'Hoje', isSingleDay: true };
            case 'yesterday':
                const yesterday = today.subtract(1, 'day');
                return { startDate: yesterday.format('YYYY-MM-DD'), endDate: yesterday.format('YYYY-MM-DD'), label: 'Ontem', isSingleDay: true };
            case 'week':
                return { startDate: today.subtract(6, 'days').format('YYYY-MM-DD'), endDate: today.format('YYYY-MM-DD'), label: 'Últimos 7 dias', isSingleDay: false };
            case 'month':
                return { startDate: today.startOf('month').format('YYYY-MM-DD'), endDate: today.format('YYYY-MM-DD'), label: 'Mês atual', isSingleDay: false };
            case 'custom':
                return { startDate: customRange.start || today.format('YYYY-MM-DD'), endDate: customRange.end || today.format('YYYY-MM-DD'), label: 'Período personalizado', isSingleDay: customRange.start === customRange.end };
        }
    }, [mode, customRange]);
    
    const targetMonth = useMemo(() => dayjs().format('YYYY-MM'), []);
    useEffect(() => {
        if (mode === 'month' && currentMonth !== targetMonth) {
            loadPayments(targetMonth);
        }
    }, [mode, currentMonth, targetMonth, loadPayments]);

    const { data: cashFlowData, isLoading: isLoadingCashFlow } = useQuery({
        queryKey: ['cashflow', startDate, endDate],
        queryFn: () => fetchCashFlow(startDate, endDate),
        enabled: !!startDate && !!endDate
    });

    const { data: financialData, isLoading: isLoadingFinancial } = useFinancialV2({
        period: 'month',
        enabled: true
    });
    const chartData = useChartData(financialData?.totals);

    const renderFilters = () => (
        <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                Caixa do Dia (REAL)
            </h2>
            <div className="flex flex-wrap gap-2 items-center mb-2">
                <div className="flex rounded-md shadow-sm">
                    <button
                        onClick={() => setMode('today')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-l-md border ${mode === 'today' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                        Hoje
                    </button>
                    <button
                        onClick={() => setMode('yesterday')}
                        className={`px-3 py-1.5 text-sm font-medium border-t border-b ${mode === 'yesterday' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                        Ontem
                    </button>
                    <button
                        onClick={() => setMode('week')}
                        className={`px-3 py-1.5 text-sm font-medium border-t border-b ${mode === 'week' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                        Semana
                    </button>
                    <button
                        onClick={() => setMode('month')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-r-md border ${mode === 'month' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                        Mês
                    </button>
                </div>
                <button
                    onClick={() => setMode('custom')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md border ${mode === 'custom' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                >
                    Personalizado
                </button>
            </div>

            {mode === 'custom' && (
                <div className="mt-3 flex flex-wrap gap-2 items-center">
                    <input
                        type="date"
                        value={customRange.start}
                        max={customRange.end || dayjs().format('YYYY-MM-DD')}
                        onChange={(e) => setCustomRange(p => ({ ...p, start: e.target.value }))}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="text-gray-500">→</span>
                    <input
                        type="date"
                        value={customRange.end}
                        min={customRange.start}
                        max={dayjs().format('YYYY-MM-DD')}
                        onChange={(e) => setCustomRange(p => ({ ...p, end: e.target.value }))}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            )}
        </div>
    );

    const isLoading = isLoadingCashFlow || isLoadingFinancial || (mode === 'month' && isLoadingPayments);
    
    const displayData = useMemo(() => {
        if (cashFlowData) {
            return {
                total: cashFlowData.summary.totalEntradas,
                transacoes: cashFlowData.summary.totalTransacoes,
                pix: cashFlowData.summary.porMetodo.pix,
                cartao: cashFlowData.summary.porMetodo.cartao,
                dinheiro: cashFlowData.summary.porMetodo.dinheiro,
                particular: cashFlowData.summary.porTipo.particular,
                pacote: cashFlowData.summary.porTipo.pacote,
                convenio: cashFlowData.summary.porTipo.convenio,
                period: cashFlowData.period,
                comparison: cashFlowData.comparison
            };
        }
        
        if (mode === 'month' && stats) {
            return {
                total: stats.received,
                transacoes: stats.countPaid + stats.countPartial + stats.countPending,
                pix: stats.byMethod?.pix || 0,
                cartao: stats.byMethod?.card || 0,
                dinheiro: stats.byMethod?.cash || 0,
                particular: stats.byType?.particular || 0,
                pacote: stats.byType?.package || 0,
                convenio: stats.byType?.insurance || 0,
                period: { start: dayjs().startOf('month').format('YYYY-MM-DD'), end: dayjs().format('YYYY-MM-DD'), days: dayjs().date() },
                comparison: { variation: 0, trend: 'up' as const }
            };
        }
        
        return null;
    }, [cashFlowData, stats, mode]);
    
    if (isLoading) {
        return (
            <div className="p-4">
                {renderFilters()}
                <FinancialLoading cardCount={4} />
            </div>
        );
    }

    if (!displayData) {
        return (
            <div className="p-4">
                {renderFilters()}
                <p className="text-gray-500">Nenhuma transação encontrada para o período selecionado.</p>
            </div>
        );
    }

    const { total, transacoes, pix, cartao, dinheiro, period, comparison } = displayData;
    const pixPct = total > 0 ? (pix / total) * 100 : 0;
    const cartaoPct = total > 0 ? (cartao / total) * 100 : 0;
    const dinheiroPct = total > 0 ? (dinheiro / total) * 100 : 0;

    return (
        <div className="p-4">
            {renderFilters()}

            <div className="text-sm text-gray-500 mb-4">
                {label}: {dayjs(period.start).format('DD/MM')} → {dayjs(period.end).format('DD/MM')}
                {period.days > 1 && ` (${period.days} dias)`}
                {' • '}{transacoes} transações
                {mode === 'month' && stats && ' • (via PaymentsContext)'}
            </div>

            {/* CARD PRINCIPAL */}
            <div
                onClick={() => setModalOpen(true)}
                className="bg-gradient-to-r from-green-500 to-green-700 text-white rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-all duration-200 mb-6"
            >
                <div className="p-5">
                    <div className="flex flex-wrap justify-between items-start gap-3">
                        <div>
                            <p className="text-sm opacity-90">Total Entrou no Caixa (clique para ver extrato)</p>
                            <p className="text-3xl font-bold mt-1">💰{formatCurrency(total)}</p>
                        </div>
                        {comparison && comparison.variation !== 0 && (
                            <div className="text-right">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-white/20`}>
                                    {comparison.trend === 'up' ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                                    {`${comparison.trend === 'up' ? '+' : ''}${comparison.variation.toFixed(1)}%`}
                                </span>
                                <p className="text-xs opacity-80 mt-1">vs {isSingleDay ? 'ontem' : 'período anterior'}</p>
                            </div>
                        )}
                    </div>
                    <p className="text-xs opacity-80 mt-3">📋 Clique para ver detalhes das {transacoes} transações</p>
                </div>
            </div>

            {/* POR MÉTODO */}
            <h3 className="text-lg font-semibold text-gray-800 mb-3">💳 Por Forma de Pagamento</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div onClick={() => setModalOpen(true)} className="border-l-4 border-cyan-500 bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer">
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <PixIcon className="text-cyan-500" />
                            <span className="text-sm text-gray-500">PIX</span>
                        </div>
                        <p className="text-xl font-bold text-cyan-600">{formatCurrency(pix)}</p>
                        <div className="mt-2 h-1.5 w-full bg-cyan-100 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${pixPct}%` }}></div>
                        </div>
                    </div>
                </div>

                <div onClick={() => setModalOpen(true)} className="border-l-4 border-purple-500 bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer">
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <CreditCard className="text-purple-500" />
                            <span className="text-sm text-gray-500">Cartão</span>
                        </div>
                        <p className="text-xl font-bold text-purple-600">{formatCurrency(cartao)}</p>
                        <div className="mt-2 h-1.5 w-full bg-purple-100 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${cartaoPct}%` }}></div>
                        </div>
                    </div>
                </div>

                <div onClick={() => setModalOpen(true)} className="border-l-4 border-green-500 bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer">
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Money className="text-green-500" />
                            <span className="text-sm text-gray-500">Dinheiro</span>
                        </div>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(dinheiro)}</p>
                        <div className="mt-2 h-1.5 w-full bg-green-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${dinheiroPct}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* POR ORIGEM */}
            <h3 className="text-lg font-semibold text-gray-800 mb-3">📦 Por Origem</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div onClick={() => setModalOpen(true)} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer">
                    <div className="p-4">
                        <p className="text-sm text-gray-500">Particular</p>
                        <p className="text-xl font-bold text-blue-600">{formatCurrency(displayData?.particular || 0)}</p>
                    </div>
                </div>

                <div onClick={() => setModalOpen(true)} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer">
                    <div className="p-4">
                        <p className="text-sm text-gray-500">Venda de Pacotes</p>
                        <p className="text-xl font-bold text-pink-500">{formatCurrency(displayData?.pacote || 0)}</p>
                    </div>
                </div>

                <div onClick={() => setModalOpen(true)} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer">
                    <div className="p-4">
                        <p className="text-sm text-gray-500">Convênio</p>
                        <p className="text-xl font-bold text-amber-500">{formatCurrency(displayData?.convenio || 0)}</p>
                    </div>
                </div>
            </div>

            {/* GRÁFICOS */}
            {chartData && (
                <>
                    <hr className="my-6 border-gray-200" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">📊 Análise do Período</h3>
                    <FinancialCharts
                        productionMix={chartData.productionMix}
                        packageStatus={chartData.packageStatus}
                        insuranceStatus={chartData.insuranceStatus}
                    />
                </>
            )}

            <ExtratoModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                startDate={startDate}
                endDate={endDate}
                periodLabel={label}
            />
        </div>
    );
};

export default CaixaTab;