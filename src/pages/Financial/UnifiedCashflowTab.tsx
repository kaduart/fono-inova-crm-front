// UnifiedCashflowTab.tsx - Caixa e Fluxo de Caixa unificados
import { 
    Alert, Box, Card, CardContent, Chip, Grid, MenuItem, Paper, Skeleton,
    Table, TableBody, TableCell, TableHead, TableRow, TextField,
    Typography, Divider, Avatar, LinearProgress, Tabs, Tab, Badge,
    Tooltip, IconButton, FormControl, InputLabel, Select
} from '@mui/material';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState, useMemo, useRef } from 'react';
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

const CashflowCardsSkeleton = () => (
    <Box sx={{ p: 2 }}>
        {/* 4 cards replicando estrutura real: ícone + label → valor → sub-info */}
        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ mb: 3 }}>
            {[
                { borderColor: '#16A34A30', bgcolor: '#16A34A08' },
                { borderColor: '#1D4ED830', bgcolor: '#1D4ED808' },
                { borderColor: '#D9770630', bgcolor: '#D9770608' },
                { borderColor: '#DC262630', bgcolor: '#DC262608' },
            ].map((colors, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                    <Box sx={{ border: '1px solid', borderColor: colors.borderColor, borderRadius: 2, bgcolor: colors.bgcolor, p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Skeleton variant="circular" width={24} height={24} />
                            <Skeleton variant="text" width="60%" height={20} />
                        </Box>
                        <Skeleton variant="text" width="70%" height={44} sx={{ mb: 0.5 }} />
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Skeleton variant="rounded" width={80} height={20} sx={{ borderRadius: 9 }} />
                            <Skeleton variant="rounded" width={64} height={20} sx={{ borderRadius: 9 }} />
                        </Box>
                    </Box>
                </Grid>
            ))}
        </Grid>
        {/* Sub-tabs: TRANSAÇÕES, PENDENTES, PACOTES, CONVÊNIOS, AGENDAMENTOS, ESPECIALIDADES */}
        <Box sx={{ display: 'flex', gap: 1, borderBottom: '1px solid #e5e7eb', pb: 1, mb: 2 }}>
            {[90, 82, 84, 86, 110, 112].map((w, i) => (
                <Skeleton key={i} variant="rounded" width={w} height={30} sx={{ borderRadius: 1 }} />
            ))}
        </Box>
        {/* Tabela */}
        <Skeleton variant="rounded" width="100%" height={40} sx={{ mb: 0.5, borderRadius: 1 }} />
        {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} variant="rounded" width="100%" height={52} sx={{ mb: 0.5, borderRadius: 1 }} />
        ))}
    </Box>
);

interface UnifiedCashflowTabProps {
    month: number;
    year: number;
}

