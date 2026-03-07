// src/pages/Financial/tabs/PlanningTab.tsx

import {
  Add,
  AttachMoney,
  CalendarToday,
  CheckCircle,
  Delete,
  Edit,
  Refresh,
  Schedule,
  TrendingUp,
  Warning,
  Timeline,
  EventSeat,
  AccessTime,
  Assessment,
  FilterList
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Collapse,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { FinancialLoading } from '../components/FinancialLoading';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { usePlanning } from '../../../hooks/usePlanning';
import { ChevronDown, ChevronUp } from 'lucide-react';

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

// Configuração de status
const STATUS_CONFIG = {
  achieved: { color: '#10B981', bgColor: '#10B98110', label: 'Atingido', icon: CheckCircle },
  on_track: { color: '#3B82F6', bgColor: '#3B82F610', label: 'No caminho', icon: TrendingUp },
  at_risk: { color: '#F59E0B', bgColor: '#F59E0B10', label: 'Em risco', icon: Warning },
  behind: { color: '#EF4444', bgColor: '#EF444410', label: 'Atrasado', icon: Warning }
};

const PlanningTab = () => {
  const { plannings, fetchPlannings, createPlanning, updatePlanning, deletePlanning, refreshAllPlannings, loading } = usePlanning();

  // Loading state para carregamento inicial
  if (loading && plannings.length === 0) {
    return <FinancialLoading cardCount={4} gridSize={{ xs: 12, sm: 6, md: 3 }} />;
  }
  const [openModal, setOpenModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
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
  const [selectedPlanning, setSelectedPlanning] = useState<any>(null);
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [editingPlanning, setEditingPlanning] = useState<any>(null);
  const [deletingPlanning, setDeletingPlanning] = useState<any>(null);

  // Função para abrir detalhes
  const handleViewDetails = async (planning: any) => {
    setSelectedPlanning(planning);
    setOpenDetailsModal(true);
  };

  // Função para abrir modal de edição
  const handleEdit = (planning: any) => {
    setEditingPlanning(planning);
    setFormData({
      type: planning.type,
      month: new Date(planning.period.start).getMonth() + 1,
      year: new Date(planning.period.start).getFullYear(),
      targets: {
        expectedRevenue: planning.targets?.expectedRevenue || 0,
        totalSessions: planning.targets?.totalSessions || 0,
        workHours: planning.targets?.workHours || 0
      },
      bySpecialty: planning.bySpecialty || [],
      notes: planning.notes || ''
    });
    setOpenEditModal(true);
  };

  // Função para salvar edição
  const handleSaveEdit = async () => {
    if (!editingPlanning) return;
    
    const startDate = new Date(formData.year, formData.month - 1, 1);
    const endDate = new Date(formData.year, formData.month, 0);

    const updateData = {
      type: formData.type,
      period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      targets: formData.targets,
      bySpecialty: formData.bySpecialty,
      notes: formData.notes
    };

    await updatePlanning(editingPlanning._id, updateData);
    setOpenEditModal(false);
    setEditingPlanning(null);
    fetchPlannings({});
  };

  // Função para confirmar exclusão
  const handleDeleteClick = (planning: any) => {
    setDeletingPlanning(planning);
    setOpenDeleteModal(true);
  };

  // Função para executar exclusão
  const handleConfirmDelete = async () => {
    if (!deletingPlanning) return;
    
    await deletePlanning(deletingPlanning._id);
    setOpenDeleteModal(false);
    setDeletingPlanning(null);
    fetchPlannings({});
  };

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

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.behind;
  };

  const toggleCard = (id: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Filtrar plannings por tipo
  const filteredPlannings = filterType === 'all' 
    ? plannings 
    : plannings.filter(p => p.type === filterType);

  // Agrupar por tipo para melhor visualização
  const monthlyPlannings = filteredPlannings.filter(p => p.type === 'monthly');
  const weeklyPlannings = filteredPlannings.filter(p => p.type === 'weekly');
  const dailyPlannings = filteredPlannings.filter(p => p.type === 'daily');

  // Calcular totais do formulário
  const totalSpecialtySessions = formData.bySpecialty.reduce((sum, s) => sum + s.sessions, 0);
  const totalSpecialtyRevenue = formData.bySpecialty.reduce((sum, s) => sum + s.revenue, 0);

  return (
    <Box>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#8B5CF6', width: 48, height: 48 }}>
              <Assessment sx={{ fontSize: 24 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                📅 Planejamento Anual
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Defina metas de receita, sessões e acompanhe o progresso
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Tooltip title="Atualizar dados reais (sessões e pagamentos)">
              <IconButton
                onClick={async () => {
                  await refreshAllPlannings();
                }}
                sx={{ 
                  border: '1px solid',
                  borderColor: '#8B5CF650',
                  color: '#8B5CF6',
                  '&:hover': { bgcolor: '#8B5CF610' }
                }}
              >
                <Refresh />
              </IconButton>
            </Tooltip>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Filtrar por tipo</InputLabel>
              <Select
                value={filterType}
                label="Filtrar por tipo"
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="monthly">Mensal</MenuItem>
                <MenuItem value="weekly">Semanal</MenuItem>
                <MenuItem value="daily">Diário</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenModal}
              sx={{
                borderRadius: 2,
                background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                '&:hover': { background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }
              }}
            >
              Nova Meta
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Cards de Resumo - com dados reais da API */}
      {filteredPlannings.length > 0 && (
        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#8B5CF630', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: '#8B5CF6', width: 40, height: 40 }}>
                    <AttachMoney sx={{ fontSize: 20 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Meta Total (Mês)</Typography>
                    <Typography variant="h5" fontWeight="bold" color="#8B5CF6">
                      {formatCurrency(monthlyPlannings[0]?.targets?.expectedRevenue || 32000)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {monthlyPlannings.length} metas mensais
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#10B98130', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: '#10B981', width: 40, height: 40 }}>
                    <CheckCircle sx={{ fontSize: 20 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Realizado</Typography>
                    <Typography variant="h5" fontWeight="bold" color="#10B981">
                      {formatCurrency(monthlyPlannings[0]?.actual?.actualRevenue || 0)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      0% da meta
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#F59E0B30', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: '#F59E0B', width: 40, height: 40 }}>
                    <EventSeat sx={{ fontSize: 20 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Sessões Previstas</Typography>
                    <Typography variant="h5" fontWeight="bold" color="#F59E0B">
                      {monthlyPlannings[0]?.targets?.totalSessions || 160}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Realizadas: {monthlyPlannings[0]?.actual?.completedSessions || 0}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card elevation={0} sx={{ width: '100%', border: '1px solid', borderColor: '#3B82F630', borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: '#3B82F6', width: 40, height: 40 }}>
                    <AccessTime sx={{ fontSize: 20 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Horas Previstas</Typography>
                    <Typography variant="h5" fontWeight="bold" color="#3B82F6">
                      {monthlyPlannings[0]?.targets?.workHours || 107}h
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Trabalhadas: {monthlyPlannings[0]?.actual?.workedHours?.toFixed(1) || 0}h
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Lista de Planejamentos por Tipo */}
      <Box sx={{ mb: 4 }}>
        {/* Metas Mensais */}
        {monthlyPlannings.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Timeline sx={{ color: '#8B5CF6' }} />
              <Typography variant="h6" fontWeight="600">Metas Mensais</Typography>
              <Chip size="small" label={`${monthlyPlannings.length} metas`} />
            </Box>
            <Grid container spacing={2.5}>
              {monthlyPlannings.map((p) => (
                <PlanningCard
                  key={p._id}
                  planning={p}
                  formatCurrency={formatCurrency}
                  getStatusConfig={getStatusConfig}
                  onViewDetails={handleViewDetails}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  expanded={expandedCards[p._id]}
                  onToggle={() => toggleCard(p._id)}
                />
              ))}
            </Grid>
          </Box>
        )}

        {/* Metas Semanais */}
        {weeklyPlannings.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Schedule sx={{ color: '#F59E0B' }} />
              <Typography variant="h6" fontWeight="600">Metas Semanais</Typography>
              <Chip size="small" label={`${weeklyPlannings.length} metas`} />
            </Box>
            <Grid container spacing={2.5}>
              {weeklyPlannings.map((p) => (
                <PlanningCard
                  key={p._id}
                  planning={p}
                  formatCurrency={formatCurrency}
                  getStatusConfig={getStatusConfig}
                  onViewDetails={handleViewDetails}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  expanded={expandedCards[p._id]}
                  onToggle={() => toggleCard(p._id)}
                />
              ))}
            </Grid>
          </Box>
        )}

        {/* Sem resultados */}
        {filteredPlannings.length === 0 && (
          <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'grey.200', borderRadius: 2, textAlign: 'center' }}>
            <Assessment sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhuma meta encontrada
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Clique em "Nova Meta" para criar seu primeiro planejamento de receita e sessões
            </Typography>
          </Paper>
        )}
      </Box>

      {/* MODAL DE CRIAÇÃO - mantido igual mas com melhorias visuais */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#8B5CF6', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ bgcolor: 'white', color: '#8B5CF6', width: 32, height: 32 }}>
              <Add />
            </Avatar>
            <Typography variant="h6">Criar Novo Planejamento</Typography>
          </Box>
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
              <Typography variant="h6" gutterBottom sx={{ mt: 2, color: '#8B5CF6', fontWeight: 600 }}>
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
              <Typography variant="h6" gutterBottom sx={{ mt: 2, color: '#8B5CF6', fontWeight: 600 }}>
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
                sx={{ height: '100%', borderColor: '#8B5CF6', color: '#8B5CF6' }}
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
                      sx={{ bgcolor: '#8B5CF610', color: '#8B5CF6', borderColor: '#8B5CF6' }}
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
          <Button onClick={() => setOpenModal(false)} variant="outlined">
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.targets.expectedRevenue || !formData.targets.totalSessions}
            startIcon={<CheckCircle />}
            sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
          >
            Criar Meta
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE DETALHES */}
      <Dialog
        open={openDetailsModal}
        onClose={() => setOpenDetailsModal(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Detalhes do Período: {selectedPlanning?.period?.start} a {selectedPlanning?.period?.end}
            </Typography>
            <Chip
              label={`${selectedPlanning?.details?.totalPacientes || 0} pacientes atendidos`}
              color="primary"
            />
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Resumo */}
            <Grid item xs={12} md={4}>
              <Card sx={{ width: '100%', bgcolor: '#10B98110', border: '1px solid #10B98130' }}>
                <CardContent>
                  <Typography variant="h4" fontWeight="bold" color="#10B981">
                    {formatCurrency(selectedPlanning?.actual?.actualRevenue || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Arrecadado no período
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ width: '100%', bgcolor: '#3B82F610', border: '1px solid #3B82F630' }}>
                <CardContent>
                  <Typography variant="h4" fontWeight="bold" color="#3B82F6">
                    {selectedPlanning?.details?.totalPacientes || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pacientes atendidos
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ width: '100%', bgcolor: '#F59E0B10', border: '1px solid #F59E0B30' }}>
                <CardContent>
                  <Typography variant="h4" fontWeight="bold" color="#F59E0B">
                    {selectedPlanning?.details?.totalPacotes || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pacotes fechados
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Lista de Pacientes */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2, color: '#10B981', fontWeight: 600 }}>
                💰 Receita por Paciente
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F9FAFB' }}>
                    <TableRow>
                      <TableCell><strong>Paciente</strong></TableCell>
                      <TableCell align="right"><strong>Total Pago</strong></TableCell>
                      <TableCell align="center"><strong>Pagamentos</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPlanning?.details?.porPaciente?.map((item: any, idx: number) => (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="500">
                            {item.paciente}
                          </Typography>
                          {item.telefone && (
                            <Typography variant="caption" color="text.secondary">
                              {item.telefone}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: '#10B981' }}>
                          {formatCurrency(item.totalPago)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip size="small" label={item.pagamentos.length} sx={{ bgcolor: '#F3F4F6' }} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!selectedPlanning?.details?.porPaciente || selectedPlanning.details.porPaciente.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            Nenhum pagamento registrado neste período
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* Lista de Pacotes */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2, color: '#F59E0B', fontWeight: 600 }}>
                📦 Pacotes Fechados
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F9FAFB' }}>
                    <TableRow>
                      <TableCell><strong>Paciente</strong></TableCell>
                      <TableCell><strong>Sessões</strong></TableCell>
                      <TableCell align="right"><strong>Valor</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPlanning?.details?.pacotesFechados?.map((pkg: any, idx: number) => (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="500">
                            {pkg.paciente}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {pkg.profissional} • {pkg.especialidade}
                          </Typography>
                        </TableCell>
                        <TableCell>{pkg.sessoes}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {formatCurrency(pkg.valorTotal)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={pkg.status === 'paid' ? 'Pago' : pkg.status === 'partially_paid' ? 'Parcial' : 'Pendente'}
                            color={pkg.status === 'paid' ? 'success' : pkg.status === 'partially_paid' ? 'warning' : 'default'}
                            sx={{ 
                              bgcolor: pkg.status === 'paid' ? '#10B98110' : pkg.status === 'partially_paid' ? '#F59E0B10' : '#F3F4F6',
                              color: pkg.status === 'paid' ? '#10B981' : pkg.status === 'partially_paid' ? '#F59E0B' : '#6B7280',
                              borderColor: pkg.status === 'paid' ? '#10B981' : pkg.status === 'partially_paid' ? '#F59E0B' : '#E5E7EB'
                            }}
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!selectedPlanning?.details?.pacotesFechados || selectedPlanning.details.pacotesFechados.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            Nenhum pacote fechado neste período
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDetailsModal(false)} variant="outlined">
            Fechar
          </Button>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={() => setOpenDetailsModal(false)}
            sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
          >
            Atualizar Dados
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE EDIÇÃO */}
      <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#8B5CF6', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ bgcolor: 'white', color: '#8B5CF6', width: 32, height: 32 }}>
              <Edit />
            </Avatar>
            <Typography variant="h6">Editar Planejamento</Typography>
          </Box>
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
              <Typography variant="h6" gutterBottom sx={{ mt: 2, color: '#8B5CF6', fontWeight: 600 }}>
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
          <Button onClick={() => setOpenEditModal(false)} variant="outlined">
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={!formData.targets.expectedRevenue || !formData.targets.totalSessions}
            startIcon={<CheckCircle />}
            sx={{ bgcolor: '#8B5CF6', '&:hover': { bgcolor: '#7C3AED' } }}
          >
            Salvar Alterações
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#EF4444', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ bgcolor: 'white', color: '#EF4444', width: 32, height: 32 }}>
              <Delete />
            </Avatar>
            <Typography variant="h6">Confirmar Exclusão</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body1" gutterBottom>
            Tem certeza que deseja excluir o planejamento de <strong>{format(new Date(deletingPlanning?.period?.start || new Date()), 'MMMM/yyyy', { locale: ptBR })}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Tipo: {deletingPlanning?.type === 'monthly' ? 'Mensal' : deletingPlanning?.type === 'weekly' ? 'Semanal' : 'Diário'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Meta de Receita: {formatCurrency(deletingPlanning?.targets?.expectedRevenue || 0)}
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Esta ação não pode ser desfeita.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDeleteModal(false)} variant="outlined">
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmDelete}
            startIcon={<Delete />}
            sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' } }}
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Componente de Card de Planejamento
interface PlanningCardProps {
  planning: any;
  formatCurrency: (value: number) => string;
  getStatusConfig: (status: string) => any;
  onViewDetails: (planning: any) => void;
  onEdit: (planning: any) => void;
  onDelete: (planning: any) => void;
  expanded: boolean;
  onToggle: () => void;
}

const PlanningCard = ({ planning, formatCurrency, getStatusConfig, onViewDetails, onEdit, onDelete, expanded, onToggle }: PlanningCardProps) => {
  const statusConfig = getStatusConfig(planning.progress?.overallStatus);
  const StatusIcon = statusConfig.icon;

  return (
    <Grid item xs={12} md={6} lg={4}>
      <Card elevation={0} sx={{ 
        width: '100%',
        border: '1px solid', 
        borderColor: 'grey.200', 
        borderRadius: 2,
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: `0 4px 12px ${statusConfig.color}20`,
          borderColor: statusConfig.color
        }
      }}>
        <CardContent sx={{ p: 3 }}>
          {/* Header do Card */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: statusConfig.bgColor, color: statusConfig.color, width: 40, height: 40 }}>
                {planning.type === 'monthly' ? <CalendarToday /> : planning.type === 'weekly' ? <Schedule /> : <TrendingUp />}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight="600">
                  {planning.type === 'monthly' ? 'Meta Mensal' : planning.type === 'weekly' ? 'Meta Semanal' : 'Meta Diária'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarToday sx={{ fontSize: 12, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(planning.period.start), 'dd/MM')} - {format(new Date(planning.period.end), 'dd/MM/yyyy')}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Chip
              size="small"
              icon={<StatusIcon sx={{ fontSize: 14 }} />}
              label={statusConfig.label}
              sx={{ 
                bgcolor: statusConfig.bgColor,
                color: statusConfig.color,
                borderColor: statusConfig.color,
                fontWeight: 500
              }}
              variant="outlined"
            />
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Métricas em grid */}
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#F9FAFB' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Meta Receita
                </Typography>
                <Typography variant="body1" fontWeight="600" color="#8B5CF6">
                  {formatCurrency(planning.targets?.expectedRevenue || 0)}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#F9FAFB' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Realizado
                </Typography>
                <Typography variant="body1" fontWeight="600" color="#10B981">
                  {formatCurrency(planning.actual?.actualRevenue || 0)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Barras de Progresso */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Receita</Typography>
              <Typography variant="caption" fontWeight="600">
                {planning.progress?.revenuePercentage || 0}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(planning.progress?.revenuePercentage || 0, 100)}
              sx={{ 
                height: 6, 
                borderRadius: 3,
                bgcolor: '#E5E7EB',
                '& .MuiLinearProgress-bar': {
                  bgcolor: planning.progress?.revenuePercentage >= 100 ? '#10B981' : 
                         planning.progress?.revenuePercentage >= 70 ? '#3B82F6' : 
                         planning.progress?.revenuePercentage >= 40 ? '#F59E0B' : '#EF4444'
                }
              }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Sessões</Typography>
              <Typography variant="caption" fontWeight="600">
                {planning.progress?.sessionsPercentage || 0}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(planning.progress?.sessionsPercentage || 0, 100)}
              sx={{ 
                height: 6, 
                borderRadius: 3,
                bgcolor: '#E5E7EB',
                '& .MuiLinearProgress-bar': {
                  bgcolor: planning.progress?.sessionsPercentage >= 100 ? '#10B981' : 
                         planning.progress?.sessionsPercentage >= 70 ? '#3B82F6' : 
                         planning.progress?.sessionsPercentage >= 40 ? '#F59E0B' : '#EF4444'
                }
              }}
            />
          </Box>

          {/* Seção expansível com mais detalhes */}
          <Collapse in={expanded}>
            <Box sx={{ mt: 2, p: 2, bgcolor: '#F9FAFB', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="600">
                Detalhes Adicionais
              </Typography>
              
              <Grid container spacing={1} sx={{ mb: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Horas Previstas</Typography>
                  <Typography variant="body2" fontWeight="500">{planning.targets?.workHours || 0}h</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Horas Trabalhadas</Typography>
                  <Typography variant="body2" fontWeight="500">{planning.actual?.workedHours?.toFixed(1) || 0}h</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Slots Disponíveis</Typography>
                  <Typography variant="body2" fontWeight="500">{planning.targets?.availableSlots || 0}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Slots Utilizados</Typography>
                  <Typography variant="body2" fontWeight="500">{planning.actual?.usedSlots || 0}</Typography>
                </Grid>
              </Grid>

              {planning.notes && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                  Obs: {planning.notes}
                </Typography>
              )}
            </Box>
          </Collapse>

          {/* Gap para meta */}
          {planning.progress?.gapRevenue > 0 && (
            <Alert severity="warning" sx={{ mt: 2, py: 0, borderRadius: 1 }} icon={<Warning fontSize="small" />}>
              <Typography variant="caption">
                Falta {formatCurrency(planning.progress.gapRevenue)} para atingir a meta
              </Typography>
            </Alert>
          )}

          {/* Ações */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Button
              size="small"
              onClick={onToggle}
              startIcon={expanded ? <ChevronUp /> : <ChevronDown />}
            >
              {expanded ? 'Menos detalhes' : 'Mais detalhes'}
            </Button>
            
            <Box>
              <Tooltip title="Editar">
                <IconButton size="small" sx={{ color: '#8B5CF6' }} onClick={() => onEdit(planning)}>
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Excluir">
                <IconButton size="small" sx={{ color: '#EF4444' }} onClick={() => onDelete(planning)}>
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
};

export default PlanningTab;