// src/pages/Financial/tabs/EntradasSaidasTab.tsx
// Fechamento Mensal - Visão Completa do Período

import { useState, useMemo, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    Paper,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Divider,
    LinearProgress,
    Tooltip,
    Avatar
} from '@mui/material';
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    Receipt,
    AccountBalance,
    AttachMoney,
    LocalHospital,
    Group,
    MedicalServices,
    CalendarToday,
    Warning,
    CheckCircle,
    EventAvailable,
    TrackChanges,
    Schedule
} from '@mui/icons-material';
import { useFinancialMetrics } from '../../../hooks/useFinancialMetrics';
import { useExpenses } from '../../../hooks/useExpenses';
import { usePlanning } from '../../../hooks/usePlanning';
import { FinancialLoading } from '../components/FinancialLoading';
import { FinancialDetailsModal } from '../components/FinancialDetailsModal';
import moment from 'moment-timezone';

const TIMEZONE = 'America/Sao_Paulo';

const formatCurrency = (value: number) =>
    `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const EntradasSaidasTab = () => {
    // Estado para seleção de mês/ano
    const [selectedMonth, setSelectedMonth] = useState<number>(moment().tz(TIMEZONE).month());
    const [selectedYear, setSelectedYear] = useState<number>(moment().tz(TIMEZONE).year());

    // Estado para modal de detalhes
    const [modalOpen, setModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'producao' | 'faturado' | 'caixa' | 'receber' | 'despesas' | 'resultado' | 'conv_receber' | null>(null);

    const handleOpenModal = (type: typeof modalType) => {
        setModalType(type);
        setModalOpen(true);
    };

    // Calcula datas do período selecionado
    const startDate = useMemo(() => {
        return moment().tz(TIMEZONE).year(selectedYear).month(selectedMonth).startOf('month').toISOString();
    }, [selectedMonth, selectedYear]);

    const endDate = useMemo(() => {
        return moment().tz(TIMEZONE).year(selectedYear).month(selectedMonth).endOf('month').toISOString();
    }, [selectedMonth, selectedYear]);

    // Hook de produção baseado em sessões (Session model — correto)
    const { data: financialData, isLoading: metricsLoading } = useFinancialMetrics(startDate, endDate);
    
    // Hook de despesas - com busca filtrada por período
    const { expenses, isLoading: expensesLoading, fetchExpenses } = useExpenses();
    
    // Hook de planning para metas
    const { plannings, fetchPlannings } = usePlanning();
    
    useEffect(() => {
        fetchPlannings({});
    }, [fetchPlannings]);

    // Busca despesas quando muda o período
    useEffect(() => {
        fetchExpenses({
            startDate: moment(startDate).format('YYYY-MM-DD'),
            endDate: moment(endDate).format('YYYY-MM-DD'),
            limit: 1000  // Garante que traga todas do período
        });
    }, [startDate, endDate, fetchExpenses]);

    // Total de despesas pagas do período (exclui canceladas)
    const totalExpenses = expenses
        .filter(e => e.status !== 'canceled')
        .reduce((sum, e) => sum + (e.amount || 0), 0);

    // Métricas calculadas do financialData (source of truth)
    const metrics = useMemo(() => {
        if (!financialData) {
            return {
                producao: 0,
                producaoCount: 0,
                faturado: 0,
                caixa: 0,
                aReceber: 0,
                particular: 0,
                convenioAvulso: 0,
                convenioPacote: 0,
                convenioAtendido: 0,
                convenioFaturado: 0,
                convenioRecebido: 0,
                convenioRecebidoMesAtual: 0,
                convenioRecebidoMesesAnteriores: 0,
                convenioRecebidoPorMes: [],
                convenioAReceber: 0,
                pendenteFaturamento: 0,
                percentualFaturado: 0,
                faturadoCount: 0,
                convenioAtendidoCount: 0,
                aReceberParticularDoMes: 0,
                aReceberParticularCount: 0,
                saldoDevedorTotal: 0,
                saldoDevedorCount: 0,
            };
        }

        const caixa = financialData?.cash?.total || 0;
        const particular = financialData?.cash?.breakdown?.particular || 0;
        const convenioAvulso = financialData?.cash?.breakdown?.convenioAvulso || 0;
        const convenioPacote = financialData?.cash?.breakdown?.convenioPacote || 0;
        const convenioRecebido = convenioAvulso + convenioPacote;

        const producaoSessoes = financialData?.production?.total || 0;
        const producaoCount = financialData?.production?.count || 0;

        const convenioAtendido = financialData?.convenioDetail?.atendido?.total || 0;
        const convenioAtendidoCount = financialData?.convenioDetail?.atendido?.count || 0;

        const faturadoNoMes = financialData?.billing?.total || 0;
        const faturadoCount = financialData?.billing?.count || 0;

        const aReceberParticularDoMes = financialData?.receivable?.particular?.doMes?.total || 0;
        const aReceberParticularCount = financialData?.receivable?.particular?.doMes?.count || 0;

        const saldoDevedorTotal = financialData?.receivable?.saldoDevedorTotal?.total || 0;
        const saldoDevedorCount = financialData?.receivable?.saldoDevedorTotal?.count || 0;

        const convenioAReceber = Math.max(0, convenioAtendido - convenioRecebido);
        const pendenteFaturamento = Math.max(0, convenioAtendido - faturadoNoMes);
        const percentualFaturado = convenioAtendido > 0 ? (faturadoNoMes / convenioAtendido) * 100 : 0;

        return {
            producao: producaoSessoes,
            producaoCount,
            faturado: faturadoNoMes,
            faturadoCount,
            pendenteFaturamento,
            percentualFaturado,
            caixa,
            aReceber: aReceberParticularDoMes + convenioAReceber,
            aReceberParticularDoMes,
            aReceberParticularCount,
            saldoDevedorTotal,
            saldoDevedorCount,
            particular,
            convenioAvulso,
            convenioPacote,
            convenioAtendido,
            convenioAtendidoCount,
            convenioFaturado: faturadoNoMes,
            convenioRecebido,
            convenioRecebidoMesAtual: financialData?.convenioDetail?.recebido?.mesAtual || 0,
            convenioRecebidoMesesAnteriores: financialData?.convenioDetail?.recebido?.mesesAnteriores || 0,
            convenioRecebidoPorMes: financialData?.convenioDetail?.recebido?.porMesReferencia || [],
            convenioAReceber,
        };
    }, [financialData]);

    // 🎯 Métricas de Meta (do GoalsTab)
    const planningDoMes = useMemo(() => plannings.find(p => {
        if (p.type !== 'monthly') return false;
        const planStart = new Date(p.period.start);
        const planEnd = new Date(p.period.end);
        const monthStart = new Date(selectedYear, selectedMonth, 1);
        const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
        return planStart <= monthEnd && planEnd >= monthStart;
    }), [plannings, selectedMonth, selectedYear]);
    
    const metaMensal = planningDoMes?.targets?.expectedRevenue || 0;
    
    // Agendados para projeção
    const today = moment().tz(TIMEZONE).format('YYYY-MM-DD');
    const agendadoConfirmado = financialData?.projections?.agendadoConfirmado?.total || 0;
    const agendadoPendente = financialData?.projections?.pendenteConfirmacao?.total || 0;
    const convenioAgendado = financialData?.projections?.convenioAgendado?.total || 0;
    
    // Cálculos de meta
    const percentualProducao = metaMensal > 0 ? Math.min((metrics.producao / metaMensal) * 100, 100) : 0;
    const percentualRecebido = metaMensal > 0 ? Math.min((metrics.caixa / metaMensal) * 100, 100) : 0;
    
    // Provisionamento e Projeção
    const totalAgendadoConfirmado = agendadoConfirmado + convenioAgendado;
    const totalComissionado = metrics.caixa + metrics.aReceber + totalAgendadoConfirmado;
    const percentualAgendado = metaMensal > 0 ? Math.min((totalComissionado / metaMensal) * 100, 100) : 0;
    
    const projecaoRealista = metrics.producao + (agendadoConfirmado * 0.85) + (convenioAgendado * 0.85) + (agendadoPendente * 0.40);
    const percentualProjecao = metaMensal > 0 ? Math.min((projecaoRealista / metaMensal) * 100, 100) : 0;

    // Cálculos derivados
    const saldo = metrics.caixa - totalExpenses;
    const margemLucro = metrics.producao > 0 ? (saldo / metrics.producao) * 100 : 0;

    // Gera lista de meses/anos para seleção
    const generateMonthOptions = () => {
        const options = [];
        const currentDate = moment();
        
        for (let i = 0; i < 24; i++) {
            const d = moment(currentDate).subtract(i, 'months');
            options.push({
                value: d.month(),
                year: d.year(),
                label: `${monthNames[d.month()]} ${d.year()}`
            });
        }
        return options;
    };

    const monthOptions = generateMonthOptions();

    if (metricsLoading || expensesLoading) {
        return <FinancialLoading />;
    }

    const periodoLabel = `${monthNames[selectedMonth]} ${selectedYear}`;

    return (
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
            {/* Header com Seletor de Período */}
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.main', color: 'white' }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    📊 Fechamento Mensal
                </Typography>
                
                <Box display="flex" flexWrap="wrap" gap={2} alignItems="center" mt={2}>
                    <Typography variant="body1">
                        Período:
                    </Typography>
                    <FormControl sx={{ minWidth: 200, bgcolor: 'white', borderRadius: 1 }}>
                        <Select
                            value={`${selectedMonth}-${selectedYear}`}
                            onChange={(e) => {
                                const [month, year] = e.target.value.split('-').map(Number);
                                setSelectedMonth(month);
                                setSelectedYear(year);
                            }}
                            displayEmpty
                            sx={{ color: 'black' }}
                        >
                            {monthOptions.map((opt) => (
                                <MenuItem key={`${opt.value}-${opt.year}`} value={`${opt.value}-${opt.year}`}>
                                    {opt.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    
                    <Chip 
                        icon={<CalendarToday />}
                        label={periodoLabel}
                        color="secondary"
                        sx={{ fontWeight: 'bold', fontSize: '1rem' }}
                    />
                </Box>
            </Paper>

            {/* 🎯 Cards de Metas (do GoalsTab) */}
            {metaMensal > 0 && (
                <>
                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Chip label="Meta do mês" size="small" sx={{ bgcolor: '#8B5CF6', color: 'white', fontWeight: 500 }} />
                        <Typography variant="body1" fontWeight="bold">{formatCurrency(metaMensal)}</Typography>
                    </Box>

                    <Grid container spacing={2.5} sx={{ mb: 3 }}>
                        {/* Produção Clínica */}
                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                        <Avatar sx={{ bgcolor: '#10B98115', width: 40, height: 40 }}>
                                            <TrendingUp sx={{ color: '#10B981' }} />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">Produção Clínica</Typography>
                                            <Typography variant="h5" fontWeight="bold" color="#10B981">
                                                {formatCurrency(metrics.producao)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">Progresso</Typography>
                                        <Typography variant="caption" fontWeight="600">{percentualProducao.toFixed(1)}%</Typography>
                                    </Box>
                                    <LinearProgress variant="determinate" value={percentualProducao} sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.100', '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: '#10B981' } }} />
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Provisionamento */}
                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                        <Avatar sx={{ bgcolor: '#3B82F615', width: 40, height: 40 }}>
                                            <EventAvailable sx={{ color: '#3B82F6' }} />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">Provisionamento</Typography>
                                            <Typography variant="h5" fontWeight="bold" color="#3B82F6">
                                                {formatCurrency(totalComissionado)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">Progresso</Typography>
                                        <Typography variant="caption" fontWeight="600">{percentualAgendado.toFixed(1)}%</Typography>
                                    </Box>
                                    <LinearProgress variant="determinate" value={percentualAgendado} sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.100', '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: '#3B82F6' } }} />
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Recebido (Caixa) */}
                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'grey.200', borderRadius: 2, height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                        <Avatar sx={{ bgcolor: '#0EA5E915', width: 40, height: 40 }}>
                                            <TrackChanges sx={{ color: '#0EA5E9' }} />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">Recebido (Caixa)</Typography>
                                            <Typography variant="h5" fontWeight="bold" color="#0EA5E9">
                                                {formatCurrency(metrics.caixa)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">vs Meta</Typography>
                                        <Typography variant="caption" fontWeight="600">{percentualRecebido.toFixed(1)}%</Typography>
                                    </Box>
                                    <LinearProgress variant="determinate" value={percentualRecebido} sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.100', '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: '#0EA5E9' } }} />
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Projeção de Fechamento */}
                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: '#8B5CF630', borderRadius: 2, height: '100%', bgcolor: '#8B5CF605' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                        <Avatar sx={{ bgcolor: '#8B5CF615', width: 40, height: 40 }}>
                                            <Schedule sx={{ color: '#8B5CF6' }} />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">Projeção de Fechamento</Typography>
                                            <Typography variant="h5" fontWeight="bold" color="#8B5CF6">
                                                {formatCurrency(projecaoRealista)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption" color="text.secondary">Estimativa</Typography>
                                        <Typography variant="caption" fontWeight="600">{percentualProjecao.toFixed(1)}%</Typography>
                                    </Box>
                                    <LinearProgress variant="determinate" value={percentualProjecao} sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.100', '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: '#8B5CF6' } }} />
                                    <Typography variant="caption" color={projecaoRealista >= metaMensal ? 'success.main' : 'warning.main'} sx={{ mt: 1, display: 'block' }}>
                                        {projecaoRealista >= metaMensal ? '✅ Meta atingível' : `Falta ${formatCurrency(metaMensal - projecaoRealista)}`}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </>
            )}

            {/* Cards das 4 Camadas Financeiras */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* PRODUÇÃO */}
                <Grid item xs={12} sm={6} lg={3}>
                    <Card 
                        onClick={() => handleOpenModal('producao')}
                        sx={{ 
                            height: '100%', 
                            borderLeft: '4px solid #3B82F6', 
                            borderTop: '3px solid #3B82F6',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
                        }}
                    >
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <MedicalServices color="primary" />
                                <Typography variant="h6" fontWeight="bold" color="primary.main">
                                    PRODUÇÃO
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold">
                                {formatCurrency(metrics.producao)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Particular + Convênio ({metrics.producaoCount} conv.)
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                                Sessões realizadas em {periodoLabel}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* FATURAMENTO */}
                <Grid item xs={12} sm={6} lg={3}>
                    <Tooltip 
                        title={
                            <Box>
                                <Typography variant="body2" fontWeight="bold">Faturamento do Mês</Typography>
                                <Typography variant="caption">
                                    • Atendido: {formatCurrency(metrics.convenioAtendido)}<br/>
                                    • Faturado: {formatCurrency(metrics.faturado)}<br/>
                                    • A Faturar: {formatCurrency(metrics.pendenteFaturamento)}<br/>
                                    <br/>
                                    O faturamento pode ocorrer em mês diferente do atendimento.
                                </Typography>
                            </Box>
                        }
                        arrow
                    >
                        <Card 
                            onClick={() => handleOpenModal('faturado')}
                            sx={{ 
                                height: '100%', 
                                borderLeft: '4px solid #8B5CF6', 
                                borderTop: '3px solid #8B5CF6',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
                            }}
                        >
                            <CardContent>
                                <Box display="flex" alignItems="center" gap={1} mb={2}>
                                    <Receipt sx={{ color: '#8B5CF6' }} />
                                    <Typography variant="h6" fontWeight="bold" sx={{ color: '#8B5CF6' }}>
                                        FATURADO
                                    </Typography>
                                </Box>
                                <Typography variant="h4" fontWeight="bold">
                                    {formatCurrency(metrics.faturado)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {metrics.faturadoCount} guias enviadas
                                </Typography>
                                
                                {/* Indicador de progresso */}
                                <Box mt={1.5} mb={1}>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={Math.min(metrics.percentualFaturado, 100)}
                                        sx={{ 
                                            height: 6, 
                                            borderRadius: 3,
                                            bgcolor: '#E0E0E0',
                                            '& .MuiLinearProgress-bar': { bgcolor: '#8B5CF6' }
                                        }}
                                    />
                                </Box>
                                
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="caption" color="text.secondary">
                                        {((metrics.percentualFaturado || 0)).toFixed(0)}% do atendido
                                    </Typography>
                                    {(metrics.pendenteFaturamento || 0) > 0 && (
                                        <Chip 
                                            label={`-${formatCurrency(metrics.pendenteFaturamento)}`}
                                            size="small"
                                            color="warning"
                                            variant="outlined"
                                            sx={{ fontSize: '0.7rem', height: 20 }}
                                        />
                                    )}
                                </Box>
                                
                                {metrics.pendenteFaturamento > 0 && (
                                    <Typography variant="caption" color="warning.main" display="block" mt={0.5}>
                                        ⚠️ {formatCurrency(metrics.pendenteFaturamento)} a faturar
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Tooltip>
                </Grid>

                {/* CAIXA */}
                <Grid item xs={12} sm={6} lg={3}>
                    <Card 
                        onClick={() => handleOpenModal('caixa')}
                        sx={{ 
                            height: '100%', 
                            borderLeft: '4px solid #10B981', 
                            borderTop: '3px solid #10B981',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
                        }}
                    >
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <Wallet color="success" />
                                <Typography variant="h6" fontWeight="bold" color="success.main">
                                    CAIXA
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold" color="success.main">
                                {formatCurrency(metrics.caixa)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Dinheiro recebido
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                                Data: pagamentos em {periodoLabel}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* A RECEBER */}
                <Grid item xs={12} sm={6} lg={3}>
                    <Card
                        onClick={() => handleOpenModal('receber')}
                        sx={{
                            height: '100%',
                            borderLeft: '4px solid #F59E0B',
                            borderTop: '3px solid #F59E0B',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
                        }}
                    >
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={2}>
                                <AccountBalance sx={{ color: '#F59E0B' }} />
                                <Typography variant="h6" fontWeight="bold" color="warning.main">
                                    A RECEBER
                                </Typography>
                            </Box>
                            <Typography variant="h4" fontWeight="bold" color="warning.main">
                                {formatCurrency(metrics.aReceber)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Sessões de {periodoLabel} não pagas
                            </Typography>

                            {/* Breakdown do mês */}
                            <Box mt={1.5}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                    <Typography variant="caption" color="text.secondary">Convênios:</Typography>
                                    <Typography variant="caption" fontWeight="medium" color="warning.main">
                                        {formatCurrency(metrics.convenioAReceber || 0)}
                                    </Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                    <Typography variant="caption" color="text.secondary">
                                        Particular ({metrics.aReceberParticularCount || 0} sess.):
                                    </Typography>
                                    <Typography variant="caption" fontWeight="medium" color="info.main">
                                        {formatCurrency(metrics.aReceberParticularDoMes || 0)}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Receita Esperada do Mês — faixa destacada */}
            <Box
                onClick={() => handleOpenModal('receber')}
                sx={{
                    mt: 2, mb: 3, p: 2.5,
                    borderRadius: 2,
                    border: '2px solid #7C3AED',
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(139,92,246,0.05))',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', transition: 'all 0.2s',
                    '&:hover': { boxShadow: '0 0 0 3px rgba(124,58,237,0.2)' }
                }}
            >
                <Box display="flex" alignItems="center" gap={2}>
                    <TrendingUp sx={{ color: '#7C3AED', fontSize: 28 }} />
                    <Box>
                        <Typography variant="body1" fontWeight="bold" sx={{ color: '#7C3AED' }}>
                            Receita Esperada — {periodoLabel}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Caixa já recebido + Particular pendente + Convênios a receber
                        </Typography>
                    </Box>
                </Box>
                <Box textAlign="right">
                    <Typography variant="h5" fontWeight="bold" sx={{ color: '#7C3AED' }}>
                        {formatCurrency(metrics.caixa + metrics.aReceber)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {formatCurrency(metrics.caixa)} + {formatCurrency(metrics.aReceber)} pendentes
                    </Typography>
                </Box>
            </Box>

            {/* Composição da Produção */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
                    <AttachMoney />
                    Composição da Produção ({periodoLabel})
                </Typography>

                <Grid container spacing={2} mt={1}>
                    <Grid item xs={12} md={3}>
                        <Box p={2} bgcolor="#E3F2FD" borderRadius={2}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <AttachMoney color="primary" />
                                <Typography variant="body2" color="text.secondary">Particular Recebido</Typography>
                            </Box>
                            <Typography variant="h5" fontWeight="bold" color="primary.main">
                                {formatCurrency(metrics.particular)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">No caixa</Typography>
                        </Box>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Box p={2} bgcolor="#E8F5E9" borderRadius={2}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <LocalHospital color="success" />
                                <Typography variant="body2" color="text.secondary">Convênio Avulso Recebido</Typography>
                            </Box>
                            <Typography variant="h5" fontWeight="bold" color="success.main">
                                {formatCurrency(metrics.convenioAvulso)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Repasse já creditado</Typography>
                        </Box>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Box p={2} bgcolor="#FFF3E0" borderRadius={2}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <Group color="warning" />
                                <Typography variant="body2" color="text.secondary">Convênio Pacote Produzido</Typography>
                            </Box>
                            <Typography variant="h5" fontWeight="bold" color="warning.main">
                                {formatCurrency(metrics.convenioPacote)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">A receber do plano</Typography>
                        </Box>
                    </Grid>

                    <Grid item xs={12} md={3}>
                        <Box p={2} bgcolor="#FCE4EC" borderRadius={2}>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <AccountBalance sx={{ color: '#E53935' }} />
                                <Typography variant="body2" color="text.secondary">Devedor do Mês</Typography>
                            </Box>
                            <Typography variant="h5" fontWeight="bold" color="error.main">
                                {formatCurrency(metrics.aReceberParticularDoMes || 0)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {metrics.aReceberParticularCount || 0} sessão(ões) não pagas
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>

                {/* Total Recebido — receita efetiva em caixa no período */}
                <Box mt={2} p={2} sx={{
                    bgcolor: '#F0FDF4',
                    borderRadius: 2,
                    border: '1.5px solid #16A34A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                        <CheckCircle sx={{ color: '#16A34A' }} />
                        <Box>
                            <Typography variant="body1" fontWeight="bold" color="#16A34A">
                                Total Recebido em Caixa
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Particular recebido + Convênios creditados
                            </Typography>
                        </Box>
                    </Box>
                    <Typography variant="h5" fontWeight="bold" color="#16A34A">
                        {formatCurrency((metrics.particular || 0) + (metrics.convenioAvulso || 0))}
                    </Typography>
                </Box>
            </Paper>

            {/* Fluxo de Convênios */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
                    <LocalHospital color="primary" />
                    Fluxo de Convênios ({periodoLabel})
                </Typography>
                
                <Grid container spacing={2} mt={1}>
                    {[
                        { label: 'ATENDIDO', value: metrics.convenioAtendido, sub: `${metrics.convenioAtendidoCount} sessões em ${periodoLabel}`, color: 'primary.main', bg: '#E3F2FD', modal: 'producao' as const },
                        { label: 'FATURADO', value: metrics.convenioFaturado, sub: `Guias enviadas — ${periodoLabel}`, color: '#8B5CF6', bg: '#F3E8FF', modal: 'faturado' as const },
                        { label: 'RECEBIDO', value: metrics.convenioRecebido, sub: `Creditado em ${periodoLabel}`, color: 'success.main', bg: '#E8F5E9', modal: 'caixa' as const },
                        { label: 'A RECEBER', value: metrics.convenioAReceber, sub: `Pendente — ${periodoLabel}`, color: 'warning.main', bg: '#FFF3E0', modal: 'conv_receber' as const },
                    ].map((item) => (
                        <Grid item xs={6} md={3} key={item.label}>
                            <Box
                                onClick={() => handleOpenModal(item.modal)}
                                textAlign="center" p={2}
                                sx={{
                                    bgcolor: item.bg, borderRadius: 2, cursor: 'pointer',
                                    transition: 'all 0.2s', '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' }
                                }}
                            >
                                <Typography variant="body2" color="text.secondary" fontWeight="bold">{item.label}</Typography>
                                <Typography variant="h6" fontWeight="bold" color={item.color} mt={0.5}>
                                    {formatCurrency(item.value)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {item.sub}
                                </Typography>
                            </Box>
                        </Grid>
                    ))}
                </Grid>

                {/* Barra de progresso do faturamento */}
                {metrics.convenioAtendido > 0 && (
                    <Box mt={2}>
                        <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">
                                Taxa de Faturamento: {metrics.convenioAtendido > 0 ? (((metrics.convenioFaturado || 0) / metrics.convenioAtendido) * 100).toFixed(1) : '0.0'}%
                            </Typography>
                            <Typography variant="body2">
                                Taxa de Recebimento: {metrics.convenioFaturado > 0 ? (((metrics.convenioRecebido || 0) / metrics.convenioFaturado) * 100).toFixed(1) : '0.0'}%
                            </Typography>
                        </Box>
                        <LinearProgress 
                            variant="determinate" 
                            value={Math.min((metrics.convenioFaturado / metrics.convenioAtendido) * 100, 100)}
                            sx={{ height: 10, borderRadius: 5 }}
                        />
                    </Box>
                )}

                {/* 🆕 Tabela de Recebimento por Mês de Referência */}
                {metrics.convenioRecebidoPorMes && metrics.convenioRecebidoPorMes.length > 0 && (
                    <Box mt={3} p={2} bgcolor="#F0F9FF" borderRadius={2}>
                        <Typography variant="subtitle2" fontWeight="bold" mb={2} display="flex" alignItems="center" gap={1}>
                            📅 Detalhamento do Recebido — Por Mês de Referência
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                            Mostra de qual mês veio cada recebimento de convênio creditado em {periodoLabel}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                            {metrics.convenioRecebidoPorMes.map((item: any) => {
                                const [ano, mes] = item.mes.split('-');
                                const mesNome = monthNames[parseInt(mes) - 1];
                                const isMesAtual = item.mes === `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
                                return (
                                    <Box 
                                        key={item.mes}
                                        sx={{ 
                                            p: 1.5, 
                                            bgcolor: isMesAtual ? '#10B98120' : 'white', 
                                            border: '1px solid',
                                            borderColor: isMesAtual ? '#10B981' : 'grey.200',
                                            borderRadius: 1.5,
                                            minWidth: 130,
                                            flex: '1 1 calc(25% - 12px)',
                                            maxWidth: 200
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            {mesNome} {ano} {isMesAtual && '✓'}
                                        </Typography>
                                        <Typography variant="body1" fontWeight="bold" color={isMesAtual ? 'success.main' : 'text.primary'}>
                                            {formatCurrency(item.total)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {item.count} pgt(s)
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Box>
                        
                        {metrics.convenioRecebidoMesesAnteriores > 0 && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                <strong>Importante:</strong> {formatCurrency(metrics.convenioRecebidoMesesAnteriores)} 
                                ({((metrics.convenioRecebidoMesesAnteriores / metrics.convenioRecebido) * 100).toFixed(1)}%) 
                                do total recebido refere-se a sessões realizadas em meses anteriores.
                                O valor do mês atual é {formatCurrency(metrics.convenioRecebidoMesAtual)}.
                            </Alert>
                        )}
                    </Box>
                )}
            </Paper>

            {/* Despesas e Resultado */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Paper 
                        onClick={() => handleOpenModal('despesas')}
                        sx={{ 
                            p: 3, 
                            height: '100%',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': { boxShadow: 4, bgcolor: '#FFEBEE' }
                        }}
                    >
                        <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
                            <TrendingDown color="error" />
                            Despesas ({periodoLabel})
                        </Typography>
                        
                        <Typography variant="h4" fontWeight="bold" color="error.main">
                            {formatCurrency(totalExpenses)}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" mt={1}>
                            {expenses.length} despesas registradas
                        </Typography>

                        {expenses.slice(0, 5).map((expense, idx) => (
                            <Box key={idx} display="flex" justifyContent="space-between" mt={1} p={1} bgcolor="grey.50" borderRadius={1}>
                                <Typography variant="body2">{expense.description || expense.category}</Typography>
                                <Typography variant="body2" fontWeight="medium">
                                    {formatCurrency(expense.amount)}
                                </Typography>
                            </Box>
                        ))}
                        
                        {expenses.length > 5 && (
                            <Typography variant="caption" color="text.secondary" display="block" mt={1} textAlign="center">
                                + {expenses.length - 5} despesas...
                            </Typography>
                        )}
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper 
                        onClick={() => handleOpenModal('resultado')}
                        sx={{ 
                            p: 3, 
                            height: '100%', 
                            bgcolor: saldo >= 0 ? '#E8F5E9' : '#FFEBEE',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': { boxShadow: 4 }
                        }}
                    >
                        <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
                            {saldo >= 0 ? <CheckCircle color="success" /> : <Warning color="error" />}
                            Resultado do Mês
                        </Typography>
                        
                        <Typography variant="h3" fontWeight="bold" color={saldo >= 0 ? "success.main" : "error.main"}>
                            {formatCurrency(saldo)}
                        </Typography>
                        
                        <Typography variant="body1" mt={2}>
                            Caixa: {formatCurrency(metrics.caixa)}
                        </Typography>
                        <Typography variant="body1">
                            Despesas: {formatCurrency(totalExpenses)}
                        </Typography>
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                                Margem sobre Produção:
                            </Typography>
                            <Chip 
                                label={`${(margemLucro || 0).toFixed(1)}%`}
                                color={margemLucro > 20 ? "success" : margemLucro > 0 ? "warning" : "error"}
                                size="small"
                            />
                        </Box>
                        
                        <LinearProgress 
                            variant="determinate" 
                            value={Math.max(0, Math.min(margemLucro, 100))}
                            color={margemLucro > 20 ? "success" : margemLucro > 0 ? "warning" : "error"}
                            sx={{ mt: 1, height: 8, borderRadius: 4 }}
                        />
                    </Paper>
                </Grid>
            </Grid>

            {/* Alertas e Resumo */}
            <Box mt={3}>
                {metrics.aReceber > metrics.caixa && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        <Typography variant="body1" fontWeight="bold">
                            ⚠️ A Receber maior que Caixa
                        </Typography>
                        <Typography variant="body2">
                            Você tem {formatCurrency(metrics.aReceber)} a receber contra {formatCurrency(metrics.caixa)} em caixa. 
                            Faça acompanhamento de convênios.
                        </Typography>
                    </Alert>
                )}

                {metrics.convenioFaturado < metrics.convenioAtendido && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body1" fontWeight="bold">
                            📋 Guias pendentes de envio
                        </Typography>
                        <Typography variant="body2">
                            {formatCurrency(metrics.convenioAtendido - metrics.convenioFaturado)} em sessões atendidas mas não faturadas. 
                            Envie as guias para não perder o prazo.
                        </Typography>
                    </Alert>
                )}

                {saldo < 0 && (
                    <Alert severity="error">
                        <Typography variant="body1" fontWeight="bold">
                            🚨 Saldo Negativo
                        </Typography>
                        <Typography variant="body2">
                            O mês fechou com prejuízo de {formatCurrency(Math.abs(saldo))}. 
                            Revise despesas e acompanhe pagamentos pendentes.
                        </Typography>
                    </Alert>
                )}
            </Box>

            {/* Modal de Detalhes */}
            <FinancialDetailsModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                type={modalType}
                period={{ month: selectedMonth, year: selectedYear }}
            />
        </Box>
    );
};

export default EntradasSaidasTab;
