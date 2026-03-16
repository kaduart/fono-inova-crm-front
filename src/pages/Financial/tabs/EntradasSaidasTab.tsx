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
    Tooltip
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
    CheckCircle
} from '@mui/icons-material';
import { usePaymentTotals } from '../../../hooks/usePaymentTotals';
import { useExpenses } from '../../../hooks/useExpenses';
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
    const [modalType, setModalType] = useState<'producao' | 'faturado' | 'caixa' | 'receber' | 'despesas' | 'resultado' | null>(null);

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

    // 🆕 HOOK - Dados financeiros do período
    const { 
        paymentTotals, 
        convenioFaturamentos,
        isLoading: financialLoading,
        fetchPaymentTotals 
    } = usePaymentTotals();

    // Busca dados quando muda o período
    useEffect(() => {
        const month = selectedMonth + 1; // API espera 1-12
        console.log('[EntradasSaidasTab] Buscando dados para:', { month, selectedYear });
        fetchPaymentTotals(month, selectedYear);
    }, [selectedMonth, selectedYear]);
    
    // Hook de despesas - com busca filtrada por período
    const { expenses, isLoading: expensesLoading, fetchExpenses } = useExpenses();

    // Busca despesas quando muda o período
    useEffect(() => {
        fetchExpenses({
            startDate: moment(startDate).format('YYYY-MM-DD'),
            endDate: moment(endDate).format('YYYY-MM-DD'),
            limit: 1000  // Garante que traga todas do período
        });
    }, [startDate, endDate, fetchExpenses]);

    // Total de despesas do período (já vem filtrado da API)
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Métricas calculadas do paymentTotals (dados reais da API)
    const metrics = useMemo(() => {
        if (!paymentTotals) {
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
                convenioAReceber: 0,
            };
        }

        // Dados do endpoint /payments/totals
        const caixa = paymentTotals.totalReceived || 0;
        const aReceberParticular = paymentTotals.totalPending || 0;
        const particular = paymentTotals.particularReceived || 0;
        
        // Convênio: produção vs recebido
        const convenioProducao = paymentTotals.totalInsuranceProduction || 0;
        const convenioRecebido = paymentTotals.totalInsuranceReceived || 0;
        const convenioPendente = paymentTotals.totalInsurancePending || 0;
        
        // Faturamento do mês (vindo do endpoint /financial/convenio/faturamentos)
        // Se não tiver dados, usa a produção como fallback
        const faturadoNoMes = convenioFaturamentos?.total ?? convenioProducao;
        
        // Cálculos de faturamento
        const pendenteFaturamento = Math.max(0, convenioProducao - faturadoNoMes);
        const percentualFaturado = convenioProducao > 0 ? (faturadoNoMes / convenioProducao) * 100 : 0;

        return {
            // Produção = Particular (recebido + pendente) + Convênio (produção total)
            producao: particular + aReceberParticular + convenioProducao,
            producaoCount: (paymentTotals.countInsuranceTotal || 0),
            faturado: faturadoNoMes,
            faturadoCount: convenioFaturamentos?.quantidade || 0,
            pendenteFaturamento,
            percentualFaturado,
            caixa: caixa,
            aReceber: aReceberParticular + convenioPendente,
            particular: particular,
            convenioAvulso: convenioRecebido,
            convenioPacote: convenioProducao,
            // Detalhamento convênio
            convenioAtendido: convenioProducao,
            convenioAtendidoCount: paymentTotals.countInsuranceTotal || 0,
            convenioFaturado: faturadoNoMes,
            convenioRecebido: convenioRecebido,
            convenioAReceber: convenioPendente,
        };
    }, [paymentTotals, convenioFaturamentos]);

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

    if (financialLoading || expensesLoading) {
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
                    <Tooltip 
                        title={
                            <Box>
                                <Typography variant="body2" fontWeight="bold">Composição do A Receber</Typography>
                                <Typography variant="caption">
                                    • Convênios: {formatCurrency(metrics.convenioAReceber || 0)}<br/>
                                    • Particular Pendente: {formatCurrency((metrics.aReceber || 0) - (metrics.convenioAReceber || 0))}<br/>
                                    <br/>
                                    Total de clientes/devedores que ainda não pagaram.
                                </Typography>
                            </Box>
                        }
                        arrow
                    >
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
                                    Convênios + Particular Pendente
                                </Typography>
                                
                                {/* Composição do A Receber */}
                                <Box mt={1.5}>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                        <Typography variant="caption" color="text.secondary">
                                            Convênios:
                                        </Typography>
                                        <Typography variant="caption" fontWeight="medium" color="warning.main">
                                            {formatCurrency(metrics.convenioAReceber || 0)}
                                        </Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Typography variant="caption" color="text.secondary">
                                            Particular:
                                        </Typography>
                                        <Typography variant="caption" fontWeight="medium" color="info.main">
                                            {formatCurrency((metrics.aReceber || 0) - (metrics.convenioAReceber || 0))}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Tooltip>
                </Grid>
            </Grid>

            {/* Composição da Produção */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
                    <AttachMoney />
                    Composição da Produção ({periodoLabel})
                </Typography>

                <Grid container spacing={2} mt={1}>
                    <Grid item xs={12} md={4}>
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

                    <Grid item xs={12} md={4}>
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

                    <Grid item xs={12} md={4}>
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
                </Grid>
            </Paper>

            {/* Fluxo de Convênios */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
                    <LocalHospital color="primary" />
                    Fluxo de Convênios ({periodoLabel})
                </Typography>
                
                <Grid container spacing={2} mt={1}>
                    <Grid item xs={6} md={3}>
                        <Box textAlign="center" p={2}>
                            <Typography variant="body2" color="text.secondary">ATENDIDO</Typography>
                            <Typography variant="h6" fontWeight="bold" color="primary.main">
                                {formatCurrency(metrics.convenioAtendido)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {metrics.convenioAtendidoCount} sessões
                            </Typography>
                        </Box>
                    </Grid>
                    
                    <Grid item xs={6} md={3}>
                        <Box textAlign="center" p={2}>
                            <Typography variant="body2" color="text.secondary">FATURADO</Typography>
                            <Typography variant="h6" fontWeight="bold" sx={{ color: '#8B5CF6' }}>
                                {formatCurrency(metrics.convenioFaturado)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Guias enviadas
                            </Typography>
                        </Box>
                    </Grid>
                    
                    <Grid item xs={6} md={3}>
                        <Box textAlign="center" p={2}>
                            <Typography variant="body2" color="text.secondary">RECEBIDO</Typography>
                            <Typography variant="h6" fontWeight="bold" color="success.main">
                                {formatCurrency(metrics.convenioRecebido)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Em {periodoLabel}
                            </Typography>
                        </Box>
                    </Grid>
                    
                    <Grid item xs={6} md={3}>
                        <Box textAlign="center" p={2}>
                            <Typography variant="body2" color="text.secondary">A RECEBER</Typography>
                            <Typography variant="h6" fontWeight="bold" color="warning.main">
                                {formatCurrency(metrics.convenioAReceber)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Pendente
                            </Typography>
                        </Box>
                    </Grid>
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
