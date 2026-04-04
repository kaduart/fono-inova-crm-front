import { useState } from 'react';
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
    TrendingUp as TrendingUpIcon,
} from 'lucide-react';
import { Tabs, Tab, Box, Paper } from '@mui/material';
import { useFinancialV2, useFinancialKPIs, useChartData } from './hooks/useFinancialV2';
import { MetricCard, KPICard } from './components/MetricCard';
import { ValidationAlerts, Insights } from './components/ValidationAlerts';
import { FinancialCharts } from './components/FinancialCharts';
import { CaixaTab } from './components/CaixaTab';
import { MetasTab } from './components/MetasTab';
import { formatCurrency } from '../../utils/format';

// ======================================================
// ABA 1: VISÃO GERAL (Mensal)
// ======================================================
const VisaoGeralTab = () => {
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
    const navigate = useNavigate();
    
    const { data, isLoading, isError, refetch } = useFinancialV2({ period });
    
    const handleReceivablesClick = () => navigate('/admin/financial?tab=insurance');
    const handlePackagesClick = () => navigate('/admin/financial?tab=packages');
    const handlePatientsDebtClick = () => navigate('/admin/financial?tab=patients');
    const handleProductionClick = () => navigate('/admin/financial');
    
    const kpis = useFinancialKPIs(data?.totals);
    const chartData = useChartData(data?.totals);
    
    if (isLoading) {
        return (
            <div className="p-8 animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 bg-gray-200 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }
    
    if (isError || !data) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <p className="text-red-700 font-medium">Erro ao carregar dados financeiros</p>
                    <button
                        onClick={() => refetch()}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }
    
    const { totals, blockingErrors, warnings, periodStart, periodEnd } = data;
    
    return (
        <div className="space-y-6">
            {/* Período */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                    Período: {new Date(periodStart).toLocaleDateString('pt-BR')} até{' '}
                    {new Date(periodEnd).toLocaleDateString('pt-BR')}
                </p>
                <div className="flex items-center gap-3">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as any)}
                        className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                    >
                        <option value="day">Hoje</option>
                        <option value="week">Semana</option>
                        <option value="month">Mês</option>
                        <option value="year">Ano</option>
                    </select>
                    <button
                        onClick={() => refetch()}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>
            
            {/* Alertas */}
            <ValidationAlerts blockingErrors={blockingErrors} warnings={warnings} />
            
            {/* Top Cards - CLICÁVEIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="💰 Caixa Recebido"
                    value={totals.totalReceived}
                    subtitle="Dinheiro que entrou"
                    icon={<DollarSign className="w-8 h-8" />}
                    color="green"
                    size="lg"
                />
                
                <div onClick={handleProductionClick} className="cursor-pointer hover:scale-[1.02] transition-transform">
                    <MetricCard
                        title="📊 Produção"
                        value={totals.totalProduction}
                        subtitle="Tudo que foi realizado →"
                        icon={<TrendingUp className="w-8 h-8" />}
                        color="blue"
                        size="lg"
                    />
                </div>
                
                <div onClick={handleReceivablesClick} className="cursor-pointer hover:scale-[1.02] transition-transform">
                    <MetricCard
                        title="🏥 A Receber"
                        value={totals.insurance.pendingBilling + totals.insurance.billed}
                        subtitle="Convênios →"
                        icon={<Building2 className="w-8 h-8" />}
                        color="purple"
                        size="lg"
                    />
                </div>
                
                <div onClick={handlePackagesClick} className="cursor-pointer hover:scale-[1.02] transition-transform">
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
            
            {/* KPIs */}
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
            
            <Insights kpis={kpis} />
            
            {/* Gráficos */}
            {chartData && (
                <FinancialCharts
                    productionMix={chartData.productionMix}
                    packageStatus={chartData.packageStatus}
                    insuranceStatus={chartData.insuranceStatus}
                />
            )}
            
            {/* Conta Corrente */}
            <div 
                onClick={handlePatientsDebtClick}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">Conta Corrente de Pacientes</h3>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-red-50 rounded-lg">
                        <span className="text-sm text-gray-700">Dívida</span>
                        <p className="font-bold text-red-700">{formatCurrency(totals.patientBalance.totalDebt)}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg">
                        <span className="text-sm text-gray-700">Crédito</span>
                        <p className="font-bold text-emerald-700">{formatCurrency(totals.patientBalance.totalCredit)}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-700">Pacientes com Dívida</span>
                        <p className="font-bold text-gray-700">{totals.patientBalance.patientsWithDebt}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ======================================================
// DASHBOARD PRINCIPAL COM ABAS
// ======================================================
export const FinancialV2Dashboard = () => {
    const [activeTab, setActiveTab] = useState(0);
    
    return (
        <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard Financeiro V2</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Visão simplificada para decisão
                    </p>
                </div>
            </div>
            
            {/* Abas */}
            <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Tabs 
                    value={activeTab} 
                    onChange={(_, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ 
                        borderBottom: 1, 
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        '& .MuiTabs-flexContainer': { gap: 1, px: 1 }
                    }}
                >
                    <Tab 
                        icon={<Calendar className="w-5 h-5" />} 
                        label="Caixa" 
                        sx={{ textTransform: 'none', fontWeight: 600, minHeight: 56 }}
                    />
                    <Tab 
                        icon={<TrendingUpIcon className="w-5 h-5" />} 
                        label="Visão Geral" 
                        sx={{ textTransform: 'none', fontWeight: 600, minHeight: 56 }}
                    />
                    <Tab 
                        icon={<TrendingUp className="w-5 h-5" />} 
                        label="Metas" 
                        sx={{ textTransform: 'none', fontWeight: 600, minHeight: 56 }}
                    />
                </Tabs>
                
                <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                    {activeTab === 0 && <CaixaTab />}
                    {activeTab === 1 && <VisaoGeralTab />}
                    {activeTab === 2 && <MetasTab />}
                </Box>
            </Paper>
            
            {/* Footer */}
            <div className="text-center text-xs text-gray-400 pt-4">
                <p>Financial V2 • Sistema de contabilidade por competência</p>
            </div>
        </div>
    );
};

export default FinancialV2Dashboard;
