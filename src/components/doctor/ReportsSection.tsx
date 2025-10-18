import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Chip,
    FormControl,
    Grid,
    InputLabel,
    LinearProgress,
    MenuItem,
    Select,
    Typography,
    useTheme
} from '@mui/material';
import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Tooltip
} from 'chart.js';
import {
    Activity,
    BarChart2,
    Calendar,
    Download,
    FileText,
    TrendingUp,
    Users
} from 'lucide-react';
import { useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement
);


// Dados mock para demonstração
const mockReportsData = {
    patientProgress: {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
        datasets: [
            {
                label: 'Articulação',
                data: [65, 59, 80, 81, 56, 72],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            },
            {
                label: 'Compreensão',
                data: [45, 75, 60, 82, 65, 88],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            },
            {
                label: 'Fluência',
                data: [55, 65, 70, 78, 62, 80],
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                tension: 0.4,
                fill: true
            }
        ]
    },
    sessionAttendance: {
        labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
        datasets: [
            {
                label: 'Sessões Realizadas',
                data: [12, 15, 8, 14, 16, 4],
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: '#3b82f6',
                borderWidth: 2,
                borderRadius: 4
            },
            {
                label: 'Cancelamentos',
                data: [2, 1, 3, 1, 0, 2],
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderColor: '#ef4444',
                borderWidth: 2,
                borderRadius: 4
            }
        ]
    },
    patientDistribution: {
        labels: ['Linguagem', 'Motor', 'Cognitivo', 'Comportamento', 'Social'],
        datasets: [
            {
                data: [35, 25, 20, 15, 5],
                backgroundColor: [
                    '#3b82f6',
                    '#10b981',
                    '#8b5cf6',
                    '#f59e0b',
                    '#ec4899'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }
        ]
    }
};

// Opções dos gráficos
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top' as const,
            labels: {
                boxWidth: 12,
                padding: 15,
                usePointStyle: true,
            }
        },
        tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#1f2937',
            bodyColor: '#374151',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            usePointStyle: true
        }
    },
    scales: {
        x: {
            grid: {
                display: false
            }
        },
        y: {
            beginAtZero: true,
            grid: {
                color: 'rgba(0, 0, 0, 0.05)'
            }
        }
    }
};

const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom' as const,
            labels: {
                boxWidth: 12,
                padding: 15,
                usePointStyle: true,
            }
        }
    },
    cutout: '65%'
};

