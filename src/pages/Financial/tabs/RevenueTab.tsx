import { useMemo, useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Grid,
    Typography,
    Paper,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import {
    AttachMoney,
    TrendingUp,
    AccountBalance,
} from '@mui/icons-material';
import { useFinancialMetrics } from '../../../hooks/useFinancialMetrics';
import { FinancialLoading } from '../components/FinancialLoading';
import moment from 'moment-timezone';

const TIMEZONE = 'America/Sao_Paulo';

const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const RevenueTab: React.FC = () => {
    const [selectedMonth, setSelectedMonth] = useState<number>(moment().tz(TIMEZONE).month());
    const [selectedYear, setSelectedYear] = useState<number>(moment().tz(TIMEZONE).year());

    const startDate = moment().tz(TIMEZONE).year(selectedYear).month(selectedMonth).startOf('month').toISOString();
    const endDate = moment().tz(TIMEZONE).year(selectedYear).month(selectedMonth).endOf('month').toISOString();
    const years = Array.from({ length: 3 }, (_, i) => moment().tz(TIMEZONE).year() - i);

    const { data, isLoading } = useFinancialMetrics(startDate, endDate);

    // Métricas calculadas dos dados unificados
    const metrics = useMemo(() => {
        if (!data) {
            return {
                totalRevenue: 0,
                particular: 0,
                convenioAvulso: 0,
                convenioPacote: 0,
                faturado: 0,
                aReceber: 0,
            };
        }

        return {
            // 🆕 Cash total (recebido)
            totalRevenue: data.cash?.total || 0,
            
            // 🆕 Breakdown por fonte
            particular: data.cash?.breakdown?.particular || 0,
            convenioAvulso: data.cash?.breakdown?.convenioAvulso || 0,
            convenioPacote: data.cash?.breakdown?.convenioPacote || 0,
            
            // 🆕 Faturamento
            faturado: data.billing?.total || 0,
            
            // 🆕 A receber
            aReceber: data.receivable?.total || 0,
        };
    }, [data]);

    if (isLoading) return <FinancialLoading />;

    const periodoLabel = `${monthNames[selectedMonth]} ${selectedYear}`;

    return (
        <Box>
            <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="h5" fontWeight="bold">
                    💵 Análise de Receitas — {periodoLabel}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Mês</InputLabel>
                        <Select value={selectedMonth} label="Mês" onChange={(e) => setSelectedMonth(Number(e.target.value))}>
                            {monthNames.map((name, idx) => (
                                <MenuItem key={idx} value={idx}>{name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>Ano</InputLabel>
                        <Select value={selectedYear} label="Ano" onChange={(e) => setSelectedYear(Number(e.target.value))}>
                            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Card: Total Recebido */}
                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2}>
                                <AttachMoney color="success" />
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Recebido
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold">
                                        R$ {metrics.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Card: Particular */}
                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2}>
                                <TrendingUp color="primary" />
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Particular
                                    </Typography>
                                    <Typography variant="h6" fontWeight="bold">
                                        R$ {metrics.particular.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Card: Convênio Avulso */}
                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2}>
                                <AccountBalance color="info" />
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Convênio Avulso
                                    </Typography>
                                    <Typography variant="h6" fontWeight="bold">
                                        R$ {metrics.convenioAvulso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Card: Convênio Pacote */}
                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={2}>
                                <AccountBalance color="warning" />
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Convênio Pacote
                                    </Typography>
                                    <Typography variant="h6" fontWeight="bold">
                                        R$ {metrics.convenioPacote.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Resumo */}
            <Paper sx={{ mt: 3, p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Resumo do Período
                </Typography>
                <Box display="flex" gap={2} flexWrap="wrap">
                    <Chip 
                        label={`Faturado: R$ ${metrics.faturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        color="primary"
                        variant="outlined"
                    />
                    <Chip 
                        label={`A Receber: R$ ${metrics.aReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        color="warning"
                        variant="outlined"
                    />
                </Box>
            </Paper>
        </Box>
    );
};

export default RevenueTab;
