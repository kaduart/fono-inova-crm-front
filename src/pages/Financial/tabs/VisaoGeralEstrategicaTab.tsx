// pages/Financial/tabs/VisaoGeralEstrategicaTab.tsx
// Visão Geral Estratégica - Painel Executivo da Clínica (CONSOLIDADO)

import { useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    Chip,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    AlertTitle,
    Skeleton,
    Divider,
    LinearProgress,
    Avatar,
    Paper,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    TrendingUp,
    TrendingDown,
    AttachMoney,
    Receipt,
    Warning,
    CheckCircle,
    Error,
    Info,
    ArrowUpward,
    ArrowDownward,
    CalendarToday,
    CompareArrows,
    Assessment,
    Savings,
    Timeline,
    AccountBalanceWallet,
    LocalHospital,
    Group,
    CalendarMonth,
    MedicalServices,
    FolderSpecial,
    EventAvailable
} from '@mui/icons-material';
import { useFinancialOverview } from '../../../hooks/useFinancialOverview';
import { MetricDetailModal } from '../components/MetricDetailModal';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';

type ViewPeriod = 'daily' | 'weekly' | 'biweekly' | 'monthly';

type ModalType = 'leads' | 'avaliacoes-agendadas' | 'avaliacoes-realizadas' | 'pacotes' | 'sessoes';