export default function ReportsSection() {
    const theme = useTheme();
    const [timeRange, setTimeRange] = useState('last_month');
    const [reportType, setReportType] = useState('sessions');
    const [isGenerating, setIsGenerating] = useState(false);

    // Estatísticas calculadas
    const stats = {
        totalSessions: 156,
        attendanceRate: 85,
        completedGoals: 42,
        activePatients: 28
    };

    const handleGenerateReport = async (type) => {
        setIsGenerating(true);
        // Simular geração de relatório
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsGenerating(false);

        // Aqui você implementaria a lógica real de geração de PDF/Excel
        console.log(`Gerando relatório: ${type}`);
        alert(`Relatório ${type} gerado com sucesso!`);
    };

    const getAttendanceColor = (rate) => {
        if (rate >= 90) return 'success';
        if (rate >= 75) return 'warning';
        return 'error';
    };

    return (
        <Card
            sx={{
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                background: 'white',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
        >
            <CardHeader
                sx={{
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    background: `linear-gradient(135deg, ${theme.palette.primary.light}10, ${theme.palette.secondary.light}05)`,
                    py: 3
                }}
                title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <FileText size={28} color={theme.palette.primary.main} />
                        <Box>
                            <Typography variant="h5" sx={{ fontWeight: 600, color: 'grey.800' }}>
                                Relatórios e Análises
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'grey.600', mt: 0.5 }}>
                                Acompanhe métricas e gere relatórios detalhados
                            </Typography>
                        </Box>
                    </Box>
                }
                action={
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Período</InputLabel>
                            <Select
                                value={timeRange}
                                label="Período"
                                onChange={(e) => setTimeRange(e.target.value)}
                            >
                                <MenuItem value="last_week">Última Semana</MenuItem>
                                <MenuItem value="last_month">Último Mês</MenuItem>
                                <MenuItem value="last_quarter">Último Trimestre</MenuItem>
                                <MenuItem value="last_year">Último Ano</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                }
            />

            <CardContent sx={{ p: 3 }}>
                {/* Cards de Estatísticas Rápidas */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card
                            sx={{
                                background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.primary.main}05)`,
                                border: `1px solid ${theme.palette.primary.light}30`,
                                p: 2
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box
                                    sx={{
                                        p: 1,
                                        borderRadius: 2,
                                        background: theme.palette.primary.main,
                                        color: 'white'
                                    }}
                                >
                                    <Calendar size={20} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                                        {stats.totalSessions}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'grey.600' }}>
                                        Sessões Totais
                                    </Typography>
                                </Box>
                            </Box>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card
                            sx={{
                                background: `linear-gradient(135deg, ${theme.palette.success.main}15, ${theme.palette.success.main}05)`,
                                border: `1px solid ${theme.palette.success.light}30`,
                                p: 2
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box
                                    sx={{
                                        p: 1,
                                        borderRadius: 2,
                                        background: theme.palette.success.main,
                                        color: 'white'
                                    }}
                                >
                                    <TrendingUp size={20} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                                        {stats.attendanceRate}%
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'grey.600' }}>
                                        Taxa de Comparecimento
                                    </Typography>
                                </Box>
                            </Box>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card
                            sx={{
                                background: `linear-gradient(135deg, ${theme.palette.warning.main}15, ${theme.palette.warning.main}05)`,
                                border: `1px solid ${theme.palette.warning.light}30`,
                                p: 2
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box
                                    sx={{
                                        p: 1,
                                        borderRadius: 2,
                                        background: theme.palette.warning.main,
                                        color: 'white'
                                    }}
                                >
                                    <Activity size={20} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.warning.main }}>
                                        {stats.completedGoals}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'grey.600' }}>
                                        Metras Atingidas
                                    </Typography>
                                </Box>
                            </Box>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card
                            sx={{
                                background: `linear-gradient(135deg, ${theme.palette.info.main}15, ${theme.palette.info.main}05)`,
                                border: `1px solid ${theme.palette.info.light}30`,
                                p: 2
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box
                                    sx={{
                                        p: 1,
                                        borderRadius: 2,
                                        background: theme.palette.info.main,
                                        color: 'white'
                                    }}
                                >
                                    <Users size={20} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.info.main }}>
                                        {stats.activePatients}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'grey.600' }}>
                                        Pacientes Ativos
                                    </Typography>
                                </Box>
                            </Box>
                        </Card>
                    </Grid>
                </Grid>

                {/* Gráficos Principais */}
                <Grid container spacing={3}>
                    {/* Progresso dos Pacientes */}
                    <Grid item xs={12} lg={8}>
                        <Card
                            sx={{
                                height: '100%',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: theme.shadows[4],
                                }
                            }}
                        >
                            <CardHeader
                                title={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <BarChart2 size={20} color={theme.palette.success.main} />
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            Progresso dos Pacientes
                                        </Typography>
                                    </Box>
                                }
                                action={
                                    <Chip
                                        label="Evolução"
                                        size="small"
                                        color="success"
                                        variant="outlined"
                                    />
                                }
                            />
                            <CardContent>
                                <Box sx={{ height: 300 }}>
                                    <Line
                                        data={mockReportsData.patientProgress}
                                        options={chartOptions}
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Distribuição de Pacientes */}
                    <Grid item xs={12} lg={4}>
                        <Card
                            sx={{
                                height: '100%',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: theme.shadows[4],
                                }
                            }}
                        >
                            <CardHeader
                                title={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Users size={20} color={theme.palette.info.main} />
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            Distribuição por Área
                                        </Typography>
                                    </Box>
                                }
                            />
                            <CardContent>
                                <Box sx={{ height: 300 }}>
                                    <Doughnut
                                        data={mockReportsData.patientDistribution}
                                        options={doughnutOptions}
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Frequência às Sessões */}
                    <Grid item xs={12}>
                        <Card
                            sx={{
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: theme.shadows[4],
                                }
                            }}
                        >
                            <CardHeader
                                title={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Activity size={20} color={theme.palette.secondary.main} />
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            Frequência às Sessões
                                        </Typography>
                                    </Box>
                                }
                                subheader={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                                        <Typography variant="body2" sx={{ color: 'grey.600' }}>
                                            Taxa média de comparecimento:
                                        </Typography>
                                        <Chip
                                            label={`${stats.attendanceRate}%`}
                                            size="small"
                                            color={getAttendanceColor(stats.attendanceRate)}
                                            variant="filled"
                                        />
                                    </Box>
                                }
                            />
                            <CardContent>
                                <Box sx={{ height: 300 }}>
                                    <Bar
                                        data={mockReportsData.sessionAttendance}
                                        options={chartOptions}
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Cards de Relatórios */}
                    {[
                        {
                            title: 'Relatório de Sessões',
                            description: 'Relatório detalhado de todas as sessões realizadas com métricas de evolução',
                            type: 'sessions',
                            color: 'primary'
                        },
                        {
                            title: 'Relatório Financeiro',
                            description: 'Resumo de pagamentos, receitas e fluxo de caixa',
                            type: 'financial',
                            color: 'success'
                        },
                        {
                            title: 'Relatório de Pacientes',
                            description: 'Lista completa de pacientes com histórico e progresso detalhado',
                            type: 'patients',
                            color: 'info'
                        }
                    ].map((report, index) => (
                        <Grid item xs={12} md={4} key={index}>
                            <Card
                                sx={{
                                    height: '100%',
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: theme.shadows[3],
                                    }
                                }}
                            >
                                <CardHeader
                                    title={
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            {report.title}
                                        </Typography>
                                    }
                                />
                                <CardContent>
                                    <Typography variant="body2" sx={{ color: 'grey.600', mb: 3, minHeight: 40 }}>
                                        {report.description}
                                    </Typography>

                                    {isGenerating ? (
                                        <Box sx={{ width: '100%' }}>
                                            <LinearProgress />
                                            <Typography variant="body2" sx={{ textAlign: 'center', mt: 1, color: 'grey.500' }}>
                                                Gerando relatório...
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <Button
                                            variant="outlined"
                                            fullWidth
                                            startIcon={<Download size={16} />}
                                            onClick={() => handleGenerateReport(report.type)}
                                            sx={{
                                                borderRadius: 2,
                                                borderColor: theme.palette[report.color].main,
                                                color: theme.palette[report.color].main,
                                                '&:hover': {
                                                    borderColor: theme.palette[report.color].dark,
                                                    backgroundColor: theme.palette[report.color].light + '10'
                                                }
                                            }}
                                        >
                                            Gerar Relatório
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>

                {/* Alertas e Insights */}
                <Alert
                    severity="info"
                    sx={{
                        mt: 3,
                        borderRadius: 2,
                        background: theme.palette.info.light + '10',
                        border: `1px solid ${theme.palette.info.light}30`
                    }}
                >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        💡 Dica: Use os filtros de período para analisar tendências específicas.
                        Os relatórios podem ser exportados em PDF e Excel.
                    </Typography>
                </Alert>
            </CardContent>
        </Card>
    );
}