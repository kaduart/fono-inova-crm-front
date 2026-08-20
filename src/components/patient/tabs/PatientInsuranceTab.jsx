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
  Select,
  FormControl,
  InputLabel,
  TextField,
  Skeleton
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
  Zap,
  History,
  ChevronDown,
  ChevronUp,
  UserCheck,
  DollarSign,
  RefreshCw,
  XOctagon,
  Info,
  AlertTriangle,
  ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useInsuranceGuides } from '../../../hooks/useInsuranceGuides';
import { useInsurancePlan, insurancePlanQueryKey } from '../../../hooks/useInsurancePlan';
import { getGuideAppointments, updateGuideAppointmentsBulk, supersedeGuide, getGuides, moveAppointmentToGuide } from '../../../services/insuranceGuideApi';
import { buildGuidesPresentation, buildGuidePresentation } from '../../../services/guidePresentationService';
import API from '../../../services/api';
import doctorService from '../../../services/doctorService';
import { appointmentService } from '../../../services/appointmentService';
import { useAppointmentsContext } from '../../../contexts/AppointmentsContext';
import InsuranceGuideForm from './InsuranceGuideForm';
import InsurancePlanForm from './InsurancePlanForm';
import { PatientMiniCalendar } from '../../patients/PatientMiniCalendar';
import InactivateEntityModal from '../../common/InactivateEntityModal';
import AppointmentDetailModal from '../../calendar/appointmentDetailModal';

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
  const selectedPresentation = useMemo(
    () => selectedGuide ? buildGuidePresentation(selectedGuide) : null,
    [selectedGuide]
  );
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [planFormContext, setPlanFormContext] = useState(null);
  const [detailsGuide, setDetailsGuide] = useState(null);
  const [showInactivateModal, setShowInactivateModal] = useState(false);
  const [isInactivating, setIsInactivating] = useState(false);
  const [renewingGuide, setRenewingGuide] = useState(null);
  const [doctors, setDoctors] = useState([]);

  const { fetchAppointments } = useAppointmentsContext();
  const queryClient = useQueryClient();
  const invalidatePlans = () => queryClient.invalidateQueries({ queryKey: ['insurance-plan'] });

  useEffect(() => {
    doctorService.getActiveDoctors()
      .then(res => setDoctors(res?.data ?? []))
      .catch(() => toast.error('Não foi possível carregar a lista de profissionais'));
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

  const presentations = useMemo(() => {
    return buildGuidesPresentation(guides);
  }, [guides]);

  const specialties = useMemo(() => {
    const unique = [...new Set(presentations.map(p => p.specialty).filter(Boolean))];
    return unique.sort();
  }, [presentations]);

  // Guias usáveis vencendo em breve — agregado num único alerta em vez de enterrado card a card.
  // Usa presentation.isExpiringSoon (mesma fonte que o badge do card) em vez de recalcular threshold aqui.
  const expiringSoonPresentations = useMemo(() => {
    return presentations.filter(p => p.isUsable && p.isExpiringSoon);
  }, [presentations]);

  const availablePresentations = useMemo(() => {
    return presentations
      .filter(p => selectedSpecialty === 'all' || p.specialty === selectedSpecialty)
      .filter(p => {
        if (selectedStatus === 'cancelled') return p.isCancelled;
        if (selectedStatus === 'inactive') return !p.isUsable;
        return p.isUsable;
      });
  }, [presentations, selectedSpecialty, selectedStatus]);

  const activeCount = useMemo(() => presentations.filter(p => p.isUsable).length, [presentations]);
  const inactiveCount = useMemo(() => presentations.filter(p => !p.isUsable).length, [presentations]);
  // Aba dedicada pra achar guia cancelada sem precisar entrar em "Inativas"
  // primeiro (achado real: usuário não sabia que #16173377 estava lá dentro).
  const cancelledCount = useMemo(() => presentations.filter(p => p.isCancelled).length, [presentations]);

  const groupedGuides = useMemo(() => {
    const active = availablePresentations.filter(p => p.isUsable);
    const exhausted = availablePresentations.filter(p => p.isExhausted);
    const expired = availablePresentations.filter(p => p.isExpired && !p.isCancelled && !p.isExhausted && !p.isSuperseded);
    const superseded = availablePresentations.filter(p => p.isSuperseded && !p.isCancelled && !p.isExpired && !p.isExhausted);
    const cancelled = availablePresentations.filter(p => p.isCancelled);
    return { active, exhausted, expired, superseded, cancelled };
  }, [availablePresentations]);

  const handleOpenMenu = (event, presentation) => {
    setAnchorEl(event.currentTarget);
    setSelectedGuide(presentation.rawGuide);
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

  const handleOpenDetailsCard = (presentation) => {
    setDetailsGuide(presentation.rawGuide);
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

  const handleRenovarGuia = () => {
    setRenewingGuide(selectedGuide);
    setIsFormOpen(true);
    handleDismissMenu();
  };

  const handleCancelGuide = () => {
    if (!selectedGuide) return;
    setShowInactivateModal(true);
    handleCloseMenu();
  };

  const handleInactivateFromCard = (presentation) => {
    setSelectedGuide(presentation.rawGuide);
    setShowInactivateModal(true);
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
      if (renewingGuide) {
        const renewResult = await supersedeGuide(renewingGuide._id, {
          newGuide: {
            number: data.number,
            expiresAt: data.expiresAt,
            totalSessions: data.totalSessions,
            sessionValue: data.sessionValue,
            evaluationAmount: data.evaluationAmount,
            doctorId: data.doctorId,
            issuedAt: data.issuedAt,
            notes: data.notes
          },
          replacementTrigger: 'new_authorization',
          replacementNotes: data.notes,
          migrationStrategy: 'eligible'
        });
        const planMsg = renewResult.planCloned
          ? ` Plano terapêutico clonado (${renewResult.planGeneratedAppointmentsCount ?? 0} novos agendamentos, ${renewResult.planAppointmentsCanceledCount ?? 0} antigos cancelados).`
          : '';
        toast.success(`Guia renovada com sucesso.${planMsg}`);
        refetch();
        fetchAppointments();
        invalidatePlans();
      } else if (editingGuide) {
        await updateGuide(editingGuide._id, data);
        toast.success('Guia atualizada com sucesso');
        refetch();
        fetchAppointments();
        invalidatePlans();
      } else {
        await createGuide({ ...data, patientId });
        toast.success('Guia criada com sucesso');
        refetch();
        fetchAppointments();
        invalidatePlans();
      }
      setIsFormOpen(false);
      setEditingGuide(null);
      setRenewingGuide(null);
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar guia');
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingGuide(null);
    setRenewingGuide(null);
  };

  const handleOpenPlanForm = (presentation, plan = null) => {
    setPlanFormContext({ guide: presentation.rawGuide, plan });
    setPlanFormOpen(true);
  };

  const handleClosePlanForm = (refetchNeeded) => {
    setPlanFormOpen(false);
    setPlanFormContext(null);
    if (refetchNeeded) {
      refetch();
      invalidatePlans();
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
              <Tab label={`Todas (${presentations.length})`} value="all" />
              {specialties.map(specialty => {
                const count = presentations.filter(p => p.specialty === specialty).length;
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

      {/* Alerta agregado — guias vencendo em breve não devem ficar escondidas card a card */}
      {expiringSoonPresentations.length > 0 && (
        <Alert
          severity="warning"
          sx={{
            mb: 3,
            borderRadius: '16px',
            fontSize: '0.8125rem',
            alignItems: 'center',
            '& .MuiAlert-message': { width: '100%' }
          }}
        >
          <strong>{expiringSoonPresentations.length} guia{expiringSoonPresentations.length !== 1 ? 's' : ''} vencendo em breve:</strong>{' '}
          {expiringSoonPresentations
            .map(p => `${p.specialtyLabel} (${p.daysUntilExpiration === 0 ? 'hoje' : `${p.daysUntilExpiration}d`})`)
            .join(', ')}
          {' — considere renovar antes do vencimento.'}
        </Alert>
      )}

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
        <Tab label={`Canceladas (${cancelledCount})`} value="cancelled"
          sx={{ '&.Mui-selected': { backgroundColor: '#A0AABF' } }} />
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

      {availablePresentations.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8, bgcolor: '#F9FBFD', borderRadius: '32px' }}>
          <Typography variant="body1" sx={{ color: '#5B6E8C', mb: 1 }}>
            Nenhuma guia {selectedStatus === 'inactive' ? 'inativa' : selectedStatus === 'cancelled' ? 'cancelada' : 'ativa'} encontrada
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
        presentations={groupedGuides.active}
        color="#2E7A5E"
        onOpenMenu={handleOpenMenu}
        onCreatePlan={handleOpenPlanForm}
        onOpenDetails={handleOpenDetailsCard}
        onInactivate={handleInactivateFromCard}
      />

      <GuideSection
        title="Guias esgotadas"
        count={groupedGuides.exhausted.length}
        presentations={groupedGuides.exhausted}
        color="#C75146"
        onOpenMenu={handleOpenMenu}
        onCreatePlan={handleOpenPlanForm}
        onOpenDetails={handleOpenDetailsCard}
        onInactivate={handleInactivateFromCard}
      />

      <GuideSection
        title="Guias expiradas"
        count={groupedGuides.expired.length}
        presentations={groupedGuides.expired}
        color="#8A99B0"
        onOpenMenu={handleOpenMenu}
        onCreatePlan={handleOpenPlanForm}
        onOpenDetails={handleOpenDetailsCard}
        onInactivate={handleInactivateFromCard}
      />

      <GuideSection
        title="Guias substituídas"
        count={groupedGuides.superseded.length}
        presentations={groupedGuides.superseded}
        color="#6366F1"
        onOpenMenu={handleOpenMenu}
        onCreatePlan={handleOpenPlanForm}
        onOpenDetails={handleOpenDetailsCard}
        onInactivate={handleInactivateFromCard}
      />

      <GuideSection
        title="Guias canceladas"
        count={groupedGuides.cancelled.length}
        presentations={groupedGuides.cancelled}
        color="#A0AABF"
        onOpenMenu={handleOpenMenu}
        onCreatePlan={handleOpenPlanForm}
        onOpenDetails={handleOpenDetailsCard}
        onInactivate={handleInactivateFromCard}
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
          disabled={!selectedPresentation?.canEdit}
          sx={{ fontSize: '0.8125rem', py: 1, gap: 1.5, borderRadius: '12px', mx: 0.5 }}
        >
          <Edit2 size={14} /> Editar
        </MenuItem>
        <MenuItem
          onClick={handleRenovarGuia}
          disabled={!selectedPresentation?.canRenew}
          sx={{ fontSize: '0.8125rem', py: 1, gap: 1.5, borderRadius: '12px', mx: 0.5, color: '#1B4D6E' }}
        >
          <RefreshCw size={14} /> Renovar Guia
        </MenuItem>
        <MenuItem
          onClick={handleCancelGuide}
          disabled={selectedPresentation?.isCancelled}
          sx={{ fontSize: '0.8125rem', py: 1, gap: 1.5, borderRadius: '12px', mx: 0.5, color: '#C75146' }}
        >
          <Trash2 size={14} /> Inativar guia
        </MenuItem>
      </Menu>

      {/* Modais */}
      <InsuranceGuideForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSaveGuide}
        guide={renewingGuide || editingGuide}
        doctors={doctors}
        isRenewal={Boolean(renewingGuide)}
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
        onUpdate={() => { refetch(); fetchAppointments(); invalidatePlans(); }}
      />



      {/* Modal de confirmação de inativação — compartilhado com Package/Liminar */}
      <InactivateEntityModal
        open={showInactivateModal}
        entityType="guide"
        loading={isInactivating}
        onConfirm={confirmInactivate}
        onClose={() => {
          if (!isInactivating) {
            setShowInactivateModal(false);
            setSelectedGuide(null);
          }
        }}
      />
    </Box>
  );
};

// ----------------------------------------------------------------------
// Componente de seção de guias (título + grid)
// ----------------------------------------------------------------------
const GuideSection = ({ title, count, presentations, color, onOpenMenu, onCreatePlan, onOpenDetails, onInactivate }) => {
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
          gap: 2.5,
          justifyItems: 'start',
          alignItems: 'start'
        }}>
          {presentations.map(presentation => (
            <GuideCard
              key={presentation.id}
              presentation={presentation}
              onOpenMenu={onOpenMenu}
              onCreatePlan={onCreatePlan}
              onOpenDetails={onOpenDetails}
              onInactivate={onInactivate}
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

// Badge de status sólido (não translúcido) — precisa ser legível em cima de QUALQUER
// gradiente de especialidade. Um tom translúcido (ex: laranja 35%) sobre um card já
// laranja praticamente some; um pill branco sólido + ponto colorido não depende da cor de fundo.
const STATUS_SEVERITY_STYLE = {
  success:  { bg: '#EFF9F6', color: '#15803D', dot: '#22C55E' },
  warning:  { bg: '#FFF7ED', color: '#C2410C', dot: '#F97316' },
  critical: { bg: '#FDECEA', color: '#B91C1C', dot: '#EF4444' },
  neutral:  { bg: '#F1F5F9', color: '#4B5563', dot: '#9CA3AF' },
};

const GuideCard = ({ presentation, onOpenMenu, onCreatePlan, onOpenDetails, onInactivate }) => {
  const guide = presentation.rawGuide;
  const {
    remaining,
    usedSessions,
    totalSessions,
    progressPct,
    isUsable,
    isCancelled,
    statusLabel,
    statusSeverity,
    expiryLabel,
    expiryColor,
    theme
  } = presentation;

  const severityStyle = STATUS_SEVERITY_STYLE[statusSeverity] || STATUS_SEVERITY_STYLE.neutral;

  const [generating, setGenerating] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [generateModal, setGenerateModal] = useState(null); // { open, planId, startDate } | null
  const queryClient = useQueryClient();

  const runGenerateSessions = async (planId, { allowPastGeneration = false } = {}) => {
    setGenerating(true);
    try {
      const res = await API.post(
        `/v2/insurance-plans/${planId}/generate-sessions`,
        { allowPastGeneration },
        { timeout: 60000 }
      );
      const {
        appointmentsGenerated,
        appointmentsCanceled,
        replanned,
        remaining,
        pastAppointmentsPending
      } = res.data?.data || {};

      if (replanned && appointmentsCanceled > 0 && appointmentsGenerated > 0) {
        toast.success(
          `🔄 ${appointmentsCanceled} antigas → ${appointmentsGenerated} novas`,
          { duration: 5000 }
        );
      } else if (appointmentsGenerated > 0) {
        toast.success(`${appointmentsGenerated} sessão(ões) gerada(s)`);
      } else if (remaining === 0) {
        // "Nada gerado" sem dizer o porquê deixava parecendo bug (ex: plano com
        // startDate no passado mas sem sessões sobrando pra preencher o passado —
        // achado real: guia 16173376, startDate 17/07, mas as 10 sessões autorizadas
        // já estavam todas alocadas em datas futuras, sem sobra pra backfill).
        toast(`Nenhuma sessão nova: as ${guide.totalSessions} autorizadas pela guia já estão todas agendadas/concluídas — não sobrou saldo pra gerar mais.`, { icon: 'ℹ️', duration: 6000 });
      } else {
        toast(`Nenhuma sessão nova foi gerada (${remaining} ainda disponível na guia) — os horários do plano já coincidem com os agendamentos existentes.`, { icon: 'ℹ️', duration: 6000 });
      }

      // 🚨 FIX (2026-08-20): sessões retroativas não são mais completadas
      // automaticamente (ver comentário no backend, routes/insurancePlans.v2.js)
      // — nascem pre_agendado, pendentes de confirmação manual real.
      if (pastAppointmentsPending > 0) {
        toast(`${pastAppointmentsPending} sessão(ões) retroativa(s) criada(s) como pendente — confirme cada uma manualmente pela agenda se o atendimento realmente aconteceu.`, { icon: 'ℹ️', duration: 8000 });
      }

      queryClient.invalidateQueries({ queryKey: insurancePlanQueryKey(guide._id) });
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;
      const conflict = err?.response?.data?.conflict;

      if (status === 429) {
        toast('Já existe uma geração em andamento. Aguarde alguns segundos.', { icon: '⏳' });
      } else if (status === 409 && conflict?.withWhom) {
        // Negrito só no que importa (com quem, guia, quando) — mesmo padrão do
        // InsurancePlanForm, pra não enterrar a informação útil em texto corrido.
        toast.error(
          <span>
            Conflito de agenda com <strong>{conflict.withWhom}</strong>
            {conflict.guideNumber ? <> (guia <strong>{conflict.guideNumber}</strong>)</> : null} em{' '}
            <strong>{conflict.date}</strong> às <strong>{conflict.time}</strong>. Escolha outro horário.
          </span>,
          { duration: 9000 }
        );
      } else if (status >= 500) {
        toast.error(serverMsg || 'Erro no servidor. Aguarde um instante e tente novamente.');
      } else if (!err?.response) {
        toast.error('A requisição demorou demais ou foi interrompida. Recarregue a página e tente novamente.');
      } else {
        toast.error(serverMsg || 'Erro ao gerar sessões');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateSessions = (planId) => {
    // Mesmo padrão do "Gerar sessões" da Liminar: sempre abre modal confirmando
    // quantidade e data de início antes de gerar, em vez de disparar direto.
    const startDateStr = plan?.startDate ? plan.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
    setGenerateModal({ open: true, planId, startDate: startDateStr });
  };

  const handleConfirmGenerate = async () => {
    if (!generateModal?.open) return;
    const { planId, startDate } = generateModal;
    setGenerateModal(null);

    const currentStartDate = plan?.startDate ? plan.startDate.slice(0, 10) : null;
    const todayStr = new Date().toISOString().slice(0, 10);
    const startsInPast = startDate < todayStr;

    try {
      // Data mudou em relação ao plano salvo — persiste antes de gerar (mesmo
      // endpoint da edição do plano, PATCH /:id).
      if (startDate !== currentStartDate) {
        await API.patch(`/v2/insurance-plans/${planId}`, { startDate });
        queryClient.invalidateQueries({ queryKey: insurancePlanQueryKey(guide._id) });
      }
      await runGenerateSessions(planId, { allowPastGeneration: startsInPast });
    } catch (err) {
      const serverMsg = err?.response?.data?.message;
      toast.error(serverMsg || 'Erro ao salvar a data de início do plano');
    }
  };

  // Query compartilhada — mesma key usada pelo GuideDetailsModal, sem fetch duplicado
  const { data: plan = null, isLoading: planLoading, isError: planError, refetch: refetchPlan } = useInsurancePlan(guide._id, isUsable);

  // O bloco "Plano ativo" abaixo já mostra o profissional do plano — só repete aqui em cima
  // se a guia tiver um profissional diferente do plano (ou não houver plano ainda).
  const planDoctorName = plan?.doctor?.fullName || plan?.doctor?.name || null;
  const showGuideDoctor = Boolean(guide.doctor?.fullName) && guide.doctor.fullName !== planDoctorName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      style={{ height: '100%', width: '100%', maxWidth: 380 }}
    >
      <div
        className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col h-full"
        style={{ opacity: isUsable ? 1 : 0.75 }}
      >
        {/* ── Faixa de identidade: cor entra como accent fino, não como bloco dominante ── */}
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${theme.from}, ${theme.to})` }} />

        {/* ── Header compacto ── */}
        <div className="px-4 pt-3 pb-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-gray-400 mb-0.5">#{presentation.number}</div>
              <h3 className="font-bold text-[0.95rem] text-gray-900 leading-tight truncate">{presentation.specialtyLabel}</h3>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 -mr-1.5 -mt-1">
              {!plan && onOpenDetails && (
                <IconButton
                  size="small"
                  onClick={() => onOpenDetails(presentation)}
                  title="Detalhes da guia"
                  sx={{ color: '#9CA3AF', p: 0.5, '&:hover': { color: theme.text, bgcolor: theme.light } }}
                >
                  <Info size={15} />
                </IconButton>
              )}
              <IconButton
                size="small"
                onClick={(e) => onOpenMenu(e, presentation)}
                sx={{ color: '#9CA3AF', p: 0.5, '&:hover': { color: theme.text, bgcolor: theme.light } }}
              >
                <MoreVertical size={16} />
              </IconButton>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {presentation.insuranceLabel && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: theme.light, color: theme.text }}
              >
                {presentation.insuranceLabel}
              </span>
            )}
            {guide.expiresAt && (
              <span className="text-gray-500 text-xs">
                Vence <strong className="text-gray-700 font-semibold">{format(parseISO(guide.expiresAt), 'dd/MM/yyyy')}</strong>
              </span>
            )}
          </div>

          {/* Badge de status sólido — ponto colorido reforça a severidade */}
          <div className="mt-2">
            {!isCancelled && onInactivate ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onInactivate(presentation); }}
                title="Clique para inativar esta guia"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                style={{ backgroundColor: severityStyle.bg, color: severityStyle.color, '--tw-ring-color': theme.to }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: severityStyle.dot }} />
                {statusLabel}
              </button>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide"
                style={{ backgroundColor: severityStyle.bg, color: severityStyle.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: severityStyle.dot }} />
                {statusLabel}
              </span>
            )}
          </div>
        </div>

        {/* ── Progresso: bloco compacto e contido, cor só como accent ── */}
        <div className="mx-4 mb-2.5 px-3.5 py-3 rounded-xl border" style={{ backgroundColor: theme.light, borderColor: theme.border }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600">Progresso clínico</span>
            <span className="text-xs font-bold" style={{ color: theme.text }}>{usedSessions} / {totalSessions}</span>
          </div>

          <div className="w-full bg-white/70 rounded-full h-2 overflow-hidden mb-2.5">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${theme.from}, ${theme.to})` }}
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: theme.text }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: theme.to }} />
              {usedSessions} concluída{usedSessions !== 1 ? 's' : ''}
            </span>
            {(guide.canceledCount > 0) && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-red-500">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                {guide.canceledCount} cancelada{guide.canceledCount !== 1 ? 's' : ''}
              </span>
            )}
            {(guide.scheduledCount > 0) && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600">
                <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                {guide.scheduledCount} agendada{guide.scheduledCount !== 1 ? 's' : ''}
              </span>
            )}
            <span className="text-[11px] text-gray-400 ml-auto">/{totalSessions}</span>
          </div>
        </div>

        {/* ── Gatilho do accordion: controle discreto integrado, sem linha estrutural pesada ── */}
        <button
          onClick={() => setDetailsExpanded(v => !v)}
          className="mx-4 mb-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
          style={{ color: theme.text, '--tw-ring-color': theme.to }}
        >
          {detailsExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
          <ChevronDown
            size={14}
            style={{ transition: 'transform 0.2s', transform: detailsExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        {detailsExpanded && (
        <>
        {/* ── Financial details ── */}
        <div className="px-4 pb-3 flex-1 flex flex-col gap-2.5">
          {(guide.sessionValue > 0 || guide.evaluationAmount > 0 || guide.totalValue > 0 || showGuideDoctor) && (
            <div className="flex flex-col gap-2">
              {(guide.sessionValue > 0 || guide.totalValue > 0) && (
                <div className="grid grid-cols-2 gap-2">
                  {guide.sessionValue > 0 && (
                    <div className="rounded-lg px-3 py-2" style={{ backgroundColor: theme.light }}>
                      <span className="flex items-center gap-1 text-[11px] text-gray-500 mb-0.5">
                        <DollarSign size={11} className="opacity-60" />
                        Valor/sessão
                      </span>
                      <div className="text-sm font-bold text-gray-900">
                        {Number(guide.sessionValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  )}
                  {guide.totalValue > 0 && (
                    <div className="rounded-lg px-3 py-2" style={{ backgroundColor: theme.light }}>
                      <span className="flex items-center gap-1 text-[11px] text-gray-500 mb-0.5">
                        <DollarSign size={11} className="opacity-60" />
                        Total autorizado
                      </span>
                      <div className="text-sm font-bold" style={{ color: theme.text }}>
                        {Number(guide.totalValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {guide.evaluationAmount > 0 && (
                <div className="flex justify-between items-center px-0.5">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <FileText size={12} className="opacity-50" />
                    Valor avaliação
                  </span>
                  <div className="flex items-center gap-2">
                    {guide.generateEvaluationBilling === false && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">sem cobrança no sistema</span>
                    )}
                    <span className="text-xs font-bold text-gray-900">
                      {Number(guide.evaluationAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              )}
              {showGuideDoctor && (
                <div className="flex justify-between items-center gap-2 px-0.5">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
                    <UserCheck size={12} className="opacity-50" />
                    Profissional da guia
                  </span>
                  <span className="text-xs font-semibold text-gray-700 text-right truncate">{guide.doctor.fullName}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Plan block (lazy-loaded) ── */}
        {isUsable && planLoading && (
          <Box sx={{ mx: 2, mb: 2 }}>
            <Skeleton variant="rounded" height={110} sx={{ borderRadius: '12px' }} />
          </Box>
        )}

        {isUsable && planError && (
          <Box sx={{
            mx: 2, mb: 2, px: 2, py: 1.5, borderRadius: '12px',
            bgcolor: '#FDECEA', border: '1px solid #F5C6C0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1
          }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#C75146' }}>
              Não foi possível carregar o plano
            </Typography>
            <IconButton size="small" onClick={() => refetchPlan()} sx={{ color: '#C75146', p: 0.4 }}>
              <RefreshCw size={13} />
            </IconButton>
          </Box>
        )}

        {plan && (
          <div className="mx-4 mb-3 px-3.5 py-3 rounded-xl" style={{ backgroundColor: theme.light }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar size={12} style={{ color: theme.text }} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.text }}>
                  Plano ativo
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Ativo" />
              </div>
              <div className="flex items-center gap-2">
                {onOpenDetails && (
                  <button
                    onClick={() => onOpenDetails(presentation)}
                    title="Detalhes da guia"
                    className="opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rounded"
                    style={{ color: theme.text, '--tw-ring-color': theme.to }}
                  >
                    <Info size={13} />
                  </button>
                )}
                <button
                  onClick={() => onCreatePlan(presentation, plan)}
                  title="Editar plano"
                  className="opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 rounded"
                  style={{ color: theme.text, '--tw-ring-color': theme.to }}
                >
                  <Edit2 size={13} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              {(plan.doctor?.fullName || plan.doctor?.name) && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Profissional</span>
                  <span className="font-semibold text-gray-800 truncate max-w-[60%] text-right">
                    {plan.doctor?.fullName || plan.doctor?.name}
                  </span>
                </div>
              )}

              {plan.sessionsPerWeek > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Frequência</span>
                  <span className="font-semibold text-gray-800">{plan.sessionsPerWeek}×/semana</span>
                </div>
              )}

              {plan.slots?.length > 0 && (
                <div className="flex items-start justify-between text-sm gap-2">
                  <span className="text-gray-500 shrink-0 mt-0.5">Horários</span>
                  <div className="flex flex-col items-end gap-1">
                    {[...plan.slots]
                      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.time.localeCompare(b.time))
                      .map((s, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                        style={{ backgroundColor: '#FFFFFF', color: theme.text, border: `1px solid ${theme.border}` }}
                      >
                        {DAY_NAMES[s.dayOfWeek] ?? s.dayOfWeek}
                        <span className="w-1 h-1 rounded-full opacity-40" style={{ backgroundColor: theme.text }} />
                        {s.time}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {plan.sessionValue > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Valor do plano</span>
                  <span className="font-semibold text-gray-800">
                    {Number(plan.sessionValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              )}

              {plan.generatedAppointments?.length > 0 && (
                <div className="flex items-center justify-between text-sm">
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
          </div>
        )}

        </>
        )}

        {plan?.needsSessionRegeneration && (
          <div
            className="mx-4 mb-3 px-3.5 py-3 rounded-xl border flex items-start gap-2.5"
            style={{ backgroundColor: '#FDECEA', borderColor: '#F5C6C0' }}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#F9D5D0' }}>
              <AlertTriangle size={14} style={{ color: '#C75146' }} />
            </div>
            <div className="flex flex-col gap-0.5 min-w-0 pt-0.5">
              <span className="text-xs font-bold" style={{ color: '#C75146' }}>Plano alterado</span>
              <span className="text-xs leading-relaxed" style={{ color: '#B85C52' }}>
                Clique em <strong className="font-semibold" style={{ color: '#C75146' }}>&quot;Gerar sessões&quot;</strong> para sincronizar.
              </span>
            </div>
          </div>
        )}

        {/* ── Action buttons ── */}
        {isUsable && onCreatePlan && (
          <div className="px-4 pt-1 pb-3.5 flex items-center gap-2">
            {plan && remaining > 0 && (
              <button
                onClick={() => handleGenerateSessions(plan._id)}
                disabled={generating}
                title={`${remaining} sessão(ões) restante(s)`}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80 active:scale-[0.97] shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                style={{ borderColor: theme.to, color: theme.to, background: 'transparent', '--tw-ring-color': theme.to }}
              >
                <Zap size={13} />
                {generating ? 'Gerando...' : `Gerar (${remaining})`}
              </button>
            )}
            <button
              onClick={() => onCreatePlan(presentation, plan || null)}
              className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-90 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{ background: `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)`, boxShadow: `0 4px 10px -2px ${theme.from}50`, '--tw-ring-color': theme.to }}
            >
              <Calendar size={14} />
              {plan ? 'Ver e editar sessões' : 'Agendar com guia'}
            </button>
          </div>
        )}
      </div>

      {/* Gerar sessões — mesmo padrão do modal da Liminar: confirma quantidade e início antes de gerar */}
      {generateModal?.open && (() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const startsInPast = generateModal.startDate < todayStr;
        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: theme.to }}>
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Gerar sessões</h3>
                  <p className="text-xs text-slate-500">Guia #{guide.number} — {presentation.specialtyLabel || guide.specialty}</p>
                </div>
                <button onClick={() => setGenerateModal(null)} className="ml-auto text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-600 mb-2">Data de início</label>
                <input
                  type="date"
                  value={generateModal.startDate}
                  onChange={(e) => setGenerateModal(prev => (prev ? { ...prev, startDate: e.target.value } : prev))}
                  className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 bg-slate-50"
                />
              </div>

              {startsInPast && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Vai criar uma sessão pendente pra cada dia/horário do plano entre{' '}
                    <strong>{format(parseISO(generateModal.startDate), 'dd/MM/yyyy')}</strong> e hoje.{' '}
                    <strong>Nenhuma sessão retroativa é marcada como realizada automaticamente</strong> — cada uma
                    fica pendente na agenda até alguém confirmar manualmente que o atendimento realmente aconteceu
                    (só assim ela desconta da guia). Não gera cobrança nem desconto de guia sozinho.
                  </p>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Sessões a gerar (autorizado pela guia):</span>
                  <span className="font-semibold text-slate-800">{remaining}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setGenerateModal(null)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50">
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmGenerate}
                  disabled={!generateModal.startDate}
                  className="flex-1 py-2.5 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
                  style={{ background: `linear-gradient(135deg, ${theme.from} 0%, ${theme.to} 100%)` }}>
                  <CheckCircle className="w-4 h-4" /> Gerar sessões
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </motion.div>
  );
};

// ----------------------------------------------------------------------
// Componente de entrada do changelog do plano
// ----------------------------------------------------------------------
const PLAN_ACTION_CONFIG = {
  insurance_plan_created:  { label: 'Plano criado',      color: '#2E7A5E', bg: '#EFF9F6', Icon: CheckCircle },
  insurance_plan_updated:  { label: 'Plano atualizado',  color: '#1B4D6E', bg: '#EEF4FB', Icon: Edit2 },
  insurance_plan_canceled: { label: 'Plano cancelado',   color: '#C75146', bg: '#FDECEA', Icon: XOctagon },
  insurance_plan_replaced: { label: 'Plano substituído', color: '#D97706', bg: '#FFFBEB', Icon: RefreshCw },
};

const DIFF_FIELD_LABELS = {
  doctor:         'Profissional',
  sessionValue:   'Valor/sessão',
  slots:          'Horários',
  notes:          'Observações',
  status:         'Status',
  sessionsPerWeek:'Frequência',
  totalSessions:  'Total de sessões',
  startDate:      'Data de início',
};

const ACTOR_ROLE_LABELS = {
  admin:      'Admin',
  secretary:  'Secretária',
  doctor:     'Profissional',
  SYSTEM:     'Sistema',
};

const PlanChangelogEntry = ({ entry }) => {
  const cfg = PLAN_ACTION_CONFIG[entry.action] || { label: entry.action, color: '#8A99B0', bg: '#F8FAFE', Icon: Clock };
  const { Icon } = cfg;

  const dateStr = entry.createdAt
    ? format(parseISO(entry.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    : '—';

  const actorLabel = entry.actorRole ? (ACTOR_ROLE_LABELS[entry.actorRole] || entry.actorRole) : 'Sistema';

  const diffLines = [];
  if (entry.diff) {
    for (const [field, change] of Object.entries(entry.diff)) {
      const label = DIFF_FIELD_LABELS[field];
      if (!label) continue;
      if (field === 'sessionValue') {
        const fmt = (v) => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
        diffLines.push(`${label}: ${fmt(change.from)} → ${fmt(change.to)}`);
      } else if (field === 'slots') {
        diffLines.push(`${label}: alterados`);
      } else if (field === 'doctor') {
        diffLines.push(`${label}: alterado`);
      } else if (field === 'startDate') {
        const fmt = (v) => v ? format(parseISO(v), 'dd/MM/yyyy') : '—';
        diffLines.push(`${label}: ${fmt(change.from)} → ${fmt(change.to)}`);
      } else {
        diffLines.push(`${label}: ${change.from ?? '—'} → ${change.to ?? '—'}`);
      }
    }
  }

  return (
    <Box sx={{
      display: 'flex', gap: 1.5,
      px: 2, py: 1.5,
      bgcolor: cfg.bg,
      borderRadius: '14px',
      border: `1px solid ${cfg.color}20`,
    }}>
      <Box sx={{
        width: 28, height: 28, borderRadius: '8px',
        bgcolor: `${cfg.color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, mt: 0.2
      }}>
        <Icon size={13} color={cfg.color} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: cfg.color }}>
            {cfg.label}
          </Typography>
          <Typography sx={{ fontSize: '0.65rem', color: '#8A99B0', flexShrink: 0 }}>
            {dateStr}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '0.7rem', color: '#5B6E8C', mt: 0.2 }}>
          Por: {actorLabel}
        </Typography>
        {diffLines.length > 0 && (
          <Box sx={{ mt: 0.8, display: 'flex', flexDirection: 'column', gap: 0.4 }}>
            {diffLines.map((line, i) => (
              <Typography key={i} sx={{ fontSize: '0.7rem', color: '#1A2C3E', fontWeight: 500 }}>
                • {line}
              </Typography>
            ))}
          </Box>
        )}
      </Box>
    </Box>
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

export const GuideDetailsModal = ({ guide, onClose, onUpdate }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState(false);

  // Concluir pelo card reaproveita o completeAppointment do contexto global
  // (mesmo usado pela agenda real) — já faz o polling do 202 assíncrono
  // (pollAppointmentStatus) e detecta lock liberado por falha de worker, sem
  // precisar reimplementar nada disso aqui (bloqueador 4 do review 2026-08-15).
  const { completeAppointment: completeAppointmentCtx } = useAppointmentsContext();

  // 🚨 FIX (2026-08-15): dialog de edição simples trocado por AppointmentDetailModal
  // (mesmo padrão já usado em ContractCard.tsx/Liminar) — corrige rótulo de status
  // errado ("Agendado" pra sessão completed, por normalizeEditStatus cair no fallback)
  // e reaproveita as guardas/tradução de status já corretas do modal canônico.
  const [editingAppointment, setEditingAppointment] = useState(null);

  const [doctors, setDoctors] = useState([]);
  const [doctorsLoaded, setDoctorsLoaded] = useState(false);

  const [bulkDoctorOpen, setBulkDoctorOpen] = useState(false);
  const [bulkDoctorId, setBulkDoctorId]     = useState('');
  const [bulkTime, setBulkTime]             = useState('');
  const [bulkDayOfWeek, setBulkDayOfWeek]   = useState('');
  const [bulkSaving, setBulkSaving]         = useState(false);
  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);

  // Mover atendimento para outra guia (correção administrativa)
  const [movingAppt, setMovingAppt]           = useState(null);
  const [moveGuides, setMoveGuides]           = useState([]);
  const [moveGuidesLoading, setMoveGuidesLoading] = useState(false);
  const [moveTargetGuideId, setMoveTargetGuideId] = useState('');
  const [moveReason, setMoveReason]           = useState('');
  const [moveSubmitting, setMoveSubmitting]   = useState(false);

  // Mesma query key do GuideCard — reaproveita o cache, sem fetch duplicado
  const { data: modalPlan = null, isLoading: modalPlanLoading, isError: modalPlanError, refetch: refetchModalPlan } = useInsurancePlan(guide?._id);

  // Changelog do plano
  const [changelog, setChangelog] = useState([]);
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [viewMode, setViewMode] = useState('calendar');

  useEffect(() => {
    if (!doctorsLoaded) {
      doctorService.getActiveDoctors()
        .then(res => { setDoctors(res?.data ?? []); setDoctorsLoaded(true); })
        .catch(() => toast.error('Não foi possível carregar a lista de profissionais'));
    }
  }, [doctorsLoaded]);

  useEffect(() => {
    if (!modalPlan?._id) { setChangelog([]); return; }
    let mounted = true;
    setChangelogLoading(true);
    API.get(`/v2/insurance-plans/${modalPlan._id}/changelog`)
      .then(res => { if (mounted) setChangelog(res.data?.data || []); })
      .catch(() => { if (mounted) setChangelog([]); })
      .finally(() => { if (mounted) setChangelogLoading(false); });
    return () => { mounted = false; };
  }, [modalPlan?._id]);

  const loadAppointments = (guideId) => {
    setLoading(true);
    setAppointmentsError(false);
    return getGuideAppointments(guideId)
      .then(data => setAppointments(data))
      .catch(() => { setAppointments([]); setAppointmentsError(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!guide) return;
    loadAppointments(guide._id);
  }, [guide?._id]);

  // Adapta o formato de appointment retornado por getGuideAppointments pro
  // shape que AppointmentDetailModal espera — mesmo mapper de ContractCard.tsx.
  const sessionToEvent = (s) => {
    const dateObj = new Date(s.date);
    return {
      id: s._id,
      patient: { id: s.patient?._id ?? s.patient, fullName: s.patient?.fullName ?? '' },
      doctor: { id: s.doctor?._id ?? s.doctor, fullName: s.doctor?.fullName ?? '' },
      date: dateObj,
      startTime: s.time,
      formattedDate: dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }),
      backgroundColor: '#3B82F6',
      borderColor: '#2563EB',
      start: `${(s.date || '').slice(0, 10)}T${s.time}`,
      operationalStatus: s.operationalStatus || s.status,
      clinicalStatus: s.clinicalStatus,
      reason: s.reason || s.notes || '',
      sessionValue: s.sessionValue,
      paymentAmount: s.paymentAmount,
      specialty: s.specialty,
      serviceType: s.serviceType,
      billingType: s.billingType,
      paymentMethod: s.paymentMethod,
      insuranceProvider: s.insuranceProvider,
      insuranceValue: s.insuranceValue,
      authorizationCode: s.authorizationCode,
      insuranceGuide: s.insuranceGuide ?? guide?._id ?? null,
      insuranceGuideId: s.insuranceGuide?.toString?.() ?? s.insuranceGuideId ?? guide?._id ?? null,
      insurancePlan: s.insurancePlan ?? null,
      liminarContract: s.liminarContract ?? null,
      package: s.package ?? null,
      __isPreAgendamento: (s.operationalStatus || s.status) === 'pre_agendado',
    };
  };

  const openEdit = (appt) => {
    // Guarda também aqui (não só no disabled do ícone) — o calendário mini
    // (viewMode='calendar') chama openEdit direto no clique do evento, sem
    // passar pelos botões da lista.
    const status = appt.operationalStatus || appt.status;
    if (status === 'completed') {
      toast('Sessão já concluída — não pode ser editada/cancelada por aqui', { icon: 'ℹ️' });
      return;
    }
    setEditingAppointment(sessionToEvent(appt));
  };

  const openMove = (appt) => {
    setMovingAppt(appt);
    setMoveTargetGuideId('');
    setMoveReason('');
    // guide.patientId vem populado ({_id, fullName, cpf}) neste fluxo (GET /v2/insurance-guides
    // faz .populate('patientId', ...)) — aceita os dois formatos pra não quebrar a query.
    const patientIdValue = guide?.patientId?._id || guide?.patientId;
    if (!patientIdValue) return;
    setMoveGuidesLoading(true);
    // GET /v2/insurance-guides ignora filtro de specialty no backend — filtra no client
    getGuides(patientIdValue)
      .then((all) => setMoveGuides(all.filter(g => g.specialty === guide.specialty && g._id !== guide._id)))
      .catch(() => toast.error('Não foi possível carregar as guias do paciente'))
      .finally(() => setMoveGuidesLoading(false));
  };

  const confirmMove = async () => {
    if (!moveTargetGuideId) { toast.error('Selecione a guia de destino'); return; }
    setMoveSubmitting(true);
    try {
      await moveAppointmentToGuide(movingAppt._id, moveTargetGuideId, { reason: moveReason || undefined });
      toast.success('Atendimento movido para a nova guia');
      setMovingAppt(null);
      await loadAppointments(guide._id);
      onUpdate?.();
    } catch (err) {
      toast.error(err.message || 'Erro ao mover atendimento');
    } finally {
      setMoveSubmitting(false);
    }
  };

  // Handlers do AppointmentDetailModal — mesmo padrão de ContractCard.tsx
  // (onCancelAppointment/onEditAppointment reaproveitam os mesmos endpoints que
  // o dialog antigo já usava; onCompleteAppointment continua redirecionando pra
  // agenda, igual ao Liminar hoje — nenhum fluxo de conclusão novo foi criado).
  const handleCancelFromModal = async (id, reason) => {
    try {
      await appointmentService.cancel(id, { reason: reason || 'Cancelado manualmente' });
      toast.success('Agendamento cancelado');
      setEditingAppointment(null);
      await loadAppointments(guide._id);
      onUpdate?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao cancelar agendamento');
    }
  };

  // 🚨 FIX (2026-08-15, auditoria Convênio): antes só mostrava um toast mandando
  // usar a agenda — não existia "Concluir" pelo card. Reaproveita o mesmo
  // primitivo já usado pela agenda real (appointmentService.complete →
  // PATCH /v2/appointments/:id/complete → backend decide o roteamento
  // financeiro por billingType, o mesmo completeInsuranceAppointmentCommand/
  // completeSessionV2 já testado em back/tests/completeInsuranceAppointmentCommand.test.js).
  // Nenhuma lógica financeira nova — só liga o botão "Realizar Atendimento" que
  // o próprio AppointmentDetailModal já constrói o payload correto (billingType/
  // insuranceProvider/insuranceValue/authorizationCode vêm do sessionToEvent).
  const handleCompleteFromModal = async (id, data) => {
    try {
      // completeAppointmentCtx (AppointmentsContext) chama appointmentService.complete
      // e, se a resposta vier processing.async=true (202), aguarda o MESMO polling
      // que a agenda real usa (pollAppointmentStatus) antes de resolver — nunca
      // fecha/atualiza o card com o processamento ainda em andamento (bloqueador 4).
      const result = await completeAppointmentCtx(id, data);
      if (result?._lockReleased) {
        // Worker falhou e liberou o lock — processamento NÃO terminou de verdade,
        // apesar de completeAppointmentCtx não ter lançado exceção.
        throw new Error('O processamento falhou. Tente novamente em alguns instantes.');
      }
    } catch (err) {
      // 🚨 FIX (review 2026-08-15, bloqueador 3): só considera sucesso quando a
      // resposta é EXPLICITAMENTE idempotente. Qualquer outro 409 (ex:
      // CONFIRM_FAILED, REACTIVATION_FAILED, SCHEDULE_FAILED) é erro real e
      // precisa propagar — nunca tratar 409 genérico como sucesso.
      const isExplicitlyIdempotent = err?.response?.status === 409 && err?.response?.data?.idempotent === true;
      if (!isExplicitlyIdempotent) {
        // Rede/timeout pode deixar ambíguo se a conclusão realmente aconteceu
        // do lado do servidor — um refetch decide com certeza antes de
        // desistir. Se o refetch também falhar, ou o status não confirmar
        // 'completed', trata como erro real (propaga o erro ORIGINAL, não o
        // do refetch — é o que explica o que aconteceu de fato).
        const statusData = await appointmentService.getStatus(id).then(
          (res) => res?.data?.data || res?.data,
          () => null
        );
        if (statusData?.operationalStatus !== 'completed') {
          throw err;
        }
        // refetch confirmou completed apesar do erro na resposta original — segue como sucesso
      }
    }
    toast.success('Sessão concluída');
    setEditingAppointment(null);
    await loadAppointments(guide._id);
    onUpdate?.();
  };

  const handleEditFromModal = async (id, data) => {
    try {
      await appointmentService.update(id, data);
      toast.success('Agendamento atualizado');
      setEditingAppointment(null);
      await loadAppointments(guide._id);
      onUpdate?.();
    } catch (err) {
      const data2 = err?.response?.data;
      if (data2?.conflict) {
        const conflict = data2.conflict;
        const existing = conflict.existingAppointment;
        const who = conflict.patientName || existing?.patient?.fullName || 'outro paciente';
        const time = existing?.time || data?.time;
        const status = existing?.operationalStatus || '';
        const statusLabel = {
          confirmed: 'confirmado', scheduled: 'agendado',
          pre_agendado: 'pré-agendado', completed: 'realizado'
        }[status] || status;
        toast.error(
          `Conflito de horário: ${who} já tem agendamento às ${time}${statusLabel ? ` (${statusLabel})` : ''}. Escolha outro horário ou profissional.`,
          { duration: 6000 }
        );
      } else {
        toast.error(data2?.message || data2?.error?.message || err?.message || 'Erro ao atualizar agendamento');
      }
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
      setBulkPreviewOpen(false);
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

  const closeBulkDialog = () => {
    setBulkDoctorOpen(false);
    setBulkPreviewOpen(false);
    setBulkDoctorId('');
    setBulkTime('');
    setBulkDayOfWeek('');
  };

  // Mesmo cálculo de data usado no backend (PATCH /appointments/doctor) — preview precisa bater com o resultado real
  const shiftToWeekday = (dateStr, targetDow) => {
    const current = new Date(dateStr);
    const currentDay = current.getDay();
    let diff = targetDow - currentDay;
    if (diff <= 0) diff += 7;
    const newDate = new Date(current);
    newDate.setDate(newDate.getDate() + diff);
    return newDate;
  };

  const apptStatus = (a) => a.operationalStatus || a.status || '';

  // Oculta appointments cancelados por replanejamento do plano (evita poluir o
  // calendário com agendamentos antigos que foram substituídos ao gerar novamente).
  const REPLAN_CANCEL_REASONS = ['plan_frequency_changed', 'plan_slot_removed', 'plan_canceled', 'plan_reset'];

  // Oculta appointments cancelados que foram substituídos por um reagendamento
  const supersededIds = new Set(
    appointments.filter(a => a.rescheduledFrom).map(a => a.rescheduledFrom?.toString())
  );
  const visibleAppointments = appointments.filter(a => {
    if (supersededIds.has(a._id?.toString())) return false;
    const isReplanCanceled = apptStatus(a) === 'canceled' && REPLAN_CANCEL_REASONS.includes(a.cancelReason);
    return !isReplanCanceled;
  });

  // Abre o calendário no mês do primeiro agendamento da guia (ou data de emissão/hoje como fallback)
  const calendarInitialDate = useMemo(() => {
    // Sempre abre no mês atual — antes pegava a data do primeiro agendamento
    // ordenado cronologicamente (podia ser uma sessão já concluída de meses
    // atrás, ex: quando a guia foi criada), fazendo o calendário abrir em
    // maio em vez de julho mesmo com sessões futuras no mês corrente.
    return new Date().toISOString().substring(0, 10);
  }, []);

  if (!guide) return null;

  const specialtyFormatted = guide.specialty
    ?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '';
  const insuranceFormatted = guide.insurance
    ?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '';

  // Mesmo filtro do backend (pendingFilter): só pre_agendado/scheduled são afetados pelo bulk-edit
  const bulkAffectedAppointments = visibleAppointments
    .filter(a => ['pre_agendado', 'scheduled'].includes(apptStatus(a)))
    .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`));

  const bulkSelectedDoctor = doctors.find(d => d._id === bulkDoctorId);
  const bulkDayOfWeekLabel = { 0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira', 4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado' };

  const completedCount = visibleAppointments.filter(a => ['completed', 'paid'].includes(apptStatus(a))).length;
  const scheduledCount = visibleAppointments.filter(a => ['scheduled', 'confirmed', 'pre_agendado'].includes(apptStatus(a))).length;
  const canceledCount  = visibleAppointments.filter(a => ['canceled', 'cancelled', 'missed'].includes(apptStatus(a))).length;

  return (
    <>
    <Dialog
      open={Boolean(guide)}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: '20px' },
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.14)',
          overflow: 'hidden',
          width: '100%',
          maxWidth: { xs: '100vw', sm: 'min(1000px, 94vw)' },
          height: { xs: '100dvh', sm: 'auto' },
          maxHeight: { xs: '100dvh', sm: 'min(90vh, 920px)' },
          m: { xs: 0, sm: 2 },
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      {/* Header */}
      <Box sx={{
        px: 3,
        py: 2.25,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        borderBottom: '1px solid #EEF2F7',
        flexShrink: 0
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box sx={{ width: 4, height: 34, borderRadius: '4px', background: 'linear-gradient(180deg, #1565C0, #1E3A8A)', flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: '#0F172A', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.3 }} noWrap>
              Detalhes da Guia #{guide.number}
            </Typography>
            <Typography sx={{ color: '#64748B', fontSize: '0.78rem', mt: 0.2 }} noWrap>
              {specialtyFormatted} • {insuranceFormatted}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#94A3B8', flexShrink: 0, '&:hover': { color: '#1E293B', bgcolor: '#F1F5F9' } }}>
          <X size={20} />
        </IconButton>
      </Box>

      <DialogContent sx={{
        p: 3,
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        '&::-webkit-scrollbar': { width: '6px' },
        '&::-webkit-scrollbar-thumb': { backgroundColor: '#CBD5E1', borderRadius: '10px' },
        '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' }
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={32} sx={{ color: '#2E7A5E' }} />
          </Box>
        ) : (
          <>
            {/* Resumo rápido */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2.5 }}>
              {[
                { label: 'Realizados', value: completedCount, color: '#2E7A5E', bg: '#EFF9F6' },
                { label: 'Agendados',  value: scheduledCount, color: '#1B4D6E', bg: '#EEF4FB' },
                { label: 'Cancelados', value: canceledCount,  color: '#C75146', bg: '#FDECEA' },
              ].map(item => (
                <Box key={item.label} sx={{ bgcolor: item.bg, borderRadius: '14px', py: 1.5, px: 1, textAlign: 'center' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.35rem', color: item.color, lineHeight: 1.15 }}>
                    {item.value}
                  </Typography>
                  <Typography sx={{ fontSize: '0.68rem', color: item.color, fontWeight: 600, opacity: 0.75, mt: 0.2, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {modalPlanLoading && (
              <Box sx={{ mb: 2.5 }}>
                <Skeleton variant="rounded" height={56} sx={{ borderRadius: '14px' }} />
              </Box>
            )}

            {modalPlanError && (
              <Box sx={{
                mb: 2.5, px: 2, py: 1.5, borderRadius: '14px',
                bgcolor: '#FDECEA', border: '1px solid #F5C6C0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1
              }}>
                <Typography sx={{ fontSize: '0.8rem', color: '#C75146' }}>
                  Não foi possível carregar o plano desta guia
                </Typography>
                <Button size="small" startIcon={<RefreshCw size={13} />} onClick={() => refetchModalPlan()}
                  sx={{ color: '#C75146', textTransform: 'none', fontSize: '0.75rem' }}>
                  Tentar novamente
                </Button>
              </Box>
            )}

            {!modalPlanLoading && !modalPlanError && !modalPlan && (
              <Box sx={{ mb: 2.5, px: 2, py: 1.5, borderRadius: '14px', bgcolor: '#F8FAFE', border: '1px solid #EDF2F7' }}>
                <Typography sx={{ fontSize: '0.8rem', color: '#8A99B0' }}>
                  Nenhum plano de atendimento configurado para esta guia
                </Typography>
              </Box>
            )}

            {/* Histórico de alterações do plano */}
            {modalPlan && (
              <Box sx={{ mb: 2.5, pb: 2.5, borderBottom: '1px solid #F1F5F9' }}>
                <Box
                  component="button"
                  onClick={() => setShowChangelog(v => !v)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.25, width: '100%',
                    bgcolor: '#F8FAFC',
                    border: 'none',
                    borderRadius: '12px', px: 1.75, py: 1.25, cursor: 'pointer',
                    transition: 'background-color 0.15s',
                    '&:hover': { bgcolor: '#F1F5F9' },
                    '&:focus-visible': { outline: '2px solid #2E7A5E', outlineOffset: '2px' }
                  }}
                >
                  <History size={15} color="#2E7A5E" />
                  <Typography sx={{ flex: 1, textAlign: 'left', fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                    Histórico do plano
                  </Typography>
                  {changelog.length > 0 && (
                    <Box component="span" sx={{ px: 1, py: 0.15, bgcolor: '#E2E8F0', color: '#475569', borderRadius: '8px', fontSize: '0.68rem', fontWeight: 700 }}>
                      {changelog.length}
                    </Box>
                  )}
                  {showChangelog ? <ChevronUp size={15} color="#64748B" /> : <ChevronDown size={15} color="#94A3B8" />}
                </Box>

                {showChangelog && (
                  <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {changelogLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                        <CircularProgress size={20} sx={{ color: '#2E7A5E' }} />
                      </Box>
                    ) : changelog.length === 0 ? (
                      <Box sx={{ textAlign: 'center', py: 2 }}>
                        <Typography sx={{ fontSize: '0.8rem', color: '#8A99B0' }}>Nenhuma alteração registrada</Typography>
                      </Box>
                    ) : changelog.map((entry) => (
                      <PlanChangelogEntry key={entry._id} entry={entry} />
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {/* Toggle Lista / Calendário — cabeçalho da seção de agenda */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.75, flexWrap: 'wrap', gap: 1 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Agenda da guia
              </Typography>
              <Box sx={{
                display: 'inline-flex',
                bgcolor: '#F1F5F9',
                borderRadius: '10px',
                p: 0.5,
                gap: 0.5
              }}>
                {[
                  { key: 'list', label: 'Lista' },
                  { key: 'calendar', label: 'Calendário' }
                ].map(({ key, label }) => (
                  <Box
                    key={key}
                    component="button"
                    type="button"
                    onClick={() => setViewMode(key)}
                    sx={{
                      px: 2.25,
                      py: 0.875,
                      borderRadius: '8px',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      transition: 'all 0.15s',
                      bgcolor: viewMode === key ? '#fff' : 'transparent',
                      color: viewMode === key ? '#1565C0' : '#64748B',
                      boxShadow: viewMode === key ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                      '&:focus-visible': { outline: '2px solid #1565C0', outlineOffset: '2px' }
                    }}
                  >
                    {label}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Calendário */}
            {appointmentsError ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <AlertCircle size={32} color="#C75146" style={{ marginBottom: 8 }} />
                <Typography sx={{ color: '#C75146', fontSize: '0.875rem', mb: 1.5 }}>
                  Não foi possível carregar os agendamentos desta guia
                </Typography>
                <Button size="small" startIcon={<RefreshCw size={13} />} onClick={() => loadAppointments(guide._id)}
                  sx={{ color: '#C75146', textTransform: 'none' }}>
                  Tentar novamente
                </Button>
              </Box>
            ) : viewMode === 'calendar' ? (
              <Box sx={{ minHeight: 480 }}>
                <PatientMiniCalendar
                  appointments={visibleAppointments.map(a => ({
                    ...a,
                    operationalStatus: a.operationalStatus || a.status,
                    start: `${(a.date || '').substring(0, 10)}T${a.time || '08:00'}`,
                  }))}
                  onEventClick={openEdit}
                  initialDate={calendarInitialDate}
                />
              </Box>
            ) : visibleAppointments.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <Calendar size={32} color="#A0AABF" style={{ marginBottom: 8 }} />
                <Typography sx={{ color: '#8A99B0', fontSize: '0.875rem' }}>
                  Nenhum agendamento registrado para esta guia
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {visibleAppointments.map((appt, idx) => {
                  const statusKey = appt.operationalStatus || appt.status || '';
                  const cfg = APPT_STATUS_CONFIG[statusKey] || { label: statusKey, color: '#8A99B0', bg: '#F8FAFE' };
                  // 🚨 FIX (2026-08-15, auditoria Convênio): sessão completed não pode ser
                  // editada/movida/cancelada por aqui — já consumiu a guia e liquidou o
                  // Payment via completeSessionV2; mexer por esse caminho corrompia o
                  // estado sem contrapartida simétrica (mesma proteção existe no backend
                  // em cancelAppointmentCommand.js, escopada a billingType='convenio').
                  const isCompleted = statusKey === 'completed';
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
                        py: 1.25,
                        bgcolor: '#F8FAFC',
                        borderRadius: '12px',
                        transition: 'background-color 0.15s',
                        '&:hover': { bgcolor: '#F1F5F9' }
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
                          onClick={() => openMove(appt)}
                          disabled={isCompleted}
                          sx={{ color: '#8A99B0', '&:hover': { color: '#1565C0' }, p: 0.5, '&.Mui-disabled': { color: '#D8DEE8' } }}
                          title={isCompleted ? 'Sessão já concluída — não pode ser movida' : 'Mover para outra guia'}
                        >
                          <ArrowRightLeft size={13} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => openEdit(appt)}
                          disabled={isCompleted}
                          sx={{ color: '#8A99B0', '&:hover': { color: '#1B4D6E' }, p: 0.5, '&.Mui-disabled': { color: '#D8DEE8' } }}
                          title={isCompleted ? 'Sessão já concluída — não pode ser editada/cancelada' : 'Editar'}
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

      <DialogActions sx={{
        px: 3, py: 2, gap: 1.5,
        justifyContent: 'space-between',
        borderTop: '1px solid #EEF2F7',
        flexShrink: 0,
        flexDirection: { xs: 'column-reverse', sm: 'row' }
      }}>
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
          sx={{
            borderRadius: '40px', textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem',
            px: 2.5, py: 0.9,
            width: { xs: '100%', sm: 'auto' },
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
            px: 3, py: 0.9,
            width: { xs: '100%', sm: 'auto' },
            borderColor: '#DDE4EE', color: '#5B6E8C',
            '&:hover': { bgcolor: '#F1F5F9', borderColor: '#C8D4E0' }
          }}
        >
          Fechar
        </Button>
      </DialogActions>
    </Dialog>

    {/* ── Dialog: Trocar terapeuta (todas pendentes) — form ou preview de impacto ── */}
    <Dialog
      open={bulkDoctorOpen}
      onClose={() => !bulkSaving && closeBulkDialog()}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: '20px' } }}
    >
      <Box sx={{ background: 'linear-gradient(135deg, #1565C0 0%, #1E3A8A 100%)', px: 3, py: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
            {bulkPreviewOpen ? 'Revisar alteração em massa' : 'Alterar sessões pendentes'}
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem', mt: 0.2 }}>
            {bulkPreviewOpen
              ? 'Confira o impacto antes de aplicar'
              : 'Aplica para todos os pré-agendados e agendados desta guia'}
          </Typography>
        </Box>
        <IconButton onClick={closeBulkDialog} size="small" disabled={bulkSaving}
          sx={{ color: 'rgba(255,255,255,0.8)' }}>
          <X size={16} />
        </IconButton>
      </Box>

      {!bulkPreviewOpen ? (
        <>
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
                  .filter(d => {
                    if (!guide?.specialty) return true;
                    const target = guide.specialty.toLowerCase();
                    const allowed = [d.specialty, ...(d.specialties || [])].map(s => (s || '').toLowerCase());
                    return allowed.includes(target);
                  })
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
            <Button onClick={closeBulkDialog} disabled={bulkSaving}
              variant="outlined" sx={{ borderRadius: '40px', textTransform: 'none', fontWeight: 600,
                fontSize: '0.8rem', borderColor: '#DDE4EE', color: '#5B6E8C' }}>
              Cancelar
            </Button>
            <Button
              onClick={() => setBulkPreviewOpen(true)}
              disabled={(!bulkDoctorId && !bulkTime && !bulkDayOfWeek) || bulkAffectedAppointments.length === 0}
              variant="contained" sx={{ borderRadius: '40px', textTransform: 'none', fontWeight: 600,
                fontSize: '0.8rem', bgcolor: '#2E7A5E', '&:hover': { bgcolor: '#246653' } }}>
              Revisar alterações ({bulkAffectedAppointments.length})
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogContent sx={{ pt: 3, pb: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ bgcolor: '#FFF3E0', border: '1px solid #FFE0B2', borderRadius: '14px', px: 2, py: 1.5 }}>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#B45309' }}>
                {bulkAffectedAppointments.length} sessão(ões) pendente(s) serão alteradas
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#8A6018', mt: 0.3 }}>
                Período: {format(parseISO(bulkAffectedAppointments[0].date.substring(0, 10)), 'dd/MM/yyyy')}
                {' – '}
                {format(parseISO(bulkAffectedAppointments[bulkAffectedAppointments.length - 1].date.substring(0, 10)), 'dd/MM/yyyy')}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
              {bulkDoctorId && (
                <Typography sx={{ fontSize: '0.8125rem', color: '#1A2C3E' }}>
                  <strong>Terapeuta:</strong> {bulkSelectedDoctor?.fullName || '—'}
                </Typography>
              )}
              {bulkTime && (
                <Typography sx={{ fontSize: '0.8125rem', color: '#1A2C3E' }}>
                  <strong>Horário:</strong> {bulkTime}
                </Typography>
              )}
              {bulkDayOfWeek !== '' && (
                <Typography sx={{ fontSize: '0.8125rem', color: '#1A2C3E' }}>
                  <strong>Dia da semana:</strong> {bulkDayOfWeekLabel[parseInt(bulkDayOfWeek)]}
                  <Box component="span" sx={{ display: 'block', fontSize: '0.7rem', color: '#8A99B0', mt: 0.2 }}>
                    Cada sessão será movida para a próxima ocorrência desse dia após sua data atual
                  </Box>
                </Typography>
              )}
            </Box>

            <Box sx={{
              maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.8,
              bgcolor: '#F8FAFE', borderRadius: '14px', border: '1px solid #EDF2F7', p: 1.2
            }}>
              {bulkAffectedAppointments.map((appt, idx) => {
                const currentDate = appt.date.substring(0, 10);
                const newDate = bulkDayOfWeek !== ''
                  ? shiftToWeekday(currentDate, parseInt(bulkDayOfWeek))
                  : null;
                return (
                  <Box key={appt._id || idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', px: 0.5 }}>
                    <span>
                      {format(parseISO(currentDate), 'dd/MM')} {appt.time || ''}
                      {newDate && (
                        <> → <strong>{format(newDate, 'dd/MM')}</strong></>
                      )}
                    </span>
                    <span style={{ color: '#8A99B0' }}>
                      {appt.doctor?.fullName || appt.professionalName || '—'}
                    </span>
                  </Box>
                );
              })}
            </Box>

            <Typography sx={{ fontSize: '0.7rem', color: '#8A99B0' }}>
              Sessões confirmadas/realizadas não serão alteradas.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
            <Button onClick={() => setBulkPreviewOpen(false)} disabled={bulkSaving}
              variant="outlined" sx={{ borderRadius: '40px', textTransform: 'none', fontWeight: 600,
                fontSize: '0.8rem', borderColor: '#DDE4EE', color: '#5B6E8C' }}>
              Voltar
            </Button>
            <Button onClick={saveBulkDoctor} disabled={bulkSaving}
              variant="contained" sx={{ borderRadius: '40px', textTransform: 'none', fontWeight: 600,
                fontSize: '0.8rem', bgcolor: '#2E7A5E', '&:hover': { bgcolor: '#246653' } }}>
              {bulkSaving ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Confirmar alteração'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>

    {/* ── Modal de edição de agendamento (mesmo AppointmentDetailModal do calendário/Liminar) ── */}
    {editingAppointment && (
      <AppointmentDetailModal
        isOpen={!!editingAppointment}
        onClose={() => setEditingAppointment(null)}
        event={editingAppointment}
        doctors={doctors}
        onCancelAppointment={handleCancelFromModal}
        onCompleteAppointment={handleCompleteFromModal}
        onEditAppointment={handleEditFromModal}
        // 🚨 FIX (2026-08-15): sem isso, este modal (div fixed, z-50) renderizava
        // ATRÁS do Dialog MUI "Detalhes da Guia" que o abre (MUI Modal usa
        // z-index 1300 por padrão) — clicar num agendamento parecia não abrir
        // nada, mas na verdade abria escondido atrás. 1400 > zIndex.modal do MUI.
        zIndex={1400}
      />
    )}

    <Dialog open={!!movingAppt} onClose={() => setMovingAppt(null)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700 }}>Mover atendimento entre guias</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <Typography sx={{ fontSize: '0.8rem', color: '#8A99B0' }}>
          {movingAppt?.date ? format(parseISO(movingAppt.date.substring(0, 10)), "dd/MM/yyyy", { locale: ptBR }) : ''}
          {movingAppt?.time ? ` às ${movingAppt.time}` : ''} · Guia atual: #{guide?.number}
        </Typography>
        <FormControl fullWidth size="small">
          <InputLabel>Guia de destino</InputLabel>
          <Select
            value={moveTargetGuideId}
            label="Guia de destino"
            onChange={e => setMoveTargetGuideId(e.target.value)}
            disabled={moveGuidesLoading}
            sx={{ borderRadius: '12px' }}
          >
            {moveGuides.map(g => (
              <MenuItem key={g._id} value={g._id}>
                #{g.number} — {g.insurance} ({g.remaining ?? (g.totalSessions - g.usedSessions)} restantes, {g.status})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {!moveGuidesLoading && moveGuides.length === 0 && (
          <Typography sx={{ fontSize: '0.75rem', color: '#C75146' }}>
            Nenhuma outra guia de {guide?.specialty} disponível para este paciente.
          </Typography>
        )}
        <TextField
          label="Motivo (opcional)"
          size="small"
          fullWidth
          value={moveReason}
          onChange={e => setMoveReason(e.target.value)}
          placeholder="Ex: correção administrativa"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          onClick={() => setMovingAppt(null)}
          disabled={moveSubmitting}
          variant="outlined"
          sx={{ borderRadius: '40px', textTransform: 'none', fontWeight: 600, fontSize: '0.8rem',
            borderColor: '#DDE4EE', color: '#5B6E8C' }}
        >
          Cancelar
        </Button>
        <Button
          onClick={confirmMove}
          disabled={moveSubmitting || !moveTargetGuideId}
          variant="contained"
          sx={{ borderRadius: '40px', textTransform: 'none', fontWeight: 600, fontSize: '0.8rem',
            bgcolor: '#1565C0', '&:hover': { bgcolor: '#0d4b94' } }}
        >
          {moveSubmitting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Confirmar'}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default PatientInsuranceTab;