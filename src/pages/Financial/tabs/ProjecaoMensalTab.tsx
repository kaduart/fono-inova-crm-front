import { CheckCircle, NavigateBefore, NavigateNext, Refresh } from '@mui/icons-material';
import { Box, Button, Card, CardContent, Chip, FormControl, Grid, IconButton, InputLabel, LinearProgress, MenuItem, Paper, Select, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { useProvisionamento } from '../../../hooks/useProvisionamento';

const PAGE_SIZE = 10;

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

function Pagination({ total, page, onPage }: { total: number; page: number; onPage: (p: number) => void }) {
    const pages = Math.ceil(total / PAGE_SIZE);
    if (pages <= 1) return null;
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, px: 1, pb: 1 }}>
            <Typography variant="caption" color="text.secondary">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
            </Typography>
            <IconButton size="small" onClick={() => onPage(page - 1)} disabled={page === 0}>
                <NavigateBefore fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => onPage(page + 1)} disabled={page >= pages - 1}>
                <NavigateNext fontSize="small" />
            </IconButton>
        </Box>
    );
}

const ProjecaoMensalTab = () => {
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [ano, setAno] = useState(new Date().getFullYear());
    const [pageRealizados, setPageRealizados] = useState(0);
    const [pageAgendados, setPageAgendados] = useState(0);
    const [pagePendentes, setPagePendentes] = useState(0);
    const { projecaoMes, fetchProjecaoMes } = useProvisionamento();

    useEffect(() => {
        fetchProjecaoMes(mes, ano);
        setPageRealizados(0);
        setPageAgendados(0);
        setPagePendentes(0);
    }, [mes, ano, fetchProjecaoMes]);

    const realizados: any[] = projecaoMes?.detalhes?.realizados || [];
    const agendados: any[] = projecaoMes?.detalhes?.agendados || [];
    const pendentes: any[] = projecaoMes?.detalhes?.pendentes || [];

    const realizadosPage = realizados.slice(pageRealizados * PAGE_SIZE, (pageRealizados + 1) * PAGE_SIZE);
    const agendadosPage = agendados.slice(pageAgendados * PAGE_SIZE, (pageAgendados + 1) * PAGE_SIZE);
    const pendentesPage = pendentes.slice(pagePendentes * PAGE_SIZE, (pagePendentes + 1) * PAGE_SIZE);

    const metaReal = projecaoMes?.metas?.sugerida || 0;

    return (
        <Box>
            {/* Header com Filtros */}
            <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
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
                            <Select value={mes} label="Mês" onChange={(e) => setMes(Number(e.target.value))}>
                                {Array.from({ length: 12 }, (_, i) => (
                                    <MenuItem key={i + 1} value={i + 1}>
                                        {format(new Date(2024, i), 'MMM', { locale: ptBR })}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel>Ano</InputLabel>
                            <Select value={ano} label="Ano" onChange={(e) => setAno(Number(e.target.value))}>
                                <MenuItem value={2025}>2025</MenuItem>
                                <MenuItem value={2026}>2026</MenuItem>
                            </Select>
                        </FormControl>
                        <Button variant="outlined" startIcon={<Refresh />} onClick={() => fetchProjecaoMes(mes, ano)} size="small">
                            Atualizar
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Cards dos 3 Cenários */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ borderLeft: 4, borderColor: 'error.main', height: '100%' }}>
                        <CardContent>
                            <Typography color="error.main" fontWeight="bold" gutterBottom>CENÁRIO PESSIMISTA</Typography>
                            <Typography variant="h4" fontWeight="bold">
                                {formatCurrency(projecaoMes?.cenarios?.pessimista?.valor ?? 0)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                70% dos agendados + 20% dos pendentes
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', height: '100%' }}>
                        <CardContent>
                            <Typography fontWeight="bold" gutterBottom>CENÁRIO ESPERADO ⭐</Typography>
                            <Typography variant="h4" fontWeight="bold">
                                {formatCurrency(projecaoMes?.cenarios?.realista?.valor ?? 0)}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                                Taxa histórica de {((projecaoMes?.taxaConversaoHistorica || 0) * 100).toFixed(0)}%
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ borderLeft: 4, borderColor: 'success.main', height: '100%' }}>
                        <CardContent>
                            <Typography color="success.main" fontWeight="bold" gutterBottom>CENÁRIO OTIMISTA</Typography>
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

            {/* Meta e Progresso — só exibe se houver meta cadastrada */}
            {metaReal > 0 && (
                <Paper sx={{ p: 3, mb: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">Meta do Mês</Typography>
                        <Typography variant="h5" fontWeight="bold" color="primary">
                            {formatCurrency(metaReal)}
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(projecaoMes?.metas?.percentualAtual || 0, 100)}
                        sx={{ height: 10, borderRadius: 5, mb: 2 }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            Realizado: {formatCurrency(projecaoMes?.resumo?.valorProduzido ?? 0)}
                        </Typography>
                        <Typography
                            variant="body2"
                            color={projecaoMes?.metas?.gapParaMeta > 0 ? 'error.main' : 'success.main'}
                            fontWeight="bold"
                        >
                            {projecaoMes?.metas?.gapParaMeta > 0
                                ? `Faltam: ${formatCurrency(projecaoMes.metas.gapParaMeta)}`
                                : 'Meta atingida!'}
                        </Typography>
                    </Box>
                </Paper>
            )}

            {/* Atendimentos Realizados */}
            <Paper sx={{ p: 3, mb: 4, borderRadius: 2, border: '1px solid', borderColor: 'success.200' }}>
                <Typography variant="h6" fontWeight="bold" color="success.dark" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle /> Atendimentos Realizados em {format(new Date(ano, mes - 1), 'MMMM/yyyy', { locale: ptBR })}
                </Typography>

                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card>
                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="body2" color="text.secondary">Total de Atendimentos</Typography>
                                <Typography variant="h4" fontWeight="bold" color="success.main">
                                    {projecaoMes?.resumo?.atendimentosRealizados || 0}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card>
                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="body2" color="text.secondary">Valor Produzido</Typography>
                                <Typography variant="h4" fontWeight="bold" color="primary.main">
                                    {formatCurrency(projecaoMes?.resumo?.valorProduzido || 0)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card>
                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="body2" color="text.secondary">Já Recebido</Typography>
                                <Typography variant="h4" fontWeight="bold" color="success.main">
                                    {formatCurrency(projecaoMes?.resumo?.jaRecebido || 0)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card>
                            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                                <Typography variant="body2" color="text.secondary">A Receber do Mês</Typography>
                                <Typography variant="h4" fontWeight="bold" color="warning.main">
                                    {formatCurrency((projecaoMes?.resumo?.valorProduzido || 0) - (projecaoMes?.resumo?.jaRecebido || 0))}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={`Particular: ${formatCurrency(projecaoMes?.resumo?.particular || 0)}`} color="primary" variant="outlined" />
                    <Chip label={`Convênio: ${formatCurrency(projecaoMes?.resumo?.convenio || 0)}`} color="info" variant="outlined" />
                </Box>

                {realizados.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="success.dark">
                            Detalhamento ({realizados.length} atendimentos)
                        </Typography>
                        <Paper variant="outlined">
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Data</TableCell>
                                        <TableCell>Paciente</TableCell>
                                        <TableCell>Tipo</TableCell>
                                        <TableCell align="right">Valor</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {realizadosPage.map((apt: any) => (
                                        <TableRow key={apt._id} hover>
                                            <TableCell>{format(new Date(apt.data), 'dd/MM')} {apt.hora}</TableCell>
                                            <TableCell>{apt.paciente}</TableCell>
                                            <TableCell>
                                                <Chip size="small" label={apt.tipo} color={apt.tipo === 'Convênio' ? 'info' : 'primary'} variant="outlined" />
                                            </TableCell>
                                            <TableCell align="right">{formatCurrency(apt.valor)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Pagination total={realizados.length} page={pageRealizados} onPage={setPageRealizados} />
                        </Paper>
                    </Box>
                )}
            </Paper>

            {/* Insights */}
            {projecaoMes?.insights?.length > 0 && (
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" gutterBottom>Insights</Typography>
                    {projecaoMes.insights.map((insight: any, idx: number) => (
                        <Paper key={idx} sx={{ p: 2, mb: 2, bgcolor: insight.tipo === 'error' ? 'error.50' : insight.tipo === 'warning' ? 'warning.50' : 'info.50' }}>
                            <Typography variant="subtitle2" fontWeight="bold" color={insight.tipo + '.main'}>{insight.titulo}</Typography>
                            <Typography variant="body2">{insight.mensagem}</Typography>
                        </Paper>
                    ))}
                </Box>
            )}

            {/* Tabelas: Agendados + Pendentes */}
            <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="h6" gutterBottom>
                        Agendados Confirmados ({agendados.length})
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
                                {agendadosPage.map((apt: any) => (
                                    <TableRow key={apt._id} hover>
                                        <TableCell>{format(new Date(apt.data), 'dd/MM')} {apt.hora}</TableCell>
                                        <TableCell>{apt.paciente}</TableCell>
                                        <TableCell align="right">{formatCurrency(apt.valor)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Pagination total={agendados.length} page={pageAgendados} onPage={setPageAgendados} />
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="h6" gutterBottom>
                        Pendentes de Confirmação ({pendentes.length})
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
                                {pendentesPage.map((apt: any) => (
                                    <TableRow key={apt._id} hover sx={{ bgcolor: apt.diasParaAtendimento <= 3 ? 'error.50' : 'inherit' }}>
                                        <TableCell>{format(new Date(apt.data), 'dd/MM')} {apt.hora}</TableCell>
                                        <TableCell>{apt.paciente}</TableCell>
                                        <TableCell align="right">{formatCurrency(apt.valor)}</TableCell>
                                        <TableCell>
                                            <Chip size="small" label={`${apt.diasParaAtendimento}d`} color={apt.diasParaAtendimento <= 3 ? 'error' : 'default'} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Pagination total={pendentes.length} page={pagePendentes} onPage={setPagePendentes} />
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ProjecaoMensalTab;
