// src/pages/Financial/FinancialDashboard.tsx (VERSÃO CORRIGIDA)

import { Box, Paper, Tab, Tabs, Typography } from '@mui/material';
import { Calendar, DollarSign, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { IDoctor, IPatient } from '../../utils/types/types';
import CashflowTab from '../Financial/CashflowTab';
import ExpensesTab from './components/ExpenseModal';
import GoalsTab from './tabs/GoalsTab';
import PlanningTab from './tabs/PlanningTab';
import RevenueTab from './tabs/RevenueTab';

interface FinancialDashboardProps {
    patients: IPatient[];
    doctors: IDoctor[];
    initialPayments: any[];
    onMarkAsPaid: (payment: any) => void;
    registerAppointmentAndPayemntFuture: (payment: any) => void;
    onCancelPayment: (paymentId: string) => void;
}

const FinancialDashboard = ({
    patients,
    doctors,
    initialPayments,
    onMarkAsPaid,
    registerAppointmentAndPayemntFuture,
    onCancelPayment
}: FinancialDashboardProps) => {
    const [currentTab, setCurrentTab] = useState(0);

    const tabs = [
        {
            label: 'Receitas',
            icon: <TrendingUp size={18} />,
            component: (
                <RevenueTab
                    patients={patients}
                    doctors={doctors}
                    initialPayments={initialPayments}
                    onMarkAsPaid={onMarkAsPaid}
                    registerAppointmentAndPayemntFuture={registerAppointmentAndPayemntFuture}
                    onCancelPayment={onCancelPayment}
                />
            )
        },
        {
            label: 'Despesas',
            icon: <TrendingDown size={18} />,
            component: <ExpensesTab /> // ✅ ExpensesTab gerencia seu próprio modal
        },
        {
            label: 'Fluxo de Caixa',
            icon: <DollarSign size={18} />,
            component: <CashflowTab />
        },
        {
            label: 'Metas',
            icon: <Target size={18} />,
            component: <GoalsTab />
        },
        {
            label: 'Planejamento',
            icon: <Calendar size={18} />,
            component: <PlanningTab />
        },
    ];

    return (
        <Box>
            {/* Header */}
            <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    💰 Gestão Financeira
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Controle completo de receitas, despesas, fluxo de caixa e planejamento
                </Typography>
            </Paper>

            {/* Tabs */}
            <Paper elevation={1} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Tabs
                    value={currentTab}
                    onChange={(_, newValue) => setCurrentTab(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        bgcolor: 'background.paper'
                    }}
                >
                    {tabs.map((tab, index) => (
                        <Tab
                            key={index}
                            label={tab.label}
                            icon={tab.icon}
                            iconPosition="start"
                            sx={{
                                minHeight: 64,
                                textTransform: 'none',
                                fontSize: '1rem',
                                fontWeight: 500
                            }}
                        />
                    ))}
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {tabs[currentTab].component}
                </Box>
            </Paper>
        </Box>
    );
};

export default FinancialDashboard;