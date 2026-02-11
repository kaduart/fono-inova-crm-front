import { Refresh } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Chip, FormControl, Grid, InputLabel, LinearProgress, MenuItem, Paper, Select, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { useProvisionamento } from '../../../hooks/useProvisionamento';

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const ProjecaoMensalTab = () => {
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [ano, setAno] = useState(new Date().getFullYear());
    const { projecaoMes, fetchProjecaoMes, loading } = useProvisionamento();

    useEffect(() => {
        fetchProjecaoMes(mes, ano);
    }, [mes, ano, fetchProjecaoMes]);

    const handleAtualizar = () => {
        fetchProjecaoMes(mes, ano);
    };

    return (
        <Box>
            {/* Header com Filtros */}
            <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 2
                }}>
                    <Box>
                        <Typography variant="h5" fontWeight="bold" gutterBottom>
                            Projeção de Fechamento
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Previsão de arrecadação para {format(new Date(ano, mes - 1), 'MMMM/yyyy', { locale: ptBR })}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Mês</InputLabel>
                            <Select
                                value={mes}
                                label="Mês"
                                onChange={(e) => setMes(Number(e.target.value))}
                            >
                                {Array.from({ length: 12 }, (_, i) => (
                                    <MenuItem key={i + 1} value={i + 1}>
                                        {format(new Date(2024, i), 'MMM', { locale: ptBR })}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel>Ano</InputLabel>
                            <Select
                                value={ano}
                                label="Ano"
                                onChange={(e) => setAno(Number(e.target.value))}
                            >
                                <MenuItem value={2025}>2025</MenuItem>
                                <MenuItem value={2026}>2026</MenuItem>
                            </Select>
                        </FormControl>

                        <Button
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={handleAtualizar}
                            size="small"
                        >
                            Atualizar
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Cards dos 3 Cenários */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ borderLeft: 4, borderColor: 'error.main', height: '100%' }}>
                        <CardContent>
                            <Typography color="error.main" fontWeight="bold" gutterBottom>
                                CENÁRIO PESSIMISTA
                            </Typography>
                            <Typography variant="h4" fontWeight="bold">
                                {formatCurrency(projecaoMes?.cenarios?.pessimista?.valor ?? 0)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                70% dos agendados + 20% dos pendentes
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', height: '100%' }}>
                        <CardContent>
                            <Typography fontWeight="bold" gutterBottom>
                                CENÁRIO ESPERADO ⭐
                            </Typography>
                            <Typography variant="h4" fontWeight="bold">
                                {formatCurrency(projecaoMes?.cenarios?.realista?.valor ?? 0)}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                                Baseado na taxa histórica de {(projecaoMes?.taxaConversaoHistorica * 100)?.toFixed(0)}%
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card sx={{ borderLeft: 4, borderColor: 'success.main', height: '100%' }}>
                        <CardContent>
                            <Typography color="success.main" fontWeight="bold" gutterBottom>
                                CENÁRIO OTIMISTA
                            </Typography>
                            <Typography variant="h4" fontWeight="bold">
                                {formatCurrency(projecaoMes?.cenarios?.otimista?.valor ?? 0)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                95% dos agendados + 70% dos pendentes
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Meta e Progresso */}
            <Paper sx={{ p: 3, mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Meta Sugerida</Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary">
                        {formatCurrency(projecaoMes?.metas?.sugerida ?? 0)}
                    </Typography>
                </Box>

                <LinearProgress
                    variant="determinate"
                    value={Math.min(projecaoMes?.metas?.percentualAtual || 0, 100)}
                    sx={{ height: 10, borderRadius: 5, mb: 2 }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        Já faturado: {formatCurrency(projecaoMes?.resumo?.jaFaturado ?? 0)}
                    </Typography>
                    <Typography variant="body2" color={projecaoMes?.metas?.gapParaMeta > 0 ? 'error.main' : 'success.main'} fontWeight="bold">
                        {projecaoMes?.metas?.gapParaMeta > 0
                            ? `Falta agendar: ${formatCurrency(projecaoMes.metas.gapParaMeta)}`
                            : 'Meta de agendamentos atingida!'}
                    </Typography>
                </Box>
            </Paper>

            {/* Insights */}
            {projecaoMes?.insights?.length > 0 && (
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom>💡 Insights</Typography>
                    {projecaoMes.insights.map((insight: any, idx: number) => (
                        <Paper key={idx} sx={{ p: 2, mb: 2, bgcolor: insight.tipo === 'error' ? 'error.50' : insight.tipo === 'warning' ? 'warning.50' : 'info.50' }}>
                            <Typography variant="subtitle2" fontWeight="bold" color={insight.tipo + '.main'}>
                                {insight.titulo}
                            </Typography>
                            <Typography variant="body2">{insight.mensagem}</Typography>
                        </Paper>
                    ))}
                </Box>
            )}

            {/* Tabelas de Detalhamento */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                        Agendados Confirmados ({projecaoMes?.detalhes?.agendados?.length || 0})
                    </Typography>
                    <Paper variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Data</TableCell>
                                    <TableCell>Paciente</TableCell>
                                    <TableCell align="right">Valor</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {projecaoMes?.detalhes?.agendados?.map((apt: any) => (
                                    <TableRow key={apt._id}>
                                        <TableCell>{format(new Date(apt.data), 'dd/MM')} {apt.hora}</TableCell>
                                        <TableCell>{apt.paciente}</TableCell>
                                        <TableCell align="right">{formatCurrency(apt.valor)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                        Pendentes de Confirmação ({projecaoMes?.detalhes?.pendentes?.length || 0})
                    </Typography>
                    <Paper variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Data</TableCell>
                                    <TableCell>Paciente</TableCell>
                                    <TableCell align="right">Valor</TableCell>
                                    <TableCell>Dias</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {projecaoMes?.detalhes?.pendentes?.map((apt: any) => (
                                    <TableRow key={apt._id} sx={{ bgcolor: apt.diasParaAtendimento <= 3 ? 'error.50' : 'inherit' }}>
                                        <TableCell>{format(new Date(apt.data), 'dd/MM')} {apt.hora}</TableCell>
                                        <TableCell>{apt.paciente}</TableCell>
                                        <TableCell align="right">{formatCurrency(apt.valor)}</TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={`${apt.diasParaAtendimento}d`}
                                                color={apt.diasParaAtendimento <= 3 ? 'error' : 'default'}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ProjecaoMensalTab;