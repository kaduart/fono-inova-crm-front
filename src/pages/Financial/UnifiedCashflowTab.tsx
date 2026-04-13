// UnifiedCashflowTab.tsx - Caixa e Fluxo de Caixa unificados
import { 
    Alert, Box, Card, CardContent, Chip, Grid, MenuItem, Paper, 
    Table, TableBody, TableCell, TableHead, TableRow, TextField, 
    Typography, Divider, Avatar, LinearProgress, Tabs, Tab, Badge,
    Tooltip, IconButton
} from '@mui/material';
import { FinancialLoading } from './components/FinancialLoading';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState, useMemo } from 'react';
import { cashflowService, CashflowV2Response } from '../../services/cashflowService';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';
import WarningIcon from '@mui/icons-material/Warning';
import PhoneIcon from '@mui/icons-material/Phone';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PieChartIcon from '@mui/icons-material/PieChart';

interface DayData {
    date: string;
    caixa: number;
    producao: number;
    atendimentos: number;
}

const UnifiedCashflowTab = () => {
    const [dailyCashflow, setDailyCashflow] = useState<CashflowV2Response | null>(null);
    const [monthData, setMonthData] = useState<DayData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Carrega dados do dia selecionado
    useEffect(() => {
        loadDayData();
    }, [selectedDate]);

    // Carrega dados do mês quando muda para visualização mensal
    useEffect(() => {
        if (viewMode === 'month') {
            loadMonthData();
        }
    }, [viewMode, selectedMonth, selectedYear]);

    const loadDayData = async () => {
        setLoading(true);
        try {
            const res = await cashflowService.getDailyCashflow(selectedDate);
            setDailyCashflow(res.data);
        } catch (error) {
            console.error('Erro ao carregar dados do dia:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMonthData = async () => {
        setLoading(true);
        try {
            // Busca dados de cada dia do mês para montar o fluxo
            const start = startOfMonth(new Date(selectedYear, selectedMonth - 1));
            const end = endOfMonth(new Date(selectedYear, selectedMonth - 1));
            const days = eachDayOfInterval({ start, end });
            
            const monthPromises = days.map(day => 
                cashflowService.getDailyCashflow(format(day, 'yyyy-MM-dd'))
                    .then(res => ({
                        date: format(day, 'yyyy-MM-dd'),
                        caixa: res.data.data.caixa.total,
                        producao: res.data.data.producao.total,
                        atendimentos: res.data.data.producao.quantidadeAtendimentos
                    }))
                    .catch(() => ({
                        date: format(day, 'yyyy-MM-dd'),
                        caixa: 0,
                        producao: 0,
                        atendimentos: 0
                    }))
            );
            
            const results = await Promise.all(monthPromises);
            setMonthData(results);
        } catch (error) {
            console.error('Erro ao carregar dados do mês:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) =>
        `R$ ${value?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const data = dailyCashflow?.data;

    // Cálculos para o mês
    const monthTotals = useMemo(() => {
        const totalCaixa = monthData.reduce((sum, d) => sum + d.caixa, 0);
        const totalProducao = monthData.reduce((sum, d) => sum + d.producao, 0);
        const totalAtendimentos = monthData.reduce((sum, d) => sum + d.atendimentos, 0);
        const diasComMovimento = monthData.filter(d => d.caixa > 0).length;
        const mediaDiaria = diasComMovimento > 0 ? totalCaixa / diasComMovimento : 0;
        return { totalCaixa, totalProducao, totalAtendimentos, diasComMovimento, mediaDiaria };
    }, [monthData]);

    // Agrupar dados do mês por semana para visualização
    const weeksData = useMemo(() => {
        const weeks: { week: number; caixa: number; producao: number; dias: number }[] = [];
        let currentWeek = 1;
        let weekCaixa = 0;
        let weekProducao = 0;
        let weekDays = 0;
        
        monthData.forEach((day, index) => {
            weekCaixa += day.caixa;
            weekProducao += day.producao;
            weekDays++;
            
            if ((index + 1) % 7 === 0 || index === monthData.length - 1) {
                weeks.push({
                    week: currentWeek,
                    caixa: weekCaixa,
                    producao: weekProducao,
                    dias: weekDays
                });
                currentWeek++;
                weekCaixa = 0;
                weekProducao = 0;
                weekDays = 0;
            }
        });
        return weeks;
    }, [monthData]);

    return (
        <Box>
            {/* Header com Filtros */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Toggle Dia/Mês */}
                        <TextField
                            select
                            label="Visualizar"
                            size="small"
                            value={viewMode}
                            onChange={(e) => setViewMode(e.target.value as 'day' | 'month')}
                            sx={{ minWidth: 120 }}
                        >
                            <MenuItem value="day">📅 Dia</MenuItem>
                            <MenuItem value="month">📊 Mês</MenuItem>
                        </TextField>

                        {viewMode === 'day' ? (
                            <TextField
                                type="date"
                                label="Data"
                                size="small"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        ) : (
                            <>
                                <TextField
                                    select
                                    label="Mês"
                                    size="small"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                    sx={{ minWidth: 100 }}
                                >
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <MenuItem key={i + 1} value={i + 1}>
                                            {format(new Date(2024, i), 'MMMM', { locale: ptBR })}
                                        </MenuItem>
                                    ))}
                                </TextField>
                                <TextField
                                    select
                                    label="Ano"
                                    size="small"
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    sx={{ minWidth: 80 }}
                                >
                                    {[2024, 2025, 2026].map((y) => (
                                        <MenuItem key={y} value={y}>{y}</MenuItem>
                                    ))}
                                </TextField>
                            </>
                        )}
                    </Box>

                    <Chip 
                        icon={<CalendarTodayIcon />} 
                        label={viewMode === 'day' 
                            ? format(new Date(selectedDate), "dd 'de' MMMM", { locale: ptBR })
                            : `${format(new Date(selectedYear, selectedMonth - 1), 'MMMM/yyyy', { locale: ptBR })}`
                        }
                        color="primary"
                        variant="outlined"
                    />
                </Box>
            </Paper>

            {loading ? (
                <FinancialLoading cardCount={4} />
            ) : viewMode === 'day' && data ? (
                // ===== VISUALIZAÇÃO DIÁRIA =====
                <Box>
                    {/* Cards Principais - Caixa e Produção */}
                    <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ mb: 3 }}>
                        {/* Caixa Total */}
                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: '#16A34A30', borderRadius: 2, bgcolor: '#16A34A08', height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <AttachMoneyIcon sx={{ color: '#16A34A' }} />
                                        <Typography variant="body2" color="text.secondary">
                                            Caixa do Dia
                                        </Typography>
                                    </Box>
                                    <Typography variant="h4" fontWeight="bold" color="#16A34A">
                                        {formatCurrency(data.caixa.total)}
                                    </Typography>
                                    <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                        {data.caixa.pix > 0 && (
                                            <Chip size="small" label={`Pix: ${formatCurrency(data.caixa.pix)}`} sx={{ bgcolor: '#16A34A20', color: '#16A34A' }} />
                                        )}
                                        {data.caixa.cartao > 0 && (
                                            <Chip size="small" label={`Card: ${formatCurrency(data.caixa.cartao)}`} sx={{ bgcolor: '#3B82F620', color: '#3B82F6' }} />
                                        )}
                                        {data.caixa.dinheiro > 0 && (
                                            <Chip size="small" label={`Din: ${formatCurrency(data.caixa.dinheiro)}`} sx={{ bgcolor: '#F59E0B20', color: '#F59E0B' }} />
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Produção */}
                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: '#3B82F630', borderRadius: 2, bgcolor: '#3B82F608', height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <ShowChartIcon sx={{ color: '#3B82F6' }} />
                                        <Typography variant="body2" color="text.secondary">
                                            Produção Total
                                        </Typography>
                                    </Box>
                                    <Typography variant="h4" fontWeight="bold" color="#3B82F6">
                                        {formatCurrency(data.producao.total)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {data.producao.quantidadeAtendimentos} atendimentos • Ticket: {formatCurrency(data.producao.ticketMedio)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* A Receber */}
                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: '#F59E0B30', borderRadius: 2, bgcolor: '#F59E0B08', height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <WarningIcon sx={{ color: '#F59E0B' }} />
                                        <Typography variant="body2" color="text.secondary">
                                            A Receber
                                        </Typography>
                                    </Box>
                                    <Typography variant="h4" fontWeight="bold" color="#F59E0B">
                                        {formatCurrency(data.producao.aReceber)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Eficiência: {data.producao.taxaEficiencia}%
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Comparativo */}
                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ 
                                border: '1px solid', 
                                borderColor: data.comparativos.variacaoVsOntem >= 0 ? '#16A34A30' : '#DC262630', 
                                borderRadius: 2, 
                                bgcolor: data.comparativos.variacaoVsOntem >= 0 ? '#16A34A08' : '#DC262608',
                                height: '100%'
                            }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <TrendingUpIcon sx={{ color: data.comparativos.variacaoVsOntem >= 0 ? '#16A34A' : '#DC2626' }} />
                                        <Typography variant="body2" color="text.secondary">
                                            vs Ontem
                                        </Typography>
                                    </Box>
                                    <Typography variant="h4" fontWeight="bold" color={data.comparativos.variacaoVsOntem >= 0 ? '#16A34A' : '#DC2626'}>
                                        {data.comparativos.variacaoVsOntem >= 0 ? '+' : ''}{data.comparativos.variacaoVsOntem}%
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Ontem: {formatCurrency(data.comparativos.ontem)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Tabs de Detalhes */}
                    <Paper sx={{ mb: 2 }}>
                        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable">
                            <Tab label="Transações" icon={<ReceiptIcon fontSize="small" />} iconPosition="start" />
                            <Tab label={data.pendentesCobranca?.length > 0 ? `Pendentes (${data.pendentesCobranca.length})` : 'Pendentes'} icon={<WarningIcon fontSize="small" />} iconPosition="start" />
                            <Tab label="Pacotes" icon={<InventoryIcon fontSize="small" />} iconPosition="start" />
                            <Tab label="Convênios" icon={<ShowChartIcon fontSize="small" />} iconPosition="start" />
                            <Tab label="Especialidades" icon={<PieChartIcon fontSize="small" />} iconPosition="start" />
                        </Tabs>
                    </Paper>

                    {/* Tab 0: Transações */}
                    {activeTab === 0 && (
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>💳 Transações do Dia</Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Hora</TableCell>
                                        <TableCell>Paciente</TableCell>
                                        <TableCell>Serviço</TableCell>
                                        <TableCell>Método</TableCell>
                                        <TableCell>Tipo</TableCell>
                                        <TableCell align="right">Valor</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.transacoes?.map((t) => (
                                        <TableRow key={t.id}>
                                            <TableCell>{t.hora}</TableCell>
                                            <TableCell>{t.paciente}</TableCell>
                                            <TableCell>
                                                <Chip size="small" label={t.servico} variant="outlined" />
                                            </TableCell>
                                            <TableCell>{t.metodo}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    size="small" 
                                                    label={t.tipo}
                                                    color={t.tipo === 'Pacote' ? 'success' : t.tipo === 'Convênio' ? 'info' : 'default'}
                                                />
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', color: '#16A34A' }}>
                                                {formatCurrency(t.valor)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!data.transacoes?.length && (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center">Nenhuma transação hoje</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Paper>
                    )}

                    {/* Tab 1: Pendentes */}
                    {activeTab === 1 && (
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                ⚠️ Pendentes de Cobrança ({data.pendentesCobranca?.length || 0})
                            </Typography>
                            {data.pendentesCobranca?.length > 0 ? (
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Horário</TableCell>
                                            <TableCell>Paciente</TableCell>
                                            <TableCell>Tipo</TableCell>
                                            <TableCell>Profissional</TableCell>
                                            <TableCell align="right">Valor</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {data.pendentesCobranca.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell>{p.horario}</TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        {p.paciente}
                                                        {p.telefone !== '-' && (
                                                            <Chip 
                                                                size="small" 
                                                                icon={<PhoneIcon fontSize="small" />}
                                                                label={p.telefone}
                                                                variant="outlined"
                                                                onClick={() => window.open(`https://wa.me/55${p.telefone?.replace(/\D/g, '')}`, '_blank')}
                                                                sx={{ cursor: 'pointer' }}
                                                            />
                                                        )}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        size="small" 
                                                        label={p.tipo}
                                                        color={p.tipo === 'Pacote' ? 'success' : p.tipo === 'Convênio' ? 'info' : 'warning'}
                                                    />
                                                </TableCell>
                                                <TableCell>{p.professional}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold', color: '#F59E0B' }}>
                                                    {formatCurrency(p.valor)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <Alert severity="success">🎉 Nenhum pagamento pendente hoje!</Alert>
                            )}
                        </Paper>
                    )}

                    {/* Tab 2: Pacotes */}
                    {activeTab === 2 && (
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                📦 Pacotes Atendidos ({data.pacotesAtendidos?.length || 0})
                            </Typography>
                            {data.pacotesAtendidos?.length > 0 ? (
                                <Grid container spacing={2}>
                                    {data.pacotesAtendidos.map((p) => (
                                        <Grid item xs={12} sm={6} md={4} key={p.id}>
                                            <Card variant="outlined">
                                                <CardContent>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                        <Typography variant="subtitle2" fontWeight="bold">
                                                            {p.paciente}
                                                        </Typography>
                                                        <Chip 
                                                            size="small" 
                                                            label={p.statusPagamento}
                                                            color={p.statusPagamento === 'Pago' ? 'success' : 'warning'}
                                                        />
                                                    </Box>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {p.especialidade} • {p.professional}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Horário: {p.horario}
                                                    </Typography>
                                                    <Typography variant="h6" color="success.main" sx={{ mt: 1 }}>
                                                        {formatCurrency(p.valor)}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : (
                                <Alert severity="info">Nenhum pacote atendido hoje</Alert>
                            )}
                        </Paper>
                    )}

                    {/* Tab 3: Convênios */}
                    {activeTab === 3 && (
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>
                                🏥 Convênios Atendidos ({data.conveniosAtendidos?.length || 0})
                            </Typography>
                            {data.conveniosAtendidos?.length > 0 ? (
                                <Grid container spacing={2}>
                                    {data.conveniosAtendidos.map((c) => (
                                        <Grid item xs={12} sm={6} md={4} key={c.id}>
                                            <Card variant="outlined">
                                                <CardContent>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                        <Typography variant="subtitle2" fontWeight="bold">
                                                            {c.paciente}
                                                        </Typography>
                                                        <Chip size="small" label={c.convenio} color="info" />
                                                    </Box>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {c.especialidade} • {c.professional}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Horário: {c.horario}
                                                    </Typography>
                                                    <Typography variant="h6" color="info.main" sx={{ mt: 1 }}>
                                                        {formatCurrency(c.valor)}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : (
                                <Alert severity="info">Nenhum convênio atendido hoje</Alert>
                            )}
                        </Paper>
                    )}

                    {/* Tab 4: Por Especialidade */}
                    {activeTab === 4 && (
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>🏥 Produção por Especialidade</Typography>
                            <Grid container spacing={2}>
                                {data.producao.porEspecialidade?.map((esp) => (
                                    <Grid item xs={12} sm={6} md={4} key={esp.nome}>
                                        <Card variant="outlined">
                                            <CardContent>
                                                <Typography variant="subtitle1" fontWeight="bold">{esp.nome}</Typography>
                                                <Typography variant="h5" color="primary">{formatCurrency(esp.total)}</Typography>
                                                <Box sx={{ mt: 1 }}>
                                                    <Typography variant="caption" display="block">
                                                        {esp.quantidade} atendimentos • Ticket: {formatCurrency(Number(esp.ticketMedio))}
                                                    </Typography>
                                                    <LinearProgress 
                                                        variant="determinate" 
                                                        value={(esp.recebido / esp.total) * 100} 
                                                        sx={{ mt: 1 }}
                                                    />
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                                        <Typography variant="caption" color="success.main">
                                                            {formatCurrency(esp.recebido)} recebido
                                                        </Typography>
                                                        <Typography variant="caption" color="warning.main">
                                                            {formatCurrency(esp.pendente)} pendente
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>
                    )}
                </Box>
            ) : viewMode === 'month' ? (
                // ===== VISUALIZAÇÃO MENSAL =====
                <Box>
                    {/* Cards Resumo do Mês */}
                    <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: '#16A34A30', borderRadius: 2, bgcolor: '#16A34A08' }}>
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">Total em Caixa</Typography>
                                    <Typography variant="h4" fontWeight="bold" color="#16A34A">
                                        {formatCurrency(monthTotals.totalCaixa)}
                                    </Typography>
                                    <Typography variant="caption">
                                        {monthTotals.diasComMovimento} dias com movimento
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: '#3B82F630', borderRadius: 2, bgcolor: '#3B82F608' }}>
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">Produção Total</Typography>
                                    <Typography variant="h4" fontWeight="bold" color="#3B82F6">
                                        {formatCurrency(monthTotals.totalProducao)}
                                    </Typography>
                                    <Typography variant="caption">
                                        {monthTotals.totalAtendimentos} atendimentos
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: '#F59E0B30', borderRadius: 2, bgcolor: '#F59E0B08' }}>
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">Média Diária</Typography>
                                    <Typography variant="h4" fontWeight="bold" color="#F59E0B">
                                        {formatCurrency(monthTotals.mediaDiaria)}
                                    </Typography>
                                    <Typography variant="caption">
                                        Projeção: {formatCurrency(monthTotals.mediaDiaria * 30)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: '#7C3AED30', borderRadius: 2, bgcolor: '#7C3AED08' }}>
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">Ticket Médio</Typography>
                                    <Typography variant="h4" fontWeight="bold" color="#7C3AED">
                                        {formatCurrency(monthTotals.totalAtendimentos > 0 ? monthTotals.totalProducao / monthTotals.totalAtendimentos : 0)}
                                    </Typography>
                                    <Typography variant="caption">
                                        por atendimento
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Tabela de Dias */}
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>📅 Fluxo Diário do Mês</Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Data</TableCell>
                                    <TableCell align="right">Caixa</TableCell>
                                    <TableCell align="right">Produção</TableCell>
                                    <TableCell align="right">Atendimentos</TableCell>
                                    <TableCell align="right">Eficiência</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {monthData.filter(d => d.caixa > 0 || d.producao > 0).map((day) => (
                                    <TableRow key={day.date} hover>
                                        <TableCell>
                                            {format(new Date(day.date), 'dd/MM/yyyy')}
                                        </TableCell>
                                        <TableCell align="right" sx={{ color: '#16A34A', fontWeight: 'bold' }}>
                                            {formatCurrency(day.caixa)}
                                        </TableCell>
                                        <TableCell align="right" sx={{ color: '#3B82F6' }}>
                                            {formatCurrency(day.producao)}
                                        </TableCell>
                                        <TableCell align="right">{day.atendimentos}</TableCell>
                                        <TableCell align="right">
                                            {day.producao > 0 ? ((day.caixa / day.producao) * 100).toFixed(1) : 0}%
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {!monthData.some(d => d.caixa > 0 || d.producao > 0) && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            Nenhum movimento neste mês
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Paper>
                </Box>
            ) : (
                <FinancialLoading cardCount={4} />
            )}
        </Box>
    );
};

export default UnifiedCashflowTab;
