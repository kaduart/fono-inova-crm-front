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

  // 🎯 FILTRAR GUIAS: 
  // 1. Não mostrar guias vinculadas a pacotes (status='linked' ou packageId !== null)
  // 🎯 TODAS as guias disponíveis (sem filtro de especialidade)
  // Usado para calcular especialidades e contagens nos tabs
  const allAvailableGuides = useMemo(() => {
    return guides
      .filter(g => g.status !== 'linked' && !g.packageId)
      .map(g => ({
        ...g,
        remaining: g.remaining ?? (g.totalSessions - (g.usedSessions || 0)),
        usedSessions: g.usedSessions || 0
      }));
  }, [guides]);

  // Especialidades disponíveis (calculadas a partir de TODAS as guias disponíveis)
  const specialties = useMemo(() => {
    const unique = [...new Set(allAvailableGuides.map(g => g.specialty))];
    return unique.sort();
  }, [allAvailableGuides]);

  console.log('Guias carregadas:', guides);

  // 🎯 GUIAS FILTRADAS por especialidade selecionada
  const availableGuides = useMemo(() => {
    return allAvailableGuides
      .filter(g => selectedSpecialty === 'all' || g.specialty === selectedSpecialty);
  }, [allAvailableGuides, selectedSpecialty]);

  // Agrupamento de guias (usando apenas guias disponíveis)
  const groupedGuides = useMemo(() => {
    const active = availableGuides.filter(g => g.status === 'active' && g.remaining > 0);
    const exhausted = availableGuides.filter(g => g.status === 'exhausted' || (g.status === 'active' && g.remaining === 0));
    const expired = availableGuides.filter(g => g.status === 'expired');
    const cancelled = availableGuides.filter(g => g.status === 'cancelled');

    return { active, exhausted, expired, cancelled };
  }, [availableGuides]);

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
    // 🎯 Segurança: não permitir editar guias vinculadas a pacotes
    if (selectedGuide.status === 'linked' || selectedGuide.packageId) {
      toast.error('Não é possível editar guia vinculada a um pacote');
      handleCloseMenu();
      return;
    }
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
    // 🎯 Segurança: não permitir cancelar guias vinculadas a pacotes
    if (selectedGuide.status === 'linked' || selectedGuide.packageId) {
      toast.error('Não é possível cancelar guia vinculada a um pacote');
      handleCloseMenu();
      return;
    }
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
                  borderRadius: '6px',
                  '&.Mui-selected': { 
                    color: '#fff', 
                    fontWeight: 600,
                    backgroundColor: '#1976d2'
                  }
                },
                '& .MuiTabs-indicator': { display: 'none' }
              }}
            >
              <Tab 
                label={`Todas (${allAvailableGuides.length})`} 
                value="all" 
              />
              {specialties.map(specialty => {
                const count = allAvailableGuides.filter(g => g.specialty === specialty).length;
                return (
                  <Tab
                    key={specialty}
                    label={`${specialty.charAt(0).toUpperCase() + specialty.slice(1).replace('-', ' ')} (${count})`}
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

      {/* Estado vazio quando filtro não retorna guias */}
      {availableGuides.length === 0 && (
        <Box sx={{ 
          textAlign: 'center', 
          py: 6,
          color: 'grey.500'
        }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Nenhuma guia encontrada
            {selectedSpecialty !== 'all' && ` para ${selectedSpecialty}`}
          </Typography>
          <Typography variant="body2" color="grey.400">
            Tente selecionar outra especialidade ou cadastre uma nova guia
          </Typography>
        </Box>
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
          mb: 2,
          color,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontSize: '0.75rem'
        }}
      >
        {title} ({count})
      </Typography>
      <AnimatePresence>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)'
          },
          gap: 2.5
        }}>
          {guides.map(guide => (
            <GuideCard
              key={guide._id}
              guide={guide}
              onOpenMenu={onOpenMenu}
            />
          ))}
        </Box>
      </AnimatePresence>
    </Box>
  );
};

