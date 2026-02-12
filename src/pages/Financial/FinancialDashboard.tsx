// src/pages/Financial/FinancialDashboard.tsx (VERSÃO CORRIGIDA)

import { Box, Button, Paper, Tab, Tabs, Typography, useTheme } from '@mui/material';
import { Building2, Calendar, DollarSign, PieChart, Plus, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { FinancialRecord } from '../../services/paymentService';
import { IDoctor, IPatient } from '../../utils/types/types';
import CashflowTab from '../Financial/CashflowTab';
import ExpensesTab from './tabs/ExpensesTab';
import RevenueTab from './tabs/RevenueTab';
import GoalsTab from './tabs/GoalsTab';
import InsuranceTab from './tabs/InsuranceTab';
import PlanningTab from './tabs/PlanningTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';
import InteligenciaFinanceiraTab from './tabs/InteligenciaFinanceiraTab';
import { BarChart3 } from 'lucide-react';




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
    const theme = useTheme();
    const [activeTab, setActiveTab] = useState(0);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };


    const handleOpenPayment = () => {
        // Implementar abertura do modal de pagamento
    };

    const tabs = [
        {
            label: 'Receitas',
            icon: <TrendingUp size={18} />,
            component: (
                <RevenueTab
                    patients={patients}
                    doctors={doctors}
                    payments={initialPayments}
                    onMarkAsPaid={onMarkAsPaid}
                    registerAppointmentAndPayemntFuture={registerAppointmentAndPaymentFuture}
                    onCancelPayment={onCancelPayment}
                />
            )
        },
        {
            label: 'IA Financeira',
            icon: <PieChart size={18} />,
            component: <InteligenciaFinanceiraTab />
        },
        {
            label: 'Fluxo de Caixa',
            icon: <DollarSign size={18} />,
            component: <CashflowTab />
        },
        {
            label: 'Convênios',
            icon: <Building2 size={18} />,
            component: <InsuranceTab />
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
        {
            label: 'Analytics',
            icon: <BarChart3 size={18} />,
            component: <AnalyticsTab />
        },
    ];

    return (
        <Box>
            {/* 🔹 HEADER PRINCIPAL */}
            <Paper
                elevation={2}
                sx={{
                    p: 4,
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}10)`,
                    border: `1px solid ${theme.palette.divider}`,
                }}
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
                            <Typography
                                variant="h4"
                                fontWeight="bold"
                                color="grey.800"
                                gutterBottom
                            >
                                Painel Financeiro
                            </Typography>
                            <Typography
                                variant="body1"
                                color="grey.600"
                                sx={{ opacity: 0.8 }}
                            >
                                Controle completo dos pagamentos: recebidos, pendentes e em processamento
                            </Typography>
                        </div>
                    </div>

                    <Button
                        variant="contained"
                        startIcon={<Plus size={20} />}
                        onClick={handleOpenPayment}
                        sx={{
                            borderRadius: 3,
                            px: 4,
                            py: 1.5,
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            background: `linear-gradient(135deg, rgb(55,171,135), rgb(40,130,100))`,
                            '&:hover': {
                                background: `linear-gradient(135deg, rgb(60,180,140), rgb(35,115,90))`,
                                transform: 'translateY(-2px)',
                                boxShadow: 6,
                            },
                            transition: 'all 0.3s ease-in-out',
                        }}
                    >
                        Novo Registro
                    </Button>
                </div>
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