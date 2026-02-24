import React, { useEffect, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    LinearProgress,
    Paper,
    Chip,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Divider,
    IconButton
} from '@mui/material';
import {
    TrendingUp,
    Target,
    Zap,
    Calendar,
    ChevronRight,
    Download,
    RefreshCcw,
    AlertCircle
} from 'lucide-react';
import { useProvisionamento } from '../../../hooks/useProvisionamento';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const MetricCard = ({ title, value, subtitle, icon, color, trend }: any) => (
    <Card variant="outlined" sx={{ width: "100%", borderRadius: 3, border: '1px solid #edf2f7', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } }}>
        <CardContent sx={{ p: 2.5 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}15`, color: color }}>
                    {icon}
                </Box>
                {trend && (
                    <Chip label={trend} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 'bold', bgcolor: '#e6fffa', color: '#285e61' }} />
                )}
            </Box>
            <Typography variant="body2" color="text.secondary" fontWeight="500">
                {title}
            </Typography>
            <Typography variant="h5" fontWeight="bold" sx={{ my: 0.5 }}>
                {value}
            </Typography>
            {subtitle && (
                <Typography variant="caption" color="text.secondary">
                    {subtitle}
                </Typography>
            )}
        </CardContent>
    </Card>
);

const InteligenciaFinanceiraTab = () => {
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [ano, setAno] = useState(new Date().getFullYear());
    const {
        data: provisaoData,
        projecaoMes,
        fetchProjecaoMes,
        calcular: calcularProvisao,
        loading
    } = useProvisionamento();

    useEffect(() => {
        refreshData();
    }, [mes, ano]);

    const refreshData = () => {
        fetchProjecaoMes(mes, ano);
        calcularProvisao(mes, ano);
    };

    const metaAlcancada = (projecaoMes?.metas?.percentualAtual || 0) >= 100;

    return (
        <Box sx={{ width: '100%' }}>
            {/* Header Estratégico */}
            <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={4}>
                <Box>
                    <Typography variant="caption" fontWeight="bold" color="primary" sx={{ letterSpacing: 1.5, textTransform: 'uppercase' }}>
                        Dashboard Estratégico
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: '#1a202c', mt: 0.5 }}>
                        Inteligência Financeira
                    </Typography>
                </Box>

                <Stack direction="row" spacing={2} alignItems="center">
                    <FormControl size="small" variant="outlined" sx={{ minWidth: 120 }}>
                        <Select
                            value={mes}
                            onChange={(e) => setMes(Number(e.target.value))}
                            sx={{ borderRadius: 2, bgcolor: 'white' }}
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <MenuItem key={i + 1} value={i + 1}>
                                    {format(new Date(2024, i), 'MMMM', { locale: ptBR })}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <Select
                            value={ano}
                            onChange={(e) => setAno(Number(e.target.value))}
                            sx={{ borderRadius: 2, bgcolor: 'white' }}
                        >
                            <MenuItem value={2025}>2025</MenuItem>
                            <MenuItem value={2026}>2026</MenuItem>
                        </Select>
                    </FormControl>
                    <IconButton onClick={refreshData} sx={{ bgcolor: 'white', border: '1px solid #e2e8f0' }}>
                        <RefreshCcw size={18} />
                    </IconButton>
                </Stack>
            </Box>

            <Grid container spacing={3}>
                {/* Coluna 1: Indicadores Imediatos (Provisionamento) */}
                <Grid item xs={12} lg={8}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, color: '#4a5568', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Zap size={16} /> SAÚDE DO CAIXA ATUAL
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={4}>
                            <MetricCard
                                title="Líquido Garantido"
                                value={formatCurrency(provisaoData?.camadas?.garantido.valor)}
                                subtitle="Já faturado e confirmado"
                                icon={<TrendingUp size={20} />}
                                color="#2d3748"
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <MetricCard
                                title="Em Processamento"
                                value={formatCurrency(provisaoData?.camadas?.agendadoConfirmado.valor)}
                                subtitle="Agendamentos confirmados"
                                icon={<Calendar size={20} />}
                                color="#3182ce"
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <MetricCard
                                title="Pipeline Pendente"
                                value={formatCurrency(provisaoData?.camadas?.agendadoPendente.valor)}
                                subtitle="Fila de confirmação"
                                icon={<Target size={20} />}
                                color="#e53e3e"
                            />
                        </Grid>
                    </Grid>

                    {/* Meta e Projeção de Fechamento */}
                    <Paper sx={{ p: 4, mt: 3, borderRadius: 4, border: '1px solid #edf2f7', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold">Projeção de Fechamento</Typography>
                                <Typography variant="caption" color="text.secondary">Expectativa realista baseada em comportamento histórico</Typography>
                            </Box>
                            <Box textAlign="right">
                                <Typography variant="h4" fontWeight="900" color="primary.main">
                                    {formatCurrency(projecaoMes?.cenarios?.realista?.valor)}
                                </Typography>
                                <Typography variant="caption" fontWeight="bold" sx={{ color: metaAlcancada ? 'success.main' : 'warning.main' }}>
                                    {metaAlcancada ? 'CONFORME META' : `Faltam ${formatCurrency(projecaoMes?.metas?.gapParaMeta)} para meta`}
                                </Typography>
                            </Box>
                        </Box>

                        <Box mb={1}>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="body2" fontWeight="bold">{projecaoMes?.metas?.percentualAtual.toFixed(1)}% atingido</Typography>
                                <Typography variant="body2" color="text.secondary">Meta: {formatCurrency(projecaoMes?.metas?.sugerida)}</Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={Math.min(projecaoMes?.metas?.percentualAtual || 0, 100)}
                                sx={{ height: 12, borderRadius: 6, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { borderRadius: 6, background: metaAlcancada ? 'linear-gradient(90deg, #48bb78, #38a169)' : 'linear-gradient(90deg, #667eea, #764ba2)' } }}
                            />
                        </Box>
                    </Paper>
                </Grid>

                {/* Coluna 2: Ações Sugeridas (Amanda Intelligence) */}
                <Grid item xs={12} lg={4}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, color: '#4a5568', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Zap size={16} /> AMANDA INTELLIGENCE
                    </Typography>
                    <Paper sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #edf2f7' }}>
                        <Box sx={{ p: 3, bgcolor: '#f8fafc', borderBottom: '1px solid #edf2f7' }}>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#64748b' }}>Ações de Curto Prazo</Typography>
                        </Box>
                        <Box sx={{ p: 1 }}>
                            {projecaoMes?.insights?.map((insight: any, idx: number) => (
                                <Box key={idx} sx={{
                                    p: 2,
                                    m: 1,
                                    borderRadius: 3,
                                    display: 'flex',
                                    gap: 2,
                                    alignItems: 'flex-start',
                                    bgcolor: insight.tipo === 'error' ? '#fff5f5' : insight.tipo === 'warning' ? '#fffaf0' : '#ebf8ff',
                                    border: '1px solid',
                                    borderColor: insight.tipo === 'error' ? '#feb2b2' : insight.tipo === 'warning' ? '#fbd38d' : '#bee3f8'
                                }}>
                                    <AlertCircle size={20} color={insight.tipo === 'error' ? '#c53030' : insight.tipo === 'warning' ? '#c05621' : '#2b6cb0'} />
                                    <Box>
                                        <Typography variant="body2" fontWeight="bold" sx={{ lineHeight: 1.2 }}>{insight.titulo}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>{insight.mensagem}</Typography>
                                        {insight.acao && (
                                            <Button variant="text" size="small" endIcon={<ChevronRight size={14} />} sx={{ p: 0, mt: 1, minWidth: 0, textTransform: 'none', fontWeight: 'bold' }}>
                                                {insight.acao}
                                            </Button>
                                        )}
                                    </Box>
                                </Box>
                            ))}

                            {!projecaoMes?.insights?.length && (
                                <Box p={4} textAlign="center">
                                    <Typography color="text.secondary" variant="body2">Tudo em dia! Nenhuma ação urgente necessária.</Typography>
                                </Box>
                            )}
                        </Box>
                    </Paper>

                    <Button
                        fullWidth
                        variant="soft"
                        startIcon={<Download size={18} />}
                        sx={{ mt: 2, borderRadius: 3, py: 1.5, textTransform: 'none', color: '#4a5568', bgcolor: '#f1f5f9', '&:hover': { bgcolor: '#e2e8f0' } }}
                    >
                        Exportar Relatórios Detalhados
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );
};

export default InteligenciaFinanceiraTab;
