import {
    Box,
    Grid,
    Paper,
    Skeleton,
    Stack,
    styled,
    Typography,
    useTheme
} from '@mui/material';
import {
    BarChart2,
    Calendar,
    CheckCircle,
    Clock,
    DollarSign,
    RefreshCw,
    User,
    XCircle
} from 'lucide-react';

const GradientBox = styled(Box)(({ theme }) => ({
    background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
    color: 'white',
    borderRadius: '16px',
    padding: theme.spacing(3),
    boxShadow: '0 10px 30px rgba(106, 17, 203, 0.3)',
    marginBottom: theme.spacing(3)
}));

const MetricCard = styled(Paper)(({ theme }) => ({
    borderRadius: '16px',
    padding: theme.spacing(3),
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    height: '100%',
}));

const StatusCard = styled(Paper)(({ theme }) => ({
    borderRadius: '12px',
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    transition: 'all 0.3s ease',
    '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: '0 6px 15px rgba(0,0,0,0.1)',
    }
}));

const ProgressBar = ({ value, color }) => {
    return (
        <Box sx={{
            height: 8,
            bgcolor: 'divider',
            borderRadius: 4,
            overflow: 'hidden',
            position: 'relative',
            mt: 1
        }}>
            <Box sx={{
                height: '100%',
                width: `${value}%`,
                bgcolor: color,
                borderRadius: 4,
                transition: 'width 0.5s ease'
            }} />
        </Box>
    );
};