const UnifiedCashflowTab = ({ month, year }: UnifiedCashflowTabProps) => {
    const [dailyCashflow, setDailyCashflow] = useState<CashflowV2Response | null>(null);
    const [monthData, setMonthData] = useState<DayData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [dayAppointments, setDayAppointments] = useState<any[]>([]);
    const [appointmentFilter, setAppointmentFilter] = useState<string>('all');
    const [loadingAppointments, setLoadingAppointments] = useState(false);

    const isFirstRender = useRef(true);

    // Carrega dados do dia selecionado
    useEffect(() => {
        const guard = { active: true };
        loadDayData(guard);
        loadDayAppointments(guard);
        return () => { guard.active = false; };
    }, [selectedDate]);

    // Recarrega agendamentos quando o usuário NAVEGA para a aba (não no mount inicial)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        if (activeTab === 4 && viewMode === 'day') {
            loadDayAppointments();
        }
    }, [activeTab]);

    // Carrega dados do mês quando muda para visualização mensal ou quando o filtro global muda
    useEffect(() => {
        if (viewMode === 'month') {
            loadMonthData();
        }
    }, [viewMode, month, year]);

    const loadDayData = async (guard = { active: true }) => {
        setLoading(true);
        try {
            const res = await cashflowService.getDailyCashflow(selectedDate);
            if (!guard.active) return;
            setDailyCashflow(res.data);
        } catch (error) {
            if (!guard.active) return;
            console.error('Erro ao carregar dados do dia:', error);
        } finally {
            if (guard.active) setLoading(false);
        }
    };

    const loadMonthData = async () => {
        setLoading(true);
        try {
            // 🚀 V2: Uma única chamada para o mês inteiro (substitui 30 requisições diárias)
            const monthStr = `${year}-${String(month).padStart(2, '0')}`;
            const res = await cashflowService.getMonthlyCashflow(monthStr);
            setMonthData(res.data.data);
        } catch (error) {
            console.error('Erro ao carregar dados do mês:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDayAppointments = async (guard = { active: true }) => {
        setLoadingAppointments(true);
        try {
            console.log('[UnifiedCashflowTab] Buscando agendamentos para:', selectedDate);
            const res = await cashflowService.getDayAppointments(selectedDate);
            if (!guard.active) return;
            console.log('[UnifiedCashflowTab] Resposta:', res.data);
            setDayAppointments(res.data?.data?.appointments || []);
        } catch (error: any) {
            if (!guard.active) return;
            console.error('[UnifiedCashflowTab] Erro ao carregar agendamentos:', error?.response?.data || error.message);
        } finally {
            if (guard.active) setLoadingAppointments(false);
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
                            <Typography variant="body1" fontWeight={500} color="text.primary">
                                {format(new Date(year, month - 1), 'MMMM/yyyy', { locale: ptBR })}
                            </Typography>
                        )}
                    </Box>

                    <Chip 
                        icon={<CalendarTodayIcon />} 
                        label={viewMode === 'day' 
                            ? format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })
                            : `${format(new Date(year, month - 1), 'MMMM/yyyy', { locale: ptBR })}`
                        }
                        color="primary"
                        variant="outlined"
                    />
                </Box>
            </Paper>

            {loading ? (
                <CashflowCardsSkeleton />
            ) : viewMode === 'day' && data ? (
                // ===== VISUALIZAÇÃO DIÁRIA =====
                <Box>
                    {/* Cards Principais - Caixa e Produção */}
                    <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ mb: 3 }}>
                        {/* Caixa Total */}
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: '#16A34A30', borderRadius: 2, bgcolor: '#16A34A08', height: '100%' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <AttachMoneyIcon sx={{ color: '#16A34A' }} />
                                        <Typography variant="body2" color="text.secondary">
                                            Caixa (Dinheiro Recebido)
                                        </Typography>
                                    </Box>
                                    <Typography variant="h4" fontWeight="bold" color="#16A34A">
                                        {formatCurrency(data.caixa.total)}
                                    </Typography>
                                    {/* Barra receita real vs diferida */}
                                    {data.receitaReal != null && data.receitaDiferida != null && data.caixa.total > 0 && (
                                        <Box sx={{ mt: 1.5 }}>
                                            <Box sx={{ display: 'flex', borderRadius: 1, overflow: 'hidden', height: 6, mb: 0.5 }}>
                                                <Box sx={{ width: `${(data.receitaReal / data.caixa.total) * 100}%`, bgcolor: '#16A34A' }} />
                                                <Box sx={{ flex: 1, bgcolor: '#F59E0B50' }} />
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="caption" color="#16A34A">
                                                    ✓ {formatCurrency(data.receitaReal)} realizados
                                                </Typography>
                                                <Typography variant="caption" color="#F59E0B">
                                                    ⏳ {formatCurrency(data.receitaDiferida)} a realizar
                                                </Typography>
                                            </Box>
                                        </Box>
                                    )}
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
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                            <Tab label={data.transacoes?.length > 0 ? `Transações (${data.transacoes.length})` : 'Transações'} icon={<ReceiptIcon fontSize="small" />} iconPosition="start" />
                            <Tab label={data.pendentesCobranca?.length > 0 ? `Pendentes (${data.pendentesCobranca.length})` : 'Pendentes'} icon={<WarningIcon fontSize="small" />} iconPosition="start" />
                            <Tab label={data.pacotesAtendidos?.length > 0 ? `Pacotes (${data.pacotesAtendidos.length})` : 'Pacotes'} icon={<InventoryIcon fontSize="small" />} iconPosition="start" />
                            <Tab label={data.conveniosAtendidos?.length > 0 ? `Convênios (${data.conveniosAtendidos.length})` : 'Convênios'} icon={<ShowChartIcon fontSize="small" />} iconPosition="start" />
                            <Tab label={dayAppointments.length > 0 ? `Agendamentos (${dayAppointments.length})` : 'Agendamentos'} icon={<CalendarTodayIcon fontSize="small" />} iconPosition="start" />
                            <Tab label={Object.keys(data.producao?.porEspecialidade || {}).length > 0 ? `Especialidades (${Object.keys(data.producao.porEspecialidade).length})` : 'Especialidades'} icon={<PieChartIcon fontSize="small" />} iconPosition="start" />
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
                                        <TableCell>Profissional</TableCell>
                                        <TableCell>Serviço</TableCell>
                                        <TableCell>Método</TableCell>
                                        <TableCell>Tipo</TableCell>
                                        <TableCell>Observação</TableCell>
                                        <TableCell align="right">Valor</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.transacoes?.map((t) => (
                                        <TableRow key={t.id}>
                                            <TableCell>
                                                <Tooltip title={`ID: ${t.id} | Status Agendamento: ${t.appointmentStatus || '-'}`}>
                                                    <span>{t.hora}</span>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>{t.paciente}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{t.profissional || '-'}</Typography>
                                                <Typography variant="caption" color="text.secondary">{t.especialidade || '-'}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip size="small" label={t.servico} variant="outlined" />
                                            </TableCell>
                                            <TableCell>{t.metodo}</TableCell>
                                            <TableCell>
                                                <Chip 
                                                    size="small" 
                                                    label={t.tipo}
                                                    color={
                                                        t.tipo === 'Pacote' ? 'success' : 
                                                        t.tipo === 'Convênio' ? 'warning' : 
                                                        t.tipo === 'Liminar' ? 'error' : 
                                                        'primary'
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title={t.observacao || '-'}>
                                                    <Typography variant="caption" sx={{ maxWidth: 150, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {t.observacao || '-'}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', color: '#16A34A' }}>
                                                {formatCurrency(t.valor)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!data.transacoes?.length && (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center">Nenhuma transação hoje</TableCell>
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
                                    {data.pacotesAtendidos.map((p) => {
                                        const isPrepaid = p.paymentModel === 'prepaid';
                                        return (
                                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p.id}>
                                            <Card variant="outlined" sx={{
                                                borderLeft: `4px solid`,
                                                borderLeftColor: isPrepaid ? 'info.main' : 'success.main',
                                            }}>
                                                <CardContent sx={{ pb: '12px !important' }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                                        <Typography variant="subtitle2" fontWeight="bold" sx={{ flex: 1, mr: 1, lineHeight: 1.3 }}>
                                                            {p.paciente}
                                                        </Typography>
                                                        <Chip
                                                            size="small"
                                                            label={isPrepaid ? 'Pré-pago' : 'Pago hoje'}
                                                            color={isPrepaid ? 'info' : 'success'}
                                                            variant={isPrepaid ? 'outlined' : 'filled'}
                                                        />
                                                    </Box>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {p.especialidade} • {p.horario}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
                                                        {p.professional}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                                                        <Typography variant="h6" fontWeight="bold"
                                                            color={isPrepaid ? 'text.secondary' : 'success.main'}>
                                                            {formatCurrency(p.valor)}
                                                        </Typography>
                                                        <Typography variant="caption" color={isPrepaid ? 'info.main' : 'success.dark'}>
                                                            {isPrepaid ? 'crédito consumido' : 'recebido hoje'}
                                                        </Typography>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                        );
                                    })}
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
                                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={c.id}>
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

                    {/* Tab 4: Agendamentos do Dia */}
                    {activeTab === 4 && (
                        <Paper sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                                <Typography variant="h6" gutterBottom>
                                    📅 Agendamentos do Dia ({dayAppointments.length})
                                </Typography>
                                <FormControl size="small" sx={{ minWidth: 140 }}>
                                    <InputLabel>Filtrar status</InputLabel>
                                    <Select
                                        value={appointmentFilter}
                                        label="Filtrar status"
                                        onChange={(e) => setAppointmentFilter(e.target.value)}
                                    >
                                        <MenuItem value="all">Todos</MenuItem>
                                        <MenuItem value="completed">✅ Atendidos</MenuItem>
                                        <MenuItem value="scheduled">📋 Agendados</MenuItem>
                                        <MenuItem value="confirmed">✔️ Confirmados</MenuItem>
                                        <MenuItem value="canceled">❌ Cancelados</MenuItem>
                                        <MenuItem value="pre_agendado">⏳ Pré-agendado</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>

                            {loadingAppointments ? (
                                <Alert severity="info">Carregando agendamentos...</Alert>
                            ) : dayAppointments.length === 0 ? (
                                <Alert severity="info">Nenhum agendamento encontrado para este dia.</Alert>
                            ) : (
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Data e Hora</TableCell>
                                            <TableCell>Paciente</TableCell>
                                            <TableCell>Profissional</TableCell>
                                            <TableCell>Especialidade</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Tipo</TableCell>
                                            <TableCell align="right">Valor</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {[...dayAppointments]
                                            .filter((a: any) => appointmentFilter === 'all' || a.operationalStatus === appointmentFilter)
                                            .sort((a: any, b: any) => {
                                                // Converte HH:mm para minutos desde meia-noite (ordenação numérica robusta)
                                                const toMinutes = (item: any) => {
                                                    const t = item.time || (item.date ? format(parseISO(item.date), 'HH:mm') : '00:00');
                                                    const [h, m] = t.split(':').map(Number);
                                                    return (h || 0) * 60 + (m || 0);
                                                };
                                                return toMinutes(a) - toMinutes(b);
                                            })
                                            .map((a: any) => {
                                                const statusColors: Record<string, any> = {
                                                    completed: { color: 'success', label: 'Atendido' },
                                                    scheduled: { color: 'primary', label: 'Agendado' },
                                                    confirmed: { color: 'info', label: 'Confirmado' },
                                                    canceled: { color: 'error', label: 'Cancelado' },
                                                    pre_agendado: { color: 'warning', label: 'Pré-agendado' }
                                                };
                                                const statusConfig = statusColors[a.operationalStatus] || { 
                                                    color: 'default', 
                                                    label: a.operationalStatus 
                                                };
                                                return (
                                                    <TableRow key={a._id} sx={{ opacity: a.operationalStatus === 'canceled' ? 0.6 : 1 }}>
                                                        <TableCell>{a.date ? format(parseISO(a.date), 'dd/MM') : '--/--'} {a.time || (a.date ? format(parseISO(a.date), 'HH:mm') : '--:--')}</TableCell>
                                                        <TableCell>{a.patientInfo?.fullName || a.patient?.fullName || '-'}</TableCell>
                                                        <TableCell>{a.professionalName || '-'}</TableCell>
                                                        <TableCell>{a.specialty || '-'}</TableCell>
                                                        <TableCell>
                                                            <Chip size="small" label={statusConfig.label} color={statusConfig.color as any} />
                                                        </TableCell>
                                                        <TableCell>
                                                            {(() => {
                                                                const serviceMap: Record<string, string> = {
                                                                    consultation: 'Consulta',
                                                                    evaluation: 'Avaliação',
                                                                    session: 'Sessão',
                                                                    individual_session: 'Sessão Individual',
                                                                    package_session: 'Sessão de Pacote',
                                                                    tongue_tie_test: 'Teste da Linguinha',
                                                                    neuropsych_evaluation: 'Avaliação Neuropsicológica',
                                                                    return: 'Retorno',
                                                                    meet: 'Meet',
                                                                    alignment: 'Alinhamento'
                                                                };
                                                                const tipoServico = serviceMap[a.serviceType] || a.serviceType || 'Sessão';
                                                                const cor = a.billingType === 'convenio' ? 'info' : a.package ? 'success' : 'default';
                                                                return (
                                                                    <Chip 
                                                                        size="small" 
                                                                        label={tipoServico} 
                                                                        variant="outlined"
                                                                        color={cor as any}
                                                                    />
                                                                );
                                                            })()}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                            {formatCurrency(a.sessionValue || a.package?.sessionValue || 0)}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                    </TableBody>
                                </Table>
                            )}

                            {/* Resumo por status */}
                            {dayAppointments.length > 0 && (
                                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {['completed', 'scheduled', 'confirmed', 'canceled', 'pre_agendado'].map((status) => {
                                        const count = dayAppointments.filter((a: any) => a.operationalStatus === status).length;
                                        if (count === 0) return null;
                                        const labels: Record<string, string> = {
                                            completed: 'Atendidos',
                                            scheduled: 'Agendados',
                                            confirmed: 'Confirmados',
                                            canceled: 'Cancelados',
                                            pre_agendado: 'Pré-agendados'
                                        };
                                        return (
                                            <Chip
                                                key={status}
                                                size="small"
                                                label={`${labels[status]}: ${count}`}
                                                color={status === 'completed' ? 'success' : status === 'canceled' ? 'error' : status === 'confirmed' ? 'info' : 'default'}
                                                variant="outlined"
                                            />
                                        );
                                    })}
                                </Box>
                            )}
                        </Paper>
                    )}

                    {/* Tab 5: Por Especialidade */}
                    {activeTab === 5 && (
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>🏥 Produção por Especialidade</Typography>
                            <Grid container spacing={2}>
                                {data.producao.porEspecialidade?.map((esp) => (
                                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={esp.nome}>
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
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
                                            {format(parseISO(day.date), 'dd/MM/yyyy')}
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
                <CashflowCardsSkeleton />
            )}
        </Box>
    );
};

export default UnifiedCashflowTab;
