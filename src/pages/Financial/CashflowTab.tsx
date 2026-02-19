import { Alert, Box, Card, CardContent, Chip, Grid, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography, Divider, Avatar } from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { CashflowSummary, cashflowService } from '../../services/cashflowService';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';

const CashflowTab = () => {
    const [summary, setSummary] = useState<CashflowSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        period: 'month', // mudar pra month como padrão já que temos dados do mês
        date: new Date().toISOString().split('T')[0],
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
    });

    useEffect(() => {
        loadData();
    }, [filters]);

    const loadData = async () => {
        setLoading(true);
        try {
            const params = filters.period === 'day'
                ? { period: 'day', date: filters.date }
                : { period: 'month', month: filters.month, year: filters.year };

            const res = await cashflowService.getSummary(params);
            setSummary(res.data);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            setSummary(null);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) =>
        `R$ ${value?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Agrupar agendamentos por paciente para evitar repetição
    const agendamentosAgrupados = summary?.data?.atividade?.agendamentosCriados?.itens?.reduce((acc: any, item: any) => {
        const key = item.paciente;
        if (!acc[key]) {
            acc[key] = {
                paciente: item.paciente,
                especialidade: item.especialidade,
                agendamentos: [],
                total: 0
            };
        }
        acc[key].agendamentos.push({
            data: item.dataAgendada,
            hora: item.hora,
            valor: item.valor
        });
        acc[key].total += item.valor;
        return acc;
    }, {}) || {};

    const agendamentosResumidos = Object.values(agendamentosAgrupados);

    return (
        <Box>
            {/* Filtro de período - mais clean */}
            <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                        select
                        label="Período"
                        size="small"
                        value={filters.period}
                        onChange={(e) => setFilters((prev) => ({ ...prev, period: e.target.value }))}
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value="day">Hoje</MenuItem>
                        <MenuItem value="month">Este mês</MenuItem>
                    </TextField>

                    {filters.period === 'day' ? (
                        <TextField
                            type="date"
                            label="Data"
                            size="small"
                            value={filters.date}
                            onChange={(e) => setFilters((prev) => ({ ...prev, date: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                        />
                    ) : (
                        <>
                            <TextField
                                select
                                label="Mês"
                                size="small"
                                value={filters.month}
                                onChange={(e) => setFilters((prev) => ({ ...prev, month: Number(e.target.value) }))}
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
                                value={filters.year}
                                onChange={(e) => setFilters((prev) => ({ ...prev, year: Number(e.target.value) }))}
                                sx={{ minWidth: 100 }}
                            >
                                {[2024, 2025, 2026].map((y) => (
                                    <MenuItem key={y} value={y}>{y}</MenuItem>
                                ))}
                            </TextField>
                        </>
                    )}

                    <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                            size="small" 
                            icon={<CalendarTodayIcon />} 
                            label={summary?.period?.label || 'Carregando...'}
                            variant="outlined"
                        />
                    </Box>
                </Box>
            </Paper>

            {summary && (
                <>
                    {/* Cards Financeiros - Redesenhados com dados reais da API */}
                    <Grid container spacing={2.5} sx={{ mb: 4 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: '#16A34A20', borderRadius: 2, bgcolor: '#16A34A05' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Avatar sx={{ bgcolor: '#16A34A', width: 40, height: 40 }}>
                                            <AttachMoneyIcon />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                Receitas
                                            </Typography>
                                            <Typography variant="h5" fontWeight="bold" color="#16A34A">
                                                {formatCurrency(summary?.financeiro?.receitas?.total || 0)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {summary?.financeiro?.receitas?.count || 0} pagamentos
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {Object.entries(summary?.financeiro?.receitas?.porMetodo || {})
                                                .filter(([_, v]) => v > 0)
                                                .map(([metodo]) => metodo)
                                                .join(' • ')}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: '#DC262620', borderRadius: 2, bgcolor: '#DC262605' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Avatar sx={{ bgcolor: '#DC2626', width: 40, height: 40 }}>
                                            <ReceiptIcon />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                Despesas
                                            </Typography>
                                            <Typography variant="h5" fontWeight="bold" color="#DC2626">
                                                {formatCurrency(summary?.financeiro?.despesas?.total || 0)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {summary?.financeiro?.despesas?.count || 0} despesas
                                        </Typography>
                                        {summary?.financeiro?.despesas?.total === 0 && (
                                            <Chip size="small" label="Sem despesas" color="success" variant="outlined" />
                                        )}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ 
                                border: '1px solid', 
                                borderColor: summary?.financeiro?.status === 'positive' ? '#16A34A30' : '#DC262630', 
                                borderRadius: 2,
                                bgcolor: summary?.financeiro?.status === 'positive' ? '#16A34A05' : '#DC262605'
                            }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Avatar sx={{ bgcolor: summary?.financeiro?.status === 'positive' ? '#16A34A' : '#DC2626', width: 40, height: 40 }}>
                                            <TrendingUpIcon />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                Saldo
                                            </Typography>
                                            <Typography variant="h5" fontWeight="bold" color={summary?.financeiro?.status === 'positive' ? '#16A34A' : '#DC2626'}>
                                                {formatCurrency(summary?.financeiro?.saldo || 0)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                        <Chip
                                            size="small"
                                            label={summary?.financeiro?.status === 'positive' ? 'Positivo' : 'Negativo'}
                                            color={summary?.financeiro?.status === 'positive' ? 'success' : 'error'}
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                            {summary?.operacional?.atendimentosRealizados || 0} atendimentos
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Card elevation={0} sx={{ border: '1px solid', borderColor: '#7C3AED20', borderRadius: 2, bgcolor: '#7C3AED05' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Avatar sx={{ bgcolor: '#7C3AED', width: 40, height: 40 }}>
                                            <InventoryIcon />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                Indicadores
                                            </Typography>
                                            <Typography variant="h6" fontWeight="bold" color="#7C3AED">
                                                {formatCurrency(summary?.indicadores?.ticketMedio || 0)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                        <Typography variant="caption" color="text.secondary">
                                            Ticket médio
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {summary?.operacional?.conversao || 0}% conversão
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* Seção de Atividade do Período - Mais limpa e organizada */}
                    <Grid container spacing={3}>
                        {/* Agendamentos Criados */}
                        <Grid item xs={12} md={6}>
                            <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Avatar sx={{ bgcolor: '#0284C7', width: 32, height: 32 }}>
                                            <CalendarTodayIcon sx={{ fontSize: 18 }} />
                                        </Avatar>
                                        <Typography variant="h6" fontWeight="600">
                                            Agendamentos
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={`${summary?.operacional?.agendamentosCriados?.count || 0} novos`}
                                        color="primary"
                                        size="small"
                                    />
                                </Box>

                                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">Valor potencial</Typography>
                                        <Typography variant="h6" fontWeight="bold" color="#0284C7">
                                            {formatCurrency(summary?.operacional?.agendamentosCriados?.valorPotencial || 0)}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">Pacientes</Typography>
                                        <Typography variant="h6" fontWeight="bold">
                                            {Object.keys(agendamentosAgrupados).length}
                                        </Typography>
                                    </Box>
                                </Box>

                                {agendamentosResumidos.length > 0 ? (
                                    <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                                        {agendamentosResumidos.map((grupo: any, idx: number) => (
                                            <Box key={idx} sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="body2" fontWeight="600">
                                                        {grupo.paciente}
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="600" color="#0284C7">
                                                        {formatCurrency(grupo.total)}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                                    {grupo.especialidade} • {grupo.agendamentos.length} sessões
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                                    {grupo.agendamentos.map((ag: any, i: number) => (
                                                        <Chip
                                                            key={i}
                                                            size="small"
                                                            label={`${format(new Date(ag.data), 'dd/MM')} ${ag.hora}`}
                                                            variant="outlined"
                                                        />
                                                    ))}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                ) : (
                                    <Alert severity="info" sx={{ mt: 1 }}>
                                        Nenhum agendamento criado neste período
                                    </Alert>
                                )}
                            </Paper>
                        </Grid>

                        {/* Pacotes Criados */}
                        <Grid item xs={12} md={6}>
                            <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Avatar sx={{ bgcolor: '#16A34A', width: 32, height: 32 }}>
                                            <InventoryIcon sx={{ fontSize: 18 }} />
                                        </Avatar>
                                        <Typography variant="h6" fontWeight="600">
                                            Pacotes
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={`${summary?.operacional?.pacotesCriados?.count || 0} novos`}
                                        color="success"
                                        size="small"
                                    />
                                </Box>

                                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">Valor total</Typography>
                                        <Typography variant="h6" fontWeight="bold" color="#16A34A">
                                            {formatCurrency(summary?.operacional?.pacotesCriados?.valorTotal || 0)}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">Valor médio</Typography>
                                        <Typography variant="h6" fontWeight="bold">
                                            {formatCurrency(summary?.indicadores?.valorMedioPacote || 0)}
                                        </Typography>
                                    </Box>
                                </Box>

                                {summary?.operacional?.pacotesCriados?.itens?.length > 0 ? (
                                    <Box>
                                        {summary?.operacional?.pacotesCriados?.itens?.map((item: any) => (
                                            <Box key={item.id} sx={{ p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 1, mb: 1 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="body2" fontWeight="600">
                                                        {item.paciente}
                                                    </Typography>
                                                    <Chip
                                                        size="small"
                                                        label={item.statusPagamento === 'paid' ? 'Pago' : 'Pendente'}
                                                        color={item.statusPagamento === 'paid' ? 'success' : 'warning'}
                                                    />
                                                </Box>
                                                <Typography variant="caption" color="text.secondary" display="block">
                                                    {item.especialidade} • {item.sessoes} sessões
                                                </Typography>
                                                <Typography variant="body2" fontWeight="bold" color="#16A34A" sx={{ mt: 1 }}>
                                                    {formatCurrency(item.valor)}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                ) : (
                                    <Alert severity="info" sx={{ mt: 1 }}>
                                        Nenhum pacote criado neste período
                                    </Alert>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Mini resumo no rodapé - opcional */}
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                            Atendimentos realizados: {summary?.operacional?.atendimentosRealizados || 0}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            • Eficiência: {summary?.indicadores?.eficiencia || 0}%
                        </Typography>
                    </Box>
                </>
            )}
        </Box>
    );
};

export default CashflowTab;