// ----------------------------------------------------------------------
// Componente de card individual (redesenhado com fundo clarinho)
// ----------------------------------------------------------------------
const GuideCard = ({ guide, onOpenMenu }) => {
  // 🎯 Garantir que temos remaining calculado
  const remaining = guide.remaining ?? (guide.totalSessions - (guide.usedSessions || 0));
  const usedSessions = guide.usedSessions || 0;
  const percentage = (remaining / guide.totalSessions) * 100;
  const daysUntilExpiration = differenceInDays(parseISO(guide.expiresAt), new Date());
  const isUrgent = daysUntilExpiration <= 7 && daysUntilExpiration >= 0;
  const isExpiringSoon = daysUntilExpiration <= 30 && daysUntilExpiration > 0;

  // Cor do status (usada em badges e bordas sutis)
  const statusColor =
    guide.status === 'linked' ? '#7c4dff' :  // 🎯 Nova cor para guias vinculadas
    guide.status === 'cancelled' ? '#9e9e9e' :
      guide.status === 'expired' ? '#d32f2f' :
        guide.status === 'exhausted' || remaining === 0 ? '#d32f2f' :
          percentage <= 20 ? '#ed6c02' : '#2e7d32';

  const statusLabel =
    guide.status === 'linked' ? 'Vinculada a Pacote' :  // 🎯 Novo label
    guide.status === 'cancelled' ? 'Cancelada' :
      guide.status === 'expired' ? 'Expirada' :
        guide.status === 'exhausted' || remaining === 0 ? 'Esgotada' : 'Ativa';

  // Formatação amigável
  const specialtyFormatted = guide.specialty
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  const insuranceFormatted = guide.insurance
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15 }}
      style={{ height: '100%' }}
    >
      <Card
        elevation={0}
        sx={{
          height: '100%',
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'grey.100',
          backgroundColor: '#d4f0f2',
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 24px -8px rgba(0,0,0,0.1)',
            borderColor: 'grey.200'
          },
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Barra superior sutil na cor do status */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${statusColor}40, ${statusColor})`
          }}
        />

        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 }, pt: 4 }}>
          {/* Header reorganizado: Número + Status + Menu */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            {/* Número da guia (à esquerda) */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              <FileText size={18} className="text-gray-400" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'grey.800' }}>
                #{guide.number}
              </Typography>
            </Box>
            
            {/* Status (no meio) */}
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <Chip
                label={statusLabel}
                size="small"
                sx={{
                  height: '24px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: `${statusColor}20`,
                  color: statusColor,
                  border: `1px solid ${statusColor}40`,
                  borderRadius: '6px'
                }}
              />
            </Box>
            
            {/* Menu de ações (à direita) */}
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <IconButton
                size="small"
                onClick={(e) => onOpenMenu(e, guide)}
                sx={{
                  color: 'grey.400',
                  '&:hover': { color: 'grey.700', bgcolor: 'grey.50' }
                }}
              >
                <MoreVertical size={18} />
              </IconButton>
            </Box>
          </Box>

          {/* Especialidade e convênio */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'grey.800' }}>
              {specialtyFormatted}
            </Typography>
            <Typography variant="caption" sx={{ color: 'grey.500' }}>
              {insuranceFormatted}
            </Typography>
          </Box>

          {/* Grid de informações: sessões e validade */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1.5,
            mb: 2.5
          }}>
            <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: 'grey.600', display: 'block', mb: 0.5 }}>
                Sessões
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'grey.800' }}>
                {remaining} / {guide.totalSessions}
              </Typography>
              <Typography variant="caption" sx={{ color: 'grey.500', fontSize: '0.65rem' }}>
                {usedSessions} usadas
              </Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: 'grey.600', display: 'block', mb: 0.5 }}>
                Validade
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'grey.800' }}>
                {format(parseISO(guide.expiresAt), 'dd/MM/yyyy')}
              </Typography>
              {daysUntilExpiration > 0 ? (
                <Typography variant="caption" sx={{
                  color: isUrgent ? '#d32f2f' : isExpiringSoon ? '#ed6c02' : 'grey.500',
                  fontSize: '0.65rem',
                  fontWeight: 500
                }}>
                  {daysUntilExpiration} dias
                </Typography>
              ) : daysUntilExpiration === 0 ? (
                <Typography variant="caption" sx={{ color: '#d32f2f', fontSize: '0.65rem', fontWeight: 500 }}>
                  Hoje!
                </Typography>
              ) : (
                <Typography variant="caption" sx={{ color: '#d32f2f', fontSize: '0.65rem', fontWeight: 500 }}>
                  Vencida
                </Typography>
              )}
            </Box>
          </Box>

          {/* Barra de progresso */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'grey.600' }}>
                Utilização
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: percentage <= 20 ? '#ed6c02' : 'grey.700' }}>
                {percentage.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={percentage}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: '#f0f0f0',
                '& .MuiLinearProgress-bar': {
                  backgroundColor:
                    percentage <= 20 ? '#ed6c02' :
                      percentage <= 50 ? '#1976d2' :
                        '#2e7d32',
                  borderRadius: 3
                }
              }}
            />
          </Box>

          {/* Notas, se houver */}
          {guide.notes && (
            <Box sx={{
              p: 1.5,
              bgcolor: '#f9f9f9',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'grey.100'
            }}>
              <Typography variant="caption" sx={{ color: 'grey.600' }}>
                <span style={{ fontWeight: 500 }}>Obs:</span> {guide.notes}
              </Typography>
            </Box>
          )}

          {/* Badge de "Nova" se não utilizada - posicionado à esquerda para não sobrepor menu */}
          {usedSessions === 0 && guide.status === 'active' && (
            <Box sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              bgcolor: '#e3f2fd',
              color: '#1976d2',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontSize: '0.6rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: '#1976d2',
              zIndex: 1
            }}>
              ✨ Nova
            </Box>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};



export default PatientInsuranceTab;