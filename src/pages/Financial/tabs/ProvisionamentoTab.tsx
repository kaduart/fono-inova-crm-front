import { useEffect, useState } from 'react';
import {
  Box, Paper, Typography, Grid, Card, CardContent, Chip,
  Alert, AlertTitle, Button, LinearProgress, Tabs, Tab,
  Table, TableBody, TableCell, TableHead, TableRow,
  IconButton, Tooltip, Checkbox, Skeleton
} from '@mui/material';
import {
  TrendingUp, CheckCircle, Schedule, Phone,
  Delete, Refresh, LocalAtm, Assessment,
  Warning, Error as ErrorIcon
} from '@mui/icons-material';
import useProvisionamento from '../../../hooks/useProvisionamento';

// Format currency helper
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};

// Termômetro de Certeza
const IndicadorCerteza = ({ indice }: { indice: number }) => {
  const getColor = (): 'success' | 'warning' | 'error' => {
    if (indice >= 0.70) return 'success';
    if (indice >= 0.40) return 'warning';
    return 'error';
  };

  const getLabel = () => {
    if (indice >= 0.70) return 'SEGURO';
    if (indice >= 0.40) return 'ATENÇÃO';
    return 'PERIGO';
  };

  const getIcon = () => {
    if (indice >= 0.70) return <CheckCircle color="success" />;
    if (indice >= 0.40) return <Warning color="warning" />;
    return <ErrorIcon color="error" />;
  };

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {getIcon()}
          <Typography variant="h6">Índice de Certeza</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <LinearProgress 
              variant="determinate" 
              value={indice * 100} 
              color={getColor()}
              sx={{ height: 20, borderRadius: 2 }}
            />
          </Box>
          <Chip 
            label={getLabel()} 
            color={getColor()} 
            sx={{ fontWeight: 'bold', fontSize: '1rem', minWidth: 100 }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {Math.round(indice * 100)}% da receita é garantida (baixo risco)
        </Typography>
      </CardContent>
    </Card>
  );
};

// Card de Camada
const CamadaCard = ({ 
  titulo, 
  valor, 
  percentual, 
  cor, 
  icone: Icon,
  subtitulo,
  onClick 
}: any) => (
  <Card 
    sx={{ 
      cursor: onClick ? 'pointer' : 'default',
      height: '100%',
      '&:hover': onClick ? { boxShadow: 4, transform: 'translateY(-2px)' } : {},
      transition: 'all 0.2s'
    }}
    onClick={onClick}
  >
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Icon color={cor} />
        <Typography variant="subtitle1" fontWeight="medium">{titulo}</Typography>
      </Box>
      <Typography variant="h5" fontWeight="bold" color={`${cor}.main`}>
        {formatCurrency(valor)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {percentual}% do total
      </Typography>
      {subtitulo && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          {subtitulo}
        </Typography>
      )}
    </CardContent>
  </Card>
);

