import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import API from '../../../services/api';
import { Card, CardContent, Typography, Box, Button, ButtonGroup, Chip, LinearProgress } from '@mui/material';
import { TrendingUp, TrendingDown, Pix as PixIcon, CreditCard, Money } from '@mui/icons-material';
import { formatCurrency } from '../../../utils/format';
import { FinancialLoading } from './FinancialLoading';
import { ExtratoModal } from './ExtratoModal';

interface CashFlowData {
    period: { start: string; end: string; days: number };
    summary: {
        totalEntradas: number;
        totalTransacoes: number;
        porMetodo: { pix: number; cartao: number; dinheiro: number; outros: number };
        porTipo: { particular: number; pacote: number; convenio: number; outros: number };
    };
    comparison: { variation: number; trend: 'up' | 'down' };
}

type PeriodMode = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const fetchCashFlow = async (startDate: string, endDate: string): Promise<CashFlowData> => {
    const response = await API.get('/v2/cashflow', { params: { startDate, endDate } });
    return response.data.data;
};

export const CaixaTab = () => {
    const [mode, setMode] = useState<PeriodMode>('today');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [modalOpen, setModalOpen] = useState(false);

    const { startDate, endDate, label, isSingleDay } = useMemo(() => {
        const today = dayjs();
        switch (mode) {
            case 'today':
                return { startDate: today.format('YYYY-MM-DD'), endDate: today.format('YYYY-MM-DD'), label: 'Hoje', isSingleDay: true };
            case 'yesterday':
                const yesterday = today.subtract(1, 'day');
                return { startDate: yesterday.format('YYYY-MM-DD'), endDate: yesterday.format('YYYY-MM-DD'), label: 'Ontem', isSingleDay: true };
            case 'week':
                return { startDate: today.subtract(6, 'days').format('YYYY-MM-DD'), endDate: today.format('YYYY-MM-DD'), label: 'Últimos 7 dias', isSingleDay: false };
            case 'month':
                return { startDate: today.startOf('month').format('YYYY-MM-DD'), endDate: today.format('YYYY-MM-DD'), label: 'Mês atual', isSingleDay: false };
            case 'custom':
                return { startDate: customRange.start || today.format('YYYY-MM-DD'), endDate: customRange.end || today.format('YYYY-MM-DD'), label: 'Período personalizado', isSingleDay: customRange.start === customRange.end };
        }
    }, [mode, customRange]);

    const { data: cashFlowData, isLoading } = useQuery({
        queryKey: ['cashflow', startDate, endDate],
        queryFn: () => fetchCashFlow(startDate, endDate),
        enabled: !!startDate && !!endDate
    });

    if (isLoading) return <FinancialLoading cardCount={4} />;
    if (!cashFlowData) return <Typography>Sem dados de caixa</Typography>;

    const { summary, comparison, period } = cashFlowData;
    
    const pixPct = summary.totalEntradas > 0 ? (summary.porMetodo.pix / summary.totalEntradas) * 100 : 0;
    const cartaoPct = summary.totalEntradas > 0 ? (summary.porMetodo.cartao / summary.totalEntradas) * 100 : 0;
    const dinheiroPct = summary.totalEntradas > 0 ? (summary.porMetodo.dinheiro / summary.totalEntradas) * 100 : 0;

    return (
        <Box sx={{ p: 2 }}>
            {/* HEADER */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                    💰 Caixa do Dia (REAL)
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 1 }}>
                    <ButtonGroup size="small" variant="outlined">
                        <Button variant={mode === 'today' ? 'contained' : 'outlined'} onClick={() => setMode('today')}>Hoje</Button>
                        <Button variant={mode === 'yesterday' ? 'contained' : 'outlined'} onClick={() => setMode('yesterday')}>Ontem</Button>
                        <Button variant={mode === 'week' ? 'contained' : 'outlined'} onClick={() => setMode('week')}>Semana</Button>
                        <Button variant={mode === 'month' ? 'contained' : 'outlined'} onClick={() => setMode('month')}>Mês</Button>
                    </ButtonGroup>
                    <Button size="small" variant={mode === 'custom' ? 'contained' : 'outlined'} onClick={() => setMode('custom')}>⋯</Button>
                </Box>

                {mode === 'custom' && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                        <input type="date" value={customRange.start} max={customRange.end || dayjs().format('YYYY-MM-DD')} onChange={(e) => setCustomRange(p => ({ ...p, start: e.target.value }))} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                        <span>→</span>
                        <input type="date" value={customRange.end} min={customRange.start} max={dayjs().format('YYYY-MM-DD')} onChange={(e) => setCustomRange(p => ({ ...p, end: e.target.value }))} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                    </Box>
                )}

                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {label}: {dayjs(period.start).format('DD/MM')} → {dayjs(period.end).format('DD/MM')}
                    {period.days > 1 && ` (${period.days} dias)`}
                    {' • '}{summary.totalTransacoes} transações
                </Typography>
            </Box>

            {/* TOTAL ENTRADAS - CARD CLICÁVEL */}
            <Card 
                sx={{ 
                    mb: 3, 
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                    color: 'white',
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 8, transform: 'scale(1.01)' },
                    transition: 'all 0.2s'
                }}
                onClick={() => setModalOpen(true)}
            >
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                💰 Total Entrou no Caixa (clique para ver extrato)
                            </Typography>
                            <Typography variant="h3" fontWeight="bold">
                                {formatCurrency(summary.totalEntradas)}
                            </Typography>
                        </Box>
                        
                        <Box sx={{ textAlign: 'right' }}>
                            {comparison.variation !== 0 && (
                                <>
                                    <Chip 
                                        icon={comparison.trend === 'up' ? <TrendingUp /> : <TrendingDown />}
                                        label={`${comparison.trend === 'up' ? '+' : ''}${comparison.variation.toFixed(1)}%`}
                                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold', '& .MuiChip-icon': { color: 'white' } }}
                                    />
                                    <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}>
                                        vs {isSingleDay ? 'ontem' : 'período anterior'}
                                    </Typography>
                                </>
                            )}
                        </Box>
                    </Box>
                    
                    <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 1 }}>
                        📋 Clique para ver detalhes das {summary.totalTransacoes} transações
                    </Typography>
                </CardContent>
            </Card>

            {/* POR MÉTODO - CLICÁVEIS */}
            <Typography variant="h6" fontWeight="bold" gutterBottom>💳 Por Forma de Pagamento</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                <Card sx={{ borderLeft: '4px solid #00b4d8', cursor: 'pointer', '&:hover': { boxShadow: 4 } }} onClick={() => setModalOpen(true)}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <PixIcon sx={{ color: '#00b4d8' }} />
                            <Typography variant="body2" color="text.secondary">PIX</Typography>
                        </Box>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: '#00b4d8' }}>
                            {formatCurrency(summary.porMetodo.pix)}
                        </Typography>
                        <LinearProgress variant="determinate" value={pixPct} sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: '#e0f7fa' }} />
                    </CardContent>
                </Card>

                <Card sx={{ borderLeft: '4px solid #7c3aed', cursor: 'pointer', '&:hover': { boxShadow: 4 } }} onClick={() => setModalOpen(true)}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <CreditCard sx={{ color: '#7c3aed' }} />
                            <Typography variant="body2" color="text.secondary">Cartão</Typography>
                        </Box>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: '#7c3aed' }}>
                            {formatCurrency(summary.porMetodo.cartao)}
                        </Typography>
                        <LinearProgress variant="determinate" value={cartaoPct} sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: '#ede9fe' }} />
                    </CardContent>
                </Card>

                <Card sx={{ borderLeft: '4px solid #059669', cursor: 'pointer', '&:hover': { boxShadow: 4 } }} onClick={() => setModalOpen(true)}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Money sx={{ color: '#059669' }} />
                            <Typography variant="body2" color="text.secondary">Dinheiro</Typography>
                        </Box>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: '#059669' }}>
                            {formatCurrency(summary.porMetodo.dinheiro)}
                        </Typography>
                        <LinearProgress variant="determinate" value={dinheiroPct} sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: '#d1fae5' }} />
                    </CardContent>
                </Card>
            </Box>

            {/* POR TIPO - CLICÁVEIS */}
            <Typography variant="h6" fontWeight="bold" gutterBottom>📦 Por Origem</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
                <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }} onClick={() => setModalOpen(true)}>
                    <CardContent>
                        <Typography variant="body2" color="text.secondary">Particular</Typography>
                        <Typography variant="h5" fontWeight="bold" color="primary.main">
                            {formatCurrency(summary.porTipo.particular)}
                        </Typography>
                    </CardContent>
                </Card>

                <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }} onClick={() => setModalOpen(true)}>
                    <CardContent>
                        <Typography variant="body2" color="text.secondary">Venda de Pacotes</Typography>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: '#ec4899' }}>
                            {formatCurrency(summary.porTipo.pacote)}
                        </Typography>
                    </CardContent>
                </Card>

                <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 } }} onClick={() => setModalOpen(true)}>
                    <CardContent>
                        <Typography variant="body2" color="text.secondary">Convênio</Typography>
                        <Typography variant="h5" fontWeight="bold" sx={{ color: '#f59e0b' }}>
                            {formatCurrency(summary.porTipo.convenio)}
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            {/* MODAL */}
            <ExtratoModal 
                open={modalOpen} 
                onClose={() => setModalOpen(false)}
                startDate={startDate}
                endDate={endDate}
                periodLabel={label}
            />
        </Box>
    );
};

export default CaixaTab;
