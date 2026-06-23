// src/pages/Financial/FinancialDashboard.tsx - VERSÃO OTIMIZADA COM LAZY LOADING

import { Suspense, lazy, useEffect, startTransition } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Grid, Paper, Skeleton, Tab, Tabs, Typography, useTheme, FormControl, Select, MenuItem } from '@mui/material';
import {
    Calendar,
    DollarSign,
    BarChart3,
    Receipt,
    CreditCard,
    LayoutDashboard,
    User,
} from 'lucide-react';
import { useState } from 'react';
import { FinancialRecord } from '../../services/paymentService';
import { IDoctor, IPatient } from '../../utils/types/types';
import { CashflowPageSkeleton } from './components/CashflowPageSkeleton';
import UnifiedCashflowTab from './UnifiedCashflowTab';
import ProfessionalResultsPage from '../ProfessionalResults/ProfessionalResultsPage';

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
          
          const reloadKey = 'chunk_reload_attempted';
          const alreadyReloaded = sessionStorage.getItem(reloadKey);
          if (!alreadyReloaded) {
            sessionStorage.setItem(reloadKey, '1');
            window.location.reload();
          }
          console.error('[FinancialDashboard] Chunk failed after all retries + reload.', error);
          throw error;
        }
        
        throw error;
      });
    };
    
    return tryLoad();
  });
};

// 🚀 LAZY LOAD: Só carrega quando a aba for ativada
// NOTA: UnifiedCashflowTab é importado estaticamente (primeira tab — F5 instantâneo)
const PaymentPage = lazyWithRetry(() => import('../../components/financial/PaymentPage'));
const ExpensesTab = lazyWithRetry(() => import('./tabs/ExpensesTab'));
const InsuranceTab = lazyWithRetry(() => import('./tabs/InsuranceTab'));
const PlanningTab = lazyWithRetry(() => import('./tabs/PlanningTab'));
const FinancialDashboardTab = lazyWithRetry(() => import('./tabs/FinancialDashboardTab'));

// ── Skeletons por aba ─────────────────────────────────────────────────────────

