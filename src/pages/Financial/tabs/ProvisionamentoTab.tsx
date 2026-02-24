import {
  Add,
  Assessment,
  Download,
  PieChart,
  Refresh,
  TrendingUp
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card, CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Tab,
  Table, TableBody, TableCell, TableHead, TableRow,
  Tabs,
  Typography,
  Grid
} from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useProvisionamento } from '../../../hooks/useProvisionamento';
import { Patient360Modal } from '../components/Patient360Modal';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const ProvisionamentoTab = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  // Estados de loading individuais para cada aba
  const [loadingAnalitico, setLoadingAnalitico] = useState(false);
  const [loadingPacotes, setLoadingPacotes] = useState(false);
  const [loadingFechamento, setLoadingFechamento] = useState(false);

  const {
    data,
    pendingAppointments,
    loading,
    loadingPendentes,
    calcular,
    carregarPendentes,
    analiticoData,
    pacotesAndamento,
    fechamentoData,
    fetchAnalitico,
    fetchProjecaoMes,
    fetchPacotesAndamento,
    fetchMetricasMes,
    fetchFechamento,
    metricasMes,
    pacotesConcluidos,
    fetchPacotesConcluidos
  } = useProvisionamento();

  const [selectedPatient360Id, setSelectedPatient360Id] = useState<string | null>(null);
  const [is360ModalOpen, setIs360ModalOpen] = useState(false);

  const handleOpen360 = (patientId: string) => {
    setSelectedPatient360Id(patientId);
    setIs360ModalOpen(true);
  };

  useEffect(() => {
    calcular(mes, ano);
    fetchProjecaoMes(mes, ano);
    fetchMetricasMes(mes, ano);
    carregarPendentes(mes, ano);
  }, [mes, ano]);

  const handleTabChange = async (_: any, newValue: number) => {
    setActiveTab(newValue);

    // Carrega dados conforme a aba selecionada
    if (newValue === 1 && !analiticoData) {
      setLoadingAnalitico(true);
      await fetchAnalitico(mes, ano);
      setLoadingAnalitico(false);
    }
    if (newValue === 2 && pacotesAndamento.length === 0) {
      setLoadingPacotes(true);
      await Promise.all([fetchPacotesAndamento(), fetchPacotesConcluidos()]);
      setLoadingPacotes(false);
    }
    if (newValue === 3 && !fechamentoData) {
      setLoadingFechamento(true);
      await fetchFechamento(mes, ano);
      setLoadingFechamento(false);
    }
  };

  const handleExport = () => {
    window.open(`/api/provisionamento/export/excel?month=${mes}&year=${ano}`, '_blank');
  };

  return (
    <Box>
      {/* Header com Filtros */}
      <Paper sx={{ p: { xs: 2, sm: 2.5, md: 3 }, mb: { xs: 2, sm: 3 }, borderRadius: 2 }}>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          flexWrap: 'wrap',
          gap: 2
        }}>
          <Box>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Provisionamento Financeiro
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {format(new Date(ano, mes - 1), 'MMMM/yyyy', { locale: ptBR })}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, alignItems: 'center', flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
            <FormControl size="small" sx={{ minWidth: 100, flex: { xs: 1, md: 'none' }, maxWidth: { xs: 120, md: 'none' } }}>
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

            <FormControl size="small" sx={{ minWidth: 80, flex: { xs: 1, md: 'none' }, maxWidth: { xs: 100, md: 'none' } }}>
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
              onClick={() => {
                calcular(mes, ano);
                carregarPendentes(mes, ano);
              }}
              size="small"
              sx={{ flex: { xs: 1, md: 'none' } }}
            >
              Atualizar
            </Button>

            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={handleExport}
              size="small"
              sx={{ flex: { xs: 1, md: 'none' } }}
            >
              Excel
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Cards Indicadores */}
      {data && (
        <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 3 } }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ width: "100%", borderLeft: 4, borderColor: 'success.main' }}>
              <CardContent>
                <Typography color="success.main" fontWeight="bold" gutterBottom>
                  GARANTIDO
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {formatCurrency(data.camadas.garantido.valor ?? 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {data.camadas.garantido.percentual}% do total
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ width: "100%", borderLeft: 4, borderColor: 'warning.main' }}>
              <CardContent>
                <Typography color="warning.main" fontWeight="bold" gutterBottom>
                  CONFIRMADO
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {formatCurrency(data.camadas.agendadoConfirmado.valor ?? 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {data.camadas.agendadoConfirmado.quantidade || 0} agendamentos
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ width: "100%", borderLeft: 4, borderColor: 'error.main' }}>
              <CardContent>
                <Typography color="error.main" fontWeight="bold" gutterBottom>
                  PENDENTE
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {formatCurrency(data.camadas.agendadoPendente.valor ?? 0)}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setActiveTab(0)}
                >
                  {data.camadas.agendadoPendente.quantidade || 0} na fila
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ width: "100%",
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              borderLeft: 4,
              borderColor: 'primary.dark'
            }}>
              <CardContent>
                <Typography fontWeight="bold" gutterBottom>
                  TOTAL PREVISTO
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {formatCurrency(data.total)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Índice certeza: {Math.round((data.indiceCerteza || 0) * 100)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Break-even Info */}
      {data && data.custos && (
        <Paper sx={{
          p: 2,
          mb: 3,
          bgcolor: data.custos.margemSeguranca > 0 ? 'success.light' : 'error.light',
          color: data.custos.margemSeguranca > 0 ? 'success.contrastText' : 'error.contrastText',
          borderRadius: 2
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {data.custos.margemSeguranca > 0
                ? `✅ Margem segurança: ${formatCurrency(data.custos.margemSeguranca)}`
                : `❌ Déficit: ${formatCurrency(Math.abs(data.custos.margemSeguranca))}`
              }
            </Typography>
            <Typography variant="body2">
              Break-even: {formatCurrency(data.custos.breakEven)} |
              Dias p/ Break: {data.custos.diasParaBreakEven}
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Tabs Internas */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<TrendingUp />} label="Visão Geral" />
          <Tab
            icon={loadingAnalitico ? <CircularProgress size={16} /> : <Assessment />}
            label="Analítico"
          />
          <Tab
            icon={loadingPacotes ? <CircularProgress size={16} /> : <Calendar />}
            label={`Pacotes (${pacotesAndamento.length + pacotesConcluidos.length})`}
          />
          <Tab
            icon={loadingFechamento ? <CircularProgress size={16} /> : <PieChart />}
            label="Fechamento (DRE)"
          />
          <Tab icon={<Assessment />} label="Pacientes" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* ABA 0: Visão Geral + Agenda Temporária */}
          {activeTab === 0 && (

            <Box>
              {/* NOVA SEÇÃO: DASHBOARD DE MÉTRICAS */}
              {metricasMes && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    📊 Performance do Mês
                  </Typography>

                  {/* Cards Principais */}
                  <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }} sx={{ mb: { xs: 2, sm: 3 } }}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card>
                        <CardContent>
                          <Typography color="text.secondary" variant="body2" gutterBottom>
                            ATENDIMENTOS REALIZADOS
                          </Typography>
                          <Typography variant="h4" fontWeight="bold">
                            {metricasMes.resumo.atendimentosRealizados}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <Chip
                              size="small"
                              label={`${metricasMes.comparativo.crescimento.atendimentos > 0 ? '+' : ''}${metricasMes.comparativo.crescimento.atendimentos}% vs mês ant.`}
                              color={metricasMes.comparativo.crescimento.atendimentos >= 0 ? 'success' : 'error'}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card>
                        <CardContent>
                          <Typography color="text.secondary" variant="body2" gutterBottom>
                            CANCELADOS/FALTAS
                          </Typography>
                          <Typography variant="h4" fontWeight="bold" color="error.main">
                            {metricasMes.resumo.atendimentosCancelados}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Taxa: {metricasMes.taxas.cancelamento}% do total
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card>
                        <CardContent>
                          <Typography color="text.secondary" variant="body2" gutterBottom>
                            FATURAMENTO
                          </Typography>
                          <Typography variant="h4" fontWeight="bold">
                            {formatCurrency(metricasMes.resumo.faturamentoMes)}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <Chip
                              size="small"
                              label={`${metricasMes.comparativo.crescimento.faturamento > 0 ? '+' : ''}${metricasMes.comparativo.crescimento.faturamento}%`}
                              color={metricasMes.comparativo.crescimento.faturamento >= 0 ? 'success' : 'error'}
                            />
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                      <Card sx={{ width: "100%", bgcolor: 'primary.50' }}>
                        <CardContent>
                          <Typography color="primary.main" variant="body2" fontWeight="bold" gutterBottom>
                            PROJEÇÃO DE CRESCIMENTO
                          </Typography>
                          <Typography variant="h4" fontWeight="bold" color="primary.main">
                            {metricasMes.comparativo.crescimento.projecao > 0 ? '+' : ''}
                            {metricasMes.comparativo.crescimento.projecao}%
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Se manter o ritmo atual
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Taxas e Comparativos */}
                  <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Taxa de Comparecimento
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <LinearProgress
                            variant="determinate"
                            value={metricasMes.taxas.comparecimento}
                            sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                          />
                          <Typography variant="h6" fontWeight="bold">
                            {metricasMes.taxas.comparecimento}%
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {metricasMes.resumo.atendimentosRealizados} de {metricasMes.resumo.atendimentosAgendados} agendamentos
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Ticket Médio
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {formatCurrency(metricasMes.resumo.ticketMedio)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Por atendimento realizado
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Top Especialidades */}
                  {metricasMes.porEspecialidade?.length > 0 && (
                    <Paper sx={{ p: 2, mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                        Top 5 Especialidades
                      </Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Especialidade</TableCell>
                            <TableCell align="center">Atendimentos</TableCell>
                            <TableCell align="right">Faturamento</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {metricasMes.porEspecialidade.map((item: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{item.especialidade}</TableCell>
                              <TableCell align="center">
                                <Chip size="small" label={item.atendimentos} />
                              </TableCell>
                              <TableCell align="right">{formatCurrency(item.valor)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Paper>
                  )}
                </Box>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Agenda Temporária ({pendingAppointments.length})
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  size="small"
                  onClick={() => {/* Abrir modal de nova venda */ }}
                >
                  Nova Venda
                </Button>
              </Box>

              {loadingPendentes ? (
                <Skeleton height={200} />
              ) : pendingAppointments.length === 0 ? (
                <Alert severity="info">Nenhum agendamento pendente</Alert>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell>Paciente</TableCell>
                      <TableCell>Data/Hora</TableCell>
                      <TableCell>Especialidade</TableCell>
                      <TableCell>Valor</TableCell>
                      <TableCell>Risco</TableCell>
                      <TableCell>Horas</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingAppointments.map((apt) => (
                      <TableRow
                        key={apt._id}
                        sx={{
                          bgcolor: apt.risco === 'urgente' ? 'error.50' :
                            apt.risco === 'medio' ? 'warning.50' : 'inherit'
                        }}
                      >
                        <TableCell>
                          <span
                            className="cursor-pointer hover:text-blue-600 hover:underline font-medium"
                            onClick={() => apt.patient?._id && handleOpen360(apt.patient._id)}
                          >
                            {apt.patient?.fullName || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>{apt.date} {apt.time}</TableCell>
                        <TableCell>{apt.specialty}</TableCell>
                        <TableCell>{formatCurrency(apt.sessionValue || 0)}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={apt.risco.toUpperCase()}
                            color={apt.risco === 'urgente' ? 'error' :
                              apt.risco === 'medio' ? 'warning' : 'default'}
                          />
                        </TableCell>
                        <TableCell>{apt.horasRestantes}h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Métricas */}
              {data && (
                <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mt: { xs: 2, sm: 3, md: 4 } }}>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Confirmação 24h
                      </Typography>
                      <Typography variant="h5" color="primary" fontWeight="bold">
                        {Math.round((data.metricas?.taxaConfirmacao24h || 0) * 100)}%
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Taxa Presença
                      </Typography>
                      <Typography variant="h5" color="primary" fontWeight="bold">
                        {Math.round((data.metricas?.taxaPresenca || 0) * 100)}%
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Pipeline
                      </Typography>
                      <Typography variant="h5" color="primary" fontWeight="bold">
                        {formatCurrency(data.camadas?.pipeline?.valor || 0)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Status
                      </Typography>
                      <Typography
                        variant="h5"
                        color={data.status === 'SEGURO' ? 'success' :
                          data.status === 'ATENCAO' ? 'warning' : 'error'}
                        fontWeight="bold"
                      >
                        {data.status}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              )}
            </Box>
          )}

          {/* ABA 1: Analítico */}
          {activeTab === 1 && (
            loadingAnalitico ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : analiticoData ? (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Base de Dados Analítica ({analiticoData.total} registros)
                </Typography>

                <Table size="small" sx={{ mt: 2 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell>ID</TableCell>
                      <TableCell>Data</TableCell>
                      <TableCell>Cliente</TableCell>
                      <TableCell>Tipo</TableCell>
                      <TableCell>Categoria</TableCell>
                      <TableCell align="right">Valor Líq.</TableCell>
                      <TableCell align="right">CMV</TableCell>
                      <TableCell align="right">Imp.</TableCell>
                      <TableCell align="right">Com.</TableCell>
                      <TableCell align="right">Taxa</TableCell>
                      <TableCell align="right">Margem</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analiticoData.data?.map((row: any, idx: number) => (
                      <TableRow key={idx} hover>
                        <TableCell>{row.ID_Venda}</TableCell>
                        <TableCell>{row.Data_Venda}</TableCell>
                        <TableCell>
                          <span
                            className="cursor-pointer hover:text-blue-600 hover:underline font-medium"
                            onClick={() => row.PatientID && handleOpen360(row.PatientID)}
                          >
                            {row.Cliente}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={row.Tipo_Produto}
                            color={row.Tipo_Produto === 'Pacote' ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>{row.Categoria}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                          {formatCurrency(row.Valor_Liquido)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          {formatCurrency(row.CMV)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          {formatCurrency(row.Impostos)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          {formatCurrency(row.Comissao)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>
                          {formatCurrency(row.Taxa_Cartao)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                          {formatCurrency(row.Margem_Contrib)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Totais */}
                <Box sx={{
                  mt: 3,
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                  display: 'flex',
                  gap: 4,
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap'
                }}>
                  <Box textAlign="right">
                    <Typography variant="caption" color="text.secondary">Total Bruto</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {formatCurrency(analiticoData.totais?.bruto)}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="caption" color="text.secondary">Total Líquido</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {formatCurrency(analiticoData.totais?.liquido)}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="caption" color="text.secondary">Total Custos</Typography>
                    <Typography variant="h6" fontWeight="bold" color="error.main">
                      {formatCurrency(analiticoData.totais?.custos)}
                    </Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="caption" color="text.secondary">Margem Total</Typography>
                    <Typography variant="h6" fontWeight="bold" color="success.main">
                      {formatCurrency(analiticoData.totais?.margem)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ) : <Alert severity="info">Selecione a aba para carregar dados analíticos</Alert>
          )}

          {/* ABA 2: Pacotes */}
          {activeTab === 2 && (
            loadingPacotes ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  📦 Pacotes em Andamento ({pacotesAndamento.length})
                </Typography>
                <Grid container spacing={3} sx={{ mb: 6 }}>
                  {pacotesAndamento.map((pacote: any, idx: number) => (
                    <Grid size={{ xs: 12, md: 6, lg: 4 }} key={idx}>
                      <Card variant="outlined" sx={{ width: "100%", height: '100%', borderLeft: 4, borderColor: 'primary.main' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="caption" color="text.secondary">
                              #{pacote.ID} • {format(new Date(pacote['Data Venda']), 'dd/MM/yyyy')}
                            </Typography>
                            <Chip size="small" label={pacote.Categoria} variant="outlined" color="primary" />
                          </Box>

                          <Typography variant="h6" fontWeight="bold" gutterBottom>
                            <span
                              className="cursor-pointer hover:text-blue-600 hover:underline"
                              onClick={() => pacote.PatientID && handleOpen360(pacote.PatientID)}
                            >
                              {pacote.Cliente}
                            </span>
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {pacote.Pacote}
                          </Typography>

                          <Box sx={{ mt: 2, mb: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="body2">
                                {pacote.Realizadas} de {pacote['Total Sessões']} sessões
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {Math.round(pacote['% Concluído'])}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={pacote['% Concluído']}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>

                          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Grid container spacing={{ xs: 1, sm: 1.5, md: 2 }}>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Valor Total
                                </Typography>
                                <Typography variant="body1" fontWeight="bold">
                                  {formatCurrency(pacote['Valor Total'])}
                                </Typography>
                              </Grid>
                              <Grid size={{ xs: 6 }} textAlign="right">
                                <Typography variant="caption" color="success.main" display="block">
                                  Provisionado
                                </Typography>
                                <Typography variant="body1" fontWeight="bold" color="success.main">
                                  {formatCurrency(pacote['Valor Provisionado'])}
                                </Typography>
                              </Grid>
                            </Grid>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {pacotesConcluidos.length > 0 && (
                  <>
                    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 4 }}>
                      ✅ Pacotes Concluídos ({pacotesConcluidos.length})
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell>Paciente</TableCell>
                          <TableCell>Profissional</TableCell>
                          <TableCell>Tipo</TableCell>
                          <TableCell align="center">Sessões</TableCell>
                          <TableCell align="right">Valor Total</TableCell>
                          <TableCell align="center">Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pacotesConcluidos.map((p, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell sx={{ fontWeight: 'medium' }}>{p.patient?.fullName}</TableCell>
                            <TableCell>{p.doctor?.fullName}</TableCell>
                            <TableCell>{p.sessionType}</TableCell>
                            <TableCell align="center">{p.sessionsDone}/{p.totalSessions}</TableCell>
                            <TableCell align="right">{formatCurrency(p.totalValue)}</TableCell>
                            <TableCell align="center">
                              <Chip label="Concluído" size="small" color="success" variant="outlined" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </Box>
            )
          )}

          {/* ABA 3: DRE */}
          {activeTab === 3 && (
            loadingFechamento ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : fechamentoData ? (
              <Box>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  Demonstração do Resultado do Exercício
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Período: {fechamentoData.periodo}
                </Typography>

                <Grid container spacing={3} sx={{ mt: 1 }}>
                  {/* Receitas */}
                  <Grid size={{ xs: 12 }}>
                    <Paper sx={{
                      p: 3,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      borderRadius: 2
                    }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        RECEITAS
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <span>Receita Bruta</span>
                        <span>{formatCurrency(fechamentoData.dre.receitaBruta)}</span>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
                        <span>(-) Descontos</span>
                        <span>{formatCurrency(fechamentoData.dre.descontos)}</span>
                      </Box>
                      <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mt: 2,
                        pt: 2,
                        borderTop: '1px solid rgba(255,255,255,0.3)'
                      }}>
                        <Typography variant="h6" fontWeight="bold">RECEITA LÍQUIDA</Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {formatCurrency(fechamentoData.dre.receitaLiquida)}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Custos */}
                  <Grid size={{ xs: 12 }}>
                    <Paper sx={{ p: 3, borderRadius: 2 }}>
                      <Typography variant="subtitle1" fontWeight="bold" color="error.main" gutterBottom>
                        CUSTOS VARIÁVEIS
                      </Typography>
                      <Grid container spacing={{ xs: 1.5, sm: 2, md: 3 }}>
                        <Grid size={{ xs: 6, md: 3 }}>
                          <Typography variant="body2" color="text.secondary">CMV</Typography>
                          <Typography variant="h6">{formatCurrency(fechamentoData.dre.cmv)}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                          <Typography variant="body2" color="text.secondary">Impostos</Typography>
                          <Typography variant="h6">{formatCurrency(fechamentoData.dre.impostos)}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                          <Typography variant="body2" color="text.secondary">Comissões</Typography>
                          <Typography variant="h6">{formatCurrency(fechamentoData.dre.comissoes)}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6, md: 3 }}>
                          <Typography variant="body2" color="text.secondary">Taxas Cartão</Typography>
                          <Typography variant="h6">{formatCurrency(fechamentoData.dre.taxasCartao)}</Typography>
                        </Grid>
                      </Grid>
                      <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mt: 3,
                        pt: 2,
                        borderTop: '2px solid',
                        borderColor: 'error.light'
                      }}>
                        <Typography variant="h6" fontWeight="bold" color="error.dark">
                          TOTAL CUSTOS VARIÁVEIS
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" color="error.dark">
                          {formatCurrency(fechamentoData.dre.totalCV)}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Margem */}
                  <Grid size={{ xs: 12 }}>
                    <Paper sx={{
                      p: 3,
                      bgcolor: 'success.light',
                      color: 'success.contrastText',
                      borderRadius: 2
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="h5" fontWeight="bold">
                            MARGEM DE CONTRIBUIÇÃO
                          </Typography>
                          <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            {fechamentoData.dre.percentualMargem}% sobre a receita
                          </Typography>
                        </Box>
                        <Typography variant="h3" fontWeight="bold">
                          {formatCurrency(fechamentoData.dre.margemContribuicao)}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            ) : <Alert severity="info">Selecione a aba para carregar DRE</Alert>
          )}
          {/* ABA 4: Pacientes */}
          {activeTab === 4 && (
            <Box>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                🏥 Saúde Financeira por Paciente
              </Typography>
              <Alert severity="info" sx={{ mb: 3 }}>
                Selecione um paciente na listagem de dados analíticos para ver o resumo detalhado aqui.
              </Alert>

              {analiticoData?.porPaciente && (
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell>Paciente</TableCell>
                      <TableCell align="right">Total Gasto</TableCell>
                      <TableCell align="center">Nº Vendas</TableCell>
                      <TableCell>Categorias</TableCell>
                      <TableCell>Última Venda</TableCell>
                      <TableCell align="center">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analiticoData.porPaciente.map((p: any, idx: number) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>
                          <span
                            className="cursor-pointer hover:text-blue-600 hover:underline"
                            onClick={() => p.PatientID && handleOpen360(p.PatientID)}
                          >
                            {p.paciente}
                          </span>
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                          {formatCurrency(p.totalGasto)}
                        </TableCell>
                        <TableCell align="center">{p.qtdVendas}</TableCell>
                        <TableCell>{p.categorias}</TableCell>
                        <TableCell>{p.ultimaVenda}</TableCell>
                        <TableCell align="center">
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => p.PatientID && handleOpen360(p.PatientID)}
                          >
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          )}
        </Box>
      </Paper>

      {selectedPatient360Id && (
        <Patient360Modal
          patientId={selectedPatient360Id}
          open={is360ModalOpen}
          onClose={() => setIs360ModalOpen(false)}
        />
      )}
    </Box>
  );
};

export default ProvisionamentoTab;