// src/components/patient/tabs/PatientInsuranceTab.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Select,
  FormControl,
  InputLabel,
  TextField
} from '@mui/material';
import {
  Plus,
  Calendar,
  AlertCircle,
  MoreVertical,
  Edit2,
  Trash2,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  X,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useInsuranceGuides } from '../../../hooks/useInsuranceGuides';
import { getGuideAppointments, updateGuideAppointmentsBulk, getInsurancePlanByGuide } from '../../../services/insuranceGuideApi';
import API from '../../../services/api';
import doctorService from '../../../services/doctorService';
import { appointmentService } from '../../../services/appointmentService';
import { useAppointmentsContext } from '../../../contexts/AppointmentsContext';
import InsuranceGuideForm from './InsuranceGuideForm';
import InsurancePlanForm from './InsurancePlanForm';

// ----------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------
const PatientInsuranceTab = ({ patientId, patientName }) => {
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [planFormContext, setPlanFormContext] = useState(null);
  const [planVersion, setPlanVersion] = useState(0);
  const [detailsGuide, setDetailsGuide] = useState(null);
  const [showInactivateModal, setShowInactivateModal] = useState(false);
  const [isInactivating, setIsInactivating] = useState(false);
  const [doctors, setDoctors] = useState([]);

  const { fetchAppointments } = useAppointmentsContext();

  useEffect(() => {
    doctorService.getActiveDoctors()
      .then(res => setDoctors(res?.data ?? []))
      .catch(() => {});
  }, []);

  const {
    guides,
    balance,
    isLoading,
    error,
    createGuide,
    updateGuide,
    inactivateGuide,
    refetch
  } = useInsuranceGuides(patientId, {
    specialty: selectedSpecialty === 'all' ? undefined : selectedSpecialty
  });

  const allAvailableGuides = useMemo(() => {
    return guides.map(g => ({
      ...g,
      remaining: g.remaining ?? (g.totalSessions - (g.usedSessions || 0)),
      usedSessions: g.usedSessions || 0
    }));
  }, [guides]);

  const specialties = useMemo(() => {
    const unique = [...new Set(allAvailableGuides.map(g => g.specialty))];
    return unique.sort();
  }, [allAvailableGuides]);

  const isExpiredByDate = (g) => g.expiresAt && new Date(g.expiresAt) < new Date();

  const isGuideActive = (g) =>
    (g.status === 'active' || g.status === 'linked') &&
    g.remaining > 0 &&
    !isExpiredByDate(g);

  const availableGuides = useMemo(() => {
    return allAvailableGuides
      .filter(g => selectedSpecialty === 'all' || g.specialty === selectedSpecialty)
      .filter(g => {
        if (selectedStatus === 'inactive') return !isGuideActive(g);
        return isGuideActive(g);
      });
  }, [allAvailableGuides, selectedSpecialty, selectedStatus]);

  const activeCount = useMemo(() => allAvailableGuides.filter(isGuideActive).length, [allAvailableGuides]);
  const inactiveCount = useMemo(() => allAvailableGuides.filter(g => !isGuideActive(g)).length, [allAvailableGuides]);

  const groupedGuides = useMemo(() => {
    const active = availableGuides.filter(g =>
      (g.status === 'active' || g.status === 'linked') && g.remaining > 0 && !isExpiredByDate(g)
    );
    const exhausted = availableGuides.filter(g =>
      g.status === 'exhausted' || ((g.status === 'active' || g.status === 'linked') && g.remaining === 0 && !isExpiredByDate(g))
    );
    const expired = availableGuides.filter(g =>
      g.status === 'expired' || ((g.status === 'active' || g.status === 'linked') && isExpiredByDate(g))
    );
    const cancelled = availableGuides.filter(g => g.status === 'cancelled');
    return { active, exhausted, expired, cancelled };
  }, [availableGuides]);

  const handleOpenMenu = (event, guide) => {
    setAnchorEl(event.currentTarget);
    setSelectedGuide(guide);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleDismissMenu = () => {
    setAnchorEl(null);
    setSelectedGuide(null);
  };

  const handleOpenDetails = () => {
    setDetailsGuide(selectedGuide);
    handleCloseMenu();
  };

  const handleEdit = () => {
    if (selectedGuide.usedSessions > 0) {
      toast.error('Não é possível editar guia já utilizada');
      handleCloseMenu();
      return;
    }
    setEditingGuide(selectedGuide);
    setIsFormOpen(true);
    handleCloseMenu();
  };

  const handleCancelGuide = () => {
    if (!selectedGuide) return;
    setShowInactivateModal(true);
    handleCloseMenu();
  };

  const confirmInactivate = async () => {
    if (!selectedGuide) return;
    setIsInactivating(true);
    try {
      const result = await inactivateGuide(selectedGuide._id);
      toast.success(`Guia inativada — ${result.sessionsCanceled ?? 0} sessão(ões) cancelada(s)`);
      setShowInactivateModal(false);
      setSelectedGuide(null);
    } catch (err) {
      toast.error(err?.message || 'Erro ao inativar guia');
    } finally {
      setIsInactivating(false);
    }
  };

  const handleSaveGuide = async (data) => {
    try {
      if (editingGuide) {
        await updateGuide(editingGuide._id, data);
        toast.success('Guia atualizada com sucesso');
      } else {
        await createGuide({ ...data, patientId });
        toast.success('Guia criada com sucesso');
      }
      setIsFormOpen(false);
      setEditingGuide(null);
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar guia');
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingGuide(null);
  };

  const handleOpenPlanForm = (guide, plan = null) => {
    setPlanFormContext({ guide, plan });
    setPlanFormOpen(true);
  };

  const handleClosePlanForm = (refetchNeeded) => {
    setPlanFormOpen(false);
    setPlanFormContext(null);
    if (refetchNeeded) {
      refetch();
      setPlanVersion(v => v + 1); // invalida plan cache em todos os GuideCards
    }
  };

  if (isLoading && guides.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={40} sx={{ color: '#2E7A5E' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: '20px', fontSize: '0.875rem' }}>{error}</Alert>
      </Box>
    );
  }

  if (guides.length === 0) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 10,
        px: 2
      }}>
        <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: '32px', bgcolor: '#F9FBFD', maxWidth: 400 }}>
          <Box sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: '#EFF9F6', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={32} color="#2E7A5E" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1A2C3E', mb: 1 }}>
            Nenhuma guia cadastrada
          </Typography>
          <Typography variant="body2" sx={{ color: '#5B6E8C', mb: 3 }}>
            Cadastre a primeira guia de convênio para este paciente
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setIsFormOpen(true)}
            sx={{
              textTransform: 'none',
              borderRadius: '40px',
              px: 3,
              py: 1,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #1B4D6E 0%, #2E7A5E 100%)',
              boxShadow: '0 4px 12px rgba(27,77,110,0.2)',
              '&:hover': {
                background: 'linear-gradient(135deg, #123F5A 0%, #246653 100%)',
                boxShadow: '0 6px 14px rgba(27,77,110,0.3)'
              }
            }}
          >
            Cadastrar primeira guia
          </Button>
        </Paper>

        <InsuranceGuideForm
          open={isFormOpen}
          onClose={handleCloseForm}
          onSave={handleSaveGuide}
          guide={editingGuide}
          doctors={doctors}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, bgcolor: '#F8FAFE', minHeight: '100%' }}>
      {/* Header premium */}
      <Box sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 4,
        gap: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1A2C3E', letterSpacing: '-0.01em' }}>
            Guias de convênio
          </Typography>

          {specialties.length > 0 && (
            <Tabs
              value={selectedSpecialty}
              onChange={(e, newValue) => setSelectedSpecialty(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 'auto',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  minHeight: '36px',
                  py: 0.5,
                  px: 2,
                  color: '#5B6E8C',
                  borderRadius: '40px',
                  transition: 'all 0.2s',
                  '&.Mui-selected': {
                    color: '#FFFFFF',
                    backgroundColor: '#2E7A5E',
                    fontWeight: 600
                  }
                },
                '& .MuiTabs-indicator': { display: 'none' }
              }}
            >
              <Tab label={`Todas (${allAvailableGuides.length})`} value="all" />
              {specialties.map(specialty => {
                const count = allAvailableGuides.filter(g => g.specialty === specialty).length;
                const label = specialty.replace(/_/g, ' ');
                return (
                  <Tab
                    key={specialty}
                    label={`${label.charAt(0).toUpperCase() + label.slice(1)} (${count})`}
                    value={specialty}
                  />
                );
              })}
            </Tabs>
          )}
        </Box>

        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={() => setIsFormOpen(true)}
          sx={{
            textTransform: 'none',
            borderRadius: '40px',
            px: 2.5,
            py: 0.8,
            fontSize: '0.8125rem',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #1B4D6E 0%, #2E7A5E 100%)',
            boxShadow: '0 2px 8px rgba(27,77,110,0.15)',
            '&:hover': {
              background: 'linear-gradient(135deg, #123F5A 0%, #246653 100%)',
              boxShadow: '0 4px 12px rgba(27,77,110,0.25)'
            }
          }}
        >
          Nova guia
        </Button>
      </Box>

      {/* Filtro de status: Todas (ativas) / Inativas */}
      <Tabs
        value={selectedStatus}
        onChange={(e, v) => setSelectedStatus(v)}
        sx={{
          mb: 3,
          minHeight: 'auto',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontSize: '0.8125rem',
            fontWeight: 500,
            minHeight: '32px',
            py: 0.5,
            px: 2,
            color: '#5B6E8C',
            borderRadius: '40px',
            transition: 'all 0.2s',
            '&.Mui-selected': { color: '#FFFFFF', fontWeight: 600 }
          },
          '& .MuiTabs-indicator': { display: 'none' }
        }}
      >
        <Tab label={`Todas (${activeCount})`} value="all"
          sx={{ '&.Mui-selected': { backgroundColor: '#2E7A5E' } }} />
        <Tab label={`Inativas (${inactiveCount})`} value="inactive"
          sx={{ '&.Mui-selected': { backgroundColor: '#C75146' } }} />
      </Tabs>

      {/* Saldo agregado por especialidade (apenas quando filtrado) */}
      {balance && selectedSpecialty !== 'all' && (
        <Card sx={{
          mb: 4,
          borderRadius: '24px',
          border: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.05)',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FBFD 100%)'
        }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="caption" sx={{ color: '#5B6E8C', fontWeight: 500, display: 'block', mb: 1.5 }}>
              Saldo total • {selectedSpecialty.replace(/_/g, ' ')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1A2C3E', lineHeight: 1.2 }}>
                  {balance.remaining}
                </Typography>
                <Typography variant="caption" sx={{ color: '#5B6E8C' }}>
                  sessões restantes
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minWidth: 150 }}>
                <LinearProgress
                  variant="determinate"
                  value={(balance.remaining / balance.total) * 100}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#E9EEF2',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#2E7A5E',
                      borderRadius: 4
                    }
                  }}
                />
                <Typography variant="caption" sx={{ color: '#5B6E8C', mt: 0.5, display: 'block' }}>
                  {balance.used} de {balance.total} sessões utilizadas
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {availableGuides.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8, bgcolor: '#F9FBFD', borderRadius: '32px' }}>
          <Typography variant="body1" sx={{ color: '#5B6E8C', mb: 1 }}>
            Nenhuma guia {selectedStatus === 'inactive' ? 'inativa' : 'ativa'} encontrada
            {selectedSpecialty !== 'all' && ` para ${selectedSpecialty.replace(/_/g, ' ')}`}
          </Typography>
          <Typography variant="body2" sx={{ color: '#8A99B0' }}>
            Tente selecionar outro filtro ou cadastre uma nova guia
          </Typography>
        </Box>
      )}

      {/* Seções de guias */}
      <GuideSection
        title="Guias ativas"
        count={groupedGuides.active.length}
        guides={groupedGuides.active}
        color="#2E7A5E"
        onOpenMenu={handleOpenMenu}
        onCreatePlan={handleOpenPlanForm}
        planVersion={planVersion}
      />

      <GuideSection
        title="Guias esgotadas"
        count={groupedGuides.exhausted.length}
        guides={groupedGuides.exhausted}
        color="#C75146"
        onOpenMenu={handleOpenMenu}
        onCreatePlan={handleOpenPlanForm}
        planVersion={planVersion}
      />

      <GuideSection
        title="Guias expiradas"
        count={groupedGuides.expired.length}
        guides={groupedGuides.expired}
        color="#8A99B0"
        onOpenMenu={handleOpenMenu}
        onCreatePlan={handleOpenPlanForm}
        planVersion={planVersion}
      />

      <GuideSection
        title="Guias canceladas"
        count={groupedGuides.cancelled.length}
        guides={groupedGuides.cancelled}
        color="#A0AABF"
        onOpenMenu={handleOpenMenu}
        onCreatePlan={handleOpenPlanForm}
        planVersion={planVersion}
      />

      {/* Menu de ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleDismissMenu}
        PaperProps={{
          sx: {
            borderRadius: '20px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: '160px',
            mt: 1
          }
        }}
      >
        <MenuItem
          onClick={handleEdit}
          disabled={selectedGuide?.usedSessions > 0}
          sx={{ fontSize: '0.8125rem', py: 1, gap: 1.5, borderRadius: '12px', mx: 0.5 }}
        >
          <Edit2 size={14} /> Editar
        </MenuItem>
        <MenuItem
          onClick={handleOpenDetails}
          sx={{ fontSize: '0.8125rem', py: 1, gap: 1.5, borderRadius: '12px', mx: 0.5, color: '#1B4D6E' }}
        >
          <Eye size={14} /> Detalhes
        </MenuItem>
        <MenuItem
          onClick={handleCancelGuide}
          disabled={selectedGuide?.status === 'cancelled'}
          sx={{ fontSize: '0.8125rem', py: 1, gap: 1.5, borderRadius: '12px', mx: 0.5, color: '#C75146' }}
        >
          <Trash2 size={14} /> Cancelar
        </MenuItem>
      </Menu>

      {/* Modais */}
      <InsuranceGuideForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSaveGuide}
        guide={editingGuide}
        doctors={doctors}
      />

      <InsurancePlanForm
        open={planFormOpen}
        onClose={handleClosePlanForm}
        guide={planFormContext?.guide}
        plan={planFormContext?.plan}
        patientId={patientId}
        patientName={patientName}
      />

      <GuideDetailsModal
        guide={detailsGuide}
        onClose={() => setDetailsGuide(null)}
        onUpdate={() => { refetch(); fetchAppointments(); setPlanVersion(v => v + 1); }}
      />

      {/* Modal de confirmação de inativação — mesmo padrão do pacote */}
      <Dialog
        open={showInactivateModal}
        onClose={() => {
          if (!isInactivating) {
            setShowInactivateModal(false);
            setSelectedGuide(null);
          }
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle sx={{ px: 2.5, pt: 2.5, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: '12px', bgcolor: '#FDECEA',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Trash2 size={18} color="#C75146" />
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#1A2C3E' }}>
              Inativar guia
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: 2.5, py: 1 }}>
          <Typography sx={{ fontSize: '0.875rem', color: '#5B6E8C', mb: 1 }}>
            Esta ação irá <strong>cancelar todas as sessões e agendamentos pendentes</strong> desta guia e liberar a agenda.
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: '#8A99B0' }}>
            Sessões já realizadas e pagamentos concluídos serão <strong>mantidos</strong> e não impactarão o financeiro.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setShowInactivateModal(false)}
            disabled={isInactivating}
            sx={{
              flex: 1,
              textTransform: 'none',
              borderRadius: '12px',
              fontWeight: 600,
              color: '#5B6E8C',
              borderColor: '#DDE4EE',
              '&:hover': { bgcolor: '#F1F5F9' }
            }}
            variant="outlined"
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmInactivate}
            disabled={isInactivating}
            variant="contained"
            disableElevation
            sx={{
              flex: 1,
              textTransform: 'none',
              borderRadius: '12px',
              fontWeight: 700,
              bgcolor: '#C75146',
              color: '#fff',
              '&:hover': { bgcolor: '#A9443A' }
            }}
          >
            {isInactivating ? 'Inativando...' : 'Inativar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ----------------------------------------------------------------------
// Componente de seção de guias (título + grid)
// ----------------------------------------------------------------------
const GuideSection = ({ title, count, guides, color, onOpenMenu, onCreatePlan, planVersion }) => {
  if (count === 0) return null;

  return (
    <Box sx={{ mb: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box sx={{ width: 4, height: 20, bgcolor: color, borderRadius: 2 }} />
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: '#1A2C3E',
            letterSpacing: '-0.2px',
            textTransform: 'uppercase',
            fontSize: '0.7rem'
          }}
        >
          {title} ({count})
        </Typography>
      </Box>
      <AnimatePresence>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)'
          },
          gap: 2.5
        }}>
          {guides.map(guide => (
            <GuideCard
              key={guide._id}
              guide={guide}
              onOpenMenu={onOpenMenu}
              onCreatePlan={onCreatePlan}
              planVersion={planVersion}
            />
          ))}
        </Box>
      </AnimatePresence>
    </Box>
  );
};

