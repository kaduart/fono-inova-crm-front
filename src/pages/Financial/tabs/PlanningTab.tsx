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
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
  Tabs,
  Tab,
} from '@mui/material';
import { FinancialLoading } from '../components/FinancialLoading';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState, useMemo } from 'react';
import { usePlanning } from '../../../hooks/usePlanning';
import { useFinancialDashboard } from '../../../hooks/useFinancialDashboard';
import { planningService } from '../../../services/planningService';
import { toast } from 'react-toastify';
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

interface MonthData {
  month: number;
  year: number;
  label: string;
  fullLabel: string;
}

// Configuração de status
const STATUS_CONFIG = {
  achieved: { color: '#10B981', bgColor: '#10B98110', label: 'Atingido', icon: CheckCircle },
  on_track: { color: '#3B82F6', bgColor: '#3B82F610', label: 'No caminho', icon: TrendingUp },
  at_risk: { color: '#F59E0B', bgColor: '#F59E0B10', label: 'Em risco', icon: Warning },
  behind: { color: '#EF4444', bgColor: '#EF444410', label: 'Atrasado', icon: Warning }
};

interface PlanningTabProps {
  month: number;
  year: number;
}

const PlanningTab = ({ month, year }: PlanningTabProps) => {
  const { plannings, fetchPlannings, createPlanning, updatePlanning, deletePlanning, refreshAllPlannings, loading } = usePlanning();
  const { data: dashData, fetchDashboard } = useFinancialDashboard();

  const [openModal, setOpenModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  
  const [selectedTab, setSelectedTab] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  
  const getMonthKey = (m: number, y: number) => `${y}-${m}`;
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(getMonthKey(month, year));

  useEffect(() => {
    setSelectedMonthKey(getMonthKey(month, year));
  }, [month, year]);
  
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

  // Gerar meses para navegação (mês selecionado + 2 anteriores)
  const last3Months: MonthData[] = useMemo(() => {
    const months: MonthData[] = [];
    const base = new Date(year, month - 1, 1);
    for (let i = 0; i < 3; i++) {
      const d = subMonths(base, i);
      months.push({
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        label: format(d, 'MMM', { locale: ptBR }).toUpperCase(),
        fullLabel: format(d, 'MMMM/yyyy', { locale: ptBR }).toUpperCase()
      });
    }
    return months;
  }, [month, year]);

  const getPlanningMonthYear = (planning: any) => {
    const startStr = planning.period.start;
    if (typeof startStr === 'string' && startStr.includes('-')) {
      const parts = startStr.split('-');
      if (parts.length >= 2) {
        return { 
          year: parseInt(parts[0], 10), 
          month: parseInt(parts[1], 10) 
        };
      }
    }
    const startDate = new Date(startStr);
    return { month: startDate.getMonth() + 1, year: startDate.getFullYear() };
  };

  const selectedMonthData = useMemo(() => {
    const [year, month] = selectedMonthKey.split('-').map(Number);
    return { year, month };
  }, [selectedMonthKey]);

  const planningsOfSelectedMonth = useMemo(() => {
    return plannings.filter(p => {
      const { month, year } = getPlanningMonthYear(p);
      return month === selectedMonthData.month && year === selectedMonthData.year;
    });
  }, [plannings, selectedMonthData]);

  const monthlyOfMonth = planningsOfSelectedMonth.find(p => p.type === 'monthly');
  const weeklyOfMonth = planningsOfSelectedMonth
    .filter(p => p.type === 'weekly')
    .sort((a, b) => new Date(a.period.start).getTime() - new Date(b.period.start).getTime());
  const dailyOfMonth = planningsOfSelectedMonth
    .filter(p => p.type === 'daily')
    .sort((a, b) => new Date(a.period.start).getTime() - new Date(b.period.start).getTime());

  const handleViewDetails = async (planning: any) => {
    setSelectedPlanning(planning);
    setOpenDetailsModal(true);
  };

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

  const handleDeleteClick = (planning: any) => {
    setDeletingPlanning(planning);
    setOpenDeleteModal(true);
  };

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

  useEffect(() => {
    const { year, month } = selectedMonthData;
    fetchDashboard(month, year);
  }, [selectedMonthData]);

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
    if (formData.type === 'weekly') {
      await planningService.generateWeeklyForMonth({
        month: formData.month,
        year: formData.year,
        monthlyRevenue: formData.targets.expectedRevenue,
        totalSessions: formData.targets.totalSessions,
        workHours: formData.targets.workHours
      });
      toast.success('Semanas do mês geradas com sucesso!');
    } else {
      await createPlanning(formData);
    }
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

  const totalSpecialtySessions = formData.bySpecialty.reduce((sum, s) => sum + s.sessions, 0);
  const totalSpecialtyRevenue = formData.bySpecialty.reduce((sum, s) => sum + s.revenue, 0);

  const isCurrentMonth = selectedMonthKey === getCurrentMonthKey();
  const selectedMonthLabel = last3Months.find(m => `${m.year}-${m.month}` === selectedMonthKey)?.fullLabel || '';

  if (loading && plannings.length === 0) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
          📅 Planejamento Anual
        </Typography>
        <FinancialLoading cardCount={4} gridSize={{ xs: 12, sm: 6, md: 3 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          border: '1px solid',
          borderColor: 'grey.200',
          borderRadius: 2,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: '#8B5CF6', width: 44, height: 44 }}>
            <Assessment sx={{ fontSize: 22 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Planejamento Anual
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Defina metas de receita, sessões e acompanhe o progresso
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Atualizar dados reais">
            <IconButton
              onClick={async () => await refreshAllPlannings()}
              sx={{ border: '1px solid', borderColor: '#8B5CF650', color: '#8B5CF6' }}
              size="small"
            >
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenModal}
            sx={{
              borderRadius: 1.5,
              background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
              textTransform: 'none',
              px: 2,
              py: 0.75,
              fontSize: '0.875rem',
            }}
          >
            Nova Meta
          </Button>
        </Box>
      </Paper>

      {/* NAVEGAÇÃO: Seletor de Meses (últimos 3 meses) */}
      <Paper
        elevation={0}
        sx={{ p: 1.5, mb: 3, border: '1px solid', borderColor: 'grey.200', borderRadius: 2 }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Selecione o período:
        </Typography>
        <ToggleButtonGroup
          value={selectedMonthKey}
          exclusive
          onChange={(e, value) => value && setSelectedMonthKey(value)}
          sx={{
            width: '100%',
            '& .MuiToggleButton-root': {
              flex: 1,
              py: 1,
              borderRadius: '8px !important',
              mx: 0.5,
              border: '2px solid transparent !important',
              '&.Mui-selected': {
                bgcolor: '#8B5CF6',
                color: 'white',
                borderColor: '#8B5CF6 !important',
              },
              '&:not(.Mui-selected)': {
                bgcolor: '#F3F4F6',
                color: '#6B7280',
              },
            },
          }}
        >
          {last3Months.map((m) => (
            <ToggleButton key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" fontWeight="600">
                  {m.label}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {m.year}
                </Typography>
                {`${m.year}-${m.month}` === getCurrentMonthKey() && (
                  <Chip
                    size="small"
                    label="ATUAL"
                    sx={{
                      height: 16,
                      fontSize: '8px',
                      fontWeight: 'bold',
                      ml: 1,
                      bgcolor: 'rgba(255,255,255,0.3)',
                      color: 'inherit',
                    }}
                  />
                )}
              </Box>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Paper>

      {/* KPIs do MÊS SELECIONADO */}
      {monthlyOfMonth && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <CalendarToday sx={{ color: '#8B5CF6', fontSize: 20 }} />
            <Typography variant="subtitle1" fontWeight="700" sx={{ color: '#8B5CF6' }}>
              {selectedMonthLabel}
            </Typography>
            {isCurrentMonth && (
              <Chip size="small" label="Em andamento" sx={{ bgcolor: '#8B5CF620', color: '#8B5CF6', fontSize: '0.7rem' }} />
            )}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#8B5CF6', width: 36, height: 36 }}>
                      <AttachMoney sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Meta do Mês
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color="#8B5CF6">
                        {formatCurrency(monthlyOfMonth?.targets?.expectedRevenue || 0)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#10B981', width: 36, height: 36 }}>
                      <CheckCircle sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Realizado
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color="#10B981">
                        {formatCurrency(dashData?.resumo?.caixa || monthlyOfMonth?.actual?.actualRevenue || 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {monthlyOfMonth?.targets?.expectedRevenue > 0
                          ? (((dashData?.resumo?.caixa || 0) / monthlyOfMonth.targets.expectedRevenue) * 100).toFixed(0)
                          : (monthlyOfMonth?.progress?.revenuePercentage || 0).toFixed(0)}% da meta
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#F59E0B', width: 36, height: 36 }}>
                      <EventSeat sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Sessões
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color="#F59E0B">
                        {monthlyOfMonth?.actual?.completedSessions || 0} / {monthlyOfMonth?.targets?.totalSessions || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(monthlyOfMonth?.progress?.sessionsPercentage || 0).toFixed(0)}% realizadas
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#3B82F6', width: 36, height: 36 }}>
                      <AccessTime sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        Horas
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color="#3B82F6">
                        {monthlyOfMonth?.actual?.workedHours?.toFixed(0) || 0}h / {monthlyOfMonth?.targets?.workHours || 0}h
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* TABS: DIA | SEMANA | MENSAL */}
      <Paper
        elevation={0}
        sx={{ border: '1px solid', borderColor: isCurrentMonth ? '#8B5CF630' : 'grey.200', borderRadius: 2, overflow: 'hidden' }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#FAFAFF' }}>
          <Tabs
            value={selectedTab}
            onChange={(e, v) => setSelectedTab(v)}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                py: 1.5,
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.875rem',
                color: '#6B7280',
                '&.Mui-selected': {
                  color: selectedTab === 'daily' ? '#3B82F6' : selectedTab === 'weekly' ? '#F59E0B' : '#8B5CF6',
                  bgcolor: 'white',
                },
              },
              '& .MuiTabs-indicator': {
                height: 3,
                bgcolor: selectedTab === 'daily' ? '#3B82F6' : selectedTab === 'weekly' ? '#F59E0B' : '#8B5CF6',
              },
            }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarToday sx={{ fontSize: 16 }} />
                  <span>Diário</span>
                  {dailyOfMonth.length > 0 && (
                    <Chip size="small" label={dailyOfMonth.length} sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#3B82F620' }} />
                  )}
                </Box>
              }
              value="daily"
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Schedule sx={{ fontSize: 16 }} />
                  <span>Semanal</span>
                  {weeklyOfMonth.length > 0 && (
                    <Chip size="small" label={weeklyOfMonth.length} sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#F59E0B20' }} />
                  )}
                </Box>
              }
              value="weekly"
            />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Timeline sx={{ fontSize: 16 }} />
                  <span>Mensal</span>
                  {monthlyOfMonth && (
                    <Chip size="small" label="1" sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#8B5CF620' }} />
                  )}
                </Box>
              }
              value="monthly"
            />
          </Tabs>
        </Box>

        <Box sx={{ p: 2.5, bgcolor: 'white' }}>
          {/* TAB: MENSAL */}
          {selectedTab === 'monthly' && (
            <Box>
              {monthlyOfMonth ? (
                <PlanningCard
                  planning={monthlyOfMonth}
                  formatCurrency={formatCurrency}
                  getStatusConfig={getStatusConfig}
                  onViewDetails={handleViewDetails}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  expanded={expandedCards[monthlyOfMonth._id]}
                  onToggle={() => toggleCard(monthlyOfMonth._id)}
                  isMonthly
                />
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Timeline sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Nenhuma meta mensal
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {selectedMonthLabel} não possui uma meta mensal definida
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, type: 'monthly' }));
                      setOpenModal(true);
                    }}
                    sx={{ borderRadius: 1.5, bgcolor: '#8B5CF6' }}
                  >
                    Criar Meta Mensal
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* TAB: SEMANAL */}
          {selectedTab === 'weekly' && (
            <Box>
              {weeklyOfMonth.length > 0 ? (
                <Grid container spacing={2}>
                  {weeklyOfMonth.map((p, idx) => (
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
                      weekNumber={idx + 1}
                    />
                  ))}
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Schedule sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Nenhuma meta semanal
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {selectedMonthLabel} não possui metas semanais definidas
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, type: 'weekly' }));
                      setOpenModal(true);
                    }}
                    sx={{ borderRadius: 1.5, bgcolor: '#F59E0B' }}
                  >
                    Criar Metas Semanais
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* TAB: DIÁRIA */}
          {selectedTab === 'daily' && (
            <Box>
              {dailyOfMonth.length > 0 ? (
                <Grid container spacing={2}>
                  {dailyOfMonth.map((p) => (
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
                      isDaily
                    />
                  ))}
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <CalendarToday sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Nenhuma meta diária
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {selectedMonthLabel} não possui metas diárias definidas
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, type: 'daily' }));
                      setOpenModal(true);
                    }}
                    sx={{ borderRadius: 1.5, bgcolor: '#3B82F6' }}
                  >
                    Criar Meta Diária
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Paper>


      {/* MODAL DE CRIAÇÃO */}
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

            {formData.type === 'weekly' && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 1 }}>
                  <strong>Geração automática de semanas</strong><br />
                  Informe a <strong>meta mensal total</strong>. O sistema cria <strong>4 semanas</strong> automaticamente.
                </Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2, color: '#8B5CF6', fontWeight: 600 }}>
                {formData.type === 'weekly' ? 'Meta Mensal Total (dividida automaticamente)' : 'Metas Principais'}
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label={formData.type === 'weekly' ? 'Meta Mensal Total (R$)' : 'Meta de Receita (R$)'}
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

            {formData.type !== 'weekly' && (<>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2, color: '#8B5CF6', fontWeight: 600 }}>
                  Distribuição por Especialidade
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Total: {totalSpecialtySessions} sessões / {formatCurrency(totalSpecialtyRevenue)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField label="Especialidade" value={newSpecialty.specialty} onChange={(e) => setNewSpecialty(prev => ({ ...prev, specialty: e.target.value }))} placeholder="Ex: Fonoaudiologia" />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField label="Sessões" type="number" value={newSpecialty.sessions} onChange={(e) => setNewSpecialty(prev => ({ ...prev, sessions: Number(e.target.value) }))} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField label="Receita Esperada" type="number" value={newSpecialty.revenue} onChange={(e) => setNewSpecialty(prev => ({ ...prev, revenue: Number(e.target.value) }))} InputProps={{ startAdornment: 'R$' }} />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button variant="outlined" onClick={handleAddSpecialty} fullWidth sx={{ height: '100%', borderColor: '#8B5CF6', color: '#8B5CF6' }}>Adicionar</Button>
              </Grid>
              {formData.bySpecialty.length > 0 && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {formData.bySpecialty.map((spec, idx) => (
                      <Chip key={idx} label={`${spec.specialty}: ${spec.sessions} sessões (${formatCurrency(spec.revenue)})`}
                        onDelete={() => setFormData(prev => ({ ...prev, bySpecialty: prev.bySpecialty.filter((_, i) => i !== idx) }))}
                        sx={{ bgcolor: '#8B5CF610', color: '#8B5CF6', borderColor: '#8B5CF6' }} variant="outlined" />
                    ))}
                  </Box>
                </Grid>
              )}
            </>)}

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
      <Dialog open={openDetailsModal} onClose={() => setOpenDetailsModal(false)} maxWidth="lg" fullWidth>
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
            <Grid item xs={12} md={4}>
              <TextField select label="Tipo de Meta" fullWidth value={formData.type} disabled>
                <MenuItem value="daily">Diária</MenuItem>
                <MenuItem value="weekly">Semanal</MenuItem>
                <MenuItem value="monthly">Mensal</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select label="Mês" fullWidth value={formData.month} disabled>
                {Array.from({ length: 12 }, (_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    {format(new Date(2024, i), 'MMMM', { locale: ptBR })}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select label="Ano" fullWidth value={formData.year} disabled>
                {[2025, 2026, 2027].map(y => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </TextField>
            </Grid>

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

            <Grid item xs={12}>
              <TextField
                label="Observações"
                multiline
                rows={3}
                fullWidth
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
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
  isMonthly?: boolean;
  isDaily?: boolean;
  weekNumber?: number;
}

const PlanningCard = ({
  planning,
  formatCurrency,
  getStatusConfig,
  onViewDetails,
  onEdit,
  onDelete,
  expanded,
  onToggle,
  isMonthly,
  isDaily,
  weekNumber,
}: PlanningCardProps) => {
  const statusConfig = getStatusConfig(planning.progress?.overallStatus);
  const StatusIcon = statusConfig.icon;

  const typeColors = isMonthly
    ? { main: '#8B5CF6', bg: '#8B5CF610', border: '#8B5CF650' }
    : weekNumber
      ? { main: '#F59E0B', bg: '#F59E0B10', border: '#F59E0B50' }
      : isDaily
        ? { main: '#3B82F6', bg: '#3B82F610', border: '#3B82F650' }
        : { main: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB' };

  return (
    <Grid item xs={12} md={isMonthly ? 12 : 6} lg={isMonthly ? 12 : 4}>
      <Card
        elevation={0}
        sx={{
          border: '2px solid',
          borderColor: typeColors.border,
          borderRadius: 2,
          bgcolor: isMonthly ? 'white' : typeColors.bg,
          transition: 'all 0.2s',
          '&:hover': {
            boxShadow: `0 4px 12px ${typeColors.main}20`,
            borderColor: typeColors.main,
          },
        }}
      >
        <CardContent sx={{ p: isMonthly ? 2.5 : 2 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: typeColors.main, width: isMonthly ? 40 : 32, height: isMonthly ? 40 : 32 }}>
                {isMonthly ? <Timeline sx={{ fontSize: 20 }} /> : weekNumber ? <Schedule sx={{ fontSize: 16 }} /> : <CalendarToday sx={{ fontSize: 16 }} />}
              </Avatar>
              <Box>
                <Typography variant={isMonthly ? 'subtitle1' : 'body2'} fontWeight="bold">
                  {isMonthly ? 'Meta Mensal' : weekNumber ? `Semana ${weekNumber}` : 'Meta Diária'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(planning.period.start), 'dd/MM')} - {format(new Date(planning.period.end), 'dd/MM/yyyy')}
                </Typography>
              </Box>
            </Box>
            <Chip
              size="small"
              icon={<StatusIcon sx={{ fontSize: 14 }} />}
              label={statusConfig.label}
              sx={{ bgcolor: statusConfig.bgColor, color: statusConfig.color, fontWeight: 500 }}
              variant="outlined"
            />
          </Box>

          <Divider sx={{ my: 1.5 }} />

          {/* Métricas */}
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#F9FAFB' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Meta Receita
                </Typography>
                <Typography variant={isMonthly ? 'h6' : 'body1'} fontWeight="bold" color={typeColors.main}>
                  {formatCurrency(planning.targets?.expectedRevenue || 0)}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#F9FAFB' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Realizado
                </Typography>
                <Typography variant={isMonthly ? 'h6' : 'body1'} fontWeight="bold" color="#10B981">
                  {formatCurrency(planning.actual?.actualRevenue || 0)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Progresso */}
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Receita
              </Typography>
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
                '& .MuiLinearProgress-bar': { bgcolor: planning.progress?.revenuePercentage >= 100 ? '#10B981' : typeColors.main },
              }}
            />
          </Box>
          <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Sessões
              </Typography>
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
                '& .MuiLinearProgress-bar': { bgcolor: planning.progress?.sessionsPercentage >= 100 ? '#10B981' : '#3B82F6' },
              }}
            />
          </Box>

          {/* Expandir detalhes */}
          <Collapse in={expanded}>
            <Box sx={{ mt: 2, p: 1.5, bgcolor: '#F9FAFB', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="600">
                Detalhes
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Horas Previstas
                  </Typography>
                  <Typography variant="body2" fontWeight="500">
                    {planning.targets?.workHours || 0}h
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Horas Trabalhadas
                  </Typography>
                  <Typography variant="body2" fontWeight="500">
                    {planning.actual?.workedHours?.toFixed(1) || 0}h
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Sessões Previstas
                  </Typography>
                  <Typography variant="body2" fontWeight="500">
                    {planning.targets?.totalSessions || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Sessões Realizadas
                  </Typography>
                  <Typography variant="body2" fontWeight="500">
                    {planning.actual?.completedSessions || 0}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Collapse>

          {/* Gap de meta */}
          {planning.progress?.gapRevenue > 0 && (
            <Alert severity="warning" sx={{ mt: 2, py: 0, borderRadius: 1 }}>
              <Typography variant="caption">
                Falta {formatCurrency(planning.progress.gapRevenue)} para atingir a meta
              </Typography>
            </Alert>
          )}

          {/* Ações */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Button size="small" onClick={onToggle} startIcon={expanded ? <ChevronUp /> : <ChevronDown />} sx={{ color: 'text.secondary' }}>
              {expanded ? 'Menos' : 'Mais'}
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
