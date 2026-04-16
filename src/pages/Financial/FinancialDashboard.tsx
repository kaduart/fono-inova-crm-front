// src/pages/Financial/FinancialDashboard.tsx - VERSÃO OTIMIZADA COM LAZY LOADING

import { Suspense, lazy } from 'react';
import { Box, Paper, Tab, Tabs, Typography, useTheme, ToggleButton, ToggleButtonGroup, Skeleton, FormControl, Select, MenuItem } from '@mui/material';
import {
    Calendar,
    DollarSign,
    PieChart,
    Target,
    BarChart3,
    Receipt,
    CreditCard,
    ArrowLeftRight,
    LayoutDashboard,
} from 'lucide-react';
import { useState } from 'react';
import { FinancialRecord } from '../../services/paymentService';
import { IDoctor, IPatient } from '../../utils/types/types';

// 🔧 Helper para lazy loading com retry em caso de falha de chunk
const lazyWithRetry = (importFn: () => Promise<any>, retries = 3, delay = 1500) => {
  return lazy(() => {
    let attempts = 0;
    
    const tryLoad = (): Promise<any> => {
      attempts++;
      return importFn().catch((error: any) => {
        const isChunkError = error?.name === 'TypeError' || 
                           error?.message?.includes('Failed to fetch dynamically imported module') ||
                           error?.message?.includes('load failed');
        
        if (isChunkError) {
          console.warn(`[FinancialDashboard] Chunk load failed (attempt ${attempts}/${retries})`);
          
          if (attempts < retries) {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve(tryLoad());
              }, delay * attempts);
            });
          }
          
          console.error('[FinancialDashboard] Chunk failed after all retries. Reloading page...');
          window.location.reload();
          return new Promise(() => {});
        }
        
        throw error;
      });
    };
    
    return tryLoad();
  });
};

// 🚀 LAZY LOAD: Só carrega quando a aba for ativada
const PaymentPage = lazyWithRetry(() => import('../../components/financial/PaymentPage'));
const ExpensesTab = lazyWithRetry(() => import('./tabs/ExpensesTab'));
const InsuranceTab = lazyWithRetry(() => import('./tabs/InsuranceTab'));
const PlanningTab = lazyWithRetry(() => import('./tabs/PlanningTab'));
const AnaliseProjecaoTab = lazyWithRetry(() => import('./tabs/AnaliseProjecaoTab'));
const UnifiedCashflowTab = lazyWithRetry(() => import('./UnifiedCashflowTab'));
const DashboardV3Tab = lazyWithRetry(() => import('./tabs/DashboardV3Tab'));

// 🔄 Skeleton de loading para tabs
const TabSkeleton = () => (
    <div className="p-6 space-y-4">
        <Skeleton variant="rectangular" height={120} />
        <Skeleton variant="rectangular" height={200} />
        <Skeleton variant="rectangular" height={150} />
    </div>
);

interface FinancialDashboardProps {
    patients: IPatient[];
    doctors: IDoctor[];
    initialPayments: FinancialRecord[];
    onMarkAsPaid: (payment: FinancialRecord) => void;
    registerAppointmentAndPaymentFuture: (payment: FinancialRecord) => void;
    onCancelPayment: (paymentId: string) => void;
}

