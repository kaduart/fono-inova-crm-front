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
    Divider,
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
    TrendingFlat,
    AccountBalance,
    Insights,
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
    const variationPercent = data?.variacao?.receita;
    const hasValidVariation = variationPercent !== null && variationPercent !== undefined;
    const isPositiveVariation = hasValidVariation ? variationPercent >= 0 : false;

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
                    borderRadius: 2,
                    bgcolor: 'white'
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
                            <Assessment sx={{ fontSize: 24 }} />
                        </Avatar>
                        <Box>
                            <Typography variant="h5" fontWeight="bold" sx={{ color: '#1F2937' }}>
                                Receitas - Visão Estratégica
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#6B7280' }}>
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
                                sx={{
                                    borderRadius: 1.5,
                                    '&:hover': { borderColor: '#10B981' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#10B981' }
                                }}
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
                                sx={{
                                    borderRadius: 1.5,
                                    '&:hover': { borderColor: '#10B981' },
                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#10B981' }
                                }}
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
                <Grid container spacing={2.5} sx={{ mb: 4 }}>
                    {[1, 2, 3, 4].map(i => (
                        <Grid item xs={12} sm={6} md={3} key={i}>
                            <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
                        </Grid>
                    ))}
                </Grid>
            ) : (
                <Grid container spacing={2.5} sx={{ mb: 4 }}>
                    {/* Total Mês */}
                    <Grid item xs={12} sm={6} md={3}>
                        <SummaryCard
                            title="Receita Total"
                            value={formatCurrency(metrics.totalRevenue)}
                            icon={<AttachMoney />}
                            color="#10B981"
                            bgColor="#10B98110"
                            subtitle={
                                <Box sx={{ mt: 1 }}>
                                    <Box component="span" sx={{ color: '#10B981', fontWeight: 600 }}>
                                        Particular: {formatCurrency(metrics.particularRecebido)}
                                    </Box>
                                    <br />
                                    <Box component="span" sx={{ color: '#0EA5E9', fontWeight: 600 }}>
                                        Convênio: {formatCurrency(metrics.convenioRecebido)}
                                    </Box>
                                </Box>
                            }
                        />
                    </Grid>

                    {/* Ticket Médio */}
                    <Grid item xs={12} sm={6} md={3}>
                        <SummaryCard
                            title="Ticket Médio"
                            value={formatCurrency(metrics.averageTicket)}
                            icon={<Receipt />}
                            color="#0EA5E9"
                            bgColor="#0EA5E910"
                            subtitle={`Média por transação`}
                        />
                    </Grid>

                    {/* Transações */}
                    <Grid item xs={12} sm={6} md={3}>
                        <SummaryCard
                            title="Transações"
                            value={metrics.transactionCount.toString()}
                            icon={<CalendarToday />}
                            color="#8B5CF6"
                            bgColor="#8B5CF610"
                            subtitle={`${metrics.transactionCount} pagamentos no período`}
                        />
                    </Grid>

                    {/* Variação vs Mês Anterior */}
                    <Grid item xs={12} sm={6} md={3}>
                        <Card 
                            elevation={0} 
                            sx={{ 
                                border: '1px solid', 
                                borderColor: hasValidVariation ? (isPositiveVariation ? '#10B98130' : '#EF444430') : '#9CA3AF30', 
                                borderRadius: 2, 
                                height: '100%',
                                transition: 'all 0.2s',
                                '&:hover': {
                                    boxShadow: `0 4px 12px ${hasValidVariation ? (isPositiveVariation ? '#10B98120' : '#EF444420') : '#9CA3AF20'}`,
                                    borderColor: hasValidVariation ? (isPositiveVariation ? '#10B981' : '#EF4444') : '#9CA3AF'
                                }
                            }}
                        >
                            <CardContent sx={{ p: 2.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box>
                                        <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, mb: 0.5 }}>
                                            vs Mês Anterior
                                        </Typography>
                                        <Typography 
                                            variant="h4" 
                                            fontWeight="bold" 
                                            sx={{ 
                                                color: hasValidVariation ? (isPositiveVariation ? '#10B981' : '#EF4444') : '#9CA3AF',
                                                lineHeight: 1.2 
                                            }}
                                        >
                                            {hasValidVariation 
                                                ? `${isPositiveVariation ? '+' : ''}${formatPercent(variationPercent)}`
                                                : 'N/A'
                                            }
                                        </Typography>
                                    </Box>
                                    <Avatar sx={{ 
                                        bgcolor: hasValidVariation ? (isPositiveVariation ? '#10B98115' : '#EF444415') : '#9CA3AF15', 
                                        width: 48, 
                                        height: 48,
                                        '& .MuiSvgIcon-root': {
                                            color: hasValidVariation ? (isPositiveVariation ? '#10B981' : '#EF4444') : '#9CA3AF'
                                        }
                                    }}>
                                        {hasValidVariation ? (
                                            isPositiveVariation ? (
                                                <TrendingUp />
                                            ) : (
                                                <TrendingDown />
                                            )
                                        ) : (
                                            <TrendingFlat />
                                        )}
                                    </Avatar>
                                </Box>
                                
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                    {hasValidVariation ? (
                                        <Chip
                                            size="small"
                                            icon={isPositiveVariation ? <ArrowUpward sx={{ fontSize: 14 }} /> : <ArrowDownward sx={{ fontSize: 14 }} />}
                                            label={`${Math.abs(variationPercent || 0).toFixed(1)}%`}
                                            sx={{
                                                bgcolor: isPositiveVariation ? '#10B98110' : '#EF444410',
                                                color: isPositiveVariation ? '#10B981' : '#EF4444',
                                                fontWeight: 600,
                                                fontSize: '0.75rem',
                                                height: 24,
                                                '& .MuiChip-icon': { fontSize: 14 }
                                            }}
                                        />
                                    ) : (
                                        <Chip
                                            size="small"
                                            label="Sem dados"
                                            sx={{
                                                bgcolor: '#9CA3AF10',
                                                color: '#9CA3AF',
                                                fontWeight: 600,
                                                fontSize: '0.75rem',
                                                height: 24
                                            }}
                                        />
                                    )}
                                    <Typography variant="caption" sx={{ color: '#6B7280' }}>
                                        {hasValidVariation 
                                            ? (isPositiveVariation ? 'Crescimento' : 'Redução') 
                                            : 'Mês anterior sem dados'
                                        }
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Seção de Detalhamento */}
            {!loading && data && (
                <Grid container spacing={2.5}>
                    {/* Breakdown por Tipo */}
                    <Grid item xs={12} md={6}>
                        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <Avatar sx={{ bgcolor: '#8B5CF610', width: 32, height: 32 }}>
                                    <AccountBalance sx={{ fontSize: 18, color: '#8B5CF6' }} />
                                </Avatar>
                                <Typography variant="h6" fontWeight="bold" sx={{ color: '#1F2937' }}>
                                    Detalhamento por Tipo
                                </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    p: 2, 
                                    bgcolor: '#F9FAFB', 
                                    borderRadius: 1.5,
                                    border: '1px solid',
                                    borderColor: '#10B98130'
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Avatar sx={{ bgcolor: '#10B98115', width: 28, height: 28 }}>
                                            <AttachMoney sx={{ fontSize: 16, color: '#10B981' }} />
                                        </Avatar>
                                        <Typography fontWeight="500">Particular Recebido</Typography>
                                    </Box>
                                    <Typography fontWeight="bold" sx={{ color: '#10B981', fontSize: '1.1rem' }}>
                                        {formatCurrency(metrics.particularRecebido)}
                                    </Typography>
                                </Box>

                                <Box sx={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    p: 2, 
                                    bgcolor: '#F9FAFB', 
                                    borderRadius: 1.5,
                                    border: '1px solid',
                                    borderColor: '#0EA5E930'
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Avatar sx={{ bgcolor: '#0EA5E915', width: 28, height: 28 }}>
                                            <Receipt sx={{ fontSize: 16, color: '#0EA5E9' }} />
                                        </Avatar>
                                        <Typography fontWeight="500">Convênio Recebido</Typography>
                                    </Box>
                                    <Typography fontWeight="bold" sx={{ color: '#0EA5E9', fontSize: '1.1rem' }}>
                                        {formatCurrency(metrics.convenioRecebido)}
                                    </Typography>
                                </Box>

                                <Box sx={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    p: 2, 
                                    bgcolor: '#FEF3C7', 
                                    borderRadius: 1.5,
                                    border: '1px solid',
                                    borderColor: '#F59E0B30'
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Avatar sx={{ bgcolor: '#F59E0B15', width: 28, height: 28 }}>
                                            <CalendarToday sx={{ fontSize: 16, color: '#F59E0B' }} />
                                        </Avatar>
                                        <Typography fontWeight="500">A Receber</Typography>
                                    </Box>
                                    <Typography fontWeight="bold" sx={{ color: '#F59E0B', fontSize: '1.1rem' }}>
                                        {formatCurrency(metrics.aReceber)}
                                    </Typography>
                                </Box>
                            </Box>
                        </Paper>
                    </Grid>

                    {/* Insights */}
                    <Grid item xs={12} md={6}>
                        <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                                <Avatar sx={{ bgcolor: '#8B5CF610', width: 32, height: 32 }}>
                                    <Insights sx={{ fontSize: 18, color: '#8B5CF6' }} />
                                </Avatar>
                                <Typography variant="h6" fontWeight="bold" sx={{ color: '#1F2937' }}>
                                    Insights
                                </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {data.insights && data.insights.length > 0 ? (
                                    data.insights.slice(0, 3).map((insight, idx) => (
                                        <Box 
                                            key={idx} 
                                            sx={{ 
                                                p: 2.5, 
                                                borderRadius: 1.5,
                                                bgcolor: insight.type === 'positive' ? '#10B98108' : 
                                                         insight.type === 'warning' ? '#F59E0B08' : '#EF444408',
                                                borderLeft: 4,
                                                borderColor: insight.type === 'positive' ? '#10B981' : 
                                                            insight.type === 'warning' ? '#F59E0B' : '#EF4444',
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    bgcolor: insight.type === 'positive' ? '#10B98115' : 
                                                             insight.type === 'warning' ? '#F59E0B15' : '#EF444415',
                                                }
                                            }}
                                        >
                                            <Typography fontWeight="bold" sx={{ color: '#1F2937', mb: 0.5 }}>
                                                {insight.message}
                                            </Typography>
                                            <Typography variant="body2" sx={{ color: '#6B7280' }}>
                                                {insight.detail}
                                            </Typography>
                                        </Box>
                                    ))
                                ) : (
                                    <Box sx={{ 
                                        p: 4, 
                                        textAlign: 'center',
                                        bgcolor: '#F9FAFB',
                                        borderRadius: 1.5
                                    }}>
                                        <Typography sx={{ color: '#6B7280' }}>
                                            Nenhum insight disponível para o período selecionado.
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
};

// Componente auxiliar para cards de resumo
interface SummaryCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    color: string;
    bgColor?: string;
    subtitle?: string | React.ReactNode;
}

const SummaryCard = ({ title, value, icon, color, bgColor = 'white', subtitle }: SummaryCardProps) => (
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
        <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                    <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500, mb: 0.5 }}>
                        {title}
                    </Typography>
                    <Typography 
                        variant="h4" 
                        fontWeight="bold" 
                        sx={{ 
                            color,
                            lineHeight: 1.2,
                            fontSize: { xs: '1.5rem', sm: '1.75rem' }
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
                        color: color,
                        fontSize: 24
                    }
                }}>
                    {icon}
                </Avatar>
            </Box>
            
            {subtitle && (
                <Typography variant="caption" sx={{ color: '#6B7280', display: 'block' }}>
                    {subtitle}
                </Typography>
            )}
        </CardContent>
    </Card>
);

export default RevenueTab;