const VisaoGeralEstrategicaTab = () => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedComparison, setSelectedComparison] = useState<'previous' | 'lastYear'>('previous');
    const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('monthly');
    
    // 🆕 Estados para modal
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState<ModalType>('leads');
    const [modalTitle, setModalTitle] = useState('');
    const [modalColor, setModalColor] = useState('#3B82F6');
    
    const openModal = (type: ModalType, title: string, color: string) => {
        setModalType(type);
        setModalTitle(title);
        setModalColor(color);
        setModalOpen(true);
    };

    const {
        data,
        loading,
        error,
        fetchOverview,
        formatCurrency,
        formatPercent,
        getVariationColor,
        getVariationIcon
    } = useFinancialOverview();

    // Atualiza automaticamente ao mudar período
    useEffect(() => {
        fetchOverview(selectedMonth, selectedYear, selectedComparison);
    }, [selectedMonth, selectedYear, selectedComparison, fetchOverview]);

    // Helpers
    const getInsightIcon = (type: string) => {
        switch (type) {
            case 'positive': return <CheckCircle sx={{ color: '#10B981' }} />;
            case 'warning': return <Warning sx={{ color: '#F59E0B' }} />;
            case 'risk': return <Error sx={{ color: '#EF4444' }} />;
            default: return <Info sx={{ color: '#6B7280' }} />;
        }
    };

    const getInsightColor = (severity: string) => {
        switch (severity) {
            case 'good': return 'success';
            case 'critical': return 'error';
            case 'high': return 'error';
            case 'medium': return 'warning';
            default: return 'info';
        }
    };

    const months = Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })
    }));

    const years = Array.from({ length: 5 }, (_, i) => selectedYear - 2 + i);

    // Dados reais da API para fevereiro/2026
    const periodoAtual = "Fevereiro 2026";
    const periodoComparacao = "Janeiro 2026";

    // Cálculos do Caixa Real + Convênios (inline)
    const receitaParticular = data?.metrics?.particularRecebido || data?.metrics?.receita || 0;
    const conveniosRecebidos = data?.metrics?.convenioRecebido || 0;
    const convenioData = data?.metrics?.convenio;
    
    const conveniosAtendidos = convenioData?.receitaRealizada || 0;
    const provisaoTotal = convenioData?.provisaoTotal || 0;
    const provisaoAgendadas = convenioData?.provisaoAgendadas || 0;
    const caixaReal = receitaParticular + conveniosRecebidos;
    const totalComProvisao = caixaReal + provisaoTotal + provisaoAgendadas;
    const provisaoMaiorQueCaixa = provisaoTotal > caixaReal;
    const percentualProvisao = caixaReal > 0 ? ((provisaoTotal / caixaReal) * 100).toFixed(1) : '0';
    
    // NOVO: Crédito em Pacotes
    const creditoPacotes = data?.metrics?.creditoPacotes;
    const totalCreditoPacotes = creditoPacotes?.total || 0;
    const pacientesCredito = creditoPacotes?.pacientes || [];
    const top3Pacientes = pacientesCredito.slice(0, 3);

    if (error) {
        return (
            <Alert severity="error" sx={{ m: 2, borderRadius: 2 }}>
                <AlertTitle>Erro ao carregar dados</AlertTitle>
                {error}
            </Alert>
        );
    }

    return (
        <Box>
            {/* Header com Filtros */}
            <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, mb: { xs: 2, sm: 3 }, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: '#8B5CF6', width: 48, height: 48 }}>
                            <Assessment className="w-6 h-6 text-white" />
                        </Avatar>
                        <Box>
                            <Typography variant="h5" fontWeight="bold">
                                📊 Dashboard Executivo
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Painel executivo de saúde financeira da clínica
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: { xs: 1, sm: 1.5 }, alignItems: 'center', width: { xs: '100%', md: 'auto' } }}>
                        <FormControl size="small" sx={{ flex: 1, maxWidth: { xs: '33%', sm: 110, md: 'none' } }}>
                            <InputLabel>Mês</InputLabel>
                            <Select
                                value={selectedMonth}
                                label="Mês"
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            >
                                {months.map(m => (
                                    <MenuItem key={m.value} value={m.value}>
                                        {m.label.charAt(0).toUpperCase() + m.label.slice(1)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ flex: 1, maxWidth: { xs: '33%', sm: 90, md: 'none' } }}>
                            <InputLabel>Ano</InputLabel>
                            <Select
                                value={selectedYear}
                                label="Ano"
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                            >
                                {years.map(y => (
                                    <MenuItem key={y} value={y}>{y}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ flex: 1.5, maxWidth: { xs: '34%', sm: 140, md: 'none' } }}>
                            <InputLabel>Comparar</InputLabel>
                            <Select
                                value={selectedComparison}
                                label="Comparar"
                                onChange={(e) => setSelectedComparison(e.target.value as 'previous' | 'lastYear')}
                            >
                                <MenuItem value="previous">Mês anterior</MenuItem>
                                <MenuItem value="lastYear">Ano anterior</MenuItem>
                            </Select>
                        </FormControl>

                        <Tooltip title="Atualizar dados">
                            <IconButton size="small" color="primary">
                                <CompareArrows fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
            </Paper>

            {loading ? (
                <Box sx={{ mt: 2 }}>
                    <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />
                    <Grid container spacing={{ xs: 1.5, sm: 2, md: 2.5 }}>
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Grid item xs={6} sm={6} md={4} lg={2} key={i}>
                                <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            ) : data ? (
                <>
                    {/* Cards de Métricas Operacionais (Funnel) */}
                    <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5, md: 3 }, mb: { xs: 2, sm: 3 }, border: '1px solid', borderColor: 'primary.main' + '20', borderRadius: 2, bgcolor: 'primary.main' + '05' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 2, sm: 3 } }}>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                                <Assessment sx={{ fontSize: 18, color: 'white' }} />
                            </Avatar>
                            <Typography variant="h6" fontWeight="600">📊 Métricas Operacionais - Fevereiro</Typography>
                        </Box>

                        <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }}>
                            {/* Leads Recebidos */}
                            <Grid item xs={6} sm={6} md={4} lg={2.4}>
                                <Card 
                                    elevation={0} 
                                    onClick={() => openModal('leads', 'Leads Recebidos', '#3B82F6')}
                                    sx={{ 
                                        width: '100%', 
                                        border: '1px solid', 
                                        borderColor: '#3B82F630', 
                                        borderRadius: 2, 
                                        height: '100%',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': { 
                                            boxShadow: '0 4px 12px #3B82F630',
                                            borderColor: '#3B82F6',
                                            transform: 'translateY(-2px)'
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                            <Avatar sx={{ bgcolor: '#3B82F6', width: 40, height: 40 }}>
                                                <Group sx={{ color: 'white', fontSize: 20 }} />
                                            </Avatar>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Leads Recebidos</Typography>
                                                <Typography variant="h5" fontWeight="bold" color="#3B82F6">
                                                    {(() => {
                                                        const total = data.metrics?.leadsRecebidos || 0;
                                                        const diasNoMes = new Date(selectedYear, selectedMonth, 0).getDate();
                                                        switch (viewPeriod) {
                                                            case 'daily': return Math.round(total / diasNoMes);
                                                            case 'weekly': return Math.round(total / 4);
                                                            case 'biweekly': return Math.round(total / 2);
                                                            default: return total;
                                                        }
                                                    })()}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            <Chip 
                                                size="small" 
                                                label="Novos contatos" 
                                                sx={{ bgcolor: '#3B82F615', color: '#3B82F6', fontWeight: 500, fontSize: '0.7rem' }} 
                                            />
                                            <FormControl size="small" sx={{ mt: 0.5 }}>
                                                <Select
                                                    value={viewPeriod}
                                                    onChange={(e) => setViewPeriod(e.target.value as ViewPeriod)}
                                                    sx={{ 
                                                        fontSize: '0.7rem', 
                                                        height: 24,
                                                        '& .MuiSelect-select': { py: 0.3, px: 1 },
                                                        bgcolor: '#3B82F608',
                                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#3B82F640' }
                                                    }}
                                                >
                                                    <MenuItem value="daily" sx={{ fontSize: '0.75rem' }}>Por Dia</MenuItem>
                                                    <MenuItem value="weekly" sx={{ fontSize: '0.75rem' }}>Por Semana</MenuItem>
                                                    <MenuItem value="biweekly" sx={{ fontSize: '0.75rem' }}>Por Quinzena</MenuItem>
                                                    <MenuItem value="monthly" sx={{ fontSize: '0.75rem' }}>Por Mês</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Agendamentos (Avaliações Agendadas) */}
                            <Grid item xs={12} sm={6} md={4} lg={2.4}>
                                <Card 
                                    elevation={0} 
                                    onClick={() => openModal('avaliacoes-agendadas', 'Avaliações Agendadas', '#10B981')}
                                    sx={{ 
                                        width: '100%', 
                                        border: '1px solid', 
                                        borderColor: '#10B98130', 
                                        borderRadius: 2, 
                                        height: '100%',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': { 
                                            boxShadow: '0 4px 12px #10B98130',
                                            borderColor: '#10B981',
                                            transform: 'translateY(-2px)'
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                            <Avatar sx={{ bgcolor: '#10B981', width: 40, height: 40 }}>
                                                <CalendarMonth sx={{ color: 'white', fontSize: 20 }} />
                                            </Avatar>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Avaliações Agend.</Typography>
                                                <Typography variant="h5" fontWeight="bold" color="#10B981">
                                                    {data.metrics?.agendamentosRealizados || 0}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Chip 
                                            size="small" 
                                            label={`${data.metrics?.leadsRecebidos ? Math.round(((data.metrics?.agendamentosRealizados || 0) / data.metrics.leadsRecebidos) * 100) : 0}% conversão`}
                                            sx={{ bgcolor: '#10B98115', color: '#10B981', fontWeight: 500, fontSize: '0.7rem' }} 
                                        />
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Avaliações Realizadas */}
                            <Grid item xs={12} sm={6} md={4} lg={2.4}>
                                <Card 
                                    elevation={0} 
                                    onClick={() => openModal('avaliacoes-realizadas', 'Avaliações Realizadas', '#F59E0B')}
                                    sx={{ 
                                        width: '100%', 
                                        border: '1px solid', 
                                        borderColor: '#F59E0B30', 
                                        borderRadius: 2, 
                                        height: '100%',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': { 
                                            boxShadow: '0 4px 12px #F59E0B30',
                                            borderColor: '#F59E0B',
                                            transform: 'translateY(-2px)'
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                            <Avatar sx={{ bgcolor: '#F59E0B', width: 40, height: 40 }}>
                                                <MedicalServices sx={{ color: 'white', fontSize: 20 }} />
                                            </Avatar>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Avaliações Realiz.</Typography>
                                                <Typography variant="h5" fontWeight="bold" color="#F59E0B">
                                                    {data.metrics?.avaliacoesRealizadas || 0}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Chip 
                                            size="small" 
                                            label={`${data.metrics?.agendamentosRealizados ? Math.round(((data.metrics?.avaliacoesRealizadas || 0) / data.metrics.agendamentosRealizados) * 100) : 0}% compareceram`}
                                            sx={{ bgcolor: '#F59E0B15', color: '#F59E0B', fontWeight: 500, fontSize: '0.7rem' }} 
                                        />
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Projetos Fechados (Pacotes) */}
                            <Grid item xs={12} sm={6} md={4} lg={2.4}>
                                <Card 
                                    elevation={0} 
                                    onClick={() => openModal('pacotes', 'Pacotes Fechados', '#8B5CF6')}
                                    sx={{ 
                                        width: '100%', 
                                        border: '1px solid', 
                                        borderColor: '#8B5CF630', 
                                        borderRadius: 2, 
                                        height: '100%',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': { 
                                            boxShadow: '0 4px 12px #8B5CF630',
                                            borderColor: '#8B5CF6',
                                            transform: 'translateY(-2px)'
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                            <Avatar sx={{ bgcolor: '#8B5CF6', width: 40, height: 40 }}>
                                                <FolderSpecial sx={{ color: 'white', fontSize: 20 }} />
                                            </Avatar>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Pacotes Fechados</Typography>
                                                <Typography variant="h5" fontWeight="bold" color="#8B5CF6">
                                                    {data.metrics?.projetosFechados || 0}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Chip 
                                            size="small" 
                                            label={`${data.metrics?.avaliacoesRealizadas ? Math.round(((data.metrics?.projetosFechados || 0) / data.metrics.avaliacoesRealizadas) * 100) : 0}% conversão`}
                                            sx={{ bgcolor: '#8B5CF615', color: '#8B5CF6', fontWeight: 500, fontSize: '0.7rem' }} 
                                        />
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Sessões do Mês */}
                            <Grid item xs={12} sm={6} md={4} lg={2.4}>
                                <Card 
                                    elevation={0} 
                                    onClick={() => openModal('sessoes', 'Sessões do Mês', '#EC4899')}
                                    sx={{ 
                                        width: '100%', 
                                        border: '1px solid', 
                                        borderColor: '#EC489930', 
                                        borderRadius: 2, 
                                        height: '100%',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        '&:hover': { 
                                            boxShadow: '0 4px 12px #EC489930',
                                            borderColor: '#EC4899',
                                            transform: 'translateY(-2px)'
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                            <Avatar sx={{ bgcolor: '#EC4899', width: 40, height: 40 }}>
                                                <EventAvailable sx={{ color: 'white', fontSize: 20 }} />
                                            </Avatar>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary">Sessões do Mês</Typography>
                                                <Typography variant="h5" fontWeight="bold" color="#EC4899">
                                                    {data.metrics?.sessoesMes || 0}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Chip 
                                            size="small" 
                                            label={`${data.metrics?.projetosFechados ? Math.round((data.metrics?.sessoesMes || 0) / data.metrics.projetosFechados) : 0} sessões/pacote`}
                                            sx={{ bgcolor: '#EC489915', color: '#EC4899', fontWeight: 500, fontSize: '0.7rem' }} 
                                        />
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* 🆕 Cards de Análise de Leads - Origem e Pico */}
                    <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5, md: 3 }, mb: { xs: 2, sm: 3 }, border: '1px solid', borderColor: '#3B82F620', borderRadius: 2, bgcolor: '#EFF6FF' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 2, sm: 3 } }}>
                            <Avatar sx={{ bgcolor: '#3B82F6', width: 32, height: 32 }}>
                                <Group sx={{ fontSize: 18, color: 'white' }} />
                            </Avatar>
                            <Typography variant="h6" fontWeight="600">📈 Análise de Leads - Origens</Typography>
                        </Box>

                        <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }}>
                            {/* WhatsApp */}
                            <Grid item xs={6} sm={4} md={2.4}>
                                <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#25D36630', borderRadius: 2, height: '100%', bgcolor: '#25D36608' }}>
                                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ bgcolor: '#25D366', width: 32, height: 32 }}>
                                                <Typography sx={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>Wpp</Typography>
                                            </Avatar>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" display="block">WhatsApp</Typography>
                                                <Typography variant="h6" fontWeight="bold" color="#25D366">
                                                    {data.metrics?.leadsWhatsApp || 0}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Tráfego Pago */}
                            <Grid item xs={6} sm={4} md={2.4}>
                                <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#F59E0B30', borderRadius: 2, height: '100%', bgcolor: '#F59E0B08' }}>
                                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ bgcolor: '#F59E0B', width: 32, height: 32 }}>
                                                <Typography sx={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Ads</Typography>
                                            </Avatar>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" display="block">Tráfego Pago</Typography>
                                                <Typography variant="h6" fontWeight="bold" color="#F59E0B">
                                                    {data.metrics?.leadsTrafegoPago || 0}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Agenda Direta */}
                            <Grid item xs={6} sm={4} md={2.4}>
                                <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#8B5CF630', borderRadius: 2, height: '100%', bgcolor: '#8B5CF608' }}>
                                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ bgcolor: '#8B5CF6', width: 32, height: 32 }}>
                                                <Typography sx={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>Dir</Typography>
                                            </Avatar>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" display="block">Agenda Direta</Typography>
                                                <Typography variant="h6" fontWeight="bold" color="#8B5CF6">
                                                    {data.metrics?.leadsAgendaDireta || 0}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        {data.metrics?.leadsAutoCriados ? (
                                            <Chip 
                                                size="small" 
                                                label={`${data.metrics.leadsAutoCriados} auto`}
                                                sx={{ mt: 0.5, bgcolor: '#8B5CF615', color: '#8B5CF6', fontSize: '0.65rem', height: 18 }} 
                                            />
                                        ) : null}
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Dia com Pico */}
                            <Grid item xs={6} sm={4} md={2.4}>
                                <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#EF444430', borderRadius: 2, height: '100%', bgcolor: '#EF444408' }}>
                                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ bgcolor: '#EF4444', width: 32, height: 32 }}>
                                                <Typography sx={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>🔥</Typography>
                                            </Avatar>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" display="block">Dia com Pico</Typography>
                                                <Typography variant="h6" fontWeight="bold" color="#EF4444">
                                                    {data.metrics?.diaPico ? format(new Date(data.metrics.diaPico.data), 'dd/MM', { locale: ptBR }) : '--'}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        {data.metrics?.diaPico ? (
                                            <Chip 
                                                size="small" 
                                                label={`${data.metrics.diaPico.quantidade} leads`}
                                                sx={{ mt: 0.5, bgcolor: '#EF444415', color: '#EF4444', fontSize: '0.65rem', height: 18 }} 
                                            />
                                        ) : null}
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Agendamentos Diretos */}
                            <Grid item xs={6} sm={4} md={2.4}>
                                <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#10B98130', borderRadius: 2, height: '100%', bgcolor: '#10B98108' }}>
                                    <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Avatar sx={{ bgcolor: '#10B981', width: 32, height: 32 }}>
                                                <Typography sx={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>+</Typography>
                                            </Avatar>
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" display="block">Agend. Diretos</Typography>
                                                <Typography variant="h6" fontWeight="bold" color="#10B981">
                                                    {data.metrics?.agendamentosDiretos || 0}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Cards Principais */}
                    <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ width: '100%', mb: { xs: 3, sm: 3 } }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <MetricCard
                                title="Receita"
                                value={formatCurrency(data.metrics?.receita)}
                                variation={data.variation?.receita}
                                icon={<AttachMoney />}
                                color="#10B981"
                                bgColor="#10B98110"
                                formatPercent={formatPercent}
                                getVariationColor={getVariationColor}
                                getVariationIcon={getVariationIcon}
                                subtitle={`${data.metrics?.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <MetricCard
                                title="Despesas"
                                value={formatCurrency(data.metrics?.despesas)}
                                variation={data.variation?.despesas}
                                icon={<Receipt />}
                                color="#EF4444"
                                bgColor="#EF444410"
                                formatPercent={formatPercent}
                                getVariationColor={getVariationColor}
                                getVariationIcon={getVariationIcon}
                                isInverted
                                subtitle="Nenhuma despesa registrada"
                            />
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <MetricCard
                                title="Lucro"
                                value={formatCurrency(data.metrics?.lucro)}
                                variation={data.variation?.lucro}
                                icon={<Savings />}
                                color="#8B5CF6"
                                bgColor="#8B5CF610"
                                formatPercent={formatPercent}
                                getVariationColor={getVariationColor}
                                getVariationIcon={getVariationIcon}
                                subtitle={`Margem: ${(data.metrics?.margem * 100).toFixed(1)}%`}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <MetricCard
                                title="Margem"
                                value={`${(data.metrics?.margem * 100).toFixed(1)}%`}
                                variation={data.variation?.margem}
                                icon={<Timeline />}
                                color="#0EA5E9"
                                bgColor="#0EA5E910"
                                formatPercent={formatPercent}
                                getVariationColor={getVariationColor}
                                getVariationIcon={getVariationIcon}
                                subtitle="Lucro / Receita"
                            />
                        </Grid>
                    </Grid>

                    {/* Segunda Linha - Caixa, A Receber, Meta, Projeção */}
                    <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ width: '100%', mb: { xs: 3, sm: 4 } }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#05966930', borderRadius: 2, height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Avatar sx={{ bgcolor: '#059669', width: 40, height: 40 }}>
                                            <AttachMoney sx={{ fontSize: 20 }} />
                                        </Avatar>
                                        <Typography variant="body2" color="text.secondary">
                                            💵 Caixa (Realizado)
                                        </Typography>
                                    </Box>
                                    <Typography variant="h4" fontWeight="bold" color="#059669" sx={{ mb: 1 }}>
                                        {formatCurrency(data.metrics?.caixa)}
                                    </Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="caption" color="text.secondary">Disponível</Typography>
                                        <Chip size="small" label="100% realizado" sx={{ bgcolor: '#05966910', color: '#059669', fontWeight: 500 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#0284C730', borderRadius: 2, height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Avatar sx={{ bgcolor: '#0284C7', width: 40, height: 40 }}>
                                            <Receipt sx={{ fontSize: 20 }} />
                                        </Avatar>
                                        <Typography variant="body2" color="text.secondary">🧾 A Receber</Typography>
                                    </Box>
                                    <Typography variant="h4" fontWeight="bold" color="#0284C7" sx={{ mb: 1 }}>
                                        {formatCurrency(data.metrics?.aReceber)}
                                    </Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="caption" color="text.secondary">Convênios pendentes</Typography>
                                        <Chip size="small" label="18% do total" sx={{ bgcolor: '#0284C710', color: '#0284C7', fontWeight: 500 }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#8B5CF630', borderRadius: 2, height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Avatar sx={{ bgcolor: '#8B5CF6', width: 40, height: 40 }}>
                                            <Assessment sx={{ fontSize: 20 }} />
                                        </Avatar>
                                        <Typography variant="body2" color="text.secondary">🎯 Meta do Mês</Typography>
                                    </Box>
                                    <Typography variant="h4" fontWeight="bold" color="#8B5CF6" sx={{ mb: 1 }}>
                                        {formatCurrency(data.metrics?.meta)}
                                    </Typography>
                                    <Box sx={{ mt: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary">Progresso</Typography>
                                            <Typography variant="caption" fontWeight="600">{data.metrics?.metaPercent.toFixed(1)}%</Typography>
                                        </Box>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={Math.min(data.metrics?.metaPercent, 100)} 
                                            sx={{ 
                                                height: 8, borderRadius: 4, bgcolor: '#E5E7EB',
                                                '& .MuiLinearProgress-bar': { bgcolor: data.metrics?.metaPercent >= 100 ? '#10B981' : '#F59E0B' }
                                            }}
                                        />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#F59E0B30', borderRadius: 2, height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Avatar sx={{ bgcolor: '#F59E0B', width: 40, height: 40 }}>
                                            <TrendingUp sx={{ fontSize: 20 }} />
                                        </Avatar>
                                        <Typography variant="body2" color="text.secondary">📈 Projeção Final</Typography>
                                    </Box>
                                    <Typography variant="h4" fontWeight="bold" color="#F59E0B" sx={{ mb: 1 }}>
                                        {formatCurrency(data.metrics?.projecao)}
                                    </Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {data.metrics?.valorDiarioNecessario > 0 
                                                ? `R$ ${data.metrics?.valorDiarioNecessario.toLocaleString('pt-BR')}/dia`
                                                : 'Acima da meta'}
                                        </Typography>
                                        <ArrowUpward sx={{ fontSize: 16, color: '#10B981' }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Caixa Real + Convênios - CONSOLIDADO INLINE */}
                    <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5, md: 3 }, mb: { xs: 2, sm: 3 }, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 2, sm: 3 } }}>
                            <Avatar sx={{ bgcolor: '#059669', width: 32, height: 32 }}>
                                <AccountBalanceWallet sx={{ fontSize: 18, color: 'white' }} />
                            </Avatar>
                            <Typography variant="h6" fontWeight="600">Caixa Real + Convênios</Typography>
                            <Tooltip title="Visão completa: particular + convênios recebidos + provisões">
                                <Info sx={{ fontSize: 18, color: 'text.secondary', cursor: 'help' }} />
                            </Tooltip>
                        </Box>

                        {/* Alerta de provisão */}
                        {provisaoMaiorQueCaixa && (
                            <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                                <Typography variant="body2" fontWeight="600">
                                    ⚠️ Atenção: Provisão ({formatCurrency(provisaoTotal)}) é {percentualProvisao}% do Caixa Real
                                </Typography>
                            </Alert>
                        )}

                        {/* 6 Cards de Caixa */}
                        <Grid container spacing={{ xs: 1.5, sm: 2, md: 2.5 }}>
                            {/* Particular */}
                            <Grid item xs={12} sm={6} md={4} lg={2}>
                                <Tooltip title="Pagamentos particulares (PIX, dinheiro, cartão)" arrow>
                                    <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#10B98130', borderRadius: 2, height: '100%', bgcolor: '#10B98110' }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: { xs: 1.5, sm: 2 } }}>
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary" gutterBottom fontSize="0.8rem">Particular</Typography>
                                                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#10B981' }}>
                                                        {formatCurrency(receitaParticular)}
                                                    </Typography>
                                                </Box>
                                                <Avatar sx={{ bgcolor: '#10B98120', width: 40, height: 40 }}>
                                                    <AttachMoney sx={{ color: '#10B981', fontSize: 20 }} />
                                                </Avatar>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">Dinheiro recebido</Typography>
                                        </CardContent>
                                    </Card>
                                </Tooltip>
                            </Grid>

                            {/* Convênios Recebidos */}
                            <Grid item xs={12} sm={6} md={4} lg={2}>
                                <Tooltip title="Convênios que efetivamente pagaram neste mês" arrow>
                                    <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#3B82F630', borderRadius: 2, height: '100%', bgcolor: '#3B82F610' }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: { xs: 1.5, sm: 2 } }}>
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary" gutterBottom fontSize="0.8rem">Convênios Pagos</Typography>
                                                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#3B82F6' }}>
                                                        {formatCurrency(conveniosRecebidos)}
                                                    </Typography>
                                                </Box>
                                                <Avatar sx={{ bgcolor: '#3B82F620', width: 40, height: 40 }}>
                                                    <Receipt sx={{ color: '#3B82F6', fontSize: 20 }} />
                                                </Avatar>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">Pagos este mês</Typography>
                                        </CardContent>
                                    </Card>
                                </Tooltip>
                            </Grid>

                            {/* Convênios Atendidos */}
                            <Grid item xs={12} sm={6} md={4} lg={2}>
                                <Tooltip title="Sessões de convênio realizadas neste mês (produção)" arrow>
                                    <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#8B5CF630', borderRadius: 2, height: '100%', bgcolor: '#8B5CF610' }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: { xs: 1.5, sm: 2 } }}>
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary" gutterBottom fontSize="0.8rem">Convênios Atendidos</Typography>
                                                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#8B5CF6' }}>
                                                        {formatCurrency(conveniosAtendidos)}
                                                    </Typography>
                                                </Box>
                                                <Avatar sx={{ bgcolor: '#8B5CF620', width: 40, height: 40 }}>
                                                    <LocalHospital sx={{ color: '#8B5CF6', fontSize: 20 }} />
                                                </Avatar>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">Produção do mês</Typography>
                                        </CardContent>
                                    </Card>
                                </Tooltip>
                            </Grid>

                            {/* Provisão Acumulada */}
                            <Grid item xs={12} sm={6} md={4} lg={2}>
                                <Tooltip title="Total acumulado de convênios a receber até o mês" arrow>
                                    <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#F59E0B30', borderRadius: 2, height: '100%', bgcolor: '#F59E0B10' }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: { xs: 1.5, sm: 2 } }}>
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary" gutterBottom fontSize="0.8rem">Provisão Acumulada</Typography>
                                                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#F59E0B' }}>
                                                        {formatCurrency(provisaoTotal)}
                                                    </Typography>
                                                </Box>
                                                <Avatar sx={{ bgcolor: '#F59E0B20', width: 40, height: 40 }}>
                                                    <TrendingUp sx={{ color: '#F59E0B', fontSize: 20 }} />
                                                </Avatar>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">A receber até mês</Typography>
                                        </CardContent>
                                    </Card>
                                </Tooltip>
                            </Grid>

                            {/* Provisão Agendadas */}
                            <Grid item xs={12} sm={6} md={4} lg={2}>
                                <Tooltip title="Valor projetado de sessões agendadas para futuro" arrow>
                                    <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#EC489930', borderRadius: 2, height: '100%', bgcolor: '#EC489910' }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: { xs: 1.5, sm: 2 } }}>
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary" gutterBottom fontSize="0.8rem">Provisão Agendadas</Typography>
                                                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#EC4899' }}>
                                                        {formatCurrency(provisaoAgendadas)}
                                                    </Typography>
                                                </Box>
                                                <Avatar sx={{ bgcolor: '#EC489920', width: 40, height: 40 }}>
                                                    <CalendarToday sx={{ color: '#EC4899', fontSize: 20 }} />
                                                </Avatar>
                                            </Box>
                                            <Typography variant="caption" color="text.secondary">Futuras</Typography>
                                        </CardContent>
                                    </Card>
                                </Tooltip>
                            </Grid>

                            {/* Total Caixa */}
                            <Grid item xs={12} sm={6} md={4} lg={2}>
                                <Tooltip title="Caixa real + provisões (visão completa)" arrow>
                                    <Card elevation={2} sx={{ width: '100%', border: '2px solid', borderColor: '#059669', borderRadius: 2, height: '100%', bgcolor: '#05966915' }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: { xs: 1.5, sm: 2 } }}>
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary" gutterBottom fontSize="0.8rem" fontWeight="600">TOTAL CAIXA</Typography>
                                                    <Typography variant="h5" fontWeight="bold" sx={{ color: '#059669', fontSize: '1.2rem' }}>
                                                        {formatCurrency(totalComProvisao)}
                                                    </Typography>
                                                </Box>
                                                <Avatar sx={{ bgcolor: '#05966930', width: 48, height: 48 }}>
                                                    <AccountBalanceWallet sx={{ color: '#059669', fontSize: 24 }} />
                                                </Avatar>
                                            </Box>
                                            <Divider sx={{ my: 1, borderColor: '#05966930' }} />
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Typography variant="caption" color="text.secondary">Real:</Typography>
                                                    <Chip size="small" label={formatCurrency(caixaReal)} sx={{ bgcolor: '#10B98120', color: '#10B981', fontSize: '0.6rem', height: 18 }} />
                                                </Box>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Typography variant="caption" color="text.secondary">Provisão:</Typography>
                                                    <Chip size="small" label={formatCurrency(provisaoTotal)} sx={{ bgcolor: '#F59E0B20', color: '#F59E0B', fontSize: '0.6rem', height: 18 }} />
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Tooltip>
                            </Grid>

                            {/* NOVO: Crédito em Pacotes */}
                            <Grid item xs={12} sm={6} md={4} lg={2}>
                                <Tooltip 
                                    title={
                                        <Box>
                                            <Typography variant="caption" fontWeight="bold">Top Créditos:</Typography>
                                            {top3Pacientes.map((p, i) => (
                                                <Typography key={i} variant="caption" display="block">
                                                    {i + 1}. {p.paciente}: {p.sessoesRemanescentes}s = {formatCurrency(p.valorTotal)}
                                                </Typography>
                                            ))}
                                            {pacientesCredito.length > 3 && (
                                                <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                                    ...e mais {pacientesCredito.length - 3} pacientes
                                                </Typography>
                                            )}
                                        </Box>
                                    } 
                                    arrow
                                >
                                    <Card elevation={0} sx={{ width: '100%', border: '2px solid', borderColor: '#EA580C30', borderRadius: 2, height: '100%', bgcolor: '#FFF7ED' }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary" gutterBottom fontSize="0.75rem" fontWeight="600">CRÉDITO PACOTES</Typography>
                                                    <Typography variant="h5" fontWeight="bold" sx={{ color: '#EA580C', fontSize: '1.1rem' }}>
                                                        {formatCurrency(totalCreditoPacotes)}
                                                    </Typography>
                                                </Box>
                                                <Avatar sx={{ bgcolor: '#EA580C20', width: 40, height: 40 }}>
                                                    <AccountBalanceWallet sx={{ color: '#EA580C', fontSize: 20 }} />
                                                </Avatar>
                                            </Box>
                                            <Divider sx={{ my: 1, borderColor: '#EA580C20' }} />
                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
                                                {pacientesCredito.length} pacientes com sessões pagas
                                            </Typography>
                                            {top3Pacientes.length > 0 && (
                                                <Box sx={{ mt: 0.5 }}>
                                                    {top3Pacientes.slice(0, 2).map((p, i) => (
                                                        <Typography key={i} variant="caption" display="block" sx={{ fontSize: '0.6rem', color: '#666' }} noWrap>
                                                            • {p.paciente?.split(' ')[0]}: {p.sessoesRemanescentes}s
                                                        </Typography>
                                                    ))}
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Tooltip>
                            </Grid>
                        </Grid>

                        {/* Legenda */}
                        <Box sx={{ mt: 2, p: 2, bgcolor: '#F0FDF4', borderRadius: 2, border: '1px solid', borderColor: '#10B98130' }}>
                            <Typography variant="subtitle2" color="#059669" gutterBottom fontWeight="600">💡 Como ler o caixa:</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={4}>
                                    <Typography variant="caption" color="text.secondary">
                                        <strong style={{ color: '#10B981' }}>🟢 Caixa Real:</strong> Particular + Convênios Recebidos
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Typography variant="caption" color="text.secondary">
                                        <strong style={{ color: '#8B5CF6' }}>🟣 Produção:</strong> Sessões realizadas no mês
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Typography variant="caption" color="text.secondary">
                                        <strong style={{ color: '#F59E0B' }}>🟡 Provisão:</strong> A receber (realizadas + agendadas)
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    </Paper>

                    {/* Insights Estratégicos */}
                    {data.insights.length > 0 && (
                        <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5, md: 3 }, mb: { xs: 2, sm: 3 }, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: { xs: 2, sm: 3 } }}>
                                <Avatar sx={{ bgcolor: '#8B5CF6', width: 32, height: 32 }}>
                                    <Info sx={{ fontSize: 18, color: 'white' }} />
                                </Avatar>
                                <Typography variant="h6" fontWeight="600">🔔 Insights Estratégicos</Typography>
                            </Box>
                            
                            <Grid container spacing={2}>
                                {data.insights.map((insight, index) => (
                                    <Grid item xs={12} md={6} key={index}>
                                        <Alert 
                                            severity={getInsightColor(insight.severity)}
                                            icon={getInsightIcon(insight.type)}
                                            sx={{ borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}
                                        >
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                <Box>
                                                    <AlertTitle sx={{ mb: 0.5 }}>{insight.message}</AlertTitle>
                                                    <Typography variant="caption">{insight.detail}</Typography>
                                                </Box>
                                                <Chip 
                                                    size="small"
                                                    label={insight.type === 'risk' ? '⚠️ Atenção' : '✅ Positivo'}
                                                    color={insight.type === 'risk' ? 'error' : 'success'}
                                                />
                                            </Box>
                                        </Alert>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>
                    )}

                    {/* Rodapé */}
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                        <Chip size="small" icon={<CalendarToday />} label={`Período: ${periodoAtual}`} variant="outlined" />
                        <Chip size="small" icon={<CompareArrows />} label={`Comparando: ${periodoComparacao}`} variant="outlined" sx={{ ml: 1 }} />
                        <Chip size="small" label={`Variação: ${(data.variation?.receita * 100).toFixed(1)}%`} sx={{ 
                            bgcolor: data.variation?.receita > 0 ? '#10B98110' : '#EF444410',
                            color: data.variation?.receita > 0 ? '#10B981' : '#EF4444', fontWeight: 500 
                        }} />
                    </Box>
                </>
            ) : null}
            
            {/* 🆕 Modal de Detalhes */}
            <MetricDetailModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                type={modalType}
                month={selectedMonth}
                year={selectedYear}
                title={modalTitle}
                color={modalColor}
            />
        </Box>
    );
};

// Componente auxiliar para cards de métricas
interface MetricCardProps {
    title: string;
    value: string;
    variation: number;
    icon: React.ReactNode;
    color: string;
    bgColor?: string;
    formatPercent: (value: number, isVariation?: boolean) => string;
    getVariationColor: (value: number, isInverted?: boolean) => string;
    getVariationIcon: (value: number, isInverted?: boolean) => string;
    isInverted?: boolean;
    subtitle?: string;
}

const MetricCard = ({ 
    title, value, variation, icon, color, bgColor = 'white',
    formatPercent, getVariationColor, getVariationIcon, isInverted = false, subtitle
}: MetricCardProps) => (
    <Card elevation={0} sx={{ 
        width: '100%', border: '1px solid', borderColor: `${color}30`, borderRadius: 2, height: '100%', bgcolor: bgColor,
        transition: 'all 0.2s', '&:hover': { boxShadow: `0 4px 12px ${color}20`, borderColor: color }
    }}>
        <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: { xs: 1.5, sm: 2 } }}>
                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>{title}</Typography>
                    <Typography variant="h4" fontWeight="bold" sx={{ color, lineHeight: 1.2 }}>{value}</Typography>
                    {subtitle && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{subtitle}</Typography>
                    )}
                </Box>
                <Avatar sx={{ bgcolor: `${color}15`, width: 48, height: 48 }}>{icon}</Avatar>
            </Box>
            
            {variation !== 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Chip
                        size="small"
                        icon={variation > 0 ? <ArrowUpward /> : <ArrowDownward />}
                        label={`${(Math.abs(variation) * 100).toFixed(1)}%`}
                        sx={{
                            bgcolor: variation > 0 ? (isInverted ? '#EF444410' : '#10B98110') : (isInverted ? '#10B98110' : '#EF444410'),
                            color: getVariationColor(variation, isInverted), fontWeight: 600, fontSize: '0.75rem'
                        }}
                    />
                    <Typography variant="caption" color="text.secondary">vs período anterior</Typography>
                </Box>
            )}
        </CardContent>
    </Card>
);

export default VisaoGeralEstrategicaTab;