const FinancialDashboard = ({
    patients,
    doctors,
    initialPayments,
    onMarkAsPaid,
    registerAppointmentAndPaymentFuture,
    onCancelPayment
}: FinancialDashboardProps) => {
    const [currentTab, setCurrentTab] = useState(0);
    const [viewMode, setViewMode] = useState<'operacional' | 'estrategico'>('operacional');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const theme = useTheme();

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    const handleViewModeChange = (
        _event: React.MouseEvent<HTMLElement>,
        newMode: 'operacional' | 'estrategico',
    ) => {
        if (newMode !== null) {
            setViewMode(newMode);
            setCurrentTab(0);
        }
    };

    // Configuração das tabs operacionais
    const operacionalTabs = [
        { id: 'caixa-unificado', label: 'Caixa & Fluxo', icon: <LayoutDashboard size={18} /> },
        { id: 'pagamentos', label: 'Pagamentos', icon: <DollarSign size={18} /> },
        { id: 'convenios', label: 'Convênios', icon: <CreditCard size={18} /> },
        { id: 'despesas', label: 'Despesas', icon: <Receipt size={18} /> },
        { id: 'dashboard-v3', label: 'Dashboard', icon: <BarChart3 size={18} /> },  // 🆕 V3 único dashboard inteligente
    ];

    // Configuração das tabs estratégicas
    const estrategicoTabs = [
        { id: 'dashboard-v3', label: 'Dashboard', icon: <BarChart3 size={18} /> },  // 🆕 V3 também no estratégico
        { id: 'analise-projecao', label: 'Análise & Projeção', icon: <PieChart size={18} /> },
        { id: 'planejamento', label: 'Planejamento Anual', icon: <Calendar size={18} /> },
    ];

    const currentTabs = viewMode === 'operacional' ? operacionalTabs : estrategicoTabs;
    const currentTabId = currentTabs[currentTab]?.id;

    // 🎯 Renderiza apenas a aba ativa (lazy loaded)
    const renderActiveTab = () => {
        return (
            <Suspense fallback={<TabSkeleton />}>
                {viewMode === 'operacional' ? renderOperacionalTab() : renderEstrategicoTab()}
            </Suspense>
        );
    };

    // 🎯 Renderiza apenas a aba ativa (lazy loaded)
    const renderOperacionalTab = () => {
        switch (currentTabId) {
            case 'dashboard-v3':
                return <DashboardV3Tab month={selectedMonth} year={selectedYear} />;
            case 'pagamentos':
                return (
                    <PaymentPage
                        patients={patients}
                        doctors={doctors}
                        onMarkAsPaid={onMarkAsPaid}
                        registerAppointmentAndPayemntFuture={registerAppointmentAndPaymentFuture}
                        onCancelPayment={onCancelPayment}
                        enabled={true}
                        month={selectedMonth}
                        year={selectedYear}
                    />
                );
            case 'despesas':
                return <ExpensesTab month={selectedMonth} year={selectedYear} />;
            case 'convenios':
                return <InsuranceTab month={selectedMonth} year={selectedYear} />;
            case 'caixa-unificado':
                return <UnifiedCashflowTab month={selectedMonth} year={selectedYear} />;
            default:
                return <DashboardV3Tab />;
        }
    };

    const renderEstrategicoTab = () => {
        switch (currentTabId) {
            case 'dashboard-v3':
                return <DashboardV3Tab />;
            case 'analise-projecao':
                return <AnaliseProjecaoTab month={selectedMonth} year={selectedYear} />;
            case 'planejamento':
                return <PlanningTab month={selectedMonth} year={selectedYear} />;
            default:
                return <DashboardV3Tab />;
        }
    };

    return (
        <Box>
            {/* Header */}
            <Paper
                elevation={2}
                sx={{
                    p: { xs: 2, md: 4 },
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}10)`,
                    border: `1px solid ${theme.palette.divider}`,
                    mb: 2
                }}
            >
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
                    <div className="flex items-center gap-4">
                        <div
                            className="p-3 rounded-2xl"
                            style={{
                                backgroundColor: viewMode === 'estrategico' 
                                    ? 'rgba(139, 92, 246, 0.15)' 
                                    : 'rgba(55, 171, 135, 0.15)',
                                backdropFilter: 'blur(10px)'
                            }}
                        >
                            <DollarSign 
                                size={28} 
                                style={{ color: viewMode === 'estrategico' ? '#8B5CF6' : '#00B57A' }} 
                            />
                        </div>
                        <div>
                            <Typography variant="h4" fontWeight="bold" color="grey.800" gutterBottom>
                                Painel Financeiro
                            </Typography>
                            <Typography variant="body1" color="grey.600" sx={{ opacity: 0.8 }}>
                                {viewMode === 'operacional'
                                    ? ' Dia a dia: lançamentos, despesas, convênios e extrato'
                                    : ' Estratégia: dashboard executivo, metas, inteligência financeira, BI e planejamento'}
                            </Typography>
                        </div>
                    </div>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', width: { xs: '100%', md: 'auto' } }}>
                        {/* Seletor global de mês/ano */}
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <FormControl size="small" sx={{ minWidth: 100 }}>
                                <Select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                    sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
                                >
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <MenuItem key={i + 1} value={i + 1}>
                                            {new Date(2000, i).toLocaleString('pt-BR', { month: 'short' })}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 80 }}>
                                <Select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
                                >
                                    {[2024, 2025, 2026, 2027].map((y) => (
                                        <MenuItem key={y} value={y}>{y}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        <ToggleButtonGroup
                            value={viewMode}
                            exclusive
                            onChange={handleViewModeChange}
                            aria-label="modo de visualização"
                            size="small"
                            sx={{
                                width: { xs: '100%', md: 'auto' },
                                bgcolor: 'background.paper',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                                '& .MuiToggleButton-root': {
                                    flex: 1,
                                    px: { xs: 2, md: 3 },
                                    py: 1,
                                    border: 'none',
                                    borderRadius: 1,
                                    fontWeight: 600,
                                    textTransform: 'none',
                                    '&.Mui-selected': {
                                        bgcolor: viewMode === 'estrategico' ? '#8B5CF6' : '#10B981',
                                        color: 'white',
                                        '&:hover': {
                                            bgcolor: viewMode === 'estrategico' ? '#7C3AED' : '#059669',
                                        }
                                    }
                                }
                            }}
                        >
                            <ToggleButton value="operacional">Operacional</ToggleButton>
                            <ToggleButton value="estrategico">Estratégico</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </div>
            </Paper>

            {/* Tabs */}
            <Paper elevation={1} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Tabs
                    value={currentTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        '& .MuiTabs-flexContainer': { gap: 1, px: 1 }
                    }}
                >
                    {currentTabs.map((tab, index) => (
                        <Tab
                            key={tab.id}
                            label={tab.label}
                            icon={tab.icon}
                            iconPosition="start"
                            sx={{
                                minHeight: { xs: 48, md: 64 },
                                textTransform: 'none',
                                fontSize: { xs: '0.75rem', md: '1rem' },
                                fontWeight: 500,
                                borderRadius: 2,
                            }}
                        />
                    ))}
                </Tabs>

                <Box sx={{ p: { xs: 0.5, sm: 1, md: 2 } }}>
                    {renderActiveTab()}
                </Box>
            </Paper>
        </Box>
    );
};

export default FinancialDashboard;
