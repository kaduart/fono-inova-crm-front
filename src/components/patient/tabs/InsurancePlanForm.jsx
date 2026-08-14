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
import { Save, X, Calendar, Plus, Trash2, Clock, User, DollarSign, CalendarDays, AlertTriangle, GripVertical } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
const InsurancePlanForm = ({ open, onClose, guide, plan, patientId, patientName }) => {
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingPlan, setExistingPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  const [form, setForm] = useState({
    doctorId: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    slots: [{ dayOfWeek: 1, time: '14:00' }],
    sessionValue: 0,
    notes: ''
  });

  // Dados do plano existente podem vir por prop (modo replace via Editar)
  // ou serem carregados via API (modo replace via "Ver sessões" ou fallback)
  const activePlan = plan || existingPlan;
  const mode = activePlan ? 'replace' : 'create';

  useEffect(() => {
    if (open && guide) {
      const base = activePlan || guide;
      setForm(prev => ({
        ...prev,
        slots: activePlan?.slots?.length
          ? activePlan.slots.map(s => ({ dayOfWeek: Number(s.dayOfWeek), time: s.time }))
          : [{ dayOfWeek: 1, time: '14:00' }],
        // O plano (InsurancePlan) não armazena sessionValue; a referência é a guia.
        sessionValue: activePlan?.sessionValue ?? guide.sessionValue ?? prev.sessionValue,
        doctorId: activePlan?.doctor?._id || base.doctor?._id || base.doctorId || prev.doctorId,
        startDate: activePlan?.startDate
          ? format(parseISO(activePlan.startDate), 'yyyy-MM-dd')
          : prev.startDate,
        notes: activePlan?.notes ?? prev.notes
      }));
    }
  }, [open, guide, activePlan]);

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
    // Se o plano já veio como prop (modo replace), usa-o diretamente
    if (plan) {
      setExistingPlan(plan);
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
  }, [open, guide?._id, plan]);

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

  // Ordem do array = prioridade de geração no backend (generateInsurancePlanSessions
  // preenche o orçamento de sessões restantes na ordem de plan.slots, semana a semana).
  // Arrastar as linhas deixa essa prioridade explícita e sob controle do usuário.
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const moveSlot = (fromIdx, toIdx) => {
    setForm(prev => {
      const newSlots = [...prev.slots];
      const [moved] = newSlots.splice(fromIdx, 1);
      newSlots.splice(toIdx, 0, moved);
      return { ...prev, slots: newSlots };
    });
  };

  const handleDragStart = (idx) => (e) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (idx) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (idx !== dragOverIdx) setDragOverIdx(idx);
  };

  const handleDrop = (idx) => (e) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== idx) {
      moveSlot(draggedIdx, idx);
    }
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);
  const [replanPreview, setReplanPreview] = useState(null); // null enquanto não carregou / não se aplica
  const [loadingPreview, setLoadingPreview] = useState(false);

  const slotSignature = (arr) => (arr || [])
    .map(s => `${Number(s.dayOfWeek)}-${s.time}`)
    .slice()
    .sort()
    .join('|');

  const handleSubmit = async () => {
    if (!guide?._id) {
      toast.error('Guia não identificada. Recarregue a página e tente novamente.');
      return;
    }
    if (!form.doctorId) {
      toast.error('Selecione um profissional responsável pelo atendimento.');
      return;
    }
    if (form.slots.some(s => !s.dayOfWeek || !s.time)) {
      toast.error('Preencha todos os dias da semana e horários dos atendimentos.');
      return;
    }

    const isReplace = Boolean(existingPlan);

    if (isReplace && (existingPlan.generatedAppointments?.length || 0) > 0) {
      const slotsChanged = slotSignature(existingPlan.slots) !== slotSignature(form.slots);
      setReplanPreview(null);
      setConfirmReplaceOpen(true);

      if (slotsChanged) {
        setLoadingPreview(true);
        try {
          const res = await API.post(`/v2/insurance-plans/${existingPlan._id}/replan-preview`, {
            slots: form.slots.map(s => ({ dayOfWeek: Number(s.dayOfWeek), time: s.time }))
          });
          setReplanPreview(res.data?.data || null);
        } catch {
          // Preview é só informativo — se falhar, o modal cai no texto genérico e o
          // usuário ainda consegue confirmar; a validação real acontece no PATCH.
          setReplanPreview(null);
        } finally {
          setLoadingPreview(false);
        }
      }
      return;
    }

    performSave();
  };

  const performSave = async () => {
    setConfirmReplaceOpen(false);
    const isReplace = Boolean(existingPlan);

    setSaving(true);
    try {
      let response;

      if (isReplace) {
        // PATCH parcial: só atualiza campos editáveis do plano e sincroniza futuros
        const payload = {
          doctorId: form.doctorId,
          sessionValue: Number(form.sessionValue) || 0,
          slots: form.slots.map(s => ({ dayOfWeek: Number(s.dayOfWeek), time: s.time })),
          notes: form.notes,
          startDate: form.startDate
        };
        response = await API.patch(`/v2/insurance-plans/${existingPlan._id}`, payload);
        const updated = response?.data?.data?.appointmentsUpdated || 0;
        const canceled = response?.data?.data?.appointmentsCanceled || 0;
        toast.success(`Plano atualizado! ${updated} sessão(ões) ajustada(s)${canceled > 0 ? `, ${canceled} cancelada(s)` : ''}.`);
      } else {
        if (!form.startDate) {
          toast.error('Informe a data de início do plano de atendimento.');
          setSaving(false);
          return;
        }
        const payload = {
          guideId: guide._id,
          doctorId: form.doctorId,
          specialty: guide.specialty,
          sessionsPerWeek: form.slots.length,
          startDate: form.startDate,
          slots: form.slots.map(s => ({ dayOfWeek: Number(s.dayOfWeek), time: s.time })),
          sessionValue: Number(form.sessionValue) || 0,
          notes: form.notes
        };
        // Criar só grava a configuração do plano — não toca na agenda. Gerar os
        // agendamentos de verdade é um passo separado e explícito (botão "Gerar
        // sessões" no card da guia, mesmo padrão de Pacotes/Liminar), pra quem está
        // criando decidir quando a agenda real é mexida em vez de isso acontecer
        // escondido dentro do "Criar plano".
        response = await API.post('/v2/insurance-plans', payload);
        toast.success('Plano criado! Clique em "Gerar sessões" no card da guia para agendar os atendimentos.', { duration: 7000 });
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
        // Texto corrido escondia exatamente a parte que importa pra decidir o que
        // fazer (com quem é o conflito, de qual guia, quando) — negrito nos dados,
        // não na frase inteira.
        const conflict = err?.response?.data?.conflict;
        const errorCode = err?.response?.data?.errorCode;
        if (conflict?.withWhom) {
          toast.error(
            <span>
              Conflito de agenda com <strong>{conflict.withWhom}</strong>
              {conflict.guideNumber ? <> (guia <strong>{conflict.guideNumber}</strong>)</> : null} em{' '}
              <strong>{conflict.date}</strong> às <strong>{conflict.time}</strong>. Escolha outro horário.
            </span>,
            { duration: 9000 }
          );
        } else if (errorCode === 'PLAN_HAS_ASSOCIATED_RECORDS') {
          // Mensagem própria — "recarregue a página" não se aplica aqui, a ação
          // certa é usar "Gerar sessões" no plano existente, não tentar de novo.
          toast.error(message, { duration: 8000 });
        } else {
          toast.error(`Conflito: ${message}. Recarregue a página e tente novamente.`);
        }
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
                {mode === 'replace' ? 'Editar Plano de Atendimento' : 'Novo Plano de Atendimento'}
              </Typography>
              {patientName && (
                <Typography variant="body2" sx={{ color: '#2E7A5E', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <User size={12} /> {patientName}
                </Typography>
              )}
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
        {mode === 'create' && (
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
        )}

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
            <strong>⚠️ Edição de plano ativo.</strong><br />
            As alterações serão aplicadas apenas às <strong>sessões futuras</strong> (a partir de hoje). Sessões já realizadas não serão alteradas.
            {existingPlan.generatedAppointments?.length > 0 && (
              <>
                <br />
                Sessões geradas no plano: <strong>{existingPlan.generatedAppointments.length}</strong>
              </>
            )}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Row 1: Profissional + Data início */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
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
            </Box>
            <Box sx={{ width: '38%', minWidth: 150 }}>
              <TextField
                label="Início *"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                fullWidth
                size="small"
                helperText={mode === 'replace' ? 'Sessões antes desta data não são geradas' : ''}
                InputLabelProps={{ shrink: true }}
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
              />
            </Box>
          </Box>

          {/* Row 2: Frequência semanal (derivada dos horários, 50%) + Valor por sessão (50%) */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ flex: 1 }}>
              <TextField
                label="Frequência semanal"
                value={`${form.slots.length}x por semana`}
                fullWidth
                size="small"
                disabled
                helperText="Definida pela quantidade de horários abaixo"
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
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <TextField
                label="Valor/sessão"
                type="number"
                value={form.sessionValue}
                onChange={(e) => setForm(prev => ({ ...prev, sessionValue: e.target.value }))}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: <DollarSign size={14} style={{ marginRight: 6, color: '#7890A7' }} />,
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
          </Box>

          {/* Slots - Dias e horários */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#2C3E50', mb: 0.3, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Clock size={14} /> Dias e horários da semana *
            </Typography>
            {form.slots.length > 1 && (
              <Typography variant="caption" sx={{ color: '#7E8B9E', mb: 1.2, display: 'block' }}>
                Arraste para definir a ordem de prioridade na geração das sessões
              </Typography>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {form.slots.map((slot, idx) => (
                <Paper
                  key={idx}
                  elevation={0}
                  draggable={form.slots.length > 1}
                  onDragStart={handleDragStart(idx)}
                  onDragOver={handleDragOver(idx)}
                  onDrop={handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                  sx={{
                    p: 1.2,
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'center',
                    bgcolor: '#F9FBFD',
                    borderRadius: '18px',
                    border: '1px solid',
                    borderColor: dragOverIdx === idx && draggedIdx !== idx ? '#2E7A5E' : '#EDF2F7',
                    opacity: draggedIdx === idx ? 0.4 : 1,
                    transition: '0.2s',
                    '&:hover': { borderColor: '#Cbd5E1', bgcolor: '#FFFFFF' }
                  }}
                >
                  {form.slots.length > 1 && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        color: '#AEB9C7',
                        cursor: 'grab',
                        '&:active': { cursor: 'grabbing' }
                      }}
                    >
                      <GripVertical size={16} />
                    </Box>
                  )}
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
          {saving
            ? (existingPlan ? 'Substituindo plano...' : 'Gerando plano...')
            : (existingPlan ? 'Salvar alterações' : 'Criar plano')}
        </Button>
      </DialogActions>

      <Dialog
        open={confirmReplaceOpen}
        onClose={() => setConfirmReplaceOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', overflow: 'hidden' } }}
      >
        <DialogContent sx={{ pt: 3.5, pb: 1 }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <Box sx={{
              flexShrink: 0, width: 36, height: 36, borderRadius: '12px',
              bgcolor: '#FFF4E5', color: '#C77B1E',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertTriangle size={18} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#2C3E50', mb: 0.5 }}>
                Confirmar edição do plano ativo
              </Typography>

              {loadingPreview && (
                <Typography sx={{ fontSize: '0.825rem', color: '#5B6E8C', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={14} /> Calculando impacto da mudança...
                </Typography>
              )}

              {!loadingPreview && (
                <Typography sx={{ fontSize: '0.825rem', color: '#5B6E8C', lineHeight: 1.6 }}>
                  Este plano já tem <strong>{existingPlan?.generatedAppointments?.length || 0} agendamento(s)</strong> gerado(s).
                  As alterações serão aplicadas apenas às <strong>sessões futuras</strong> (a partir de hoje). Sessões já realizadas não serão alteradas.
                  {replanPreview?.slotsChanged && (
                    <> A frequência/horário mudou: sincronize a agenda pelo botão <strong>"Gerar sessões"</strong> no card.</>
                  )}
                  {replanPreview?.eligible === false && (
                    <Box component="span" sx={{ display: 'block', color: '#C75146', fontWeight: 700, mt: 0.5 }}>
                      ⚠ {replanPreview.eligibilityMessage || 'Guia pode não estar elegível para gerar novas sessões.'}
                    </Box>
                  )}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button
            onClick={() => setConfirmReplaceOpen(false)}
            sx={{ textTransform: 'none', borderRadius: '40px', px: 2, fontWeight: 600, color: '#5B6E8C' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={performSave}
            variant="contained"
            disabled={loadingPreview}
            sx={{
              textTransform: 'none', borderRadius: '40px', px: 2.5, fontWeight: 700,
              background: 'linear-gradient(135deg, #1B4D6E 0%, #2E7A5E 100%)'
            }}
          >
            Confirmar e salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default InsurancePlanForm;