const PaymentsSkeleton = () => (
    <div className="p-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
                <Skeleton variant="circular" width={48} height={48} sx={{ bgcolor: '#EF444420' }} />
                <div>
                    <Skeleton variant="text" width={160} height={30} />
                    <Skeleton variant="text" width={220} height={20} />
                </div>
            </div>
            <Skeleton variant="rounded" width={145} height={36} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {[{ color: '#10B981' }, { color: '#F59E0B' }].map((c, i) => (
                <div key={i} className="border rounded-xl p-4" style={{ borderColor: `${c.color}20`, backgroundColor: `${c.color}08` }}>
                    <div className="flex items-center gap-4">
                        <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: `${c.color}20` }} />
                        <div className="flex-1">
                            <Skeleton variant="text" width="55%" height={20} />
                            <Skeleton variant="text" width="70%" height={32} sx={{ bgcolor: `${c.color}15` }} />
                            <Skeleton variant="text" width="40%" height={16} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-2">
                <div className="flex gap-2">
                    {[24, 70, 140, 80, 90, 70, 75].map((w, i) => <Skeleton key={i} variant="text" width={w} />)}
                </div>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center p-2 border-t">
                    <Skeleton variant="circular" width={24} height={24} />
                    <Skeleton variant="text" width={140} className="ml-2" />
                    <Skeleton variant="text" width={90} className="ml-2" />
                    <Skeleton variant="text" width={80} className="ml-2" />
                    <Skeleton variant="rounded" width={70} height={22} className="ml-2" sx={{ bgcolor: '#10B98115' }} />
                    <Skeleton variant="text" width={70} className="ml-auto" />
                    <Skeleton variant="rounded" width={80} height={24} className="ml-2" sx={{ bgcolor: '#10B98115' }} />
                    <div className="flex gap-1 ml-2">
                        <Skeleton variant="circular" width={28} height={28} />
                        <Skeleton variant="circular" width={28} height={28} />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const InsuranceSkeleton = () => (
    <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {[{ color: '#F59E0B' }, { color: '#3B82F6' }, { color: '#10B981' }].map((c, i) => (
                <div key={i} className="border rounded-xl p-4" style={{ borderColor: `${c.color}20`, backgroundColor: `${c.color}08` }}>
                    <div className="flex items-center gap-4">
                        <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: `${c.color}20` }} />
                        <div className="flex-1">
                            <Skeleton variant="text" width="55%" height={20} />
                            <Skeleton variant="text" width="70%" height={32} sx={{ bgcolor: `${c.color}15` }} />
                            <Skeleton variant="text" width="40%" height={16} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
        <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex gap-2">
                {[130, 130, 130].map((w, i) => <Skeleton key={i} variant="rounded" width={w} height={36} />)}
            </div>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-2 border-b border-gray-200">
                <div className="flex gap-2">
                    {[130, 130, 130].map((w, i) => <Skeleton key={i} variant="rounded" width={w} height={36} />)}
                </div>
            </div>
            <div className="p-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="mb-2 border border-gray-200 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-2 bg-gray-50">
                            <div className="flex items-center gap-2">
                                <Skeleton variant="circular" width={32} height={32} sx={{ bgcolor: '#3B82F615' }} />
                                <div>
                                    <Skeleton variant="text" width={150} height={20} />
                                    <Skeleton variant="text" width={100} height={16} />
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <Skeleton variant="rounded" width={90} height={30} sx={{ bgcolor: '#F59E0B15' }} />
                                <Skeleton variant="rounded" width={90} height={30} sx={{ bgcolor: '#3B82F615' }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const ExpensesSkeleton = () => (
    <div className="p-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
                <Skeleton variant="circular" width={48} height={48} sx={{ bgcolor: '#EF444420' }} />
                <div>
                    <Skeleton variant="text" width={160} height={30} />
                    <Skeleton variant="text" width={220} height={20} />
                </div>
            </div>
            <Skeleton variant="rounded" width={145} height={36} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {[{ color: '#10B981' }, { color: '#F59E0B' }, { color: '#6366F1' }].map((c, i) => (
                <div key={i} className="border rounded-xl p-4" style={{ borderColor: `${c.color}20`, backgroundColor: `${c.color}08` }}>
                    <div className="flex items-center gap-4">
                        <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: `${c.color}20` }} />
                        <div className="flex-1">
                            <Skeleton variant="text" width="55%" height={20} />
                            <Skeleton variant="text" width="70%" height={32} sx={{ bgcolor: `${c.color}15` }} />
                            <Skeleton variant="text" width="40%" height={16} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
        <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex flex-wrap gap-2">
                {[120, 120, 120, 120].map((w, i) => <Skeleton key={i} variant="rounded" width={w} height={40} />)}
                <Skeleton variant="rounded" width={110} height={40} className="ml-auto" />
            </div>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-2">
                <div className="flex gap-2">
                    {[24, 70, 140, 80, 90, 70, 75, 80].map((w, i) => <Skeleton key={i} variant="text" width={w} />)}
                </div>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center p-2 border-t">
                    <Skeleton variant="circular" width={24} height={24} />
                    <Skeleton variant="rounded" width={70} height={22} className="ml-2" sx={{ bgcolor: '#10B98115' }} />
                    <Skeleton variant="text" width={140} className="ml-2" />
                    <Skeleton variant="rounded" width={80} height={24} className="ml-2" sx={{ bgcolor: '#6366F115' }} />
                    <Skeleton variant="text" width={90} className="ml-2" />
                    <Skeleton variant="text" width={70} className="ml-auto" />
                    <Skeleton variant="rounded" width={75} height={24} className="ml-2" />
                    <Skeleton variant="rounded" width={80} height={24} className="ml-2" sx={{ bgcolor: '#10B98115' }} />
                    <div className="flex gap-1 ml-2">
                        <Skeleton variant="circular" width={28} height={28} />
                        <Skeleton variant="circular" width={28} height={28} />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const DashboardV3Skeleton = () => (
    <div className="p-4 space-y-5">
        <div className="flex gap-2 pb-2 border-b border-gray-200">
            {[{ w: 80 }, { w: 80 }, { w: 96 }, { w: 64 }].map((t, i) => (
                <Skeleton key={i} variant="rounded" width={t.w} height={36} />
            ))}
        </div>
        <div className="p-5 rounded-2xl border" style={{ borderColor: '#10B98120', backgroundColor: '#10B98108' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Skeleton variant="text" width={130} height={20} sx={{ bgcolor: '#10B98115' }} />
                    <Skeleton variant="text" width={110} height={40} sx={{ bgcolor: '#10B98115' }} />
                    <Skeleton variant="text" width={160} height={16} sx={{ bgcolor: '#10B98115' }} />
                </div>
                <div className="space-y-3">
                    <Skeleton variant="text" width={120} height={16} sx={{ bgcolor: '#10B98115' }} />
                    <Skeleton variant="rounded" width="100%" height={12} sx={{ bgcolor: '#10B98115' }} />
                    <Skeleton variant="text" width={100} height={16} sx={{ bgcolor: '#10B98115' }} />
                </div>
                <div className="space-y-2">
                    <Skeleton variant="text" width={100} height={20} sx={{ bgcolor: '#10B98115' }} />
                    <Skeleton variant="text" width={80} height={32} sx={{ bgcolor: '#10B98115' }} />
                </div>
            </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[{ color: '#10B981' }, { color: '#3B82F6' }, { color: '#F59E0B' }].map((c, i) => (
                <div key={i} className="border rounded-xl p-4" style={{ borderColor: `${c.color}20`, backgroundColor: `${c.color}08` }}>
                    <div className="flex items-center gap-3 mb-2">
                        <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: `${c.color}20` }} />
                        <Skeleton variant="text" width="55%" height={20} />
                    </div>
                    <Skeleton variant="text" width="70%" height={32} sx={{ bgcolor: `${c.color}15` }} />
                    <Skeleton variant="text" width="45%" height={16} />
                </div>
            ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
                <Skeleton variant="text" width="60%" height={24} className="mb-4" />
                <Skeleton variant="rounded" width="100%" height={160} />
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
                <Skeleton variant="text" width="60%" height={24} className="mb-4" />
                <Skeleton variant="rounded" width="100%" height={160} />
            </div>
        </div>
    </div>
);

const PlanningSkeleton = () => (
    <div className="p-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
                <Skeleton variant="circular" width={44} height={44} sx={{ bgcolor: '#8B5CF620' }} />
                <div>
                    <Skeleton variant="text" width={180} height={28} />
                    <Skeleton variant="text" width={260} height={20} />
                </div>
            </div>
            <Box sx={{ display: 'flex', gap: 1 }}>
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton variant="rounded" width={110} height={36} />
            </Box>
        </div>
        <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex gap-2">
                {[120, 120, 120].map((w, i) => <Skeleton key={i} variant="rounded" width={w} height={40} />)}
            </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {[{ color: '#8B5CF6' }, { color: '#10B981' }, { color: '#059669' }, { color: '#F59E0B' }, { color: '#3B82F6' }].map((c, i) => (
                <div key={i} className="border rounded-xl p-4" style={{ borderColor: `${c.color}20`, backgroundColor: `${c.color}08` }}>
                    <div className="flex items-center gap-4">
                        <Skeleton variant="circular" width={36} height={36} sx={{ bgcolor: `${c.color}20` }} />
                        <div className="flex-1">
                            <Skeleton variant="text" width="55%" height={20} />
                            <Skeleton variant="text" width="70%" height={30} sx={{ bgcolor: `${c.color}15` }} />
                            <Skeleton variant="text" width="40%" height={16} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
        <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex gap-2">
                {[130, 130, 130].map((w, i) => <Skeleton key={i} variant="rounded" width={w} height={36} />)}
            </div>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-2">
                <div className="flex gap-2">
                    {[24, 70, 140, 80, 90, 70].map((w, i) => <Skeleton key={i} variant="text" width={w} />)}
                </div>
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center p-2 border-t">
                    <Skeleton variant="circular" width={24} height={24} />
                    <Skeleton variant="text" width={140} className="ml-2" />
                    <Skeleton variant="text" width={90} className="ml-2" />
                    <Skeleton variant="text" width={80} className="ml-2" />
                    <Skeleton variant="rounded" width={70} height={22} className="ml-2" sx={{ bgcolor: '#10B98115' }} />
                    <Skeleton variant="text" width={70} className="ml-auto" />
                </div>
            ))}
        </div>
    </div>
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

const TAB_PARAM_KEY = 'financialTab';

const allTabs = [
    { id: 'caixa-unificado', label: 'Caixa & Fluxo', icon: <LayoutDashboard size={18} /> },
    { id: 'pagamentos', label: 'Pagamentos', icon: <DollarSign size={18} /> },
    { id: 'convenios', label: 'Convênios', icon: <CreditCard size={18} /> },
    { id: 'despesas', label: 'Despesas', icon: <Receipt size={18} /> },
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={18} /> },
    { id: 'profissionais', label: 'Profissionais', icon: <User size={18} /> },
    { id: 'planejamento', label: 'Planejamento Anual', icon: <Calendar size={18} /> },
];

const FinancialDashboard = ({
    patients,
    doctors,
    initialPayments,
    onMarkAsPaid,
    registerAppointmentAndPaymentFuture,
    onCancelPayment
}: FinancialDashboardProps) => {
    const [searchParams, setSearchParams] = useSearchParams();

    const resolveTabFromSearchParams = () => {
        const tabId = searchParams.get(TAB_PARAM_KEY);
        if (!tabId) return 0;
        const index = allTabs.findIndex((tab) => tab.id === tabId);
        return index >= 0 ? index : 0;
    };

    const [currentTab, setCurrentTab] = useState(resolveTabFromSearchParams());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [cashflowRange, setCashflowRange] = useState<{ startDate: string; endDate: string; label: string } | undefined>(undefined);
    const [cashflowViewMode, setCashflowViewMode] = useState<'day' | 'month'>('day');
    const theme = useTheme();

    // 🚀 Prefetch all tab chunks on mount so tab switching feels instant
    useEffect(() => {
        const prefetchChunks = () => {
            import('../../components/financial/PaymentPage');
            import('./tabs/ExpensesTab');
            import('./tabs/InsuranceTab');
            import('./tabs/PlanningTab');
            import('./UnifiedCashflowTab');
            import('./tabs/FinancialDashboardTab');
            import('./tabs/AnaliseProjecaoTab');
            import('../ProfessionalResults/ProfessionalResultsPage');
        };
        window.requestIdleCallback?.(prefetchChunks) ?? setTimeout(prefetchChunks, 2000);
    }, []);

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        const newTabId = allTabs[newValue]?.id;
        if (!newTabId) return;

        startTransition(() => {
            setCurrentTab(newValue);
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    next.set(TAB_PARAM_KEY, newTabId);
                    return next;
                },
                { replace: true }
            );
        });
    };

    // Sincroniza estado local caso o query param mude (navegação via URL)
    useEffect(() => {
        const nextTab = resolveTabFromSearchParams();
        if (nextTab !== currentTab) {
            setCurrentTab(nextTab);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const currentTabId = allTabs[currentTab]?.id;

    const renderActiveTab = () => {
        switch (currentTabId) {
            case 'caixa-unificado':
                return (
                    <>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className="text-xs font-medium text-gray-600">Período:</span>
                            {[
                                { key: 'day', label: 'Hoje' },
                                { key: 'yesterday', label: 'Ontem' },
                                { key: 'week', label: 'Esta Semana' },
                                { key: 'last_week', label: 'Semana Passada' },
                                { key: 'month', label: 'Este Mês' },
                                { key: 'last_month', label: 'Mês Passado' },
                            ].map((chip) => (
                                <button
                                    key={chip.key}
                                    onClick={() => {
                                        const now = new Date();
                                        const toISODate = (d: Date) => d.toLocaleDateString('en-CA');
                                        if (chip.key === 'day') {
                                            const today = toISODate(now);
                                            setCashflowViewMode('day');
                                            setCashflowRange({ startDate: today, endDate: today, label: 'Hoje' });
                                        } else if (chip.key === 'yesterday') {
                                            const y = new Date(now);
                                            y.setDate(now.getDate() - 1);
                                            const yStr = toISODate(y);
                                            setCashflowViewMode('day');
                                            setCashflowRange({ startDate: yStr, endDate: yStr, label: 'Ontem' });
                                        } else if (chip.key === 'week') {
                                            const dayOfWeek = now.getDay();
                                            const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                                            const monday = new Date(now);
                                            monday.setDate(now.getDate() - diffToMonday);
                                            const saturday = new Date(monday);
                                            saturday.setDate(monday.getDate() + 5);
                                            setCashflowViewMode('day');
                                            setCashflowRange({ startDate: toISODate(monday), endDate: toISODate(saturday), label: 'Esta Semana' });
                                        } else if (chip.key === 'last_week') {
                                            const dayOfWeek = now.getDay();
                                            const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                                            const lastMonday = new Date(now);
                                            lastMonday.setDate(now.getDate() - diffToMonday - 7);
                                            const lastSaturday = new Date(lastMonday);
                                            lastSaturday.setDate(lastMonday.getDate() + 5);
                                            setCashflowViewMode('day');
                                            setCashflowRange({ startDate: toISODate(lastMonday), endDate: toISODate(lastSaturday), label: 'Semana Passada' });
                                        } else if (chip.key === 'month') {
                                            setCashflowRange(undefined);
                                            setCashflowViewMode('month');
                                            setSelectedMonth(now.getMonth() + 1);
                                            setSelectedYear(now.getFullYear());
                                        } else if (chip.key === 'last_month') {
                                            setCashflowRange(undefined);
                                            setCashflowViewMode('month');
                                            const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                            setSelectedMonth(lm.getMonth() + 1);
                                            setSelectedYear(lm.getFullYear());
                                        }
                                    }}
                                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-all bg-gray-100 text-gray-700 hover:bg-gray-200"
                                >
                                    {chip.label}
                                </button>
                            ))}
                    </div>
                    <UnifiedCashflowTab month={selectedMonth} year={selectedYear} dateRange={cashflowRange} defaultViewMode={cashflowViewMode} />
                    </>
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
            case 'dashboard':
                return (
                    <Suspense fallback={<DashboardV3Skeleton />}>
                        <FinancialDashboardTab month={selectedMonth} year={selectedYear} />
                    </Suspense>
                );
            case 'profissionais':
                return (
                    <Suspense fallback={<div className="min-h-[400px] flex items-center justify-center text-gray-400">Carregando...</div>}>
                        <ProfessionalResultsPage />
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
                        <FinancialDashboardTab month={selectedMonth} year={selectedYear} />
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
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-3 pt-3 pb-0 border-b border-gray-100">
                    <div className="flex gap-1 overflow-x-auto bg-gray-100 rounded-xl p-1">
                        {allTabs.map((tab, index) => (
                            <button key={tab.id} onClick={() => handleTabChange({} as React.SyntheticEvent, index)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-all shrink-0 ${
                                    currentTab === index
                                        ? 'bg-white text-gray-900 shadow-sm font-semibold'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}>
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-1 sm:p-2 md:p-4 min-h-[400px] transition-opacity duration-200 ease-in-out">
                    {renderActiveTab()}
                </div>
            </div>
        </Box>
    );
};

export default FinancialDashboard;