const MetricItem = ({ icon, title, value, percentage, color }) => {
    return (
        <Box sx={{ mb: 2.5 }}>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
                <Box sx={{
                    bgcolor: `${color}.light`,
                    color: `${color}.dark`,
                    borderRadius: '50%',
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {icon}
                </Box>
                <Typography variant="subtitle2" color="text.secondary">
                    {title}
                </Typography>
            </Stack>

            <Stack direction="row" justifyContent="space-between" alignItems="flex-end">
                <Typography variant="h6" fontWeight={600}>
                    {value} {value === 1 ? 'paciente' : 'pacientes'}
                </Typography>
                <Typography variant="body2" fontWeight={500} color="text.secondary">
                    {percentage.toFixed(0)}%
                </Typography>
            </Stack>

            <ProgressBar value={percentage} color={`${color}.main`} />
        </Box>
    );
};

const AppointmentItem = ({ time, patient, clinic, status }) => {
    return (
        <StatusCard>
            <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle1" fontWeight={600}>
                    {time}
                </Typography>
                <Box sx={{
                    bgcolor: status === 'pending' ? 'warning.light' : 'success.light',
                    color: status === 'pending' ? 'warning.dark' : 'success.dark',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 4,
                    fontSize: '0.75rem',
                    fontWeight: 500
                }}>
                    {status === 'pending' ? 'Pendente' : 'Confirmado'}
                </Box>
            </Stack>
            <Typography variant="body1" fontWeight={500} mt={0.5}>
                {patient}
            </Typography>
            <Typography variant="body2" color="text.secondary">
                {clinic}
            </Typography>
        </StatusCard>
    );
};

const DashboardStats = ({ stats, appointments, loading = false }) => {
    const theme = useTheme();

    if (loading) {
        return (
            <Box>
                <GradientBox>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Box>
                            <Skeleton variant="text" width={200} height={40} />
                            <Skeleton variant="text" width={150} height={60} sx={{ mt: 1 }} />
                        </Box>
                        <Skeleton variant="circular" width={48} height={48} />
                    </Stack>
                </GradientBox>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <MetricCard>
                            <Skeleton variant="text" width={180} height={30} sx={{ mb: 3 }} />
                            {[1, 2, 3, 4].map((_, index) => (
                                <Box key={index} sx={{ mb: 3 }}>
                                    <Skeleton variant="rectangular" height={20} sx={{ mb: 1 }} />
                                    <Skeleton variant="rectangular" height={10} />
                                </Box>
                            ))}
                        </MetricCard>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <MetricCard>
                            <Skeleton variant="text" width={180} height={30} sx={{ mb: 3 }} />
                            {[1, 2, 3, 4].map((_, index) => (
                                <Box key={index} sx={{ mb: 3 }}>
                                    <Skeleton variant="rectangular" height={20} sx={{ mb: 1 }} />
                                    <Skeleton variant="rectangular" height={10} />
                                </Box>
                            ))}
                        </MetricCard>
                    </Grid>
                </Grid>
            </Box>
        );
    }

    // Preparar dados com fallbacks
    const safeStats = {
        today: stats?.today || 0,
        clinical: {
            pending: stats?.clinical?.pending || 0,
            inProgress: stats?.clinical?.inProgress || 0,
            candidates: stats?.clinical?.candidates || 0,
            noShow: stats?.clinical?.noShow || 0,
        },
        operational: {
            scheduled: stats?.operational?.scheduled || 0,
            confirmed: stats?.operational?.confirmed || 0,
            cancelled: stats?.operational?.cancelled || 0,
            paid: stats?.operational?.paid || 0,
        }
    };

    const clinicalItems = [
        {
            icon: <Clock size={18} />,
            title: 'Pendentes',
            value: safeStats.clinical.pending,
            percentage: safeStats.today ? (safeStats.clinical.pending / safeStats.today) * 100 : 0,
            color: 'info'
        },
        {
            icon: <RefreshCw size={18} />,
            title: 'Em Andamento',
            value: safeStats.clinical.inProgress,
            percentage: safeStats.today ? (safeStats.clinical.inProgress / safeStats.today) * 100 : 0,
            color: 'primary'
        },
        {
            icon: <User size={18} />,
            title: 'Candidatos',
            value: safeStats.clinical.candidates,
            percentage: safeStats.today ? (safeStats.clinical.candidates / safeStats.today) * 100 : 0,
            color: 'warning'
        },
        {
            icon: <XCircle size={18} />,
            title: 'Faltas',
            value: safeStats.clinical.noShow,
            percentage: safeStats.today ? (safeStats.clinical.noShow / safeStats.today) * 100 : 0,
            color: 'error'
        }
    ];

    const operationalItems = [
        {
            icon: <Calendar size={18} />,
            title: 'Agendados',
            value: safeStats.operational.scheduled,
            percentage: safeStats.today ? (safeStats.operational.scheduled / safeStats.today) * 100 : 0,
            color: 'info'
        },
        {
            icon: <CheckCircle size={18} />,
            title: 'Confirmados',
            value: safeStats.operational.confirmed,
            percentage: safeStats.today ? (safeStats.operational.confirmed / safeStats.today) * 100 : 0,
            color: 'success'
        },
        {
            icon: <XCircle size={18} />,
            title: 'Cancelados',
            value: safeStats.operational.cancelled,
            percentage: safeStats.today ? (safeStats.operational.cancelled / safeStats.today) * 100 : 0,
            color: 'error'
        },
        {
            icon: <DollarSign size={18} />,
            title: 'Pagamentos',
            value: safeStats.operational.paid,
            percentage: safeStats.today ? (safeStats.operational.paid / safeStats.today) * 100 : 0,
            color: 'warning'
        }
    ];

    return (
        <Box>
            <GradientBox>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                        <Typography variant="h5" fontWeight={600} gutterBottom>
                            Resumo do Dia
                        </Typography>
                        <Typography variant="h3" fontWeight={700}>
                            {safeStats.today} agendamentos
                        </Typography>
                    </Box>
                    <BarChart2 size={48} color="white" />
                </Stack>
            </GradientBox>

            <Box sx={{
                display: 'flex',
                gap: 3,
                mb: 3,
                flexDirection: { xs: 'column', sm: 'row' }
            }}>
                {/* Status Clínico - 50% */}
                <Box sx={{
                    flex: 1,
                    minWidth: 0 // Importante para evitar overflow
                }}>
                    <MetricCard sx={{ height: '100%' }}>
                        <Typography variant="h6" fontWeight={700} mb={3} color="primary.main">
                            Status Clínico
                        </Typography>
                        {clinicalItems.map((item, index) => (
                            <MetricItem key={index} {...item} />
                        ))}
                    </MetricCard>
                </Box>

                {/* Status Operacional - 50% */}
                <Box sx={{
                    flex: 1,
                    minWidth: 0 // Importante para evitar overflow
                }}>
                    <MetricCard sx={{ height: '100%' }}>
                        <Typography variant="h6" fontWeight={700} mb={3} color="primary.main">
                            Status Operacional
                        </Typography>
                        {operationalItems.map((item, index) => (
                            <MetricItem key={index} {...item} />
                        ))}
                    </MetricCard>
                </Box>
            </Box>

            {appointments && appointments.length > 0 && (
                <Grid item xs={12}>
                    <MetricCard>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                            <Typography variant="h6" fontWeight={700} color="primary.main">
                                Agendamentos de Hoje
                            </Typography>
                            <Typography variant="body2" color="primary" sx={{ cursor: 'pointer' }}>
                                Ver todas ✔
                            </Typography>
                        </Stack>

                        {appointments.map((appt, index) => (
                            <AppointmentItem
                                key={index}
                                time={appt.time}
                                patient={appt.patient}
                                clinic={appt.clinic}
                                status={appt.status}
                            />
                        ))}
                    </MetricCard>
                </Grid>
            )}
        </Box>
    );
};

export default DashboardStats;