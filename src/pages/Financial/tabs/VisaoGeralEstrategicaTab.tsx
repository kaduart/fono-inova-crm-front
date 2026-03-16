// pages/Financial/tabs/VisaoGeralEstrategicaTab.tsx
// Visão Geral Estratégica - Painel Executivo da Clínica (CONSOLIDADO V2)

import { useMemo, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    Chip,
    Alert,
    AlertTitle,
    Divider,
    Paper,
    LinearProgress,
    Tabs,
    Tab
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
    Assessment,
    AccountBalanceWallet,
    LocalHospital,
    Group,
    MedicalServices,
    AccountBalance
} from '@mui/icons-material';
import { useFinancialMetrics } from '../../../hooks/useFinancialMetrics';
import { FinancialLoadingDashboard } from '../components/FinancialLoading';
import moment from 'moment-timezone';

const TIMEZONE = 'America/Sao_Paulo';

const formatCurrency = (value: number) => 
    `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const VisaoGeralEstrategicaTab = () => {
    const [activeTab, setActiveTab] = useState(0);
    
    // 🆕 HOOK ÚNICO - Mesma fonte das outras tabs
    const startDate = moment().tz(TIMEZONE).startOf('month').toISOString();
    const endDate = moment().tz(TIMEZONE).endOf('month').toISOString();
    
    const { data, isLoading, error } = useFinancialMetrics(startDate, endDate);

    // Métricas calculadas dos dados unificados
    const metrics = useMemo(() => {
        if (!data) {
            return {
                caixa: 0,
                producao: 0,
                faturado: 0,
                aReceber: 0,
                particular: 0,
                convenioAvulso: 0,
                convenioPacote: 0,
                sessoes: 0,
                // Convênio detalhado
                convenioAtendido: 0,
                convenioFaturado: 0,
                convenioRecebido: 0,
                convenioAReceber: 0,
            };
        }

        const convenioDetail = data.convenioDetail || {};

        return {
            caixa: data.cash?.total || 0,
            producao: data.production?.total || 0,
            faturado: data.billing?.total || 0,
            aReceber: data.receivable?.total || 0,
            particular: data.cash?.breakdown?.particular || 0,
            convenioAvulso: data.cash?.breakdown?.convenioAvulso || 0,
            convenioPacote: data.cash?.breakdown?.convenioPacote || 0,
            sessoes: data.production?.count || 0,
            // Convênio detalhado
            convenioAtendido: convenioDetail.atendido?.total || 0,
            convenioAtendidoCount: convenioDetail.atendido?.count || 0,
            convenioFaturado: convenioDetail.faturado?.total || 0,
            convenioRecebido: convenioDetail.recebido?.total || 0,
            convenioAReceber: convenioDetail.aReceber?.total || 0,
        };
    }, [data]);

    const getInsightIcon = (type: string) => {
        switch (type) {
            case 'positive': return <CheckCircle sx={{ color: '#10B981' }} />;
            case 'warning': return <Warning sx={{ color: '#F59E0B' }} />;
            case 'risk': return <Error sx={{ color: '#EF4444' }} />;
            default: return <Info sx={{ color: '#6B7280' }} />;
        }
    };

    if (error) {
        return (
            <Alert severity="error" sx={{ m: 2, borderRadius: 2 }}>
                <AlertTitle>Erro ao carregar dados</AlertTitle>
                {error}
            </Alert>
        );
    }

    if (isLoading) {
        return <FinancialLoadingDashboard />;
    }

    const periodoAtual = moment().tz(TIMEZONE).format('MMMM YYYY');

    return (
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    📊 Dashboard Executivo
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Visão consolidada do mês: {periodoAtual}
                </Typography>
            </Box>

            {/* Tabs de Navegação */}
            <Tabs 
                value={activeTab} 
                onChange={(_, v) => setActiveTab(v)}
                sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            >
                <Tab label="Visão Geral" icon={<Assessment />} iconPosition="start" />
                <Tab label="Convênios" icon={<LocalHospital />} iconPosition="start" />
            </Tabs>

            {activeTab === 0 && (
                <>
                    {/* 📊 Painel Estratégico - Indicadores de Performance */}
                    <Alert severity="info" sx={{ mb: 3 }}>
                        <AlertTitle>Visão Estratégica</AlertTitle>
                        Para valores detalhados do mês (produção, caixa, a receber), use a aba <strong>Extrato</strong> no modo Operacional.
                    </Alert>

                    {/* Cards Resumidos - Versão Compacta */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={6} md={3}>
                            <Card>
                                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                    <Typography variant="body2" color="text.secondary">Produção</Typography>
                                    <Typography variant="h6" fontWeight="bold">{formatCurrency(metrics.producao)}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card>
                                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                    <Typography variant="body2" color="text.secondary">Faturado</Typography>
                                    <Typography variant="h6" fontWeight="bold">{formatCurrency(metrics.faturado)}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card>
                                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                    <Typography variant="body2" color="text.secondary">Caixa</Typography>
                                    <Typography variant="h6" fontWeight="bold" color="success.main">{formatCurrency(metrics.caixa)}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <Card>
                                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                    <Typography variant="body2" color="text.secondary">A Receber</Typography>
                                    <Typography variant="h6" fontWeight="bold" color="warning.main">{formatCurrency(metrics.aReceber)}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Composição do Caixa */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                            💵 Composição do Caixa
                        </Typography>
                        
                        <Grid container spacing={3} mt={1}>
                            <Grid item xs={12} md={4}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" p={2} bgcolor="grey.50" borderRadius={2}>
                                    <Box display="flex" alignItems="center" gap={2}>
                                        <AttachMoney color="primary" />
                                        <Typography>Particular</Typography>
                                    </Box>
                                    <Typography variant="h6" fontWeight="bold">
                                        {formatCurrency(metrics.particular)}
                                    </Typography>
                                </Box>
                            </Grid>
                            
                            <Grid item xs={12} md={4}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" p={2} bgcolor="grey.50" borderRadius={2}>
                                    <Box display="flex" alignItems="center" gap={2}>
                                        <LocalHospital color="info" />
                                        <Typography>Convênio Avulso</Typography>
                                    </Box>
                                    <Typography variant="h6" fontWeight="bold">
                                        {formatCurrency(metrics.convenioAvulso)}
                                    </Typography>
                                </Box>
                            </Grid>
                            
                            <Grid item xs={12} md={4}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" p={2} bgcolor="grey.50" borderRadius={2}>
                                    <Box display="flex" alignItems="center" gap={2}>
                                        <Group color="warning" />
                                        <Typography>Convênio Pacote</Typography>
                                    </Box>
                                    <Typography variant="h6" fontWeight="bold">
                                        {formatCurrency(metrics.convenioPacote)}
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </Paper>
                </>
            )}

            {activeTab === 1 && (
                <>
                    {/* FLUXO DE CONVÊNIOS - O que o usuário pediu */}
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
                            <LocalHospital color="primary" />
                            Fluxo de Convênios
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={3}>
                            Acompanhamento completo: Atendido → Faturado → Recebido
                        </Typography>

                        {/* 4 Cards do Fluxo */}
                        <Grid container spacing={3}>
                            {/* ATENDIDO */}
                            <Grid item xs={12} sm={6} md={3}>
                                <Card variant="outlined" sx={{ borderColor: '#3B82F6', borderWidth: 2 }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                                            <MedicalServices color="primary" />
                                            <Typography variant="h6" fontWeight="bold">
                                                Atendido
                                            </Typography>
                                        </Box>
                                        <Typography variant="h4" fontWeight="bold" color="primary.main">
                                            {formatCurrency(metrics.convenioAtendido)}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {metrics.convenioAtendidoCount} sessões realizadas
                                        </Typography>
                                        <Box mt={2}>
                                            <Chip 
                                                label="Produção" 
                                                size="small" 
                                                color="primary" 
                                                variant="outlined"
                                            />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* FATURADO */}
                            <Grid item xs={12} sm={6} md={3}>
                                <Card variant="outlined" sx={{ borderColor: '#8B5CF6', borderWidth: 2 }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                                            <Receipt sx={{ color: '#8B5CF6' }} />
                                            <Typography variant="h6" fontWeight="bold">
                                                Faturado
                                            </Typography>
                                        </Box>
                                        <Typography variant="h4" fontWeight="bold" sx={{ color: '#8B5CF6' }}>
                                            {formatCurrency(metrics.convenioFaturado)}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Guias enviadas
                                        </Typography>
                                        <Box mt={2}>
                                            <Chip 
                                                label="Enviado ao Convênio" 
                                                size="small" 
                                                sx={{ color: '#8B5CF6', borderColor: '#8B5CF6' }}
                                                variant="outlined"
                                            />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* RECEBIDO */}
                            <Grid item xs={12} sm={6} md={3}>
                                <Card variant="outlined" sx={{ borderColor: '#10B981', borderWidth: 2 }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                                            <AttachMoney color="success" />
                                            <Typography variant="h6" fontWeight="bold">
                                                Recebido
                                            </Typography>
                                        </Box>
                                        <Typography variant="h4" fontWeight="bold" color="success.main">
                                            {formatCurrency(metrics.convenioRecebido)}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Dinheiro na conta
                                        </Typography>
                                        <Box mt={2}>
                                            <Chip 
                                                label="Caixa" 
                                                size="small" 
                                                color="success" 
                                                variant="outlined"
                                            />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* A RECEBER */}
                            <Grid item xs={12} sm={6} md={3}>
                                <Card variant="outlined" sx={{ borderColor: '#F59E0B', borderWidth: 2 }}>
                                    <CardContent>
                                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                                            <AccountBalance sx={{ color: '#F59E0B' }} />
                                            <Typography variant="h6" fontWeight="bold">
                                                A Receber
                                            </Typography>
                                        </Box>
                                        <Typography variant="h4" fontWeight="bold" color="warning.main">
                                            {formatCurrency(metrics.convenioAReceber)}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Pendentes de pagamento
                                        </Typography>
                                        <Box mt={2}>
                                            <Chip 
                                                label="Em Aberto" 
                                                size="small" 
                                                color="warning" 
                                                variant="outlined"
                                            />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>

                        {/* Visualização do Fluxo */}
                        <Box mt={4} p={3} bgcolor="grey.50" borderRadius={2}>
                            <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                                📊 Análise do Fluxo
                            </Typography>
                            
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={4}>
                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                        <Typography variant="body2">Taxa de Faturamento:</Typography>
                                        <Typography variant="body2" fontWeight="bold">
                                            {metrics.convenioAtendido > 0 
                                                ? ((metrics.convenioFaturado / metrics.convenioAtendido) * 100).toFixed(1) 
                                                : 0}%
                                        </Typography>
                                    </Box>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={metrics.convenioAtendido > 0 
                                            ? Math.min((metrics.convenioFaturado / metrics.convenioAtendido) * 100, 100) 
                                            : 0} 
                                        sx={{ height: 8, borderRadius: 4 }}
                                    />
                                </Grid>
                                
                                <Grid item xs={12} md={4}>
                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                        <Typography variant="body2">Taxa de Recebimento:</Typography>
                                        <Typography variant="body2" fontWeight="bold">
                                            {metrics.convenioFaturado > 0 
                                                ? ((metrics.convenioRecebido / metrics.convenioFaturado) * 100).toFixed(1) 
                                                : 0}%
                                        </Typography>
                                    </Box>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={metrics.convenioFaturado > 0 
                                            ? Math.min((metrics.convenioRecebido / metrics.convenioFaturado) * 100, 100) 
                                            : 0}
                                        color="success"
                                        sx={{ height: 8, borderRadius: 4 }}
                                    />
                                </Grid>
                                
                                <Grid item xs={12} md={4}>
                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                        <Typography variant="body2">Inadimplência:</Typography>
                                        <Typography variant="body2" fontWeight="bold" color={metrics.convenioAReceber > metrics.convenioRecebido ? "error" : "inherit"}>
                                            {metrics.convenioFaturado > 0 
                                                ? ((metrics.convenioAReceber / metrics.convenioFaturado) * 100).toFixed(1) 
                                                : 0}%
                                        </Typography>
                                    </Box>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={metrics.convenioFaturado > 0 
                                            ? Math.min((metrics.convenioAReceber / metrics.convenioFaturado) * 100, 100) 
                                            : 0}
                                        color="warning"
                                        sx={{ height: 8, borderRadius: 4 }}
                                    />
                                </Grid>
                            </Grid>
                        </Box>

                        {/* Alertas */}
                        {metrics.convenioAReceber > metrics.convenioRecebido && (
                            <Alert severity="warning" sx={{ mt: 3 }} icon={getInsightIcon('warning')}>
                                <AlertTitle>Atenção: Convênios pendentes</AlertTitle>
                                Você tem {formatCurrency(metrics.convenioAReceber)} em convênios a receber, 
                                que é maior que o valor já recebido ({formatCurrency(metrics.convenioRecebido)}). 
                                Considere fazer um acompanhamento das guias pendentes.
                            </Alert>
                        )}

                        {metrics.convenioFaturado < metrics.convenioAtendido && (
                            <Alert severity="info" sx={{ mt: 2 }} icon={getInsightIcon('info')}>
                                <AlertTitle>Guias pendentes de envio</AlertTitle>
                                Existem sessões atendidas ({formatCurrency(metrics.convenioAtendido - metrics.convenioFaturado)}) 
                                que ainda não foram faturadas. Envie as guias para não perder o prazo.
                            </Alert>
                        )}
                    </Paper>
                </>
            )}

            {/* Alertas e Insights Gerais */}
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom display="flex" alignItems="center" gap={1}>
                    <Assessment />
                    Insights do Período
                </Typography>
                
                <Box mt={2} display="flex" flexDirection="column" gap={2}>
                    {metrics.aReceber > metrics.caixa && (
                        <Alert severity="warning" icon={getInsightIcon('warning')}>
                            <AlertTitle>Atenção: A Receber maior que Caixa</AlertTitle>
                            Você tem {formatCurrency(metrics.aReceber)} a receber, 
                            que é maior que o caixa atual de {formatCurrency(metrics.caixa)}. 
                            Considere fazer um acompanhamento de convênios.
                        </Alert>
                    )}
                    
                    {metrics.caixa > 0 && (
                        <Alert severity="success" icon={getInsightIcon('positive')}>
                            <AlertTitle>Caixa Positivo</AlertTitle>
                            O caixa de {formatCurrency(metrics.caixa)} está saudável. 
                            Mantenha o acompanhamento de próximos vencimentos.
                        </Alert>
                    )}
                    
                    {metrics.sessoes > 0 && (
                        <Box display="flex" alignItems="center" gap={2} p={2} bgcolor="grey.50" borderRadius={2}>
                            <TrendingUp color="success" />
                            <Box>
                                <Typography variant="body1" fontWeight="medium">
                                    Ticket Médio por Sessão
                                </Typography>
                                <Typography variant="h6">
                                    {formatCurrency(metrics.producao / metrics.sessoes)}
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </Box>
            </Paper>
        </Box>
    );
};

export default VisaoGeralEstrategicaTab;
