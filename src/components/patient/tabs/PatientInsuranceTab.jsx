// src/components/patient/tabs/PatientInsuranceTab.jsx
import React, { useState, useMemo } from 'react';
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
  Paper
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
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useInsuranceGuides } from '../../../hooks/useInsuranceGuides';
import InsuranceGuideForm from './InsuranceGuideForm';
import InsurancePlanForm from './InsurancePlanForm';

// ----------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------
const PatientInsuranceTab = ({ patientId }) => {
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [planFormGuide, setPlanFormGuide] = useState(null);

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

  const availableGuides = useMemo(() => {
    return allAvailableGuides
      .filter(g => selectedSpecialty === 'all' || g.specialty === selectedSpecialty);
  }, [allAvailableGuides, selectedSpecialty]);

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
            Nenhuma guia encontrada {selectedSpecialty !== 'all' && `para ${selectedSpecialty.replace(/_/g, ' ')}`}
          </Typography>
          <Typography variant="body2" sx={{ color: '#8A99B0' }}>
            Tente selecionar outra especialidade ou cadastre uma nova guia
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

export default PatientInsuranceTab;