import {
    Add,
    AttachMoney,
    FilterList, TrendingUp,
    Visibility
} from '@mui/icons-material';
import {
    Box,
    Button,
    Card, CardContent,
    Chip,
    Grid,
    IconButton,
    Paper,
    Table, TableBody, TableCell, TableHead, TableRow,
    TextField,
    Typography
} from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { useSales } from '../../hooks/useSales';

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

interface SalesListProps {
    onNewSale: () => void;
    onViewSale: (id: string) => void;
}

const SalesList = ({ onNewSale, onViewSale }: SalesListProps) => {
    const { sales, loading, fetchSales } = useSales();
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchSales({ month: filterMonth, year: filterYear });
    }, [filterMonth, filterYear]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'realizado': return 'success';
            case 'confirmado': return 'info';
            case 'agendado': return 'warning';
            case 'cancelado': return 'error';
            default: return 'default';
        }
    };

    const totalFaturamento = sales.reduce((acc, sale) => acc + sale.valorLiquido, 0);
    const totalMargem = sales.reduce((acc, sale) => acc + (sale.margemContribuicao || 0), 0);
    const ticketMedio = sales.length > 0 ? totalFaturamento / sales.length : 0;

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight="bold">
                    Vendas e Contratos
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={onNewSale}
                >
                    Nova Venda
                </Button>
            </Box>

            {/* Cards Resumo */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <AttachMoney color="primary" />
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Faturamento</Typography>
                                    <Typography variant="h5" fontWeight="bold">
                                        {formatCurrency(totalFaturamento)}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <TrendingUp color="success" />
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Margem Total</Typography>
                                    <Typography variant="h5" fontWeight="bold" color="success.main">
                                        {formatCurrency(totalMargem)}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <FilterList color="info" />
                                <Box>
                                    <Typography variant="body2" color="text.secondary">Ticket Médio</Typography>
                                    <Typography variant="h5" fontWeight="bold">
                                        {formatCurrency(ticketMedio)}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filtros */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={2}>
                        <TextField
                            select
                            fullWidth
                            label="Mês"
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(Number(e.target.value))}
                            SelectProps={{ native: true }}
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {format(new Date(2024, i), 'MMMM', { locale: ptBR })}
                                </option>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <TextField
                            select
                            fullWidth
                            label="Ano"
                            value={filterYear}
                            onChange={(e) => setFilterYear(Number(e.target.value))}
                            SelectProps={{ native: true }}
                        >
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                        </TextField>
                    </Grid>
                    <Grid item xs={12} md={8} sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" color="text.secondary">
                            {sales.length} vendas encontradas
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>

            {/* Tabela */}
            <Paper>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell>Data</TableCell>
                            <TableCell>Cliente</TableCell>
                            <TableCell>Tipo</TableCell>
                            <TableCell>Profissional</TableCell>
                            <TableCell align="right">Valor</TableCell>
                            <TableCell align="right">Custos</TableCell>
                            <TableCell align="right">Margem</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sales.map((sale) => (
                            <TableRow key={sale._id} hover>
                                <TableCell>
                                    {format(new Date(sale.dataVenda), 'dd/MM/yyyy')}
                                </TableCell>
                                <TableCell>{sale.patient?.fullName}</TableCell>
                                <TableCell>
                                    <Chip
                                        size="small"
                                        label={sale.tipoVenda === 'pacote' ? 'Pacote' : 'Avulso'}
                                        color={sale.tipoVenda === 'pacote' ? 'primary' : 'default'}
                                    />
                                </TableCell>
                                <TableCell>{sale.doctor?.fullName}</TableCell>
                                <TableCell align="right" fontWeight="medium">
                                    {formatCurrency(sale.valorLiquido)}
                                </TableCell>
                                <TableCell align="right" color="error">
                                    {formatCurrency(sale.totalCustosVariaveis)}
                                </TableCell>
                                <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                    {formatCurrency(sale.margemContribuicao)}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        size="small"
                                        label={sale.status}
                                        color={getStatusColor(sale.status) as any}
                                    />
                                </TableCell>
                                <TableCell>
                                    <IconButton size="small" onClick={() => onViewSale(sale._id)}>
                                        <Visibility />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
};

export default SalesList;