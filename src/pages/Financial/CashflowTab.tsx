import { Alert, Box, Card, CardContent, Chip, Grid, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { CashflowSummary, cashflowService } from '../../services/cashflowService';

const CashflowTab = () => {
    const [summary, setSummary] = useState<CashflowSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        period: 'day', // 'day' ou 'month'
        date: new Date().toISOString().split('T')[0], // Hoje como padrão
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

    return (
        <Box>
            {/* Filtro de período */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                        select
                        label="Visualizar por"
                        size="small"
                        value={filters.period}
                        onChange={(e) => setFilters((prev) => ({ ...prev, period: e.target.value }))}
                        sx={{ minWidth: 150 }}
                    >
                        <MenuItem value="day">Dia específico</MenuItem>
                        <MenuItem value="month">Mês completo</MenuItem>
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
                </Box>
            </Paper>

            {/* Cards Financeiros */}
            {summary && (
                <>
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">
                                        Receitas
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold" color="success.main">
                                        {formatCurrency(summary?.data?.revenue?.total || 0)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {summary?.data?.revenue?.count || 0} pagamentos
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <Card>
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">
                                        Despesas
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold" color="error.main">
                                        {formatCurrency(summary?.data?.expenses?.total || 0)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {summary?.data?.expenses?.count || 0} despesas
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <Card sx={{ bgcolor: summary?.data?.balanceStatus === 'positive' ? 'success.50' : 'error.50' }}>
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">
                                        Saldo do Período
                                    </Typography>
                                    <Typography
                                        variant="h5"
                                        fontWeight="bold"
                                        color={summary?.data?.balanceStatus === 'positive' ? 'success.main' : 'error.main'}
                                    >
                                        {formatCurrency(summary?.data?.balance || 0)}
                                    </Typography>
                                    <Chip
                                        size="small"
                                        label={summary?.data?.balanceStatus === 'positive' ? 'Positivo' : 'Negativo'}
                                        color={summary?.data?.balanceStatus === 'positive' ? 'success' : 'error'}
                                    />
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={3}>
                            <Card sx={{ bgcolor: 'primary.50' }}>
                                <CardContent>
                                    <Typography variant="body2" color="primary.main">
                                        Movimentação Total
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold" color="primary.main">
                                        {formatCurrency(summary?.data?.atividade?.movimentacaoTotal || 0)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Receitas + Potencial novo
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>

                    {/* NOVA SEÇÃO: Atividade do Período */}
                    {summary?.data?.atividade && (
                        <Grid container spacing={3}>
                            {/* Agendamentos Criados */}
                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="h6" fontWeight="bold">
                                            📅 Agendamentos Criados
                                        </Typography>
                                        <Chip
                                            label={`${summary?.data?.atividade?.agendamentosCriados?.count || 0} novos`}
                                            color="primary"
                                        />
                                    </Box>

                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Valor potencial: {formatCurrency(summary?.data?.atividade?.agendamentosCriados?.valorPotencial || 0)}
                                    </Typography>

                                    {summary?.data?.atividade?.agendamentosCriados?.itens?.length > 0 ? (
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Paciente</TableCell>
                                                    <TableCell>Data</TableCell>
                                                    <TableCell>Valor</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {summary?.data?.atividade?.agendamentosCriados?.itens?.map((item) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight="medium">
                                                                {item.paciente}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {item.especialidade}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            {format(new Date(item.dataAgendada), 'dd/MM')} {item.hora}
                                                        </TableCell>
                                                        <TableCell>{formatCurrency(item.valor)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <Alert severity="info" sx={{ mt: 1 }}>
                                            Nenhum agendamento criado neste período
                                        </Alert>
                                    )}
                                </Paper>
                            </Grid>

                            {/* Pacotes Criados */}
                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="h6" fontWeight="bold">
                                            📦 Pacotes Criados
                                        </Typography>
                                        <Chip
                                            label={`${summary?.data?.atividade?.pacotesCriados?.count || 0} novos`}
                                            color="success"
                                        />
                                    </Box>

                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Valor total: {formatCurrency(summary?.data?.atividade?.pacotesCriados?.valorPotencial || 0)}
                                    </Typography>

                                    {summary?.data?.atividade?.pacotesCriados?.itens?.length > 0 ? (
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Paciente</TableCell>
                                                    <TableCell>Sessões</TableCell>
                                                    <TableCell>Valor</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {summary?.data?.atividade?.pacotesCriados?.itens?.map((item) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight="medium">
                                                                {item.paciente}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {item.especialidade}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>{item.sessoes}</TableCell>
                                                        <TableCell>{formatCurrency(item.valor)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <Alert severity="info" sx={{ mt: 1 }}>
                                            Nenhum pacote criado neste período
                                        </Alert>
                                    )}
                                </Paper>
                            </Grid>
                        </Grid>
                    )}
                </>
            )}
        </Box>
    );
};

export default CashflowTab;