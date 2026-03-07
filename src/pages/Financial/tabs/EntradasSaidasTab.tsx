// src/pages/Financial/tabs/EntradasSaidasTab.tsx
// Design: Dashboard com Selector + Lógica Caixa vs A Receber (funcional)

import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Grid,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    MenuItem,
    Typography,
    Tooltip,
    Alert,
    Avatar,
    LinearProgress,
    Divider,
    List,
    ListItem,
    ListItemText
} from '@mui/material';
import {
    Plus,
    Edit2,
    Trash2,
    TrendingUp,
    TrendingDown,
    Wallet,
    CreditCard,
    Receipt,
    Calendar,
    ChevronDown,
    ChevronUp,
    Landmark,
    Banknote,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useExpenses } from '../../../hooks/useExpenses';
import ExpenseModal from '../components/ExpenseModal';
import api from '../../../services/api';
import { FinancialLoading } from '../components/FinancialLoading';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { AccountBalance, ArrowUpward, AttachMoney, LocalAtm, Schedule } from '@mui/icons-material';

// ==================== TIPOS ====================
interface Payment {
    _id: string;
    patient?: { fullName?: string };
    patientName?: string;
    sessionType?: string;
    sessionValue?: number;
    amount?: number;
    date?: string;
    paymentDate?: string;
    createdAt?: string;
    status: string;
    paymentMethod?: string;
    bandeiraCartao?: string;
    parcelas?: number;
    billingType?: string;
    insurance?: {
        provider?: string;
        status?: string;
        grossAmount?: number;
    } | null;
}

interface SummaryData {
    receitas: {
        total: number;
        caixa: { total: number; count: number };
        aReceber: { total: number; count: number };
        porMetodo: Record<string, number>;
    };
    despesas: {
        total: number;
        count: number;
        porCategoria: Record<string, number>;
    };
    lucroCaixa: number;
    lucroTotal: number;
    taxasCartao: { total: number; count: number };
    margemLucro: number;
}

interface FluxoHistorico {
    mes: string;
    caixa: number;
    aReceber: number;
}

