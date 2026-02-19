// pages/Financial/tabs/VisaoGeralEstrategicaTab.tsx
// Visão Geral Estratégica - Painel Executivo da Clínica

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
    AccountBalance,
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
    MoneyOff,
    Savings,
    Timeline
} from '@mui/icons-material';
import { useFinancialOverview } from '../../../hooks/useFinancialOverview';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';

const VisaoGeralEstrategicaTab = () => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedComparison, setSelectedComparison] = useState<'previous' | 'lastYear'>('previous');

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
            <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: '#8B5CF6', width: 48, height: 48 }}>
                            <Assessment className="w-6 h-6 text-white" />
                        </Avatar>
                        <Box>
                            <Typography variant="h5" fontWeight="bold">
                                Visão Geral Estratégica
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Painel executivo de saúde financeira da clínica
                            </Typography>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
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

                        <FormControl size="small" sx={{ minWidth: 100 }}>
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

                        <FormControl size="small" sx={{ minWidth: 140 }}>
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
                                <CompareArrows size={18} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
            </Paper>

            {loading ? (
                <Box sx={{ mt: 2 }}>
                    <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />
                    <Grid container spacing={2.5}>
                        {[1, 2, 3, 4].map(i => (
                            <Grid item xs={12} sm={6} md={3} key={i}>
                                <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            ) : data ? (
                <>
                    {/* Cards Principais - Dados reais de Fevereiro/2026 */}
                    <Grid container spacing={2.5} sx={{ mb: 3 }}>
                        {/* Receita - R$ 11.670,12 */}
                        <Grid item xs={12} sm={6} md={3}>
                            <MetricCard
                                title="Receita"
                                value={formatCurrency(data.metrics.receita)}
                                variation={data.variation.receita}
                                icon={<AttachMoney />}
                                color="#10B981"
                                bgColor="#10B98110"
                                formatPercent={formatPercent}
                                getVariationColor={getVariationColor}
                                getVariationIcon={getVariationIcon}
                                subtitle={`${data.metrics.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            />
                        </Grid>

                        {/* Despesas - R$ 0 */}
                        <Grid item xs={12} sm={6} md={3}>
                            <MetricCard
                                title="Despesas"
                                value={formatCurrency(data.metrics.despesas)}
                                variation={data.variation.despesas}
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

                        {/* Lucro - R$ 11.670,12 */}
                        <Grid item xs={12} sm={6} md={3}>
                            <MetricCard
                                title="Lucro"
                                value={formatCurrency(data.metrics.lucro)}
                                variation={data.variation.lucro}
                                icon={<Savings />}
                                color="#8B5CF6"
                                bgColor="#8B5CF610"
                                formatPercent={formatPercent}
                                getVariationColor={getVariationColor}
                                getVariationIcon={getVariationIcon}
                                subtitle={`Margem: ${(data.metrics.margem * 100).toFixed(1)}%`}
                            />
                        </Grid>

                        {/* Margem - 100% */}
                        <Grid item xs={12} sm={6} md={3}>
                            <MetricCard
                                title="Margem"
                                value={`${(data.metrics.margem * 100).toFixed(1)}%`}
                                variation={data.variation.margem}
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

                    {/* Segunda Linha de Cards - Caixa vs A Receber */}
                    <Grid container spacing={2.5} sx={{ mb: 4 }}>
                        {/* Caixa - R$ 11.670,12 */}
                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: '#05966930', borderRadius: 2, height: '100%' }}>
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
                                        {formatCurrency(data.metrics.caixa)}
                                    </Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Disponível
                                        </Typography>
                                        <Chip 
                                            size="small" 
                                            label="100% realizado"
                                            sx={{ bgcolor: '#05966910', color: '#059669', fontWeight: 500 }}
                                        />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* A Receber - R$ 2.621,02 */}
                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: '#0284C730', borderRadius: 2, height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Avatar sx={{ bgcolor: '#0284C7', width: 40, height: 40 }}>
                                            <Receipt sx={{ fontSize: 20 }} />
                                        </Avatar>
                                        <Typography variant="body2" color="text.secondary">
                                            🧾 A Receber
                                        </Typography>
                                    </Box>
                                    <Typography variant="h4" fontWeight="bold" color="#0284C7" sx={{ mb: 1 }}>
                                        {formatCurrency(data.metrics.aReceber)}
                                    </Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Convênios pendentes
                                        </Typography>
                                        <Chip 
                                            size="small" 
                                            label="18% do total"
                                            sx={{ bgcolor: '#0284C710', color: '#0284C7', fontWeight: 500 }}
                                        />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Meta - R$ 0 */}
                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: '#8B5CF630', borderRadius: 2, height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Avatar sx={{ bgcolor: '#8B5CF6', width: 40, height: 40 }}>
                                            <Assessment sx={{ fontSize: 20 }} />
                                        </Avatar>
                                        <Typography variant="body2" color="text.secondary">
                                            🎯 Meta do Mês
                                        </Typography>
                                    </Box>
                                    <Typography variant="h4" fontWeight="bold" color="#8B5CF6" sx={{ mb: 1 }}>
                                        {formatCurrency(data.metrics.meta)}
                                    </Typography>
                                    <Box sx={{ mt: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary">Progresso</Typography>
                                            <Typography variant="caption" fontWeight="600">{data.metrics.metaPercent.toFixed(1)}%</Typography>
                                        </Box>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={Math.min(data.metrics.metaPercent, 100)} 
                                            sx={{ 
                                                height: 8, 
                                                borderRadius: 4,
                                                bgcolor: '#E5E7EB',
                                                '& .MuiLinearProgress-bar': {
                                                    bgcolor: data.metrics.metaPercent >= 100 ? '#10B981' : '#F59E0B'
                                                }
                                            }}
                                        />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Projeção - R$ 18.154 */}
                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: '#F59E0B30', borderRadius: 2, height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Avatar sx={{ bgcolor: '#F59E0B', width: 40, height: 40 }}>
                                            <TrendingUp sx={{ fontSize: 20 }} />
                                        </Avatar>
                                        <Typography variant="body2" color="text.secondary">
                                            📈 Projeção Final
                                        </Typography>
                                    </Box>
                                    <Typography variant="h4" fontWeight="bold" color="#F59E0B" sx={{ mb: 1 }}>
                                        {formatCurrency(data.metrics.projecao)}
                                    </Typography>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {data.metrics.valorDiarioNecessario > 0 
                                                ? `R$ ${data.metrics.valorDiarioNecessario.toLocaleString('pt-BR')}/dia necessário`
                                                : 'Acima da meta'}
                                        </Typography>
                                        <ArrowUpward sx={{ fontSize: 16, color: '#10B981' }} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Insights Estratégicos - Baseado nos dados reais */}
                    {data.insights.length > 0 && (
                        <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                                <Avatar sx={{ bgcolor: '#8B5CF6', width: 32, height: 32 }}>
                                    <Info sx={{ fontSize: 18, color: 'white' }} />
                                </Avatar>
                                <Typography variant="h6" fontWeight="600">
                                    🔔 Insights Estratégicos
                                </Typography>
                            </Box>
                            
                            <Grid container spacing={2}>
                                {data.insights.map((insight, index) => (
                                    <Grid item xs={12} md={6} key={index}>
                                        <Alert 
                                            severity={getInsightColor(insight.severity)}
                                            icon={getInsightIcon(insight.type)}
                                            sx={{ 
                                                borderRadius: 2,
                                                '& .MuiAlert-message': { width: '100%' }
                                            }}
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

                    {/* Rodapé com período de comparação */}
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                        <Chip
                            size="small"
                            icon={<CalendarToday />}
                            label={`Período atual: ${periodoAtual}`}
                            variant="outlined"
                        />
                        <Chip
                            size="small"
                            icon={<CompareArrows />}
                            label={`Comparando com: ${periodoComparacao}`}
                            variant="outlined"
                            sx={{ ml: 1 }}
                        />
                        <Chip
                            size="small"
                            label={`Variação: ${(data.variation.receita * 100).toFixed(1)}%`}
                            sx={{ 
                                bgcolor: data.variation.receita > 0 ? '#10B98110' : '#EF444410',
                                color: data.variation.receita > 0 ? '#10B981' : '#EF4444',
                                fontWeight: 500
                            }}
                        />
                    </Box>
                </>
            ) : null}
        </Box>
    );
};

// Componente auxiliar para cards de métricas - Aprimorado
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
    title, 
    value, 
    variation, 
    icon, 
    color,
    bgColor = 'white',
    formatPercent,
    getVariationColor,
    getVariationIcon,
    isInverted = false,
    subtitle
}: MetricCardProps) => (
    <Card elevation={0} sx={{ 
        border: '1px solid', 
        borderColor: `${color}30`, 
        borderRadius: 2, 
        height: '100%',
        bgcolor: bgColor,
        transition: 'all 0.2s',
        '&:hover': {
            boxShadow: `0 4px 12px ${color}20`,
            borderColor: color
        }
    }}>
        <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        {title}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" sx={{ color, lineHeight: 1.2 }}>
                        {value}
                    </Typography>
                    {subtitle && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {subtitle}
                        </Typography>
                    )}
                </Box>
                <Avatar sx={{ bgcolor: `${color}15`, width: 48, height: 48 }}>
                    {icon}
                </Avatar>
            </Box>
            
            {variation !== 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Chip
                        size="small"
                        icon={variation > 0 ? <ArrowUpward /> : <ArrowDownward />}
                        label={`${(Math.abs(variation) * 100).toFixed(1)}%`}
                        sx={{
                            bgcolor: variation > 0 ? (isInverted ? '#EF444410' : '#10B98110') : (isInverted ? '#10B98110' : '#EF444410'),
                            color: getVariationColor(variation, isInverted),
                            fontWeight: 600,
                            fontSize: '0.75rem'
                        }}
                    />
                    <Typography variant="caption" color="text.secondary">
                        vs período anterior
                    </Typography>
                </Box>
            )}
        </CardContent>
    </Card>
);

export default VisaoGeralEstrategicaTab;