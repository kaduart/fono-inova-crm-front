import { Box, Card, CardContent, Grid, MenuItem, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { CashflowSummary, cashflowService } from '../../services/cashflowService';

const CashflowTab = () => {
    const [summary, setSummary] = useState<CashflowSummary | null>(null);
    const [filters, setFilters] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });

    useEffect(() => {
        const load = async () => {
            const res = await cashflowService.getSummary({
                period: 'month',
                month: filters.month,
                year: filters.year,
            });
            setSummary(res.data);
        };
        load();
    }, [filters]);

    const formatCurrency = (value: number) =>
        `R$ ${value?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <Box>
            {/* Filtro rápido de mês/ano */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                <TextField
                    select
                    label="Mês"
                    size="small"
                    value={filters.month}
                    onChange={(e) => setFilters((prev) => ({ ...prev, month: Number(e.target.value) }))}
                >
                    {Array.from({ length: 12 }, (_, i) => (
                        <MenuItem key={i + 1} value={i + 1}>
                            {i + 1}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    select
                    label="Ano"
                    size="small"
                    value={filters.year}
                    onChange={(e) => setFilters((prev) => ({ ...prev, year: Number(e.target.value) }))}
                >
                    {[2023, 2024, 2025, 2026].map((y) => (
                        <MenuItem key={y} value={y}>
                            {y}
                        </MenuItem>
                    ))}
                </TextField>
            </Box>

            {/* Cards principais */}
            {summary && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography variant="body2" color="text.secondary">
                                    Receitas no período
                                </Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    {formatCurrency(summary?.data?.revenue?.total)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {summary?.data?.revenue?.count} pagamentos
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography variant="body2" color="text.secondary">
                                    Despesas no período
                                </Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    {formatCurrency(summary?.data?.expenses?.total)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {summary.data?.expenses?.count} despesas
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography variant="body2" color="text.secondary">
                                    Saldo
                                </Typography>
                                <Typography
                                    variant="h5"
                                    fontWeight="bold"
                                    color={summary.data?.balanceStatus === 'positive' ? 'success.main' : 'error.main'}
                                >
                                    {formatCurrency(summary.data?.balance)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {summary.data?.balanceStatus === 'positive' ? 'Positivo' : 'Negativo'}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
};

export default CashflowTab;
