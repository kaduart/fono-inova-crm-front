// src/components/Dashboard/AnalyticsDashboard.tsx
import { Box, Paper, Tab, Tabs, Typography, useTheme } from '@mui/material';
import { Activity, BarChart3, Globe2 } from 'lucide-react';
import { useMemo, useState } from 'react';

// import MarketingDashboard from '../../pages/MarketingDashboard';
import { FinancialRecord } from '../../services/paymentService';
import { IDoctor, IPatient } from '../../utils/types/types';
// import RevenueTab from './RevenueTab';
import SiteAnalyticsDashboard from './SiteAnalyticsDashboard';

interface AnalyticsDashboardProps {
    patients: IPatient[];
    doctors: IDoctor[];
    payments: FinancialRecord[];
    onMarkAsPaid: (payment: FinancialRecord) => void;
    registerAppointmentAndPayemntFuture: (payment: FinancialRecord) => void;
    onCancelPayment: (paymentId: string) => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
    patients,
    doctors,
    payments,
    onMarkAsPaid,
    registerAppointmentAndPayemntFuture,
    onCancelPayment,
}) => {
    const theme = useTheme();
    const [tab, setTab] = useState<'overview' | 'revenue' | 'site' | 'marketing'>('overview');

    const overview = useMemo(() => {
        const totalPatients = patients?.length ?? 0;
        const totalDoctors = doctors?.length ?? 0;
        const totalPayments = payments?.length ?? 0;

        const paid = payments?.filter(p => p.status === 'paid') ?? [];
        const pending = payments?.filter(
            p => p.status === 'pending' || p.status === 'partial'
        ) ?? [];

        const totalPaidValue = paid.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalPendingValue = pending.reduce((sum, p) => sum + (p.amount || 0), 0);

        return {
            totalPatients,
            totalDoctors,
            totalPayments,
            totalPaidValue,
            totalPendingValue,
        };
    }, [patients, doctors, payments]);

    return (
        <Box className="space-y-4">
            <Paper
                elevation={2}
                sx={{
                    p: 3,
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}10)`,
                    mb: 2,
                }}
            >
                <Box display="flex" alignItems="center" gap={2}>
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 3,
                            backgroundColor: 'rgba(55,171,135,0.15)',
                        }}
                    >
                        <BarChart3 size={22} />
                    </Box>
                    <Box>
                        <Typography variant="h5" fontWeight="bold" color="grey.800">
                            Analytics da Clínica
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Atendimentos, faturamento, site e marketing em um só lugar.
                        </Typography>
                    </Box>
                </Box>
            </Paper>

            <Paper elevation={1} sx={{ borderRadius: 3 }}>
                <Tabs
                    value={tab}
                    onChange={(_, value) => setTab(value)}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
                >
                    <Tab
                        label="Visão Geral"
                        value="overview"
                        icon={<Activity size={16} />}
                        iconPosition="start"
                    />
                    <Tab
                        label="Receitas"
                        value="revenue"
                        icon={<BarChart3 size={16} />}
                        iconPosition="start"
                    />
                    <Tab
                        label="Site / GA4"
                        value="site"
                        icon={<Globe2 size={16} />}
                        iconPosition="start"
                    />
                    <Tab
                        label="Marketing"
                        value="marketing"
                        icon={<Globe2 size={16} />}
                        iconPosition="start"
                    />
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {tab === 'overview' && (
                        <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'grey.200',
                                }}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    Pacientes cadastrados
                                </Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    {overview.totalPatients}
                                </Typography>
                            </Paper>

                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'grey.200',
                                }}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    Profissionais ativos
                                </Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    {overview.totalDoctors}
                                </Typography>
                            </Paper>

                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'grey.200',
                                }}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    Pagamentos registrados
                                </Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    {overview.totalPayments}
                                </Typography>
                            </Paper>

                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2.5,
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'grey.200',
                                }}
                            >
                                <Typography variant="body2" color="text.secondary">
                                    Receita recebida (R$)
                                </Typography>
                                <Typography variant="h6" fontWeight="bold">
                                    {overview.totalPaidValue.toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                    })}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Pendente:{' '}
                                    {overview.totalPendingValue.toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                    })}
                                </Typography>
                            </Paper>
                        </Box>
                    )}

                    {tab === 'revenue' && (
                        <Box sx={{ mt: 2, p: 3 }}>
                            <Typography variant="h6">Aba de Receitas em desenvolvimento</Typography>
                        </Box>
                    )}

                    {tab === 'site' && (
                        <Box sx={{ mt: 1 }}>
                            <SiteAnalyticsDashboard />
                        </Box>
                    )}

                    {tab === 'marketing' && (
                        <Box sx={{ mt: 2, p: 3 }}>
                            <Typography variant="h6">Marketing Dashboard em desenvolvimento</Typography>
                        </Box>
                    )}
                </Box>
            </Paper>
        </Box>
    );
};

export default AnalyticsDashboard;