// ----------------------------------------------------------------------
// Componente de card individual (premium, clean, informativo)
// ----------------------------------------------------------------------

const DAY_NAMES = { 0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb' };

const SPECIALTY_THEMES = {
  fonoaudiologia:    { from: '#1D4ED8', to: '#38BDF8', light: '#EFF6FF', border: '#BAE6FD', text: '#1D4ED8' },
  psicologia:        { from: '#7C3AED', to: '#C084FC', light: '#F5F3FF', border: '#DDD6FE', text: '#6D28D9' },
  fisioterapia:      { from: '#059669', to: '#34D399', light: '#ECFDF5', border: '#A7F3D0', text: '#047857' },
  psicomotricidade:  { from: '#D97706', to: '#FCD34D', light: '#FFFBEB', border: '#FDE68A', text: '#B45309' },
  terapia_ocupacional:{ from: '#EA580C', to: '#FB923C', light: '#FFF7ED', border: '#FED7AA', text: '#C2410C' },
  psicopedagogia:    { from: '#0D9488', to: '#2DD4BF', light: '#F0FDFA', border: '#99F6E4', text: '#0F766E' },
  neuropsicologia:   { from: '#4338CA', to: '#818CF8', light: '#EEF2FF', border: '#C7D2FE', text: '#3730A3' },
  musicoterapia:     { from: '#B45309', to: '#FBBF24', light: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
};

const GuideCard = ({ guide, onOpenMenu, onCreatePlan, planVersion = 0 }) => {
  const remaining = guide.remaining ?? (guide.totalSessions - (guide.usedSessions || 0));
  const usedSessions = guide.usedSessions || 0;
  const daysUntilExpiration = guide.expiresAt
    ? differenceInDays(parseISO(guide.expiresAt), new Date())
    : 999;

  const canUse = (guide.status === 'active' || guide.status === 'linked') && remaining > 0 && daysUntilExpiration >= 0;

  const [generating, setGenerating] = useState(false);

  const handleGenerateSessions = async (planId) => {
    setGenerating(true);
    try {
      const res = await API.post(`/v2/insurance-plans/${planId}/generate-sessions`);
      const count = res.data?.data?.appointmentsGenerated || 0;
      if (count > 0) {
        toast.success(`${count} sessão(ões) gerada(s) com sucesso`);
      } else {
        toast('Todos os agendamentos futuros já existem', { icon: 'ℹ️' });
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao gerar sessões';
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  // Lazy-load do InsurancePlan — só para guias ativas, isolado no card
  const [plan, setPlan] = useState(null);
  useEffect(() => {
    if (!canUse) return;
    let mounted = true;
    getInsurancePlanByGuide(guide._id)
      .then(data => { if (mounted) setPlan(data); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [guide._id, canUse, planVersion]);
  const progressPct = guide.totalSessions > 0 ? Math.min((usedSessions / guide.totalSessions) * 100, 100) : 0;

  let statusLabel = 'Disponível';
  let statusBg = 'rgba(255,255,255,0.25)';
  if (guide.status === 'cancelled')                           { statusLabel = 'Cancelada'; statusBg = 'rgba(255,255,255,0.15)'; }
  else if (guide.status === 'expired' || daysUntilExpiration < 0) { statusLabel = 'Vencida';    statusBg = 'rgba(255,255,255,0.15)'; }
  else if (remaining === 0)                                   { statusLabel = 'Esgotada';  statusBg = 'rgba(239,68,68,0.35)'; }
  else if (remaining <= 2)                                    { statusLabel = 'Poucas sessões'; statusBg = 'rgba(249,115,22,0.35)'; }
  else if (daysUntilExpiration <= 14)                         { statusLabel = 'Vence em breve'; statusBg = 'rgba(249,115,22,0.35)'; }

  const theme = SPECIALTY_THEMES[guide.specialty] || { from: '#1B4D6E', to: '#2E7A5E', light: '#F0FFF4', border: '#A7F3D0', text: '#1B4D6E' };

  const specialtyFormatted = guide.specialty
    .split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const insuranceFormatted = guide.insurance
    .split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    .replace('Anapolis', 'Anápolis').replace('Goiania', 'Goiânia').replace('Saude', 'Saúde');

  const expiryLabel = !guide.expiresAt ? null
    : daysUntilExpiration < 0   ? `⚠️ Venceu em ${format(parseISO(guide.expiresAt), 'dd/MM/yyyy')}`
    : daysUntilExpiration === 0 ? '🔴 Vence hoje'
    : daysUntilExpiration <= 7  ? `🟠 Expira em ${format(parseISO(guide.expiresAt), 'dd/MM/yyyy')} (${daysUntilExpiration}d)`
    : daysUntilExpiration <= 30 ? `🟡 Expira em ${format(parseISO(guide.expiresAt), 'dd/MM/yyyy')}`
    :                              `Expira em ${format(parseISO(guide.expiresAt), 'dd/MM/yyyy')}`;

  const expiryColor = daysUntilExpiration < 0 ? '#C75146'
    : daysUntilExpiration <= 7  ? '#EA580C'
    : daysUntilExpiration <= 30 ? '#D97706'
    : '#8A99B0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      style={{ height: '100%' }}
    >
      <div
        className="bg-white rounded-2xl shadow-md border border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full"
        style={{ opacity: canUse ? 1 : 0.75 }}
      >
        {/* ── Gradient Header ── */}
        <div
          className="px-5 pt-4 pb-5 relative"
          style={{ background: `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)` }}
        >
          <IconButton
            size="small"
            onClick={(e) => onOpenMenu(e, guide)}
            sx={{ position: 'absolute', top: 8, right: 8, color: 'rgba(255,255,255,0.65)', p: 0.4, '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', borderRadius: '8px' } }}
          >
            <MoreVertical size={16} />
          </IconButton>

          <div className="text-white/70 text-xs font-mono mb-1">#{guide.number}</div>
          <div className="text-white font-bold text-[1.15rem] leading-tight pr-6">{specialtyFormatted}</div>
          <div className="text-white/80 text-sm mt-1">{insuranceFormatted}{guide.createdAt && ` • ${format(parseISO(guide.createdAt), 'dd/MM/yyyy')}`}</div>

          <div className="mt-3">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wide"
              style={{ backgroundColor: statusBg, backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.3)' }}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        {/* ── Progress section ── */}
        <div className="px-5 py-4 border-b" style={{ backgroundColor: theme.light, borderColor: theme.border }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Progresso clínico</span>
            <span className="text-sm font-bold" style={{ color: theme.text }}>{usedSessions} / {guide.totalSessions}</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${theme.from}, ${theme.to})` }}
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: theme.text }}>
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: theme.to }} />
              {usedSessions} concluída{usedSessions !== 1 ? 's' : ''}
            </span>
            {(guide.canceledCount > 0) && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                {guide.canceledCount} cancelada{guide.canceledCount !== 1 ? 's' : ''}
              </span>
            )}
            {(guide.scheduledCount > 0) && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />
                {guide.scheduledCount} agendada{guide.scheduledCount !== 1 ? 's' : ''}
              </span>
            )}
            <span className="text-xs text-gray-400 ml-auto">/{guide.totalSessions}</span>
          </div>
        </div>

        {/* ── Financial details ── */}
        <div className="px-5 py-4 flex-1 flex flex-col gap-2">
          {guide.sessionValue > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Valor/sessão</span>
              <span className="text-sm font-bold text-gray-900">
                {Number(guide.sessionValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          )}
          {guide.evaluationAmount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Valor avaliação</span>
              <div className="flex items-center gap-2">
                {guide.generateEvaluationBilling === false && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">sem cobrança no sistema</span>
                )}
                <span className="text-sm font-bold text-gray-900">
                  {Number(guide.evaluationAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          )}
          {guide.totalValue > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Total autorizado</span>
              <span className="text-sm font-bold" style={{ color: theme.text }}>
                {Number(guide.totalValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          )}
          {guide.doctor?.fullName && (
            <div className="flex justify-between items-center gap-2">
              <span className="text-sm text-gray-500 shrink-0">Profissional da guia</span>
              <span className="text-sm font-semibold text-gray-700 text-right truncate">{guide.doctor.fullName}</span>
            </div>
          )}

          {expiryLabel && (
            <div className="mt-auto pt-2" style={{ color: expiryColor }}>
              <span className="text-sm font-medium">{expiryLabel}</span>
            </div>
          )}
        </div>

        {/* ── Plan block (lazy-loaded) ── */}
        {plan && (
          <div className="mx-5 mb-4 px-4 py-3.5 rounded-xl border" style={{ backgroundColor: theme.light, borderColor: theme.border }}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <Calendar size={12} style={{ color: theme.text }} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.text }}>
                  Plano ativo
                </span>
                {plan.status && (
                  <span className="text-[0.65rem] px-1.5 py-0.5 rounded-full bg-white/70 font-medium" style={{ color: theme.text }}>
                    {plan.status}
                  </span>
                )}
              </div>
              <button
                onClick={() => onCreatePlan(guide, plan)}
                className="text-xs font-semibold underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
                style={{ color: theme.text }}
              >
                Editar
              </button>
            </div>

            {(plan.doctor?.fullName || plan.doctor?.name) && (
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-gray-500">Profissional</span>
                <span className="font-semibold text-gray-800 truncate max-w-[60%] text-right">
                  {plan.doctor?.fullName || plan.doctor?.name}
                </span>
              </div>
            )}

            {plan.sessionsPerWeek > 0 && (
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-gray-500">Frequência</span>
                <span className="font-semibold text-gray-800">{plan.sessionsPerWeek}×/semana</span>
              </div>
            )}

            {plan.slots?.length > 0 && (
              <div className="flex items-start justify-between text-sm mb-1.5">
                <span className="text-gray-500 shrink-0">Horários</span>
                <span className="font-semibold text-gray-800 text-right leading-relaxed">
                  {plan.slots
                    .map(s => `${DAY_NAMES[s.dayOfWeek] ?? s.dayOfWeek} ${s.time}`)
                    .join(' · ')}
                </span>
              </div>
            )}

            {plan.sessionValue > 0 && (
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-gray-500">Valor do plano</span>
                <span className="font-semibold text-gray-800">
                  {Number(plan.sessionValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            )}

            {plan.generatedAppointments?.length > 0 && (
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-gray-500">Sessões geradas</span>
                <span className="font-semibold text-gray-800">{plan.generatedAppointments.length}</span>
              </div>
            )}

            {(() => {
              const today = new Date().toISOString().split('T')[0];
              const nextAppt = plan.generatedAppointments
                ?.filter(a => a.date >= today && ['scheduled', 'pre_agendado'].includes(a.operationalStatus))
                .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))[0];
              return nextAppt ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Próxima sessão</span>
                  <span className="font-semibold text-gray-800">
                    {format(parseISO(nextAppt.date), 'dd/MM')} · {nextAppt.time}
                  </span>
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* ── Action buttons ── */}
        {canUse && onCreatePlan && (
          <div className="px-5 pb-5 flex items-center gap-2">
            {plan && remaining > 0 && (
              <button
                onClick={() => handleGenerateSessions(plan._id)}
                disabled={generating}
                title={`${remaining} sessão(ões) restante(s)`}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80 active:scale-[0.97] shrink-0"
                style={{ borderColor: theme.to, color: theme.to, background: 'transparent' }}
              >
                <Zap size={13} />
                {generating ? 'Gerando...' : `Gerar (${remaining})`}
              </button>
            )}
            <button
              onClick={() => onCreatePlan(guide, plan || null)}
              className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)`, boxShadow: `0 4px 10px -2px ${theme.from}50` }}
            >
              <Calendar size={14} />
              {plan ? 'Ver e editar sessões' : 'Agendar com guia'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ----------------------------------------------------------------------
// Modal de detalhes da guia — lista todos os agendamentos atrelados
// ----------------------------------------------------------------------
const APPT_STATUS_CONFIG = {
  completed:           { label: 'Realizado',    color: '#2E7A5E', bg: '#EFF9F6' },
  paid:                { label: 'Realizado',    color: '#2E7A5E', bg: '#EFF9F6' },
  scheduled:           { label: 'Agendado',     color: '#1B4D6E', bg: '#EEF4FB' },
  pre_agendado:        { label: 'Pré-agendado', color: '#5B6E8C', bg: '#F1F5F9' },
  confirmed:           { label: 'Confirmado',   color: '#1B4D6E', bg: '#EEF4FB' },
  canceled:            { label: 'Cancelado',    color: '#C75146', bg: '#FDECEA' },
  cancelled:           { label: 'Cancelado',    color: '#C75146', bg: '#FDECEA' },
  pending:             { label: 'Pendente',     color: '#ED6C02', bg: '#FFF3E0' },
  missed:              { label: 'Faltou',       color: '#C75146', bg: '#FDECEA' },
  processing_create:   { label: 'Processando',  color: '#8A99B0', bg: '#F1F5F9' },
  processing_complete: { label: 'Processando',  color: '#8A99B0', bg: '#F1F5F9' },
  processing_cancel:   { label: 'Processando',  color: '#8A99B0', bg: '#F1F5F9' },
};

const EDITABLE_STATUSES = [
  { value: 'pre_agendado', label: 'Pré-agendado' },
  { value: 'scheduled',    label: 'Agendado' },
  { value: 'confirmed',    label: 'Confirmado' },
  { value: 'canceled',     label: 'Cancelado' },
  { value: 'missed',       label: 'Faltou' },
];

const normalizeEditStatus = (raw) => {
  if (!raw) return 'scheduled';
  if (raw === 'cancelled') return 'canceled'; // normaliza grafia britânica
  const known = ['pre_agendado', 'scheduled', 'confirmed', 'canceled', 'missed'];
  return known.includes(raw) ? raw : 'scheduled';
};

const GuideDetailsModal = ({ guide, onClose, onUpdate }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editingAppt, setEditingAppt] = useState(null);
  const [editDate, setEditDate]       = useState('');
  const [editTime, setEditTime]       = useState('');
  const [editStatus, setEditStatus]   = useState('');
  const [editDoctorId, setEditDoctorId] = useState('');
  const [editSaving, setEditSaving]   = useState(false);

  const [doctors, setDoctors] = useState([]);
  const [doctorsLoaded, setDoctorsLoaded] = useState(false);

  const [bulkDoctorOpen, setBulkDoctorOpen] = useState(false);
  const [bulkDoctorId, setBulkDoctorId]     = useState('');
  const [bulkTime, setBulkTime]             = useState('');
  const [bulkDayOfWeek, setBulkDayOfWeek]   = useState('');
  const [bulkSaving, setBulkSaving]         = useState(false);

  // Plan do modal — mesma lógica do GuideCard, independente
  const [modalPlan, setModalPlan] = useState(null);

  useEffect(() => {
    if (!doctorsLoaded) {
      doctorService.getActiveDoctors()
        .then(res => { setDoctors(res?.data ?? []); setDoctorsLoaded(true); })
        .catch(() => {});
    }
  }, [doctorsLoaded]);

  useEffect(() => {
    if (!guide?._id) return;
    let mounted = true;
    getInsurancePlanByGuide(guide._id)
      .then(data => { if (mounted) setModalPlan(data); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [guide?._id]);

  const loadAppointments = (guideId) => {
    setLoading(true);
    return getGuideAppointments(guideId)
      .then(data => setAppointments(data))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!guide) return;
    loadAppointments(guide._id);
  }, [guide?._id]);

  const openEdit = (appt) => {
    setEditingAppt(appt);
    setEditDate(appt.date ? appt.date.substring(0, 10) : '');
    setEditTime(appt.time || '');
    setEditStatus(normalizeEditStatus(appt.operationalStatus || appt.status));
    setEditDoctorId(appt.doctor?._id || '');
  };

  const saveEdit = async () => {
    if (!editDate || !editTime) { toast.error('Preencha data e hora'); return; }
    setEditSaving(true);
    try {
      if (editStatus === 'canceled') {
        await appointmentService.cancel(editingAppt._id, { reason: 'Cancelado manualmente' });
      } else {
        const patch = { date: editDate, time: editTime };
        if (editDoctorId) patch.doctor = editDoctorId;
        await appointmentService.update(editingAppt._id, patch);
      }
      toast.success('Agendamento atualizado');
      setEditingAppt(null);
      await loadAppointments(guide._id);
      onUpdate?.();
    } catch {
      toast.error('Erro ao atualizar agendamento');
    } finally {
      setEditSaving(false);
    }
  };

  const saveBulkDoctor = async () => {
    if (!bulkDoctorId && !bulkTime && !bulkDayOfWeek) return;
    setBulkSaving(true);
    try {
      const patch = {};
      if (bulkDoctorId) patch.doctorId = bulkDoctorId;
      if (bulkTime) patch.time = bulkTime;
      if (bulkDayOfWeek !== '') patch.dayOfWeek = parseInt(bulkDayOfWeek);
      const result = await updateGuideAppointmentsBulk(guide._id, patch);
      const parts = [];
      if (bulkDoctorId) parts.push('terapeuta');
      if (bulkDayOfWeek !== '') parts.push('dia da semana');
      if (bulkTime) parts.push('horário');
      toast.success(`${parts.join(', ')} atualizado(s) em ${result.updated} sessão(ões) pendente(s)`);
      setBulkDoctorOpen(false);
      setBulkDoctorId('');
      setBulkTime('');
      setBulkDayOfWeek('');
      await loadAppointments(guide._id);
      onUpdate?.();
    } catch {
      toast.error('Erro ao atualizar sessões pendentes');
    } finally {
      setBulkSaving(false);
    }
  };

  if (!guide) return null;

  const specialtyFormatted = guide.specialty
    ?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '';
  const insuranceFormatted = guide.insurance
    ?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '';

  const apptStatus = (a) => a.operationalStatus || a.status || '';

  // Oculta appointments cancelados que foram substituídos por um reagendamento
  const supersededIds = new Set(
    appointments.filter(a => a.rescheduledFrom).map(a => a.rescheduledFrom?.toString())
  );
  const visibleAppointments = appointments.filter(a => !supersededIds.has(a._id?.toString()));

  const completedCount = visibleAppointments.filter(a => ['completed', 'paid'].includes(apptStatus(a))).length;
  const scheduledCount = visibleAppointments.filter(a => ['scheduled', 'confirmed', 'pre_agendado'].includes(apptStatus(a))).length;
  const canceledCount  = visibleAppointments.filter(a => ['canceled', 'cancelled', 'missed'].includes(apptStatus(a))).length;

  return (
    <>
    <Dialog
      open={Boolean(guide)}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '28px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.15)',
          overflow: 'hidden'
        }
      }}
    >
      {/* Header */}
      <Box sx={{
        background: 'linear-gradient(135deg, #1565C0 0%, #1E3A8A 100%)',
        px: 3,
        py: 2.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
            Detalhes da Guia #{guide.number}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem', mt: 0.3 }}>
            {specialtyFormatted} • {insuranceFormatted}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}>
          <X size={18} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} sx={{ color: '#2E7A5E' }} />
          </Box>
        ) : (
          <>
            {/* Resumo rápido */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 3 }}>
              {[
                { label: 'Realizados', value: completedCount, color: '#2E7A5E', bg: '#EFF9F6' },
                { label: 'Agendados',  value: scheduledCount, color: '#1B4D6E', bg: '#EEF4FB' },
                { label: 'Cancelados', value: canceledCount,  color: '#C75146', bg: '#FDECEA' },
              ].map(item => (
                <Box key={item.label} sx={{ bgcolor: item.bg, borderRadius: '16px', p: 1.5, textAlign: 'center' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: item.color, lineHeight: 1.2 }}>
                    {item.value}
                  </Typography>
                  <Typography sx={{ fontSize: '0.65rem', color: item.color, fontWeight: 500, opacity: 0.8 }}>
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Divider sx={{ mb: 2.5 }} />

            {/* Lista de agendamentos */}
            {visibleAppointments.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <Calendar size={32} color="#A0AABF" style={{ marginBottom: 8 }} />
                <Typography sx={{ color: '#8A99B0', fontSize: '0.875rem' }}>
                  Nenhum agendamento registrado para esta guia
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {visibleAppointments.map((appt, idx) => {
                  const statusKey = appt.operationalStatus || appt.status || '';
                  const cfg = APPT_STATUS_CONFIG[statusKey] || { label: statusKey, color: '#8A99B0', bg: '#F8FAFE' };
                  const dateStr = appt.date
                    ? format(parseISO(appt.date.substring(0, 10)), "dd/MM/yyyy", { locale: ptBR })
                    : '—';
                  const timeStr = appt.time || '';
                  const doctorName = appt.doctor?.fullName || appt.professionalName || '';

                  return (
                    <Box
                      key={appt._id || idx}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 2,
                        py: 1.5,
                        bgcolor: '#F8FAFE',
                        borderRadius: '14px',
                        border: '1px solid #EDF2F7',
                        transition: 'all 0.15s',
                        '&:hover': { bgcolor: '#F1F5F9', borderColor: '#E2E8F0' }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: '#1A2C3E' }}>
                            {dateStr}{timeStr ? ` às ${timeStr}` : ''}
                          </Typography>
                          <Typography sx={{ fontSize: '0.7rem', color: '#8A99B0', mt: 0.2 }}>
                            {[
                              doctorName,
                              appt.sessionType ? appt.sessionType.replace(/_/g, ' ') : null
                            ].filter(Boolean).join(' • ') || '—'}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip
                          label={cfg.label}
                          size="small"
                          sx={{
                            height: '20px',
                            fontSize: '0.6rem',
                            fontWeight: 600,
                            bgcolor: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.color}30`,
                            borderRadius: '8px'
                          }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => openEdit(appt)}
                          sx={{ color: '#8A99B0', '&:hover': { color: '#1B4D6E' }, p: 0.5 }}
                        >
                          <Edit2 size={13} />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'space-between' }}>
        <Button
          onClick={() => {
            const firstPending = appointments.find(a =>
              ['pre_agendado', 'scheduled'].includes(a.operationalStatus || a.status)
            );
            // Plan é fonte primária; firstPending é fallback
            setBulkDoctorId(modalPlan?.doctor?._id || firstPending?.doctor?._id || '');
            setBulkTime(modalPlan?.slots?.[0]?.time || firstPending?.time || '');
            if (modalPlan?.slots?.[0]?.dayOfWeek != null) {
              setBulkDayOfWeek(String(modalPlan.slots[0].dayOfWeek));
            }
            setBulkDoctorOpen(true);
          }}
          variant="outlined"
          size="small"
          sx={{
            borderRadius: '40px', textTransform: 'none', fontWeight: 600, fontSize: '0.75rem',
            borderColor: '#C6E6DA', color: '#2E7A5E',
            '&:hover': { bgcolor: '#EFF9F6', borderColor: '#2E7A5E' }
          }}
        >
          Alterar terapeuta/horário (todas pendentes)
        </Button>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: '40px', textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem',
            borderColor: '#DDE4EE', color: '#5B6E8C',
            '&:hover': { bgcolor: '#F1F5F9', borderColor: '#C8D4E0' }
          }}
        >
          Fechar
        </Button>
      </DialogActions>
    </Dialog>

    {/* ── Dialog: Trocar terapeuta (todas pendentes) ── */}
    <Dialog
      open={bulkDoctorOpen}
      onClose={() => !bulkSaving && setBulkDoctorOpen(false)}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: '20px' } }}
    >
      <Box sx={{ background: 'linear-gradient(135deg, #1565C0 0%, #1E3A8A 100%)', px: 3, py: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
            Alterar sessões pendentes
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem', mt: 0.2 }}>
            Aplica para todos os pré-agendados e agendados desta guia
          </Typography>
        </Box>
        <IconButton onClick={() => setBulkDoctorOpen(false)} size="small" disabled={bulkSaving}
          sx={{ color: 'rgba(255,255,255,0.8)' }}>
          <X size={16} />
        </IconButton>
      </Box>
      <DialogContent sx={{ pt: 3, pb: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Profissional (opcional)</InputLabel>
          <Select
            value={bulkDoctorId}
            label="Profissional (opcional)"
            onChange={e => setBulkDoctorId(e.target.value)}
            sx={{ borderRadius: '12px' }}
          >
            <MenuItem value=""><em>Manter atual</em></MenuItem>
            {doctors
              .filter(d => !guide?.specialty || (d.specialty || '').toLowerCase() === (guide.specialty || '').toLowerCase())
              .map(d => <MenuItem key={d._id} value={d._id}>{d.fullName}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel>Dia da semana (opcional)</InputLabel>
          <Select
            value={bulkDayOfWeek}
            label="Dia da semana (opcional)"
            onChange={e => setBulkDayOfWeek(e.target.value)}
            sx={{ borderRadius: '12px' }}
          >
            <MenuItem value=""><em>Manter dia atual</em></MenuItem>
            <MenuItem value="1">Segunda-feira</MenuItem>
            <MenuItem value="2">Terça-feira</MenuItem>
            <MenuItem value="3">Quarta-feira</MenuItem>
            <MenuItem value="4">Quinta-feira</MenuItem>
            <MenuItem value="5">Sexta-feira</MenuItem>
            <MenuItem value="6">Sábado</MenuItem>
            <MenuItem value="0">Domingo</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Horário (opcional)"
          type="time"
          value={bulkTime}
          onChange={e => setBulkTime(e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          size="small"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
        />
        <Typography sx={{ fontSize: '0.7rem', color: '#8A99B0' }}>
          Sessões confirmadas/realizadas não serão alteradas. Preencha pelo menos um campo.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={() => { setBulkDoctorOpen(false); setBulkDoctorId(''); setBulkTime(''); setBulkDayOfWeek(''); }} disabled={bulkSaving}
          variant="outlined" sx={{ borderRadius: '40px', textTransform: 'none', fontWeight: 600,
            fontSize: '0.8rem', borderColor: '#DDE4EE', color: '#5B6E8C' }}>
          Cancelar
        </Button>
        <Button onClick={saveBulkDoctor} disabled={(!bulkDoctorId && !bulkTime && !bulkDayOfWeek) || bulkSaving}
          variant="contained" sx={{ borderRadius: '40px', textTransform: 'none', fontWeight: 600,
            fontSize: '0.8rem', bgcolor: '#2E7A5E', '&:hover': { bgcolor: '#246653' } }}>
          {bulkSaving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Aplicar a todas'}
        </Button>
      </DialogActions>
    </Dialog>

    {/* ── Dialog de edição de agendamento ── */}
    <Dialog
      open={Boolean(editingAppt)}
      onClose={() => !editSaving && setEditingAppt(null)}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: '20px' } }}
    >
      <Box sx={{
        background: 'linear-gradient(135deg, #1565C0 0%, #1E3A8A 100%)',
        px: 3, py: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
          Editar Agendamento
        </Typography>
        <IconButton onClick={() => setEditingAppt(null)} size="small" disabled={editSaving}
          sx={{ color: 'rgba(255,255,255,0.8)' }}>
          <X size={16} />
        </IconButton>
      </Box>

      <DialogContent sx={{ pt: 3, pb: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Data"
          type="date"
          value={editDate}
          onChange={e => setEditDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          size="small"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
        />
        <TextField
          label="Hora"
          type="time"
          value={editTime}
          onChange={e => setEditTime(e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          size="small"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
        />
        <FormControl fullWidth size="small">
          <InputLabel>Status</InputLabel>
          <Select
            value={editStatus}
            label="Status"
            onChange={e => setEditStatus(e.target.value)}
            sx={{ borderRadius: '12px' }}
          >
            {EDITABLE_STATUSES.map(s => (
              <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel>Profissional</InputLabel>
          <Select
            value={editDoctorId}
            label="Profissional"
            onChange={e => setEditDoctorId(e.target.value)}
            sx={{ borderRadius: '12px' }}
          >
            <MenuItem value=""><em>Sem alteração</em></MenuItem>
            {doctors
              .filter(d => !guide?.specialty || (d.specialty || '').toLowerCase() === (guide.specialty || '').toLowerCase())
              .map(d => <MenuItem key={d._id} value={d._id}>{d.fullName}</MenuItem>)}
          </Select>
        </FormControl>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          onClick={() => setEditingAppt(null)}
          disabled={editSaving}
          variant="outlined"
          sx={{ borderRadius: '40px', textTransform: 'none', fontWeight: 600, fontSize: '0.8rem',
            borderColor: '#DDE4EE', color: '#5B6E8C' }}
        >
          Cancelar
        </Button>
        <Button
          onClick={saveEdit}
          disabled={editSaving}
          variant="contained"
          sx={{ borderRadius: '40px', textTransform: 'none', fontWeight: 600, fontSize: '0.8rem',
            bgcolor: '#1B4D6E', '&:hover': { bgcolor: '#163d58' } }}
        >
          {editSaving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default PatientInsuranceTab;