// ==================== HELPERS ====================
const formatCurrency = (value: number) =>
    `R$ ${(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatCurrencyCompact = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
    return `R$ ${value.toFixed(0)}`;
};

const safeFormatDate = (dateValue?: string): string => {
    if (!dateValue) return '-';
    try {
        const date = parseISO(dateValue);
        if (!isValid(date)) return '-';
        return format(date, "dd/MM 'às' HH:mm", { locale: ptBR });
    } catch {
        return '-';
    }
};

const getPaymentMethodLabel = (method?: string): string => {
    const labels: Record<string, string> = {
        dinheiro: 'Dinheiro',
        pix: 'PIX',
        cartao_credito: 'Cartão Créd',
        cartao_debito: 'Cartão Déb',
        transferencia_bancaria: 'Transfer',
        convenio: 'Convênio',
        outro: 'Outro'
    };
    return labels[method || ''] || method || '-';
};

const getCategoryLabel = (cat?: string): string => {
    const labels: Record<string, string> = {
        payroll: 'Folha',
        commission: 'Comissão',
        benefit: 'Benefício',
        operational: 'Operacional',
        equipment: 'Equipamento',
        marketing: 'Marketing',
        other: 'Outro',
        taxa_cartao: 'Taxa Cartão'
    };
    return labels[cat || ''] || cat || '-';
};

const isCardPayment = (method?: string): boolean => {
    return ['cartao_credito', 'cartao_debito', 'cartão', 'debito', 'credito'].includes(method || '');
};

// ==================== COMPONENTE ====================
const EntradasSaidasTab = () => {
    const [filters, setFilters] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });

    const [payments, setPayments] = useState<Payment[]>([]);
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [historico, setHistorico] = useState<FluxoHistorico[]>([]);
    const [showDetails, setShowDetails] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [meta, setMeta] = useState<any>(null);
    const [loadingMeta, setLoadingMeta] = useState(false);

    const { expenses, loading: loadingExpenses, fetchExpenses, cancelExpense } = useExpenses();

    // Buscar meta do planejamento
    useEffect(() => {
        const fetchMeta = async () => {
            setLoadingMeta(true);
            try {
                const res = await api.get('/planning', { 
                    params: { 
                        type: 'monthly', 
                        month: filters.month,
                        year: filters.year 
                    } 
                });
                if (res.data?.data && res.data.data.length > 0) {
                    setMeta(res.data.data[0]);
                } else {
                    setMeta(null);
                }
            } catch (error) {
                console.error('Erro ao buscar meta:', error);
                setMeta(null);
            } finally {
                setLoadingMeta(false);
            }
        };
        fetchMeta();
    }, [filters]);

    // Buscar dados
    const fetchData = async () => {
        setLoading(true);
        try {
            const start = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
            const lastDay = new Date(filters.year, filters.month, 0).getDate();
            const end = `${filters.year}-${String(filters.month).padStart(2, '0')}-${lastDay}`;

            const [paymentsRes, historicoRes] = await Promise.all([
                api.get('/payments', { params: { status: 'paid', startDate: start, endDate: end, limit: 1000 } }),
                api.get('/cashflow/historico', { params: { meses: 6 } }).catch(() => ({ data: { data: [] } }))
            ]);

            setPayments(paymentsRes.data.data || []);
            setHistorico(historicoRes.data.data || []);
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calcular resumo
    useEffect(() => {
        let caixaTotal = 0, caixaCount = 0;
        let aReceberTotal = 0, aReceberCount = 0;
        let taxasTotal = 0, taxasCount = 0;
        const porMetodo: Record<string, number> = {};
        const porCategoria: Record<string, number> = {};

        payments.forEach(payment => {
            const isConvenio = payment.billingType === 'convenio' || payment.paymentMethod === 'convenio';
            const valor = payment.insurance?.grossAmount || payment.sessionValue || payment.amount || 0;
            
            const metodo = payment.paymentMethod || 'outro';
            porMetodo[metodo] = (porMetodo[metodo] || 0) + valor;

            if (isConvenio) {
                aReceberTotal += valor;
                aReceberCount++;
            } else {
                caixaTotal += valor;
                caixaCount++;
                
                if (isCardPayment(payment.paymentMethod)) {
                    const taxaEstimada = valor * 0.02;
                    taxasTotal += taxaEstimada;
                    taxasCount++;
                }
            }
        });

        expenses.forEach((expense: any) => {
            if (expense.status !== 'canceled') {
                const cat = expense.category || 'other';
                porCategoria[cat] = (porCategoria[cat] || 0) + expense.amount;
            }
        });

        const despesasTotal = Object.values(porCategoria).reduce((a, b) => a + b, 0);
        const totalReceitas = caixaTotal + aReceberTotal;
        const lucroCaixa = caixaTotal - despesasTotal - taxasTotal;
        const lucroTotal = totalReceitas - despesasTotal - taxasTotal;
        const margemLucro = totalReceitas > 0 ? (lucroTotal / totalReceitas) * 100 : 0;

        setSummary({
            receitas: {
                total: totalReceitas,
                caixa: { total: caixaTotal, count: caixaCount },
                aReceber: { total: aReceberTotal, count: aReceberCount },
                porMetodo
            },
            despesas: {
                total: despesasTotal,
                count: expenses.filter((e: any) => e.status !== 'canceled').length,
                porCategoria
            },
            lucroCaixa,
            lucroTotal,
            taxasCartao: { total: taxasTotal, count: taxasCount },
            margemLucro
        });
    }, [payments, expenses]);

    useEffect(() => {
        fetchData();
        fetchExpenses(filters);
    }, [filters]);

    if (loading || !summary) {
        return (
            <Box sx={{ p: { xs: 2, md: 4 } }}>
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 3, color: 'primary.main' }}>
                    📈 Extrato Financeiro
                </Typography>
                <FinancialLoading cardCount={6} gridSize={{ xs: 12, sm: 6, md: 4 }} />
            </Box>
        );
    }

    const statusPositivo = summary.lucroTotal >= 0;

    return (
        <Box>
            {/* HEADER COM FILTRO */}
            <Paper sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3 }, borderRadius: 3, boxShadow: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: { xs: 'flex-start', md: 'space-between' }, alignItems: { xs: 'stretch', md: 'center' }, gap: 2 }}>
                    <Box>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                            📊 Entradas e Saídas
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Fluxo de caixa e projeções financeiras
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, alignItems: 'center', flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
                        <TextField
                            select
                            size="small"
                            sx={{ flex: { xs: 1, md: 'none' }, minWidth: { xs: 100, sm: 180 } }}
                            value={`${filters.month}-${filters.year}`}
                            onChange={(e) => {
                                const [m, y] = e.target.value.split('-').map(Number);
                                setFilters({ month: m, year: y });
                            }}
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <MenuItem key={i} value={`${i + 1}-${filters.year}`}>
                                    {format(new Date(filters.year, i), 'MMMM/yyyy', { locale: ptBR })}
                                </MenuItem>
                            ))}
                        </TextField>

                        <Chip 
                            icon={<Calendar size={16} />} 
                            label="Atualizado"
                            size="small"
                            variant="outlined"
                            color="success"
                        />

                        <Button
                            variant="contained"
                            startIcon={<Plus size={18} />}
                            onClick={() => { setEditingExpense(null); setModalOpen(true); }}
                            sx={{ borderRadius: 2, textTransform: 'none', flex: { xs: 1, md: 'none' } }}
                        >
                            Nova Despesa
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* CARDS PRINCIPAIS - CAIXA vs A RECEBER vs RESULTADO */}
            <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ width: '100%', mb: { xs: 3, sm: 4 } }}>
                {/* CARD CAIXA (REALIZADO) */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ width: "100%", 
                        height: '100%',
                        background: 'linear-gradient(135deg, #10B98115, #10B98105)',
                        border: '1px solid',
                        borderColor: '#10B98140',
                        borderRadius: 3,
                        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.1)'
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Avatar sx={{ bgcolor: '#10B981', width: 52, height: 52 }}>
                                    <LocalAtm size={28} color="white" />
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" fontWeight="500">
                                        CAIXA (Realizado)
                                    </Typography>
                                    <Typography variant="h4" fontWeight="700" color="#059669">
                                        {formatCurrencyCompact(summary.receitas.caixa.total)}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Pagamentos</Typography>
                                    <Typography variant="body1" fontWeight="600">{summary.receitas.caixa.count}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Convênios</Typography>
                                    <Typography variant="body1" fontWeight="600">{summary.receitas.aReceber.count}</Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                    <Typography variant="caption" color="text.secondary">Ticket Médio</Typography>
                                    <Typography variant="body1" fontWeight="600">
                                        {formatCurrencyCompact(summary.receitas.caixa.count > 0 ? summary.receitas.caixa.total / summary.receitas.caixa.count : 0)}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <ArrowUpward size={16} color="#10B981" />
                                <Typography variant="body2" color="success.main" fontWeight="500">
                                    Dinheiro na conta
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* CARD A RECEBER (FUTURO) */}
                <Grid item xs={12} sm={6} md={4}>
                    <Card sx={{ width: "100%", 
                        height: '100%',
                        background: 'linear-gradient(135deg, #0EA5E915, #0EA5E905)',
                        border: '1px solid',
                        borderColor: '#0EA5E940',
                        borderRadius: 3,
                        boxShadow: '0 4px 20px rgba(14, 165, 233, 0.1)'
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Avatar sx={{ bgcolor: '#0EA5E9', width: 52, height: 52 }}>
                                    <Schedule size={28} color="white" />
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" fontWeight="500">
                                        A RECEBER (Convênios)
                                    </Typography>
                                    <Typography variant="h4" fontWeight="700" color="#0284C7">
                                        {formatCurrencyCompact(summary.receitas.aReceber.total)}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                    Previsão de recebimento
                                </Typography>
                                <LinearProgress 
                                    variant="determinate" 
                                    value={65} 
                                    sx={{ height: 8, borderRadius: 4, bgcolor: '#0EA5E920' }}
                                />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                    <Typography variant="caption" color="text.secondary">30 dias</Typography>
                                    <Typography variant="caption" color="info.main" fontWeight="500">65% processado</Typography>
                                    <Typography variant="caption" color="text.secondary">90+ dias</Typography>
                                </Box>
                            </Box>

                            <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed', borderColor: '#0EA5E930' }}>
                                <Typography variant="body2" color="text.secondary">
                                    {summary.receitas.aReceber.count} atendimentos a faturar
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* CARD RESULTADO (LUCRO) */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ width: "100%", 
                        height: '100%',
                        background: statusPositivo 
                            ? 'linear-gradient(135deg, #8B5CF615, #8B5CF605)'
                            : 'linear-gradient(135deg, #EF444415, #EF444405)',
                        border: '1px solid',
                        borderColor: statusPositivo ? '#8B5CF640' : '#EF444640',
                        borderRadius: 3,
                        boxShadow: statusPositivo 
                            ? '0 4px 20px rgba(139, 92, 246, 0.1)'
                            : '0 4px 20px rgba(239, 68, 68, 0.1)'
                    }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Avatar sx={{ 
                                    bgcolor: statusPositivo ? '#8B5CF6' : '#EF4444', 
                                    width: 52, 
                                    height: 52 
                                }}>
                                    <AccountBalance size={28} color="white" />
                                </Avatar>
                                <Box>
                                    <Typography variant="body2" color="text.secondary" fontWeight="500">
                                        RESULTADO LÍQUIDO
                                    </Typography>
                                    <Typography variant="h4" fontWeight="700" color={statusPositivo ? '#7C3AED' : '#DC2626'}>
                                        {formatCurrencyCompact(summary.lucroTotal)}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Receitas</Typography>
                                    <Typography variant="body1" fontWeight="600" color="#10B981">
                                        {formatCurrencyCompact(summary.receitas.total)}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">Despesas</Typography>
                                    <Typography variant="body1" fontWeight="600" color="#EF4444">
                                        {formatCurrencyCompact(summary.despesas.total)}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip 
                                    size="small"
                                    label={statusPositivo ? '✓ Lucro' : '✗ Prejuízo'}
                                    color={statusPositivo ? 'success' : 'error'}
                                    sx={{ fontWeight: 600 }}
                                />
                                <Typography variant="body2" color="text.secondary">
                                    Margem: {summary.margemLucro.toFixed(1)}%
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* PROJEÇÃO vs META */}
            {meta && (
                <Card sx={{ width: "100%", mb: 4, borderRadius: 3, boxShadow: 2, overflow: 'visible' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            📊 PROJEÇÃO vs META
                        </Typography>
                        
                        {(() => {
                            const hoje = new Date();
                            const diasPassados = hoje.getDate();
                            const diasTotais = new Date(filters.year, filters.month, 0).getDate();
                            const diasRestantes = diasTotais - diasPassados;
                            const mediaDiaria = summary.receitas.caixa.total / (diasPassados || 1);
                            const projecaoFinal = mediaDiaria * diasTotais;
                            const metaEsperada = meta.targets?.expectedRevenue || 0;
                            const percentualMeta = metaEsperada > 0 ? (projecaoFinal / metaEsperada) * 100 : 0;
                            const valorRestante = metaEsperada - summary.receitas.caixa.total;
                            const valorDiarioNecessario = diasRestantes > 0 ? valorRestante / diasRestantes : 0;
                            
                            // Definir cor do status
                            let statusColor = '#EF4444'; // Vermelho
                            let statusBg = '#FEE2E2';
                            let statusIcon = '⚠️';
                            let statusText = 'Abaixo da meta';
                            
                            if (percentualMeta >= 100) {
                                statusColor = '#10B981'; // Verde
                                statusBg = '#D1FAE5';
                                statusIcon = '✅';
                                statusText = 'Meta atingida!';
                            } else if (percentualMeta >= 80) {
                                statusColor = '#F59E0B'; // Amarelo
                                statusBg = '#FEF3C7';
                                statusIcon = '⚡';
                                statusText = 'Próximo da meta';
                            }
                            
                            const diferenca = percentualMeta - 100;
                            
                            return (
                                <Grid container spacing={3} alignItems="center">
                                    <Grid item xs={12} md={6}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Meta do Mês:
                                                </Typography>
                                                <Typography variant="h6" fontWeight="600">
                                                    {formatCurrency(metaEsperada)}
                                                </Typography>
                                            </Box>
                                            
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Projeção Atual:
                                                </Typography>
                                                <Typography variant="h6" fontWeight="600" color={statusColor}>
                                                    {formatCurrency(projecaoFinal)}
                                                </Typography>
                                            </Box>
                                            
                                            <Box sx={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: 1,
                                                p: 1.5,
                                                borderRadius: 2,
                                                bgcolor: statusBg,
                                                width: 'fit-content'
                                            }}>
                                                <Typography variant="body1" fontWeight="600" sx={{ color: statusColor }}>
                                                    {statusIcon} Status: {statusText} ({diferenca > 0 ? '+' : ''}{diferenca.toFixed(1)}%)
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                    
                                    <Grid item xs={12} md={6}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                            {/* Barra de progresso */}
                                            <Box>
                                                <LinearProgress 
                                                    variant="determinate" 
                                                    value={Math.min(percentualMeta, 100)}
                                                    sx={{ 
                                                        height: 12, 
                                                        borderRadius: 6, 
                                                        bgcolor: '#E5E7EB',
                                                        '& .MuiLinearProgress-bar': {
                                                            bgcolor: statusColor,
                                                            borderRadius: 6,
                                                        }
                                                    }}
                                                />
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        0%
                                                    </Typography>
                                                    <Typography variant="caption" fontWeight="600" sx={{ color: statusColor }}>
                                                        {percentualMeta.toFixed(1)}%
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        100%
                                                    </Typography>
                                                </Box>
                                            </Box>
                                            
                                            {/* Dicas */}
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                                                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    💡 Com este ritmo, você atingirá <strong>{formatCurrency(projecaoFinal)}</strong>
                                                </Typography>
                                                
                                                {diasRestantes > 0 && percentualMeta < 100 && (
                                                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        📈 Faltam <strong>{diasRestantes} dias</strong>. 
                                                        Precisa faturar <strong>{formatCurrency(valorDiarioNecessario)}/dia</strong> para bater a meta
                                                    </Typography>
                                                )}
                                                
                                                {diasRestantes > 0 && percentualMeta >= 100 && (
                                                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#10B981' }}>
                                                        🎉 Parabéns! No ritmo atual, você superará a meta em <strong>{formatCurrency(projecaoFinal - metaEsperada)}</strong>
                                                    </Typography>
                                                )}
                                                
                                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                                    📅 Dia {diasPassados} de {diasTotais} ({((diasPassados/diasTotais)*100).toFixed(0)}% do mês)
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Grid>
                                </Grid>
                            );
                        })()}
                    </CardContent>
                </Card>
            )}

            {/* GRÁFICO DE FLUXO */}
            <Paper sx={{ p: 3, mb: 4, borderRadius: 3, boxShadow: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" fontWeight="600">
                        📈 Histórico de Fluxo (últimos 6 meses)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 12, height: 12, bgcolor: '#10B981', borderRadius: 1 }} />
                            <Typography variant="caption">Caixa</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 12, height: 12, bgcolor: '#0EA5E9', borderRadius: 1 }} />
                            <Typography variant="caption">A Receber</Typography>
                        </Box>
                    </Box>
                </Box>

                <Box sx={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={historico.length > 0 ? historico : [
                            { mes: 'Jan', caixa: summary.receitas.caixa.total * 0.9, aReceber: summary.receitas.aReceber.total * 0.8 },
                            { mes: 'Fev', caixa: summary.receitas.caixa.total * 0.95, aReceber: summary.receitas.aReceber.total * 0.9 },
                            { mes: 'Mar', caixa: summary.receitas.caixa.total, aReceber: summary.receitas.aReceber.total },
                        ]}>
                            <defs>
                                <linearGradient id="colorCaixa" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorAReceber" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="mes" axisLine={false} tickLine={false} />
                            <YAxis 
                                tickFormatter={(value) => `R$ ${value/1000}k`} 
                                axisLine={false} 
                                tickLine={false}
                            />
                            <RechartsTooltip 
                                formatter={(value: any) => formatCurrency(value)}
                                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="caixa" 
                                stroke="#10B981" 
                                strokeWidth={3}
                                fill="url(#colorCaixa)" 
                                name="Caixa"
                            />
                            <Area 
                                type="monotone" 
                                dataKey="aReceber" 
                                stroke="#0EA5E9" 
                                strokeWidth={3}
                                fill="url(#colorAReceber)" 
                                name="A Receber"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </Box>
            </Paper>

            {/* DISTRIBUIÇÃO E ÚLTIMAS TRANSAÇÕES */}
            <Grid container spacing={3}>
                {/* DISTRIBUIÇÃO POR CATEGORIA */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 3, height: '100%', boxShadow: 2 }}>
                        <Typography variant="h6" fontWeight="600" gutterBottom>
                            📊 Distribuição
                        </Typography>
                        
                        <Typography variant="subtitle2" color="success.main" gutterBottom sx={{ mt: 2 }}>
                            Entradas por forma
                        </Typography>
                        <List dense>
                            {Object.entries(summary.receitas.porMetodo)
                                .sort(([,a], [,b]) => (b as number) - (a as number))
                                .slice(0, 4)
                                .map(([metodo, valor]) => (
                                <ListItem key={metodo} sx={{ px: 0 }}>
                                    <ListItemText
                                        primary={getPaymentMethodLabel(metodo)}
                                        secondary={`${((valor as number) / summary.receitas.total * 100).toFixed(0)}%`}
                                    />
                                    <Typography fontWeight="500">{formatCurrencyCompact(valor as number)}</Typography>
                                </ListItem>
                            ))}
                        </List>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2" color="error.main" gutterBottom>
                            Saídas por categoria
                        </Typography>
                        <List dense>
                            {Object.keys(summary.despesas.porCategoria).length === 0 ? (
                                <Typography variant="body2" color="text.secondary">Nenhuma despesa</Typography>
                            ) : (
                                Object.entries(summary.despesas.porCategoria)
                                    .sort(([,a], [,b]) => (b as number) - (a as number))
                                    .slice(0, 3)
                                    .map(([cat, valor]) => (
                                    <ListItem key={cat} sx={{ px: 0 }}>
                                        <ListItemText
                                            primary={getCategoryLabel(cat)}
                                            secondary={`${((valor as number) / summary.despesas.total * 100).toFixed(0)}%`}
                                        />
                                        <Typography fontWeight="500" color="error.main">{formatCurrencyCompact(valor as number)}</Typography>
                                    </ListItem>
                                ))
                            )}
                        </List>
                    </Paper>
                </Grid>

                {/* ÚLTIMAS ENTRADAS */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 3, height: '100%', boxShadow: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" fontWeight="600" color="success.main">
                                💚 Últimas Entradas
                            </Typography>
                        </Box>

                        <TableContainer>
                            <Table size="small">
                                <TableBody>
                                    {payments.slice(0, 5).map((p) => (
                                        <TableRow key={p._id} hover>
                                            <TableCell width={40} sx={{ pl: 0 }}>
                                                <Avatar sx={{ width: 36, height: 36, bgcolor: '#10B98120' }}>
                                                    <AttachMoney size={18} color="#10B981" />
                                                </Avatar>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="500">
                                                    {p.patient?.fullName || p.patientName || 'Paciente'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {safeFormatDate(p.paymentDate || p.date)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight="600" color="#10B981">
                                                    +{formatCurrencyCompact(p.sessionValue || p.amount || 0)}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {payments.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3}>
                                                <Alert severity="info">Nenhuma entrada no período</Alert>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>

                {/* ÚLTIMAS SAÍDAS */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, borderRadius: 3, height: '100%', boxShadow: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" fontWeight="600" color="error.main">
                                ❤️‍🩹 Últimas Saídas
                            </Typography>
                        </Box>

                        <TableContainer>
                            <Table size="small">
                                <TableBody>
                                    {expenses.slice(0, 5).map((e: any) => (
                                        <TableRow key={e._id} hover>
                                            <TableCell width={40} sx={{ pl: 0 }}>
                                                <Avatar sx={{ width: 36, height: 36, bgcolor: '#EF444420' }}>
                                                    <Receipt size={18} color="#EF4444" />
                                                </Avatar>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="500">
                                                    {e.description}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {getCategoryLabel(e.category)} • {safeFormatDate(e.date)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight="600" color="#EF4444">
                                                    -{formatCurrencyCompact(e.amount)}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {expenses.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3}>
                                                <Alert severity="info">Nenhuma despesa no período</Alert>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>

            {/* BOTÃO VER MAIS DETALHES */}
            <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Button
                    variant="outlined"
                    onClick={() => setShowDetails(!showDetails)}
                    endIcon={showDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    size="large"
                    sx={{ borderRadius: 3, px: 4 }}
                >
                    {showDetails ? 'Ocultar detalhes completos' : 'Ver detalhes completos'}
                </Button>
            </Box>

            {/* SEÇÃO EXPANSÍVEL */}
            {showDetails && (
                <Paper sx={{ p: 4, mt: 3, borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Detalhamento Completo
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Use as sub-abas acima para ver mais detalhes
                    </Typography>
                </Paper>
            )}

            {/* MODAL DE DESPESA */}
            <ExpenseModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditingExpense(null); }}
                expense={editingExpense}
                onSaved={() => { fetchExpenses(filters); setModalOpen(false); setEditingExpense(null); }}
            />
        </Box>
    );
};

export default EntradasSaidasTab;
