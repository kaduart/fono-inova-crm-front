import { useEffect, useState, useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Avatar,
    Paper,
    Skeleton,
    Chip,
} from '@mui/material';
import {
    AttachMoney,
    TrendingUp,
    Receipt,
    CalendarToday,
    ArrowUpward,
    ArrowDownward,
    Assessment,
    TrendingDown,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFinancialOverview } from '../../../hooks/useFinancialOverview';

// 🆕 RevenueTab Estratégico - Apenas análise e métricas (sem caixa diário)
const RevenueTab: React.FC = () => {
    // Estado para filtros de mês/ano
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

    // Hook de visão geral financeira - busca da API
    const {
        data,
        loading,
        fetchOverview,
        formatCurrency,
        formatPercent,
    } = useFinancialOverview();

    // Buscar dados ao montar componente ou mudar período
    useEffect(() => {
        fetchOverview(currentMonth, currentYear, 'previous');
    }, [currentMonth, currentYear, fetchOverview]);

    // Métricas calculadas dos dados da API
    const metrics = useMemo(() => {
        if (!data?.metrics) {
            return {
                totalRevenue: 0,
                transactionCount: 0,
                averageTicket: 0,
                particularRecebido: 0,
                convenioRecebido: 0,
                aReceber: 0,
            };
        }

        return {
            totalRevenue: data.metrics.receita || 0,
            transactionCount: data.metrics.totalTransacoes || 0,
            averageTicket: data.metrics.ticketMedio || 0,
            particularRecebido: data.metrics.particularRecebido || 0,
            convenioRecebido: data.metrics.convenioRecebido || 0,
            aReceber: data.metrics.aReceber || 0,
        };
    }, [data]);

    // Dados para os selects
    const months = Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })
    }));

    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    // Variação vs mês anterior (do hook)
    const variationPercent = data?.variacao?.receita || 0;
    const isPositiveVariation = variationPercent >= 0;

    return (
        <Box>
            {/* Header com Título e Filtros */}
            <Paper 
                elevation={0} 
                sx={{ 
                    p: 2.5, 
                    mb: 3, 
                    border: '1px solid', 
                    borderColor: 'grey.200', 
                    borderRadius: 2 
                }}
            >
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    gap: 2 
                }}>
                    {/* Título */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: '#10B981', width: 48, height: 48 }}>
                            <Assessment sx={{ fontSize: 24, color: 'white' }} />
                        </Avatar>
                        <Box>
                            <Typography variant="h5" fontWeight="bold">
                                Receitas - Visão Estratégica
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Análise de receita, ticket médio e variações mensais
                            </Typography>
                        </Box>
                    </Box>

                    {/* Filtros de Mês/Ano */}
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Mês</InputLabel>
                            <Select
                                value={currentMonth}
                                label="Mês"
                                onChange={(e) => setCurrentMonth(Number(e.target.value))}
                            >
                                {months.map(m => (
                                    <MenuItem key={m.value} value={m.value}>
                                        {m.label.charAt(0).toUpperCase() + m.label.slice(1)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel>Ano</InputLabel>
                            <Select
                                value={currentYear}
                                label="Ano"
                                onChange={(e) => setCurrentYear(Number(e.target.value))}
                            >
                                {years.map(y => (
                                    <MenuItem key={y} value={y}>{y}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </Box>
            </Paper>

            {/* Cards de Resumo */}
            {loading ? (
                <Grid container spacing={2.5} sx={{ mb: 3 }}>
                    {[1, 2, 3, 4].map(i => (
                        <Grid item xs={12} sm={6} md={3} key={i}>
                            <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Grid container spacing={2.5} sx={{ mb: 3 }}>
                    {/* Total Mês */}
                    <Grid item xs={12} sm={6} md={3}>
                        <SummaryCard
                            title="Total Receita"
                            value={formatCurrency(metrics.totalRevenue)}
                            subtitle={`Particular: ${formatCurrency(metrics.particularRecebido)} | Convênio: ${formatCurrency(metrics.convenioRecebido)}`}
                            icon={<AttachMoney />}
                            color="#10B981"
                        />
                    </Grid>

                    {/* Ticket Médio */}
                    <Grid item xs={12} sm={6} md={3}>
                        <SummaryCard
                            title="Ticket Médio"
                            value={formatCurrency(metrics.averageTicket)}
                            subtitle={`Média por transação`}
                            icon={<Receipt />}
                            color="#0EA5E9"
                        />
                    </Grid>

                    {/* Transações */}
                    <Grid item xs={12} sm={6} md={3}>
                        <SummaryCard
                            title="Transações"
                            value={metrics.transactionCount.toString()}
                            subtitle={`${metrics.transactionCount} pagamentos no período`}
                            icon={<CalendarToday />}
                            color="#8B5CF6"
                        />
                    </Grid>

                    {/* Variação vs Mês Anterior */}
                    <Grid item xs={12} sm={6} md={3}>
                        <Card 
                            elevation={0} 
                            sx={{ 
                                border: '1px solid', 
                                borderColor: isPositiveVariation ? '#10B98130' : '#EF444430', 
                                borderRadius: 2, 
                                height: '100%',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    boxShadow: `0 4px 12px ${isPositiveVariation ? '#10B98120' : '#EF444420'}`,
                                    borderColor: isPositiveVariation ? '#10B981' : '#EF4444'
                                }
                            }}
                        >
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" gutterBottom>
                                            vs Mês Anterior
                                        </Typography>
                                        <Typography 
                                            variant="h4" 
                                            fontWeight="bold" 
                                            sx={{ 
                                                color: isPositiveVariation ? '#10B981' : '#EF4444',
                                                lineHeight: 1.2 
                                            }}
                                        >
                                            {isPositiveVariation ? '+' : ''}{formatPercent(variationPercent * 100)}
                                        </Typography>
                                    </Box>
                                    <Avatar sx={{ 
                                        bgcolor: isPositiveVariation ? '#10B98115' : '#EF444415', 
                                        width: 48, 
                                        height: 48 
                                    }}>
                                        {isPositiveVariation ? (
                                            <TrendingUp sx={{ color: '#10B981' }} />
                                        ) : (
                                            <TrendingDown sx={{ color: '#EF4444' }} />
                                        )}
                                    </Avatar>
                                </Box>
                                
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip
                                        size="small"
                                        icon={isPositiveVariation ? <ArrowUpward /> : <ArrowDownward />}
                                        label={`${Math.abs(variationPercent * 100).toFixed(1)}%`}
                                        sx={{
                                            bgcolor: isPositiveVariation ? '#10B98110' : '#EF444410',
                                            color: isPositiveVariation ? '#10B981' : '#EF4444',
                                            fontWeight: 600,
                                        }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        {isPositiveVariation ? 'Crescimento' : 'Redução'}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Seção de Detalhamento */}
            {!loading && data && (
                <Grid container spacing={3}>
                    {/* Breakdown por Tipo */}
                    <Grid item xs={12} md={6}>
                        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                            <Typography variant="h6" fontWeight="bold" gutterBottom>
                                Detalhamento por Tipo
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, p: 2, bgcolor: '#F3F4F6', borderRadius: 1 }}>
                                    <Typography>Particular Recebido</Typography>
                                    <Typography fontWeight="bold" color="#10B981">
                                        {formatCurrency(metrics.particularRecebido)}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, p: 2, bgcolor: '#F3F4F6', borderRadius: 1 }}>
                                    <Typography>Convênio Recebido</Typography>
                                    <Typography fontWeight="bold" color="#0EA5E9">
                                        {formatCurrency(metrics.convenioRecebido)}
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: '#FEF3C7', borderRadius: 1 }}>
                                    <Typography>A Receber</Typography>
                                    <Typography fontWeight="bold" color="#F59E0B">
                                        {formatCurrency(metrics.aReceber)}
                                    </Typography>
                                </Box>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Insights */}
                    <Grid item xs={12} md={6}>
                        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                            <Typography variant="h6" fontWeight="bold" gutterBottom>
                                Insights
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                                {data.insights && data.insights.length > 0 ? (
                                    data.insights.slice(0, 3).map((insight, idx) => (
                                        <Box 
                                            key={idx} 
                                            sx={{ 
                                                mb: 2, 
                                                p: 2, 
                                                borderRadius: 1,
                                                bgcolor: insight.type === 'positive' ? '#10B98110' : 
                                                         insight.type === 'warning' ? '#F59E0B10' : '#EF444410',
                                                borderLeft: 4,
                                                borderColor: insight.type === 'positive' ? '#10B981' : 
                                                            insight.type === 'warning' ? '#F59E0B' : '#EF4444'
                                            }}
                                        >
                                            <Typography fontWeight="bold" color="text.primary">
                                                {insight.message}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {insight.detail}
                                            </Typography>
                                        </Box>
                                    ))
                                ) : (
                                    <Typography color="text.secondary">
                                        Nenhum insight disponível para o período selecionado.
                                    </Typography>
                                )}
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* Nota: Caixa Diário movido para aba separada no modo Operacional */}
        </Box>
    );
};

// Componente auxiliar para cards de resumo
interface SummaryCardProps {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
}

const SummaryCard = ({ title, value, subtitle, icon, color }: SummaryCardProps) => (
    <Card 
        elevation={0} 
        sx={{ 
            border: '1px solid', 
            borderColor: `${color}30`, 
            borderRadius: 2, 
            height: '100%',
            transition: 'all 0.2s',
            '&:hover': {
                boxShadow: `0 4px 12px ${color}20`,
                borderColor: color,
                transform: 'translateY(-2px)'
            }
        }}
    >
        <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        {title}
                    </Typography>
                    <Typography 
                        variant="h4" 
                        fontWeight="bold" 
                        sx={{ 
                            color,
                            lineHeight: 1.2 
                        }}
                    >
                        {value}
                    </Typography>
                </Box>
                <Avatar sx={{ 
                    bgcolor: `${color}15`, 
                    width: 48, 
                    height: 48,
                    '& .MuiSvgIcon-root': {
                        color: color
                    }
                }}>
                    {icon}
                </Avatar>
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {subtitle}
            </Typography>
        </CardContent>
    </Card>
);

export default RevenueTab;