// Painel de Agenda Temporária
const AgendaTemporariaPanel = ({ 
  pendentes, 
  loading, 
  onRefresh,
  onConfirmar,
  onLiberar
}: any) => {
  const [selected, setSelected] = useState<string[]>([]);

  const handleSelectAll = (checked: boolean) => {
    setSelected(checked ? pendentes.map((p: any) => p._id) : []);
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelected([...selected, id]);
    } else {
      setSelected(selected.filter((sid: string) => sid !== id));
    }
  };

  const urgentes = pendentes.filter((p: any) => p.risco === 'urgente');

  if (loading) {
    return <Skeleton variant="rectangular" height={400} />;
  }

  return (
    <Box>
      {urgentes.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>⚠️ Atenção Urgente!</AlertTitle>
          {urgentes.length} agendamento(s) precisa(m) de confirmação nas próximas 24h
        </Alert>
      )}

      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          color="success"
          startIcon={<CheckCircle />}
          disabled={selected.length === 0}
          onClick={() => onConfirmar(selected, () => setSelected([]))}
        >
          Confirmar ({selected.length})
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<Delete />}
          disabled={selected.length === 0}
          onClick={() => onLiberar(selected, () => setSelected([]))}
        >
          Liberar Vagas
        </Button>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={onRefresh}
        >
          Atualizar
        </Button>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                checked={selected.length === pendentes.length && pendentes.length > 0}
                indeterminate={selected.length > 0 && selected.length < pendentes.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            </TableCell>
            <TableCell>Paciente</TableCell>
            <TableCell>Data/Hora</TableCell>
            <TableCell>Especialidade</TableCell>
            <TableCell>Valor</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Ação</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pendentes.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} align="center">
                <Typography color="text.secondary" sx={{ py: 4 }}>
                  Nenhum agendamento pendente
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {pendentes.map((apt: any) => (
            <TableRow 
              key={apt._id}
              sx={{ 
                bgcolor: apt.risco === 'urgente' ? 'error.light' : 
                        apt.risco === 'medio' ? 'warning.light' : 'inherit',
                opacity: apt.risco === 'urgente' ? 0.9 : 1
              }}
            >
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selected.includes(apt._id)}
                  onChange={(e) => handleSelect(apt._id, e.target.checked)}
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight={apt.risco === 'urgente' ? 'bold' : 'normal'}>
                  {apt.patient?.fullName || 'N/A'}
                </Typography>
                {apt.patient?.phoneNumber && (
                  <Typography variant="caption" color="text.secondary">
                    {apt.patient.phoneNumber}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                {apt.date} {apt.time && `às ${apt.time}`}
              </TableCell>
              <TableCell>{apt.specialty}</TableCell>
              <TableCell>{formatCurrency(apt.sessionValue || 0)}</TableCell>
              <TableCell>
                <Chip 
                  size="small"
                  color={apt.risco === 'urgente' ? 'error' : apt.risco === 'medio' ? 'warning' : 'default'}
                  label={apt.horasRestantes <= 0 ? 'Vencido' : `${apt.horasRestantes}h`}
                />
              </TableCell>
              <TableCell>
                <Tooltip title="Ligar para confirmar">
                  <IconButton size="small" color="primary" href={`tel:${apt.patient?.phoneNumber}`}>
                    <Phone />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

// Componente Principal
const ProvisionamentoTab = () => {
  const { 
    data, 
    pendingAppointments,
    loading, 
    loadingPendentes,
    calcular,
    carregarPendentes,
    confirmarAgendamentos,
    liberarVagas
  } = useProvisionamento();
  
  const [activeTab, setActiveTab] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    calcular();
    carregarPendentes();
  }, []);

  const handleConfirmar = async (ids: string[], onSuccess: () => void) => {
    setActionLoading(true);
    try {
      await confirmarAgendamentos(ids);
      await carregarPendentes();
      await calcular();
      onSuccess();
    } finally {
      setActionLoading(false);
    }
  };

  const handleLiberar = async (ids: string[], onSuccess: () => void) => {
    setActionLoading(true);
    try {
      await liberarVagas(ids, 'Não confirmado via provisionamento');
      await carregarPendentes();
      await calcular();
      onSuccess();
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" height={60} />
        <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (!data) {
    return (
      <Alert severity="error">
        Erro ao carregar provisionamento. 
        <Button onClick={() => calcular()} size="small">Tentar novamente</Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          💰 Provisionamento - {data.periodo.mes.toString().padStart(2, '0')}/{data.periodo.ano}
        </Typography>
        <Button 
          startIcon={<Refresh />} 
          onClick={() => { calcular(); carregarPendentes(); }}
          disabled={loading}
        >
          Atualizar
        </Button>
      </Box>

      {/* Alertas */}
      {data.alertas.map((alerta, idx) => (
        <Alert 
          key={idx} 
          severity={alerta.tipo}
          sx={{ mb: 2 }}
        >
          <AlertTitle>{alerta.tipo === 'error' ? 'Crítico' : alerta.tipo === 'warning' ? 'Atenção' : 'Info'}</AlertTitle>
          {alerta.mensagem}
        </Alert>
      ))}

      {/* Índice de Certeza */}
      <IndicadorCerteza indice={data.indiceCerteza} />

      {/* Cards das Camadas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <CamadaCard
            titulo="Garantido"
            valor={data.camadas.garantido.valor}
            percentual={data.camadas.garantido.percentual}
            cor="success"
            icone={LocalAtm}
            subtitulo="Dinheiro já recebido"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CamadaCard
            titulo="Confirmado"
            valor={data.camadas.agendadoConfirmado.valor}
            percentual={data.camadas.agendadoConfirmado.percentual}
            cor="warning"
            icone={CheckCircle}
            subtitulo={`${data.camadas.agendadoConfirmado.quantidade || 0} agendamentos`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CamadaCard
            titulo="Pendente"
            valor={data.camadas.agendadoPendente.valor}
            percentual={data.camadas.agendadoPendente.percentual}
            cor="error"
            icone={Schedule}
            subtitulo={`${data.camadas.agendadoPendente.quantidade || 0} na agenda temp.`}
            onClick={() => setActiveTab(1)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <CamadaCard
            titulo="Total Previsto"
            valor={data.total}
            percentual={100}
            cor="primary"
            icone={TrendingUp}
            subtitulo={`Break-even: ${formatCurrency(data.custos.breakEven)}`}
          />
        </Grid>
      </Grid>

      {/* Break-even Info */}
      <Paper 
        sx={{ 
          p: 2, 
          mb: 3, 
          bgcolor: data.custos.margemSeguranca > 0 ? 'success.light' : 'error.light',
          color: data.custos.margemSeguranca > 0 ? 'success.contrastText' : 'error.contrastText'
        }}
      >
        <Typography variant="h6">
          {data.custos.margemSeguranca > 0 
            ? `✅ Margem de segurança: ${formatCurrency(data.custos.margemSeguranca)}`
            : `❌ Déficit: ${formatCurrency(Math.abs(data.custos.margemSeguranca))}`
          }
        </Typography>
        {data.custos.diasParaBreakEven > 0 && (
          <Typography variant="body2">
            Estimativa: {data.custos.diasParaBreakEven} dias para cobrir custos fixos
          </Typography>
        )}
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
          Custos fixos do mês: {formatCurrency(data.custos.fixos)}
        </Typography>
      </Paper>

      {/* Abas */}
      <Paper>
        <Tabs 
          value={activeTab} 
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Resumo" />
          <Tab 
            label={`Agenda Temporária (${data.camadas.agendadoPendente.quantidade || 0})`} 
            sx={{ color: data.camadas.agendadoPendente.quantidade > 0 ? 'error.main' : 'inherit' }}
          />
          <Tab label="Por Especialidade" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>Métricas Operacionais (últimos 90 dias)</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Taxa de Confirmação</Typography>
                    <Typography variant="h4" color="primary">
                      {Math.round(data.metricas.taxaConfirmacao24h * 100)}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Taxa de Presença</Typography>
                    <Typography variant="h4" color="primary">
                      {Math.round(data.metricas.taxaPresenca * 100)}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Pipeline</Typography>
                    <Typography variant="h4" color="primary">
                      {formatCurrency(data.camadas.pipeline.valor)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Certeza Média</Typography>
                    <Typography variant="h4" color={data.indiceCerteza >= 0.7 ? 'success' : data.indiceCerteza >= 0.4 ? 'warning' : 'error'}>
                      {Math.round(data.indiceCerteza * 100)}%
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {activeTab === 1 && (
            <AgendaTemporariaPanel 
              pendentes={pendingAppointments}
              loading={loadingPendentes || actionLoading}
              onRefresh={carregarPendentes}
              onConfirmar={handleConfirmar}
              onLiberar={handleLiberar}
            />
          )}

          {activeTab === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>Distribuição por Especialidade</Typography>
              {data.porEspecialidade.length === 0 ? (
                <Typography color="text.secondary">Nenhum dado disponível</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Especialidade</TableCell>
                      <TableCell align="right">Confirmado</TableCell>
                      <TableCell align="right">Pendente</TableCell>
                      <TableCell align="right">Total Bruto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.porEspecialidade.map((esp: any) => (
                      <TableRow key={esp.especialidade}>
                        <TableCell>{esp.especialidade}</TableCell>
                        <TableCell align="right">{formatCurrency(esp.confirmado)}</TableCell>
                        <TableCell align="right">{formatCurrency(esp.pendente)}</TableCell>
                        <TableCell align="right" fontWeight="bold">{formatCurrency(esp.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default ProvisionamentoTab;
