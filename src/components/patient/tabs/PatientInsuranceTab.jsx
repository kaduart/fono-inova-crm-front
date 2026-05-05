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
  Divider
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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useInsuranceGuides } from '../../../hooks/useInsuranceGuides';
import { getGuideAppointments } from '../../../services/insuranceGuideApi';
import InsuranceGuideForm from './InsuranceGuideForm';
import InsurancePlanForm from './InsurancePlanForm';

// ----------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------
const PatientInsuranceTab = ({ patientId }) => {
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [planFormGuide, setPlanFormGuide] = useState(null);
  const [detailsGuide, setDetailsGuide] = useState(null);

  const {
    guides,
    balance,
    isLoading,
    error,
    createGuide,
    updateGuide,
    cancelGuide,
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

  const isGuideActive = (g) => g.status === 'active' && g.remaining > 0;

  const availableGuides = useMemo(() => {
    return allAvailableGuides
      .filter(g => selectedSpecialty === 'all' || g.specialty === selectedSpecialty)
      .filter(g => {
        if (selectedStatus === 'active') return isGuideActive(g);
        if (selectedStatus === 'inactive') return !isGuideActive(g);
        return true;
      });
  }, [allAvailableGuides, selectedSpecialty, selectedStatus]);

  const activeCount = useMemo(() => allAvailableGuides.filter(isGuideActive).length, [allAvailableGuides]);
  const inactiveCount = useMemo(() => allAvailableGuides.filter(g => !isGuideActive(g)).length, [allAvailableGuides]);

  const groupedGuides = useMemo(() => {
    const active = availableGuides.filter(g => g.status === 'active' && g.remaining > 0);
    const exhausted = availableGuides.filter(g => g.status === 'exhausted' || (g.status === 'active' && g.remaining === 0));
    const expired = availableGuides.filter(g => g.status === 'expired');
    const cancelled = availableGuides.filter(g => g.status === 'cancelled');
    return { active, exhausted, expired, cancelled };
  }, [availableGuides]);

  const handleOpenMenu = (event, guide) => {
    setAnchorEl(event.currentTarget);
    setSelectedGuide(guide);
  };

  const handleCloseMenu = () => {
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

  const handleCancelGuide = async () => {
    if (!selectedGuide) return;
    try {
      await cancelGuide(selectedGuide._id);
      toast.success('Guia cancelada com sucesso');
    } catch (err) {
      toast.error(err.message || 'Erro ao cancelar guia');
    } finally {
      handleCloseMenu();
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

  const handleOpenPlanForm = (guide) => {
    setPlanFormGuide(guide);
    setPlanFormOpen(true);
  };

  const handleClosePlanForm = (refetchNeeded) => {
    setPlanFormOpen(false);
    setPlanFormGuide(null);
    if (refetchNeeded) {
      refetch();
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

      {/* Filtro de status: Todas / Ativas / Inativas */}
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
        <Tab label={`Todas (${allAvailableGuides.length})`} value="all"
          sx={{ '&.Mui-selected': { backgroundColor: '#5B6E8C' } }} />
        <Tab label={`Ativas (${activeCount})`} value="active"
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
            Nenhuma guia {selectedStatus === 'active' ? 'ativa' : selectedStatus === 'inactive' ? 'inativa' : ''} encontrada
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
      />

      <GuideSection
        title="Guias esgotadas"
        count={groupedGuides.exhausted.length}
        guides={groupedGuides.exhausted}
        color="#C75146"
        onOpenMenu={handleOpenMenu}
        onCreatePlan={handleOpenPlanForm}
      />

      <GuideSection
        title="Guias expiradas"
        count={groupedGuides.expired.length}
        guides={groupedGuides.expired}
        color="#8A99B0"
        onOpenMenu={handleOpenMenu}
        onCreatePlan={handleOpenPlanForm}
      />

      <GuideSection
        title="Guias canceladas"
        count={groupedGuides.cancelled.length}
        guides={groupedGuides.cancelled}
        color="#A0AABF"
        onOpenMenu={handleOpenMenu}
        onCreatePlan={handleOpenPlanForm}
      />

      {/* Menu de ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
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
      />

      <InsurancePlanForm
        open={planFormOpen}
        onClose={handleClosePlanForm}
        guide={planFormGuide}
        patientId={patientId}
      />

      <GuideDetailsModal
        guide={detailsGuide}
        onClose={() => setDetailsGuide(null)}
      />
    </Box>
  );
};

// ----------------------------------------------------------------------
// Componente de seção de guias (título + grid)
// ----------------------------------------------------------------------
const GuideSection = ({ title, count, guides, color, onOpenMenu, onCreatePlan }) => {
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
const GuideCard = ({ guide, onOpenMenu, onCreatePlan }) => {
  const remaining = guide.remaining ?? (guide.totalSessions - (guide.usedSessions || 0));
  const usedSessions = guide.usedSessions || 0;
  const percentage = (usedSessions / guide.totalSessions) * 100;
  const daysUntilExpiration = differenceInDays(parseISO(guide.expiresAt), new Date());
  const isUrgent = daysUntilExpiration <= 7 && daysUntilExpiration >= 0;
  const isExpiringSoon = daysUntilExpiration <= 30 && daysUntilExpiration > 0;

  const statusColor =
    guide.status === 'cancelled' ? '#A0AABF' :
      guide.status === 'expired' ? '#C75146' :
        guide.status === 'exhausted' || remaining === 0 ? '#C75146' : '#2E7A5E';

  const statusLabel =
    guide.status === 'cancelled' ? 'Cancelada' :
      guide.status === 'expired' ? 'Expirada' :
        guide.status === 'exhausted' || remaining === 0 ? 'Esgotada' : 'Ativa';

  const specialtyFormatted = guide.specialty
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  const insuranceFormatted = guide.insurance
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const isNew = usedSessions === 0 && guide.status === 'active';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      style={{ height: '100%' }}
    >
      <Card
        elevation={0}
        sx={{
          height: '100%',
          borderRadius: '24px',
          border: '1px solid',
          borderColor: '#EDF2F7',
          backgroundColor: '#FFFFFF',
          transition: 'all 0.25s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 30px -12px rgba(0,0,0,0.12)',
            borderColor: '#E2E8F0'
          },
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Barra superior gradiente */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${statusColor}60, ${statusColor})`
          }}
        />

        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
          {/* Header: badge Nova (inline) + número + status + menu */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isNew ? (
                <Box sx={{
                  bgcolor: '#EFF9F6',
                  color: '#2E7A5E',
                  px: 1.2,
                  py: 0.3,
                  borderRadius: '40px',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  border: '1px solid #C6E6DA',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.4,
                  whiteSpace: 'nowrap'
                }}>
                  ✨ Nova
                </Box>
              ) : (
                <FileText size={16} color="#8A99B0" />
              )}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1A2C3E', letterSpacing: '-0.2px', fontSize: '0.8rem' }}>
                #{guide.number}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip
                label={statusLabel}
                size="small"
                sx={{
                  height: '22px',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor: `${statusColor}10`,
                  color: statusColor,
                  border: `1px solid ${statusColor}30`,
                  borderRadius: '8px'
                }}
              />
              <IconButton
                size="small"
                onClick={(e) => onOpenMenu(e, guide)}
                sx={{ color: '#A0AABF', '&:hover': { color: '#5B6E8C', bgcolor: '#F1F5F9' } }}
              >
                <MoreVertical size={16} />
              </IconButton>
            </Box>
          </Box>

          {/* Especialidade e convênio */}
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1A2C3E', mb: 0.5 }}>
              {specialtyFormatted}
            </Typography>
            <Typography variant="caption" sx={{ color: '#8A99B0', fontWeight: 500 }}>
              {insuranceFormatted}
            </Typography>
          </Box>

          {/* Informações em grid */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 2,
            mb: 2.5
          }}>
            <Box sx={{ bgcolor: '#F8FAFE', borderRadius: '16px', p: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#5B6E8C', fontWeight: 500, display: 'block', mb: 0.5 }}>
                Sessões
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#1A2C3E' }}>
                {remaining} / {guide.totalSessions}
              </Typography>
              <Typography variant="caption" sx={{ color: '#8A99B0', fontSize: '0.6rem' }}>
                {usedSessions} usadas
              </Typography>
            </Box>
            <Box sx={{ bgcolor: '#F8FAFE', borderRadius: '16px', p: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#5B6E8C', fontWeight: 500, display: 'block', mb: 0.5 }}>
                Validade
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#1A2C3E' }}>
                {format(parseISO(guide.expiresAt), 'dd/MM/yyyy')}
              </Typography>
              {daysUntilExpiration > 0 ? (
                <Typography variant="caption" sx={{
                  color: isUrgent ? '#C75146' : isExpiringSoon ? '#ED6C02' : '#8A99B0',
                  fontSize: '0.6rem',
                  fontWeight: 500
                }}>
                  {daysUntilExpiration} dias
                </Typography>
              ) : daysUntilExpiration === 0 ? (
                <Typography variant="caption" sx={{ color: '#C75146', fontSize: '0.6rem', fontWeight: 500 }}>
                  Hoje!
                </Typography>
              ) : (
                <Typography variant="caption" sx={{ color: '#C75146', fontSize: '0.6rem', fontWeight: 500 }}>
                  Vencida
                </Typography>
              )}
            </Box>
          </Box>

          {/* Barra de progresso */}
          <Box sx={{ mb: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: '#5B6E8C', fontWeight: 500 }}>
                Utilização
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: percentage >= 80 ? '#C75146' : '#2E7A5E' }}>
                {percentage.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={percentage}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: '#E9EEF2',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: percentage >= 80 ? '#C75146' : percentage >= 50 ? '#ED6C02' : '#2E7A5E',
                  borderRadius: 3
                }
              }}
            />
          </Box>

          {/* Notas */}
          {guide.notes && (
            <Box sx={{
              p: 1.5,
              bgcolor: '#F8FAFE',
              borderRadius: '16px',
              mb: 2,
              border: '1px solid #EDF2F7'
            }}>
              <Typography variant="caption" sx={{ color: '#5B6E8C' }}>
                <span style={{ fontWeight: 600 }}>Observação:</span> {guide.notes}
              </Typography>
            </Box>
          )}

          {/* Botão Criar Plano (apenas para guias ativas não utilizadas) */}
          {usedSessions === 0 && guide.status === 'active' && onCreatePlan && (
            <Button
              size="small"
              variant="outlined"
              fullWidth
              onClick={() => onCreatePlan(guide)}
              startIcon={<Calendar size={14} />}
              sx={{
                textTransform: 'none',
                borderRadius: '40px',
                fontSize: '0.7rem',
                fontWeight: 600,
                borderColor: '#2E7A5E',
                color: '#2E7A5E',
                mt: 1,
                '&:hover': {
                  bgcolor: '#EFF9F6',
                  borderColor: '#246653'
                }
              }}
            >
              Criar Plano de Atendimento
            </Button>
          )}
        </CardContent>
      </Card>
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

const GuideDetailsModal = ({ guide, onClose }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!guide) return;
    setLoading(true);
    getGuideAppointments(guide._id)
      .then(data => setAppointments(data))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [guide?._id]);

  if (!guide) return null;

  const specialtyFormatted = guide.specialty
    ?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '';
  const insuranceFormatted = guide.insurance
    ?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '';

  const apptStatus = (a) => a.operationalStatus || a.status || '';
  const completedCount = appointments.filter(a => ['completed', 'paid'].includes(apptStatus(a))).length;
  const scheduledCount = appointments.filter(a => ['scheduled', 'confirmed', 'pre_agendado'].includes(apptStatus(a))).length;
  const canceledCount  = appointments.filter(a => ['canceled', 'cancelled', 'missed'].includes(apptStatus(a))).length;

  return (
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
        background: 'linear-gradient(135deg, #1B4D6E 0%, #2E7A5E 100%)',
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
            {appointments.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <Calendar size={32} color="#A0AABF" style={{ marginBottom: 8 }} />
                <Typography sx={{ color: '#8A99B0', fontSize: '0.875rem' }}>
                  Nenhum agendamento registrado para esta guia
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {appointments.map((appt, idx) => {
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
                    </Box>
                  );
                })}
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderRadius: '40px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.8125rem',
            borderColor: '#DDE4EE',
            color: '#5B6E8C',
            '&:hover': { bgcolor: '#F1F5F9', borderColor: '#C8D4E0' }
          }}
        >
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PatientInsuranceTab;