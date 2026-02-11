import {
  Add,
  AttachMoney,
  CalendarToday,
  CheckCircle,
  Delete,
  Edit,
  Schedule,
  TrendingUp,
  Warning
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card, CardContent,
  Chip, Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { usePlanning } from '../../../hooks/usePlanning';

interface PlanningFormData {
  type: 'daily' | 'weekly' | 'monthly';
  month: number;
  year: number;
  targets: {
    expectedRevenue: number;
    totalSessions: number;
    workHours: number;
  };
  bySpecialty: Array<{
    specialty: string;
    sessions: number;
    revenue: number;
  }>;
  notes: string;
}

const PlanningTab = () => {
  const { plannings, fetchPlannings, createPlanning, loading } = usePlanning();
  const [openModal, setOpenModal] = useState(false);
  const [formData, setFormData] = useState<PlanningFormData>({
    type: 'monthly',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    targets: {
      expectedRevenue: 0,
      totalSessions: 0,
      workHours: 0
    },
    bySpecialty: [],
    notes: ''
  });

  const [newSpecialty, setNewSpecialty] = useState({ specialty: '', sessions: 0, revenue: 0 });

  useEffect(() => {
    fetchPlannings({});
  }, [fetchPlannings]);

  const handleOpenModal = () => {
    setFormData({
      type: 'monthly',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      targets: {
        expectedRevenue: 0,
        totalSessions: 0,
        workHours: 0
      },
      bySpecialty: [],
      notes: ''
    });
    setOpenModal(true);
  };

  const handleAddSpecialty = () => {
    if (newSpecialty.specialty && newSpecialty.sessions > 0) {
      setFormData(prev => ({
        ...prev,
        bySpecialty: [...prev.bySpecialty, newSpecialty]
      }));
      setNewSpecialty({ specialty: '', sessions: 0, revenue: 0 });
    }
  };

  const handleSave = async () => {
    await createPlanning(formData);
    setOpenModal(false);
    fetchPlannings({});
  };

  const formatCurrency = (value: number) =>
    `R$ ${value?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'achieved': return 'success';
      case 'on_track': return 'info';
      case 'at_risk': return 'warning';
      case 'behind': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'achieved': return 'Atingido';
      case 'on_track': return 'No caminho';
      case 'at_risk': return 'Em risco';
      case 'behind': return 'Atrasado';
      default: return status;
    }
  };

  // Calcular totais do formulário
  const totalSpecialtySessions = formData.bySpecialty.reduce((sum, s) => sum + s.sessions, 0);
  const totalSpecialtyRevenue = formData.bySpecialty.reduce((sum, s) => sum + s.revenue, 0);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Planejamento Financeiro
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Defina metas de receita, sessões e acompanhe o progresso
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenModal}
          size="large"
        >
          Nova Meta
        </Button>
      </Box>

      {/* Cards de Resumo */}
      {plannings.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
              <CardContent>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Meta Total (Mês)</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {formatCurrency(plannings[0]?.targets?.expectedRevenue || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: 'success.main', color: 'success.contrastText' }}>
              <CardContent>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Realizado</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {formatCurrency(plannings[0]?.actual?.actualRevenue || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Sessões Previstas</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {plannings[0]?.targets?.totalSessions || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Realizadas: {plannings[0]?.actual?.completedSessions || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary">Horas Previstas</Typography>
                <Typography variant="h4" fontWeight="bold">
                  {plannings[0]?.targets?.workHours || 0}h
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Trabalhadas: {plannings[0]?.actual?.workedHours?.toFixed(1) || 0}h
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Lista de Planejamentos */}
      <Grid container spacing={3}>
        {plannings.map((p) => (
          <Grid item xs={12} md={6} lg={4} key={p._id}>
            <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
              <CardContent>
                {/* Header do Card */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ bgcolor: p.type === 'monthly' ? 'primary.main' : p.type === 'weekly' ? 'warning.main' : 'info.main' }}>
                      {p.type === 'monthly' ? <CalendarToday /> : p.type === 'weekly' ? <Schedule /> : <TrendingUp />}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {p.type === 'monthly' ? 'Meta Mensal' : p.type === 'weekly' ? 'Meta Semanal' : 'Meta Diária'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(p.period.start), 'dd/MM/yyyy')} até {format(new Date(p.period.end), 'dd/MM/yyyy')}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    size="small"
                    label={getStatusLabel(p.progress?.overallStatus)}
                    color={getStatusColor(p.progress?.overallStatus) as any}
                  />
                </Box>

                <Divider sx={{ my: 1.5 }} />

                {/* Progresso de Receita */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      <AttachMoney fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      Receita
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {p.progress?.revenuePercentage || 0}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(p.progress?.revenuePercentage || 0, 100)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Meta: {formatCurrency(p.targets?.expectedRevenue || 0)}
                    </Typography>
                    <Typography variant="caption" color="success.main" fontWeight="bold">
                      Real: {formatCurrency(p.actual?.actualRevenue || 0)}
                    </Typography>
                  </Box>
                </Box>

                {/* Progresso de Sessões */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      <Schedule fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      Sessões
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {p.progress?.sessionsPercentage || 0}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(p.progress?.sessionsPercentage || 0, 100)}
                    color="secondary"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Prev: {p.targets?.totalSessions || 0}
                    </Typography>
                    <Typography variant="caption" color="success.main" fontWeight="bold">
                      Real: {p.actual?.completedSessions || 0}
                    </Typography>
                  </Box>
                </Box>

                {/* Detalhes por Especialidade */}
                {p.bySpecialty && p.bySpecialty.length > 0 && (
                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" gutterBottom>
                      Por Especialidade:
                    </Typography>
                    {p.bySpecialty.map((spec: any, idx: number) => (
                      <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption">{spec.specialty}</Typography>
                        <Typography variant="caption" fontWeight="bold">
                          {spec.sessions} sessões
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Gap para meta */}
                {p.progress?.gapRevenue > 0 && (
                  <Alert severity="warning" sx={{ mt: 2 }} icon={<Warning fontSize="small" />}>
                    <Typography variant="caption">
                      Falta {formatCurrency(p.progress.gapRevenue)} para atingir a meta
                    </Typography>
                  </Alert>
                )}

                {/* Notas */}
                {p.notes && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                    Obs: {p.notes}
                  </Typography>
                )}

                {/* Ações */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                  <Tooltip title="Editar">
                    <IconButton size="small" color="primary">
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir">
                    <IconButton size="small" color="error">
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {plannings.length === 0 && (
          <Grid item xs={12}>
            <Alert severity="info" sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" gutterBottom>
                Nenhuma meta cadastrada
              </Typography>
              <Typography variant="body2">
                Clique em "Nova Meta" para criar seu primeiro planejamento de receita e sessões
              </Typography>
            </Alert>
          </Grid>
        )}
      </Grid>

      {/* MODAL DE CRIAÇÃO */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          Criar Novo Planejamento
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Tipo e Período */}
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Tipo de Meta"
                fullWidth
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
              >
                <MenuItem value="daily">Diária</MenuItem>
                <MenuItem value="weekly">Semanal</MenuItem>
                <MenuItem value="monthly">Mensal</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Mês"
                fullWidth
                value={formData.month}
                onChange={(e) => setFormData(prev => ({ ...prev, month: Number(e.target.value) }))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    {format(new Date(2024, i), 'MMMM', { locale: ptBR })}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Ano"
                fullWidth
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: Number(e.target.value) }))}
              >
                {[2025, 2026, 2027].map(y => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Metas Principais */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Metas Principais
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Meta de Receita (R$)"
                type="number"
                fullWidth
                value={formData.targets.expectedRevenue}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  targets: { ...prev.targets, expectedRevenue: Number(e.target.value) }
                }))}
                InputProps={{ startAdornment: 'R$' }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Total de Sessões"
                type="number"
                fullWidth
                value={formData.targets.totalSessions}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  targets: { ...prev.targets, totalSessions: Number(e.target.value) }
                }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Horas de Trabalho"
                type="number"
                fullWidth
                value={formData.targets.workHours}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  targets: { ...prev.targets, workHours: Number(e.target.value) }
                }))}
              />
            </Grid>

            {/* Especialidades */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Distribuição por Especialidade
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Total: {totalSpecialtySessions} sessões / {formatCurrency(totalSpecialtyRevenue)}
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Especialidade"
                value={newSpecialty.specialty}
                onChange={(e) => setNewSpecialty(prev => ({ ...prev, specialty: e.target.value }))}
                placeholder="Ex: Fonoaudiologia"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Sessões"
                type="number"
                value={newSpecialty.sessions}
                onChange={(e) => setNewSpecialty(prev => ({ ...prev, sessions: Number(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Receita Esperada"
                type="number"
                value={newSpecialty.revenue}
                onChange={(e) => setNewSpecialty(prev => ({ ...prev, revenue: Number(e.target.value) }))}
                InputProps={{ startAdornment: 'R$' }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                onClick={handleAddSpecialty}
                fullWidth
                sx={{ height: '100%' }}
              >
                Adicionar
              </Button>
            </Grid>

            {/* Lista de Especialidades Adicionadas */}
            {formData.bySpecialty.length > 0 && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {formData.bySpecialty.map((spec, idx) => (
                    <Chip
                      key={idx}
                      label={`${spec.specialty}: ${spec.sessions} sessões (${formatCurrency(spec.revenue)})`}
                      onDelete={() => {
                        setFormData(prev => ({
                          ...prev,
                          bySpecialty: prev.bySpecialty.filter((_, i) => i !== idx)
                        }));
                      }}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Grid>
            )}

            {/* Notas */}
            <Grid item xs={12}>
              <TextField
                label="Observações"
                multiline
                rows={3}
                fullWidth
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Detalhes adicionais sobre o planejamento..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.targets.expectedRevenue || !formData.targets.totalSessions}
            startIcon={<CheckCircle />}
          >
            Criar Meta
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlanningTab;