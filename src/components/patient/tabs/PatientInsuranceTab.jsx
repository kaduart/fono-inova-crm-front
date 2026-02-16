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
  Tab
} from '@mui/material';
import {
  Plus,
  Calendar,
  AlertCircle,
  MoreVertical,
  Edit2,
  Trash2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useInsuranceGuides } from '../../../hooks/useInsuranceGuides';
import InsuranceGuideForm from './InsuranceGuideForm';

// ----------------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------------
const PatientInsuranceTab = ({ patientId }) => {
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedGuide, setSelectedGuide] = useState(null);

  // Hook para gerenciar guias
  const {
    guides,
    balance,
    isLoading,
    error,
    createGuide,
    updateGuide,
    cancelGuide
  } = useInsuranceGuides(patientId, {
    specialty: selectedSpecialty === 'all' ? undefined : selectedSpecialty
  });

  // Especialidades disponíveis
  const specialties = useMemo(() => {
    const unique = [...new Set(guides.map(g => g.specialty))];
    return unique.sort();
  }, [guides]);

  // Agrupamento de guias
  const groupedGuides = useMemo(() => {
    const active = guides.filter(g => g.status === 'active' && g.remaining > 0);
    const exhausted = guides.filter(g => g.status === 'exhausted' || (g.status === 'active' && g.remaining === 0));
    const expired = guides.filter(g => g.status === 'expired');
    const cancelled = guides.filter(g => g.status === 'cancelled');

    return { active, exhausted, expired, cancelled };
  }, [guides]);

  // Handlers
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

  // Loading
  if (isLoading && guides.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} sx={{ color: '#666' }} />
      </Box>
    );
  }

  // Error
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ borderRadius: '8px', fontSize: '0.875rem' }}>{error}</Alert>
      </Box>
    );
  }

  // Empty state
  if (guides.length === 0) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 2
      }}>
        <FileText size={48} className="text-gray-300 mb-3" />
        <Typography variant="body1" sx={{ color: '#666', fontWeight: 500, mb: 1 }}>
          Nenhuma guia cadastrada
        </Typography>
        <Typography variant="body2" sx={{ color: '#999', mb: 3, textAlign: 'center' }}>
          Cadastre a primeira guia de convênio para este paciente
        </Typography>
        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={() => setIsFormOpen(true)}
          sx={{
            textTransform: 'none',
            fontSize: '0.875rem',
            backgroundColor: '#1976d2',
            boxShadow: 'none',
            '&:hover': { backgroundColor: '#1565c0', boxShadow: 'none' }
          }}
        >
          Cadastrar primeira guia
        </Button>

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
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: 3
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 500, color: '#1a1a1a' }}>
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
                  minHeight: '36px',
                  py: 0.5,
                  px: 2,
                  color: '#666',
                  '&.Mui-selected': { color: '#1976d2', fontWeight: 500 }
                },
                '& .MuiTabs-indicator': { backgroundColor: '#1976d2' }
              }}
            >
              <Tab label="Todas" value="all" />
              {specialties.map(specialty => (
                <Tab
                  key={specialty}
                  label={specialty.charAt(0).toUpperCase() + specialty.slice(1).replace('-', ' ')}
                  value={specialty}
                />
              ))}
            </Tabs>
          )}
        </Box>

        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={() => setIsFormOpen(true)}
          sx={{
            textTransform: 'none',
            fontSize: '0.8125rem',
            backgroundColor: '#1976d2',
            boxShadow: 'none',
            '&:hover': { backgroundColor: '#1565c0', boxShadow: 'none' }
          }}
        >
          Nova guia
        </Button>
      </Box>

      {/* Saldo agregado */}
      {balance && selectedSpecialty !== 'all' && (
        <Card sx={{
          mb: 3,
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          boxShadow: 'none'
        }}>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1.5 }}>
              Saldo total • {selectedSpecialty.charAt(0).toUpperCase() + selectedSpecialty.slice(1).replace('-', ' ')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 500, color: '#1a1a1a', lineHeight: 1.2 }}>
                  {balance.remaining}
                </Typography>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  sessões restantes
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={(balance.remaining / balance.total) * 100}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#f0f0f0',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: '#1976d2',
                      borderRadius: 3
                    }
                  }}
                />
                <Typography variant="caption" sx={{ color: '#666', mt: 0.5, display: 'block' }}>
                  {balance.used} de {balance.total} sessões utilizadas
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Listas de guias */}
      <GuideSection
        title="Guias ativas"
        count={groupedGuides.active.length}
        guides={groupedGuides.active}
        color="#2e7d32"
        onOpenMenu={handleOpenMenu}
      />

      <GuideSection
        title="Guias esgotadas"
        count={groupedGuides.exhausted.length}
        guides={groupedGuides.exhausted}
        color="#d32f2f"
        onOpenMenu={handleOpenMenu}
      />

      <GuideSection
        title="Guias expiradas"
        count={groupedGuides.expired.length}
        guides={groupedGuides.expired}
        color="#666"
        onOpenMenu={handleOpenMenu}
      />

      <GuideSection
        title="Guias canceladas"
        count={groupedGuides.cancelled.length}
        guides={groupedGuides.cancelled}
        color="#999"
        onOpenMenu={handleOpenMenu}
      />

      {/* Menu de ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: {
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            minWidth: '140px'
          }
        }}
      >
        <MenuItem
          onClick={handleEdit}
          disabled={selectedGuide?.usedSessions > 0}
          sx={{ fontSize: '0.8125rem', py: 1 }}
        >
          <Edit2 size={14} className="mr-2" />
          Editar
        </MenuItem>
        <MenuItem
          onClick={handleCancelGuide}
          disabled={selectedGuide?.status === 'cancelled'}
          sx={{ fontSize: '0.8125rem', py: 1 }}
        >
          <Trash2 size={14} className="mr-2" />
          Cancelar
        </MenuItem>
      </Menu>

      {/* Modal de formulário */}
      <InsuranceGuideForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSaveGuide}
        guide={editingGuide}
      />
    </Box>
  );
};

// ----------------------------------------------------------------------
// Componente de seção de guias
// ----------------------------------------------------------------------
const GuideSection = ({ title, count, guides, color, onOpenMenu }) => {
  if (count === 0) return null;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mb: 1.5,
          color,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontSize: '0.75rem'
        }}
      >
        {title} ({count})
      </Typography>
      <AnimatePresence>
        {guides.map(guide => (
          <GuideCard
            key={guide._id}
            guide={guide}
            onOpenMenu={onOpenMenu}
          />
        ))}
      </AnimatePresence>
    </Box>
  );
};

// ----------------------------------------------------------------------
// Componente de card individual
// ----------------------------------------------------------------------
const GuideCard = ({ guide, onOpenMenu }) => {
  const percentage = (guide.remaining / guide.totalSessions) * 100;
  const daysUntilExpiration = differenceInDays(parseISO(guide.expiresAt), new Date());
  const isUrgent = daysUntilExpiration <= 7 && daysUntilExpiration >= 0;

  // Cor da borda baseada no status
  const borderColor =
    guide.status === 'cancelled' ? '#9e9e9e' :
      guide.status === 'expired' ? '#d32f2f' :
        guide.status === 'exhausted' || guide.remaining === 0 ? '#d32f2f' :
          percentage <= 20 ? '#ed6c02' : '#2e7d32';

  // Cor do chip de status
  const statusColor =
    guide.status === 'cancelled' ? 'default' :
      guide.status === 'expired' ? 'error' :
        guide.status === 'exhausted' || guide.remaining === 0 ? 'error' :
          percentage <= 20 ? 'warning' : 'success';

  const statusLabel =
    guide.status === 'cancelled' ? 'Cancelada' :
      guide.status === 'expired' ? 'Expirada' :
        guide.status === 'exhausted' || guide.remaining === 0 ? 'Esgotada' : 'Ativa';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15 }}
    >
      <Card sx={{
        mb: 2,
        borderRadius: '8px',
        border: '1px solid #f0f0f0',
        boxShadow: 'none',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          borderColor: '#e0e0e0'
        }
      }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            {/* Informações principais */}
            <Box sx={{ flex: 1 }}>
              {/* Cabeçalho do card */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 500, color: '#1a1a1a' }}>
                  Guia #{guide.number}
                </Typography>
                <Chip
                  label={statusLabel}
                  color={statusColor}
                  size="small"
                  sx={{
                    height: '20px',
                    fontSize: '0.625rem',
                    '& .MuiChip-label': { px: 1 }
                  }}
                />
                {guide.usedSessions === 0 && (
                  <Chip
                    label="Não utilizada"
                    size="small"
                    variant="outlined"
                    sx={{
                      height: '20px',
                      fontSize: '0.625rem',
                      borderColor: '#90caf9',
                      color: '#1976d2'
                    }}
                  />
                )}
              </Box>

              {/* Grid de informações */}
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 2,
                mb: 2.5
              }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                    Especialidade
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                    {guide.specialty.charAt(0).toUpperCase() + guide.specialty.slice(1).replace('-', ' ')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                    Convênio
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                    {guide.insurance.split('-').map(word =>
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                    Validade
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Calendar size={12} className="text-gray-500" />
                    <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                      {format(parseISO(guide.expiresAt), 'dd/MM/yyyy')}
                    </Typography>
                    {isUrgent && (
                      <AlertCircle size={14} className="text-yellow-600" />
                    )}
                  </Box>
                  {isUrgent && (
                    <Typography variant="caption" sx={{ color: '#ed6c02', display: 'block', mt: 0.5 }}>
                      Expira em {daysUntilExpiration} dia(s)
                    </Typography>
                  )}
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                    Sessões
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                    {guide.remaining} de {guide.totalSessions}
                  </Typography>
                </Box>
              </Box>

              {/* Barra de progresso */}
              <Box sx={{ mb: guide.notes ? 2 : 0 }}>
                <LinearProgress
                  variant="determinate"
                  value={percentage}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: '#f0f0f0',
                    mb: 0.5,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor:
                        percentage <= 20 ? '#ed6c02' :
                          percentage <= 50 ? '#1976d2' :
                            '#2e7d32',
                      borderRadius: 2
                    }
                  }}
                />
                <Typography variant="caption" sx={{ color: '#666' }}>
                  {guide.usedSessions} sessões utilizadas ({percentage.toFixed(0)}% disponível)
                </Typography>
              </Box>

              {/* Notas */}
              {guide.notes && (
                <Box sx={{
                  mt: 2,
                  p: 1.5,
                  bgcolor: '#fafafa',
                  borderRadius: '6px',
                  border: '1px solid #f0f0f0'
                }}>
                  <Typography variant="caption" sx={{ color: '#666' }}>
                    <span style={{ fontWeight: 500 }}>Observações:</span> {guide.notes}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Menu de ações */}
            <IconButton
              size="small"
              onClick={(e) => onOpenMenu(e, guide)}
              sx={{
                ml: 1,
                color: '#999',
                '&:hover': { color: '#666', bgcolor: '#f5f5f5' }
              }}
            >
              <MoreVertical size={16} />
            </IconButton>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PatientInsuranceTab;