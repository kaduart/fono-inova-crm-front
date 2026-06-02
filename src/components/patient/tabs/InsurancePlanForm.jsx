import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Paper
} from '@mui/material';
import { Save, X, Calendar, Plus, Trash2, Clock, User, DollarSign, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import API from '../../../services/api';
import { toast } from 'react-hot-toast';

import { SPECIALTY_VALUES } from '../../../constants/specialties';

const VALID_SPECIALTIES = SPECIALTY_VALUES;

const DAYS = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' }
];

/**
 * Modal para criar plano de atendimento de convênio
 * Gera appointments + payments pendentes automaticamente
 */
const InsurancePlanForm = ({ open, onClose, guide, patientId }) => {
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingPlan, setExistingPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  const [form, setForm] = useState({
    doctorId: '',
    sessionsPerWeek: 1,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    slots: [{ dayOfWeek: 1, time: '14:00' }],
    sessionValue: 0,
    notes: ''
  });

  useEffect(() => {
    if (open && guide?.specialty) {
      setForm(prev => ({
        ...prev,
        slots: [{ dayOfWeek: 1, time: '14:00' }]
      }));
    }
  }, [open, guide]);

  useEffect(() => {
    if (!open) return;
    setLoadingDoctors(true);
    API.get('/doctors?status=active')
      .then(res => {
        const docs = res.data?.data?.doctors || res.data?.data || res.data || [];
        setDoctors(Array.isArray(docs) ? docs : []);
      })
      .catch(() => toast.error('Erro ao carregar profissionais'))
      .finally(() => setLoadingDoctors(false));
  }, [open]);

  // Verifica se já existe plano para esta guia
  useEffect(() => {
    if (!open || !guide?._id) {
      setExistingPlan(null);
      return;
    }
    setLoadingPlan(true);
    API.get(`/api/v2/insurance-plans/guide/${guide._id}`)
      .then(res => {
        if (res.data?.data) {
          setExistingPlan(res.data.data);
        } else {
          setExistingPlan(null);
        }
      })
      .catch(() => setExistingPlan(null))
      .finally(() => setLoadingPlan(false));
  }, [open, guide?._id]);

  const handleSlotChange = (idx, field, value) => {
    setForm(prev => {
      const newSlots = [...prev.slots];
      newSlots[idx] = { ...newSlots[idx], [field]: value };
      return { ...prev, slots: newSlots };
    });
  };

  const addSlot = () => {
    if (form.slots.length >= 5) return;
    setForm(prev => ({
      ...prev,
      slots: [...prev.slots, { dayOfWeek: 1, time: '14:00' }]
    }));
  };

  const removeSlot = (idx) => {
    setForm(prev => ({
      ...prev,
      slots: prev.slots.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = async () => {
    if (!guide?._id) {
      toast.error('Guia não identificada. Recarregue a página e tente novamente.');
      return;
    }
    if (!form.doctorId) {
      toast.error('Selecione um profissional responsável pelo atendimento.');
      return;
    }
    if (!form.startDate) {
      toast.error('Informe a data de início do plano de atendimento.');
      return;
    }
    if (form.slots.some(s => !s.dayOfWeek || !s.time)) {
      toast.error('Preencha todos os dias da semana e horários dos atendimentos.');
      return;
    }

    // Se já existe plano, pedir confirmação
    if (existingPlan) {
      const generatedCount = existingPlan.generatedAppointments?.length || 0;
      const msg = generatedCount > 0
        ? `Esta guia já possui um plano com ${generatedCount} agendamento(s) gerado(s).\n\nAo continuar, o plano anterior será cancelado e os agendamentos futuros serão removidos. Um novo plano será criado com as configurações atuais.\n\nDeseja prosseguir?`
        : 'Esta guia já possui um plano de atendimento. Deseja substituí-lo por um novo?'
      if (!window.confirm(msg)) return;
    }

    setSaving(true);
    try {
      const payload = {
        guideId: guide._id,
        doctorId: form.doctorId,
        specialty: guide.specialty,
        sessionsPerWeek: Number(form.sessionsPerWeek),
        startDate: form.startDate,
        slots: form.slots.map(s => ({ dayOfWeek: Number(s.dayOfWeek), time: s.time })),
        sessionValue: Number(form.sessionValue) || 0,
        notes: form.notes
      };

      const response = await API.post('/v2/insurance-plans', payload);
      const createdCount = response?.data?.data?.appointments?.length || guide.totalSessions;

      if (existingPlan) {
        toast.success(`Plano substituído com sucesso! ${createdCount} novo(s) agendamento(s) gerado(s).`);
      } else {
        toast.success(`Plano criado com sucesso! ${createdCount} agendamento(s) gerado(s).`);
      }
      onClose(true);
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || '';

      if (status === 400) {
        if (message.includes('sessões restantes')) {
          toast.error(`Não é possível criar o plano: ${message}`);
        } else if (message.includes('não encontrad')) {
          toast.error(`Dados inválidos: ${message}. Verifique as informações e tente novamente.`);
        } else {
          toast.error(`Erro de validação: ${message}`);
        }
      } else if (status === 409) {
        toast.error(`Conflito: ${message}. Recarregue a página e tente novamente.`);
      } else if (status === 500) {
        toast.error('Erro interno no servidor. Nosso time foi notificado. Tente novamente em alguns instantes.');
      } else {
        toast.error(message || 'Não foi possível criar o plano. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!guide) return null;

  return (
    <Dialog
      open={open}
      onClose={() => onClose(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          bgcolor: '#ffffff'
        }
      }}
    >
      {/* HEADER PREMIUM */}
      <DialogTitle sx={{ px: 3, py: 3, borderBottom: '1px solid', borderColor: '#f0f2f5', bgcolor: '#fafcff' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #1B4D6E 0%, #2E7A5E 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 14px -6px rgba(27,77,110,0.2)'
              }}
            >
              <CalendarDays size={20} color="#ffffff" />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1A2C3E', letterSpacing: '-0.01em' }}>
                Plano de Atendimento
              </Typography>
              <Typography variant="caption" sx={{ color: '#5B6E8C', fontWeight: 500, mt: 0.2, display: 'block' }}>
                Guia #{guide.number} • {guide.specialty.replace('_', ' ')} • {guide.totalSessions} sessões autorizadas
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => onClose(false)}
            sx={{ color: '#7E8B9E', '&:hover': { bgcolor: '#F0F4F9', color: '#1A2C3E' } }}
          >
            <X size={18} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 3.5, bgcolor: '#ffffff' }}>
        <Alert
          severity="info"
          icon={<Clock size={16} />}
          sx={{
            mb: 3,
            borderRadius: '20px',
            bgcolor: '#EFF9F6',
            color: '#1C6E4A',
            border: '1px solid #C6E6DA',
            '& .MuiAlert-message': { fontSize: '0.8125rem', fontWeight: 500 },
            '& .MuiAlert-icon': { color: '#2E7A5E' }
          }}
        >
          O sistema vai gerar <strong>{guide.totalSessions} agendamentos</strong> automaticamente
          e criar os pagamentos como <strong>pendentes</strong> do convênio.
        </Alert>

        {loadingPlan && (
          <Alert
            severity="info"
            sx={{
              mb: 3,
              borderRadius: '20px',
              bgcolor: '#F0F4F9',
              color: '#5B6E8C',
              border: '1px solid #D6DFEA',
              '& .MuiAlert-message': { fontSize: '0.8125rem', fontWeight: 500 }
            }}
          >
            <CircularProgress size={12} sx={{ mr: 1 }} /> Verificando plano existente...
          </Alert>
        )}

        {existingPlan && !loadingPlan && (
          <Alert
            severity="warning"
            sx={{
              mb: 3,
              borderRadius: '20px',
              bgcolor: '#FFF8E6',
              color: '#8A6D1F',
              border: '1px solid #F0E0B0',
              '& .MuiAlert-message': { fontSize: '0.8125rem', fontWeight: 500 }
            }}
          >
            <strong>Atenção:</strong> Esta guia já possui um plano de atendimento
            {existingPlan.generatedAppointments?.length > 0
              ? ` com ${existingPlan.generatedAppointments.length} agendamento(s) gerado(s). `
              : '. '}
            Ao salvar, o plano anterior será <strong>substituído</strong> e os agendamentos futuros serão removidos.
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Profissional */}
          <TextField
            select
            label="Profissional responsável *"
            value={form.doctorId}
            onChange={(e) => setForm(prev => ({ ...prev, doctorId: e.target.value }))}
            fullWidth
            size="small"
            disabled={loadingDoctors}
            InputProps={{
              startAdornment: <User size={16} style={{ marginRight: 8, color: '#7890A7' }} />,
              sx: { borderRadius: '14px', bgcolor: '#F9FBFD' }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#E2E8F0', transition: '0.2s' },
                '&:hover fieldset': { borderColor: '#9BB4C8' },
                '&.Mui-focused fieldset': { borderColor: '#2E7A5E', borderWidth: 1.5 }
              }
            }}
          >
            {loadingDoctors ? (
              <MenuItem disabled sx={{ justifyContent: 'center' }}>
                <CircularProgress size={16} sx={{ mr: 1 }} /> Carregando...
              </MenuItem>
            ) : (
              doctors.map(doc => (
                <MenuItem key={doc._id} value={doc._id} sx={{ fontSize: '0.85rem' }}>
                  {doc.fullName} {doc.specialty ? `(${doc.specialty})` : ''}
                </MenuItem>
              ))
            )}
          </TextField>

          {/* Frequência */}
          <TextField
            select
            label="Frequência semanal *"
            value={form.sessionsPerWeek}
            onChange={(e) => setForm(prev => ({ ...prev, sessionsPerWeek: e.target.value }))}
            fullWidth
            size="small"
            InputProps={{
              sx: { borderRadius: '14px', bgcolor: '#F9FBFD' }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#E2E8F0' },
                '&:hover fieldset': { borderColor: '#9BB4C8' },
                '&.Mui-focused fieldset': { borderColor: '#2E7A5E' }
              }
            }}
          >
            {[1, 2, 3, 4, 5].map(n => (
              <MenuItem key={n} value={n}>{n}x por semana</MenuItem>
            ))}
          </TextField>

          {/* Data início */}
          <TextField
            label="Data de início *"
            type="date"
            value={form.startDate}
            onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            InputProps={{
              startAdornment: <Calendar size={16} style={{ marginRight: 8, color: '#7890A7' }} />,
              sx: { borderRadius: '14px', bgcolor: '#F9FBFD' }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#E2E8F0' },
                '&:hover fieldset': { borderColor: '#9BB4C8' },
                '&.Mui-focused fieldset': { borderColor: '#2E7A5E' }
              }
            }}
          />

          {/* Slots - Dias e horários */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#2C3E50', mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Clock size={14} /> Dias e horários da semana *
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {form.slots.map((slot, idx) => (
                <Paper
                  key={idx}
                  elevation={0}
                  sx={{
                    p: 1.2,
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'center',
                    bgcolor: '#F9FBFD',
                    borderRadius: '18px',
                    border: '1px solid #EDF2F7',
                    transition: '0.2s',
                    '&:hover': { borderColor: '#Cbd5E1', bgcolor: '#FFFFFF' }
                  }}
                >
                  <TextField
                    select
                    size="small"
                    value={slot.dayOfWeek}
                    onChange={(e) => handleSlotChange(idx, 'dayOfWeek', e.target.value)}
                    sx={{ flex: 1 }}
                    InputProps={{ sx: { borderRadius: '12px', bgcolor: '#FFFFFF' } }}
                  >
                    {DAYS.map(d => (
                      <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    type="time"
                    size="small"
                    value={slot.time}
                    onChange={(e) => handleSlotChange(idx, 'time', e.target.value)}
                    sx={{ flex: 1 }}
                    InputProps={{ sx: { borderRadius: '12px', bgcolor: '#FFFFFF' } }}
                  />
                  {form.slots.length > 1 && (
                    <IconButton
                      size="small"
                      onClick={() => removeSlot(idx)}
                      sx={{ color: '#C75146', '&:hover': { bgcolor: '#FFE5E3' } }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  )}
                </Paper>
              ))}
              {form.slots.length < 5 && (
                <Button
                  size="small"
                  onClick={addSlot}
                  startIcon={<Plus size={14} />}
                  sx={{
                    textTransform: 'none',
                    width: 'fit-content',
                    color: '#2E7A5E',
                    fontWeight: 600,
                    '&:hover': { bgcolor: '#EFF9F6' },
                    borderRadius: '40px',
                    px: 2,
                    mt: 0.5
                  }}
                >
                  Adicionar horário
                </Button>
              )}
            </Box>
          </Box>

          {/* Valor tabela */}
          <TextField
            label="Valor por sessão (tabela convênio)"
            type="number"
            value={form.sessionValue}
            onChange={(e) => setForm(prev => ({ ...prev, sessionValue: e.target.value }))}
            fullWidth
            size="small"
            InputProps={{
              startAdornment: <DollarSign size={16} style={{ marginRight: 8, color: '#7890A7' }} />,
              sx: { borderRadius: '14px', bgcolor: '#F9FBFD' }
            }}
            inputProps={{ min: 0, step: 0.01 }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#E2E8F0' },
                '&:hover fieldset': { borderColor: '#9BB4C8' },
                '&.Mui-focused fieldset': { borderColor: '#2E7A5E' }
              }
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2.5, borderTop: '1px solid #F0F2F5', bgcolor: '#FAFCFF', gap: 1.5 }}>
        <Button
          onClick={() => onClose(false)}
          disabled={saving}
          startIcon={<X size={16} />}
          sx={{
            textTransform: 'none',
            borderRadius: '40px',
            px: 2.5,
            fontWeight: 600,
            color: '#5B6E8C',
            '&:hover': { bgcolor: '#F0F4F9' }
          }}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} sx={{ color: '#ffffff' }} /> : <Save size={16} />}
          sx={{
            textTransform: 'none',
            borderRadius: '40px',
            px: 3,
            py: 0.9,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #1B4D6E 0%, #2E7A5E 100%)',
            boxShadow: '0 4px 12px rgba(27,77,110,0.25)',
            '&:hover': {
              background: 'linear-gradient(135deg, #123F5A 0%, #246653 100%)',
              boxShadow: '0 6px 14px rgba(27,77,110,0.35)'
            }
          }}
        >
          {saving ? (existingPlan ? 'Substituindo plano...' : 'Gerando plano...') : (existingPlan ? 'Substituir plano' : 'Criar plano')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InsurancePlanForm;