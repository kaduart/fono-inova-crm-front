// src/pages/Financial/FinancialDashboard.tsx (VERSÃO COM SEPARAÇÃO OPERACIONAL/ESTRATÉGICO)

import { Box, Button, Paper, Tab, Tabs, Typography, useTheme, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { 
    Building2, 
    Calendar, 
    DollarSign, 
    PieChart, 
    Plus, 
    Target, 
    TrendingUp, 
    Receipt, 
    ArrowLeftRight,
    BarChart3,
    ClipboardList,
    TrendingDown
} from 'lucide-react';
import { useState } from 'react';
import { FinancialRecord } from '../../services/paymentService';
import { IDoctor, IPatient } from '../../utils/types/types';
import CashflowTab from '../Financial/CashflowTab';
import PaymentPage from '../../components/financial/PaymentPage';
import ExpensesTab from './tabs/ExpensesTab';
import EntradasSaidasTab from './tabs/EntradasSaidasTab';
import RevenueTab from './tabs/RevenueTab';
import GoalsTab from './tabs/GoalsTab';
import InsuranceTab from './tabs/InsuranceTab';
import PlanningTab from './tabs/PlanningTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';
import InteligenciaFinanceiraTab from './tabs/InteligenciaFinanceiraTab';
import VisaoGeralEstrategicaTab from './tabs/VisaoGeralEstrategicaTab';

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
            setCurrentTab(0); // Reset para primeira aba ao trocar modo
        }
    };

    const handleOpenPayment = () => {
        // Implementar abertura do modal de pagamento
    };

    // Tabs do modo OPERACIONAL (Gestão do Dia a Dia)
    const operacionalTabs = [
        {
            label: 'Caixa Diário',
            icon: <DollarSign size={18} />,
            component: (
                <PaymentPage
                    patients={patients}
                    doctors={doctors}
                    initialPayments={initialPayments}
                    onMarkAsPaid={onMarkAsPaid}
                    registerAppointmentAndPayemntFuture={registerAppointmentAndPaymentFuture}
                    onCancelPayment={onCancelPayment}
                />
            )
        },
        {
            label: 'Despesas',
            icon: <Receipt size={18} />,
            component: <ExpensesTab />
        },
        {
            label: 'Entradas e Saídas',
            icon: <ArrowLeftRight size={18} />,
            component: <EntradasSaidasTab />
        },
        {
            label: 'Convênios',
            icon: <Building2 size={18} />,
            component: <InsuranceTab />
        },
        {
            label: 'Fluxo de Caixa',
            icon: <DollarSign size={18} />,
            component: <CashflowTab />
        },
    ];

    // Tabs do modo ESTRATÉGICO (Gestão de Crescimento)
    const estrategicoTabs = [
        {
            label: 'Receitas',
            icon: <TrendingUp size={18} />,
            component: <RevenueTab />
        },
        {
            label: 'Visão Geral',
            icon: <BarChart3 size={18} />,
            component: <VisaoGeralEstrategicaTab />
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
            icon: <TrendingDown size={18} />,
            component: <AnalyticsTab />
        },
        {
            label: 'Inteligência',
            icon: <PieChart size={18} />,
            component: <InteligenciaFinanceiraTab />
        },
    ];

    const currentTabs = viewMode === 'operacional' ? operacionalTabs : estrategicoTabs;

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
                    mb: 2
                }}
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
                                {viewMode === 'operacional' 
                                    ? 'Controle operacional: receitas, despesas e fluxo de caixa' 
                                    : 'Análise estratégica: metas, projeções e indicadores de crescimento'}
                            </Typography>
                        </div>
                    </div>

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {/* Toggle Operacional/Estratégico */}
                        <ToggleButtonGroup
                            value={viewMode}
                            exclusive
                            onChange={handleViewModeChange}
                            aria-label="modo de visualização"
                            size="small"
                            sx={{
                                bgcolor: 'background.paper',
                                borderRadius: 2,
                                border: '1px solid',
                                borderColor: 'divider',
                                '& .MuiToggleButton-root': {
                                    px: 3,
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
                            <ToggleButton value="operacional">
                                <ClipboardList size={16} style={{ marginRight: 8 }} />
                                Operacional
                            </ToggleButton>
                            <ToggleButton value="estrategico">
                                <BarChart3 size={16} style={{ marginRight: 8 }} />
                                Estratégico
                            </ToggleButton>
                        </ToggleButtonGroup>

                        {viewMode === 'operacional' && (
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
                        )}
                    </Box>
                </div>
            </Paper>

            {/* Tabs */}
            <Paper 
                elevation={1} 
                sx={{ 
                    borderRadius: 3, 
                    overflow: 'hidden',
                    border: viewMode === 'estrategico' ? '2px solid #8B5CF620' : 'none'
                }}
            >
                <Tabs
                    value={currentTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        bgcolor: viewMode === 'estrategico' ? '#8B5CF608' : 'background.paper',
                        '& .MuiTabs-flexContainer': {
                            gap: 1,
                            px: 1
                        }
                    }}
                >
                    {currentTabs.map((tab, index) => (
                        <Tab
                            key={index}
                            label={tab.label}
                            icon={tab.icon}
                            iconPosition="start"
                            sx={{
                                minHeight: 64,
                                textTransform: 'none',
                                fontSize: '1rem',
                                fontWeight: 500,
                                borderRadius: 2,
                                '&.Mui-selected': {
                                    color: viewMode === 'estrategico' ? '#7C3AED !important' : undefined,
                                    bgcolor: viewMode === 'estrategico' ? '#8B5CF615' : undefined
                                }
                            }}
                        />
                    ))}
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {currentTabs[currentTab]?.component}
                </Box>
            </Paper>
        </Box>
    );
};

export default FinancialDashboard;
