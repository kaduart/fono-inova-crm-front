// src/pages/Financial/FinancialDashboard.tsx - VERSÃO OTIMIZADA COM LAZY LOADING

import { Suspense, lazy } from 'react';
import { Box, Grid, Paper, Skeleton, Tab, Tabs, Typography, useTheme, FormControl, Select, MenuItem } from '@mui/material';
import {
    Calendar,
    DollarSign,
    BarChart3,
    Receipt,
    CreditCard,
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
const UnifiedCashflowTab = lazyWithRetry(() => import('./UnifiedCashflowTab'));
const DashboardV3Tab = lazyWithRetry(() => import('./tabs/DashboardV3Tab'));

// ── Skeletons por aba ─────────────────────────────────────────────────────────

const KpiCard = ({ color }: { color: string }) => (
    <Box sx={{ p: 2, border: `1px solid ${color}30`, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Skeleton variant="circular" width={36} height={36} />
            <Skeleton variant="text" width="55%" />
        </Box>
        <Skeleton variant="text" width="65%" height={32} />
        <Skeleton variant="text" width="40%" />
    </Box>
);

const SkeletonTable = ({ cols = 6, rows = 5 }: { cols?: number; rows?: number }) => (
    <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', gap: 2, p: 1.5, bgcolor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
            {Array.from({ length: cols }).map((_, i) => (
                <Skeleton key={i} variant="text" width={70} />
            ))}
        </Box>
        {Array.from({ length: rows }).map((_, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 2, p: 1.5, alignItems: 'center', borderBottom: i < rows - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <Skeleton variant="circular" width={30} height={30} />
                {Array.from({ length: cols - 1 }).map((_, j) => (
                    <Skeleton key={j} variant="text" width={j === 0 ? 110 : 75} sx={{ flex: j === 0 ? 1 : undefined }} />
                ))}
            </Box>
        ))}
    </Box>
);

const CaixaFluxoSkeleton = () => (
    <Box sx={{ p: 2, space: 3 }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
            {['#16A34A', '#1D4ED8', '#D97706', '#DC2626'].map((color, i) => (
                <Grid item xs={12} sm={6} md={3} key={i}><KpiCard color={color} /></Grid>
            ))}
        </Grid>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
                <Skeleton key={i} variant="rounded" width={100} height={36} />
            ))}
        </Box>
        <SkeletonTable cols={7} rows={6} />
    </Box>
);

const PaymentsSkeleton = () => (
    <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Skeleton variant="text" width={200} height={32} />
            <Box sx={{ display: 'flex', gap: 1 }}>
                <Skeleton variant="rounded" width={120} height={36} />
                <Skeleton variant="rounded" width={100} height={36} />
            </Box>
        </Box>
        <Grid container spacing={2} sx={{ mb: 3 }}>
            {['#10B981', '#3B82F6'].map((color, i) => (
                <Grid item xs={12} sm={6} key={i}><KpiCard color={color} /></Grid>
            ))}
        </Grid>
        <SkeletonTable cols={7} rows={5} />
    </Box>
);

const InsuranceSkeleton = () => (
    <Box sx={{ p: 2 }}>
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
            {['#F59E0B', '#3B82F6', '#10B981'].map((color, i) => (
                <Grid item xs={12} md={4} key={i}><KpiCard color={color} /></Grid>
            ))}
        </Grid>
        <Box sx={{ border: '1px solid #E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', gap: 1, p: 1, bgcolor: '#FAFAFF', borderBottom: '1px solid #E5E7EB' }}>
                {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" width={130} height={36} />)}
            </Box>
            <Box sx={{ p: 2 }}>
                {[1, 2, 3].map(i => (
                    <Box key={i} sx={{ p: 2, mb: 1.5, border: '1px solid #E5E7EB', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Skeleton variant="circular" width={40} height={40} />
                            <Box>
                                <Skeleton variant="text" width={130} />
                                <Skeleton variant="text" width={90} />
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Skeleton variant="rounded" width={80} height={30} />
                            <Skeleton variant="rounded" width={80} height={30} />
                        </Box>
                    </Box>
                ))}
            </Box>
        </Box>
    </Box>
);

const ExpensesSkeleton = () => (
    <Box sx={{ p: 2 }}>
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
            {['#10B981', '#F59E0B', '#6366F1'].map((color, i) => (
                <Grid item xs={12} md={4} key={i}><KpiCard color={color} /></Grid>
            ))}
        </Grid>
        <Box sx={{ p: 2, mb: 2, border: '1px solid #E5E7EB', borderRadius: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rounded" width={120} height={40} />)}
        </Box>
        <SkeletonTable cols={8} rows={5} />
    </Box>
);

const DashboardV3Skeleton = () => (
    <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rounded" width={100} height={36} />)}
        </Box>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {['#10B981', '#3B82F6', '#F59E0B'].map((color, i) => (
                <Box key={i} sx={{ p: 2.5, border: `1px solid ${color}30`, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Skeleton variant="circular" width={36} height={36} />
                        <Skeleton variant="text" width="55%" />
                    </Box>
                    <Skeleton variant="text" width="70%" height={36} />
                    <Skeleton variant="text" width="45%" />
                </Box>
            ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton variant="rounded" height={200} />
            <Skeleton variant="rounded" height={200} />
        </div>
    </Box>
);

const PlanningSkeleton = () => (
    <Box sx={{ p: 2 }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
            {['#16A34A', '#3B82F6', '#6366F1', '#F59E0B', '#10B981'].map((color, i) => (
                <Grid item xs={12} sm={6} md={3} key={i}><KpiCard color={color} /></Grid>
            ))}
        </Grid>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" width={130} height={36} />)}
        </Box>
        <SkeletonTable cols={6} rows={6} />
    </Box>
);

// ─────────────────────────────────────────────────────────────────────────────

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
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const theme = useTheme();

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setCurrentTab(newValue);
    };

    const allTabs = [
        { id: 'caixa-unificado', label: 'Caixa & Fluxo', icon: <LayoutDashboard size={18} /> },
        { id: 'pagamentos', label: 'Pagamentos', icon: <DollarSign size={18} /> },
        { id: 'convenios', label: 'Convênios', icon: <CreditCard size={18} /> },
        { id: 'despesas', label: 'Despesas', icon: <Receipt size={18} /> },
        { id: 'dashboard-v3', label: 'Dashboard', icon: <BarChart3 size={18} /> },
        { id: 'planejamento', label: 'Planejamento Anual', icon: <Calendar size={18} /> },
    ];

    const currentTabId = allTabs[currentTab]?.id;

    const renderActiveTab = () => {
        switch (currentTabId) {
            case 'caixa-unificado':
                return (
                    <Suspense fallback={<CaixaFluxoSkeleton />}>
                        <UnifiedCashflowTab month={selectedMonth} year={selectedYear} />
                    </Suspense>
                );
            case 'pagamentos':
                return (
                    <Suspense fallback={<PaymentsSkeleton />}>
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
                    </Suspense>
                );
            case 'convenios':
                return (
                    <Suspense fallback={<InsuranceSkeleton />}>
                        <InsuranceTab month={selectedMonth} year={selectedYear} />
                    </Suspense>
                );
            case 'despesas':
                return (
                    <Suspense fallback={<ExpensesSkeleton />}>
                        <ExpensesTab month={selectedMonth} year={selectedYear} />
                    </Suspense>
                );
            case 'dashboard-v3':
                return (
                    <Suspense fallback={<DashboardV3Skeleton />}>
                        <DashboardV3Tab month={selectedMonth} year={selectedYear} />
                    </Suspense>
                );
            case 'planejamento':
                return (
                    <Suspense fallback={<PlanningSkeleton />}>
                        <PlanningTab month={selectedMonth} year={selectedYear} />
                    </Suspense>
                );
            default:
                return (
                    <Suspense fallback={<DashboardV3Skeleton />}>
                        <DashboardV3Tab month={selectedMonth} year={selectedYear} />
                    </Suspense>
                );
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
                                backgroundColor: 'rgba(55, 171, 135, 0.15)',
                                backdropFilter: 'blur(10px)'
                            }}
                        >
                            <DollarSign size={28} style={{ color: '#00B57A' }} />
                        </div>
                        <div>
                            <Typography variant="h4" fontWeight="bold" color="grey.800" gutterBottom>
                                Painel Financeiro
                            </Typography>
                            <Typography variant="body1" color="grey.600" sx={{ opacity: 0.8 }}>
                                Dia a dia: lançamentos, despesas, convênios, extrato e análise estratégica
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
                    {allTabs.map((tab, index) => (
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

                <Box key={currentTabId} sx={{ p: { xs: 0.5, sm: 1, md: 2 } }}>
                    {renderActiveTab()}
                </Box>
            </Paper>
        </Box>
    );
};

export default FinancialDashboard;
