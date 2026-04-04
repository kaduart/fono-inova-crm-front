/**
 * ABA LANÇAMENTOS V2
 * Integração do FinancialV2Dashboard como aba no FinancialDashboard existente
 * Mantém estilo visual do PaymentPage (filtros com chips elegantes)
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DollarSign,
    TrendingUp,
    Package,
    Users,
    Building2,
    RefreshCw,
    ArrowRight,
    Calendar,
    Wallet,
    TrendingDown,
    AlertCircle,
} from 'lucide-react';
import { Button, Paper, Typography, Box, Chip, Divider } from '@mui/material';
import { useFinancialV2, useFinancialKPIs } from '../../FinancialV2/hooks/useFinancialV2';
import { MetricCard, KPICard } from '../../FinancialV2/components/MetricCard';
import { ValidationAlerts, Insights } from '../../FinancialV2/components/ValidationAlerts';
import { FinancialCharts } from '../../FinancialV2/components/FinancialCharts';
import { useChartData } from '../../FinancialV2/hooks/useFinancialV2';
import { formatCurrency } from '../../../utils/format';
import { FinancialTableLoading } from '../components/FinancialLoading';
// Formatador de data simples sem dayjs para evitar problemas de import
const formatDateBR = (dateStr: string): string => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR');
};

// ======================================================
// COMPONENTE PRINCIPAL
// ======================================================
const LancamentosV2Tab = () => {
    const navigate = useNavigate();
    
    // Estados de período (igual ao PaymentPage)
    type PeriodType = 'day' | 'week' | 'month' | 'year' | 'last_week' | 'last_month' | 'custom';
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Mapeia period para o hook
    const periodMap: Record<string, 'day' | 'week' | 'month' | 'year'> = {
        'day': 'day',
        'week': 'week',
        'month': 'month',
        'year': 'year',
        'last_week': 'week',
        'last_month': 'month',
        'custom': 'month',
    };

    const { data, isLoading, isError, refetch } = useFinancialV2({ 
        period: periodMap[selectedPeriod] || 'month' 
    });

    const kpis = useFinancialKPIs(data?.totals);
    const chartData = useChartData(data?.totals);

    // Chips de filtro rápido (estilo PaymentPage)
    const periodChips = [
        { key: 'day', label: 'Hoje', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
        { key: 'week', label: 'Esta Semana', color: 'bg-green-100 text-green-800 hover:bg-green-200' },
        { key: 'month', label: 'Este Mês', color: 'bg-purple-100 text-purple-800 hover:bg-purple-200' },
        { key: 'last_week', label: 'Semana Passada', color: 'bg-orange-100 text-orange-800 hover:bg-orange-200' },
        { key: 'last_month', label: 'Mês Passado', color: 'bg-pink-100 text-pink-800 hover:bg-pink-200' },
        { key: 'year', label: 'Este Ano', color: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200' },
    ];

    const handlePeriodChange = async (period: PeriodType) => {
        setSelectedPeriod(period);
        
        if (period === 'custom') {
            return; // Aguarda seleção de datas
        }
        
        setIsRefreshing(true);
        await refetch();
        setIsRefreshing(false);
    };

    const handleCustomDateApply = async () => {
        if (customStartDate && customEndDate) {
            setIsRefreshing(true);
            await refetch();
            setIsRefreshing(false);
        }
    };

    // Navegações
    const handleReceivablesClick = () => navigate('/admin/financial?tab=insurance');
    const handlePackagesClick = () => navigate('/admin/financial?tab=packages');
    const handlePatientsDebtClick = () => navigate('/admin/financial?tab=patients');
    const handleProductionClick = () => navigate('/admin/financial');

    // Loading state
    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                {/* Header Skeleton */}
                <div className="flex items-center justify-between mb-6">
                    <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
                    <div className="flex gap-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-8 w-24 bg-gray-200 rounded-full animate-pulse"></div>
                        ))}
                    </div>
                </div>
                {/* Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-36 bg-gray-200 rounded-xl animate-pulse"></div>
                    ))}
                </div>
                <FinancialTableLoading rowCount={3} colSpan={4} />
            </div>
        );
    }

    // Error state
    if (isError || !data) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <Typography variant="h6" className="text-red-800 mb-2">
                        Erro ao carregar dados financeiros
                    </Typography>
                    <p className="text-red-600 mb-4">
                        Não foi possível carregar os lançamentos financeiros.
                    </p>
                    <Button
                        variant="contained"
                        onClick={() => refetch()}
                        startIcon={<RefreshCw className="w-4 h-4" />}
                        sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}
                    >
                        Tentar novamente
                    </Button>
                </div>
            </div>
        );
    }

    const { totals, blockingErrors, warnings, periodStart, periodEnd } = data;

    return (
        <div className="p-6 space-y-6">
            {/* ======================================================
                HEADER COM FILTROS (Estilo PaymentPage)
            ======================================================*/}
            <div className="space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <Typography variant="h5" fontWeight="700" className="text-gray-900">
                            💰 Lançamentos Financeiros
                        </Typography>
                        <p className="text-sm text-gray-500 mt-1">
                            Visão integrada de caixa, produção e a receber
                        </p>
                    </div>

                    {/* Botão de refresh */}
                    <button
                        onClick={() => refetch()}
                        disabled={isRefreshing}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors self-start lg:self-center"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Filtros de Período - Estilo PaymentPage (Chips) */}
                <Paper elevation={0} className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">Período:</span>
                        
                        {/* Chips de filtro rápido */}
                        <div className="flex flex-wrap gap-2">
                            {periodChips.map((chip) => (
                                <button
                                    key={chip.key}
                                    onClick={() => handlePeriodChange(chip.key as PeriodType)}
                                    disabled={isRefreshing}
                                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
                                        selectedPeriod === chip.key 
                                            ? 'ring-2 ring-offset-2 ring-green-500 shadow-sm ' + chip.color 
                                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                    } ${isRefreshing ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                    {chip.label}
                                </button>
                            ))}
                            
                            {/* Botão período customizado */}
                            <button
                                onClick={() => handlePeriodChange('custom')}
                                disabled={isRefreshing}
                                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1 ${
                                    selectedPeriod === 'custom'
                                        ? 'ring-2 ring-offset-2 ring-green-500 bg-gray-800 text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                } ${isRefreshing ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                <Calendar className="w-3 h-3" />
                                Customizado
                            </button>
                        </div>

                        {/* Inputs de Período Customizado */}
                        {selectedPeriod === 'custom' && (
                            <div className="flex items-center gap-2 ml-0 sm:ml-2 w-full sm:w-auto mt-2 sm:mt-0">
                                <input
                                    type="date"
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                />
                                <span className="text-gray-400">→</span>
                                <input
                                    type="date"
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                />
                                <button
                                    onClick={handleCustomDateApply}
                                    disabled={!customStartDate || !customEndDate || isRefreshing}
                                    className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                >
                                    Aplicar
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Período atual */}
                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>
                            {formatDateBR(periodStart)} até {formatDateBR(periodEnd)}
                        </span>
                        {(isLoading || isRefreshing) && (
                            <span className="flex items-center gap-1 text-green-600">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Atualizando...
                            </span>
                        )}
                    </div>
                </Paper>
            </div>

            {/* ======================================================
                CARDS PRINCIPAIS
            ======================================================*/}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Caixa Recebido */}
                <MetricCard
                    title="💰 Caixa Recebido"
                    value={totals.totalReceived}
                    subtitle="Dinheiro que entrou"
                    icon={<DollarSign className="w-8 h-8" />}
                    color="green"
                    size="lg"
                />
                
                {/* Produção - Clicável */}
                <div 
                    onClick={handleProductionClick}
                    className="cursor-pointer hover:scale-[1.02] transition-transform"
                >
                    <MetricCard
                        title="📊 Produção"
                        value={totals.totalProduction}
                        subtitle="Tudo que foi realizado →"
                        icon={<TrendingUp className="w-8 h-8" />}
                        color="blue"
                        size="lg"
                    />
                </div>
                
                {/* A Receber - Clicável */}
                <div 
                    onClick={handleReceivablesClick}
                    className="cursor-pointer hover:scale-[1.02] transition-transform"
                >
                    <MetricCard
                        title="🏥 A Receber"
                        value={totals.insurance.pendingBilling + totals.insurance.billed}
                        subtitle="Convênios →"
                        icon={<Building2 className="w-8 h-8" />}
                        color="purple"
                        size="lg"
                    />
                </div>
                
                {/* Pacotes - Clicável */}
                <div 
                    onClick={handlePackagesClick}
                    className="cursor-pointer hover:scale-[1.02] transition-transform"
                >
                    <MetricCard
                        title="📦 Pacotes"
                        value={totals.packageCredit.deferredRevenue}
                        subtitle={`${totals.packageCredit.deferredSessions} sessões →`}
                        icon={<Package className="w-8 h-8" />}
                        color="orange"
                        size="lg"
                    />
                </div>
            </div>

            {/* ======================================================
                KPIs E INDICADORES
            ======================================================*/}
            {kpis && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <KPICard
                        title="Risco Operacional"
                        value={kpis.operationalRisk}
                        max={100}
                        status={kpis.operationalRiskStatus as any}
                        description="Obrigação de pacote vs capacidade"
                    />
                    <KPICard
                        title="Execução de Pacotes"
                        value={kpis.packageExecutionRate}
                        max={100}
                        status={kpis.packageExecutionRate > 50 ? 'good' : 'warning'}
                        description="Sessões realizadas vs contratadas"
                    />
                    <KPICard
                        title="Eficiência de Caixa"
                        value={kpis.cashEfficiency}
                        max={100}
                        status={kpis.cashEfficiencyStatus as any}
                        description="Caixa vs Produção"
                    />
                </div>
            )}

            {/* ======================================================
                INSIGHTS E ALERTAS
            ======================================================*/}
            <ValidationAlerts blockingErrors={blockingErrors} warnings={warnings} />
            <Insights kpis={kpis} />

            {/* ======================================================
                GRÁFICOS
            ======================================================*/}
            {chartData && (
                <Paper elevation={1} className="rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-gray-100">
                        <Typography variant="h6" fontWeight="600" className="text-gray-800">
                            📊 Análise Financeira
                        </Typography>
                    </div>
                    <div className="p-4">
                        <FinancialCharts
                            productionMix={chartData.productionMix}
                            packageStatus={chartData.packageStatus}
                            insuranceStatus={chartData.insuranceStatus}
                        />
                    </div>
                </Paper>
            )}

            {/* ======================================================
                CONTA CORRENTE DE PACIENTES
            ======================================================*/}
            <Paper 
                elevation={1}
                className="rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={handlePatientsDebtClick}
            >
                <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <Typography variant="h6" fontWeight="600" className="text-gray-900">
                                    Conta Corrente de Pacientes
                                </Typography>
                                <p className="text-sm text-gray-500">Clique para gerenciar débitos e créditos</p>
                            </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                    
                    <Divider className="my-4" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingDown className="w-4 h-4 text-red-600" />
                                <span className="text-sm font-medium text-gray-700">Dívida Total</span>
                            </div>
                            <p className="text-2xl font-bold text-red-700">
                                {formatCurrency(totals.patientBalance.totalDebt)}
                            </p>
                        </div>
                        
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm font-medium text-gray-700">Crédito Disponível</span>
                            </div>
                            <p className="text-2xl font-bold text-emerald-700">
                                {formatCurrency(totals.patientBalance.totalCredit)}
                            </p>
                        </div>
                        
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="w-4 h-4 text-gray-600" />
                                <span className="text-sm font-medium text-gray-700">Pacientes com Dívida</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-700">
                                {totals.patientBalance.patientsWithDebt}
                            </p>
                        </div>
                    </div>
                </div>
            </Paper>

            {/* ======================================================
                RESUMO POR CATEGORIA
            ======================================================*/}
            <Paper elevation={1} className="rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <Typography variant="h6" fontWeight="600" className="text-gray-800">
                        📋 Resumo por Categoria
                    </Typography>
                </div>
                <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Particular */}
                        <div className="p-4 bg-green-50 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Wallet className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium text-gray-700">Particular</span>
                            </div>
                            <p className="text-lg font-bold text-green-700">
                                {formatCurrency((totals as any).particular?.received || 0)}
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                                {(totals as any).particular?.count || 0} recebimentos
                            </p>
                        </div>

                        {/* Convênios - A Faturar */}
                        <div className="p-4 bg-amber-50 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Building2 className="w-4 h-4 text-amber-600" />
                                <span className="text-sm font-medium text-gray-700">Convênios - A Faturar</span>
                            </div>
                            <p className="text-lg font-bold text-amber-700">
                                {formatCurrency(totals.insurance.pendingBilling)}
                            </p>
                            <Chip 
                                size="small" 
                                label="Pendente" 
                                sx={{ bgcolor: '#fef3c7', color: '#92400e', fontSize: '10px', mt: 1 }} 
                            />
                        </div>

                        {/* Convênios - Faturado */}
                        <div className="p-4 bg-blue-50 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Building2 className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-gray-700">Convênios - Faturado</span>
                            </div>
                            <p className="text-lg font-bold text-blue-700">
                                {formatCurrency(totals.insurance.billed)}
                            </p>
                            <Chip 
                                size="small" 
                                label="Aguardando recebimento" 
                                sx={{ bgcolor: '#dbeafe', color: '#1e40af', fontSize: '10px', mt: 1 }} 
                            />
                        </div>

                        {/* Convênios - Recebido */}
                        <div className="p-4 bg-purple-50 rounded-xl">
                            <div className="flex items-center gap-2 mb-2">
                                <Building2 className="w-4 h-4 text-purple-600" />
                                <span className="text-sm font-medium text-gray-700">Convênios - Recebido</span>
                            </div>
                            <p className="text-lg font-bold text-purple-700">
                                {formatCurrency(totals.insurance.received)}
                            </p>
                            <Chip 
                                size="small" 
                                label="Recebido" 
                                sx={{ bgcolor: '#f3e8ff', color: '#6b21a8', fontSize: '10px', mt: 1 }} 
                            />
                        </div>
                    </div>
                </div>
            </Paper>

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 pt-4 pb-2">
                <p>Financial V2 • Sistema de contabilidade por competência</p>
            </div>
        </div>
    );
};

export default LancamentosV2Tab;
