// src/components/patient/tabs/InsuranceGuideForm.jsx
import React, { useEffect } from 'react';
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
  Alert
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { Save, X } from 'lucide-react';
import { format, addMonths } from 'date-fns';

// Constantes de validação (sincronizadas com backend)
const VALID_SPECIALTIES = [
  'fonoaudiologia',
  'psicologia',
  'fisioterapia',
  'terapia_ocupacional',
  'psicopedagogia',
  'psicomotricidade',
  'musicoterapia',
  'neuropsicologia'
];


const VALID_INSURANCES = [
  'unimed-anapolis',
  'unimed-goiania',
  'unimed-campinas',
  'hapvida',
  'amil',
  'bradesco-saude',
  'sulamerica',
  'outro'
];

/**
 * Modal para criar/editar guias de convênio
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onClose
 * @param {Function} props.onSave
 * @param {Object} [props.guide]
 */
const InsuranceGuideForm = ({ open, onClose, onSave, guide = null }) => {
  const isEditing = Boolean(guide);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      number: '',
      specialty: '',
      insurance: '',
      totalSessions: '',
      expiresAt: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
      notes: ''
    }
  });

  // Resetar formulário quando abrir/fechar ou mudar guia
  useEffect(() => {
    if (open) {
      if (guide) {
        reset({
          number: guide.number || '',
          specialty: guide.specialty || '',
          insurance: guide.insurance || '',
          totalSessions: guide.totalSessions || '',
          expiresAt: guide.expiresAt ? format(new Date(guide.expiresAt), 'yyyy-MM-dd') : '',
          notes: guide.notes || ''
        });
      } else {
        reset({
          number: '',
          specialty: '',
          insurance: '',
          totalSessions: '',
          expiresAt: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
          notes: ''
        });
      }
    }
  }, [open, guide, reset]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        number: data.number.trim(),
        specialty: data.specialty.toLowerCase().trim(),
        insurance: data.insurance.toLowerCase().trim(),
        totalSessions: parseInt(data.totalSessions, 10),
        expiresAt: new Date(data.expiresAt).toISOString(),
        notes: data.notes?.trim() || undefined
      };

      await onSave(payload);
    } catch (error) {
      console.error('Erro ao salvar guia:', error);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        }
      }}
    >
      <DialogTitle sx={{ px: 3, py: 2.5, borderBottom: '1px solid #f0f0f0' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 500, color: '#1a1a1a' }}>
          {isEditing ? 'Editar guia' : 'Nova guia de convênio'}
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ px: 3, py: 2.5 }}>
          {/* Alertas informativos */}
          {isEditing && guide?.usedSessions > 0 && (
            <Alert
              severity="warning"
              sx={{
                mb: 2.5,
                p: 1.5,
                borderRadius: '8px',
                '& .MuiAlert-message': { fontSize: '0.8125rem', p: 0 }
              }}
            >
              Esta guia já possui {guide.usedSessions} sessão(ões) utilizada(s).
              Apenas alguns campos podem ser editados.
            </Alert>
          )}

          {!isEditing && (
            <Alert
              severity="info"
              sx={{
                mb: 2.5,
                p: 1.5,
                borderRadius: '8px',
                '& .MuiAlert-message': { fontSize: '0.8125rem', p: 0 }
              }}
            >
              Preencha os dados da guia conforme autorização do convênio.
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Número da guia */}
            <Controller
              name="number"
              control={control}
              rules={{
                required: 'Número da guia é obrigatório',
                minLength: {
                  value: 3,
                  message: 'Mínimo 3 caracteres'
                }
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Número da guia"
                  fullWidth
                  required
                  size="small"
                  error={Boolean(errors.number)}
                  helperText={errors.number?.message}
                  placeholder="Ex: 123456789"
                  disabled={isEditing && guide?.usedSessions > 0}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      backgroundColor: '#fafafa',
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#fff',
                      }
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.875rem',
                    }
                  }}
                />
              )}
            />

            {/* Especialidade */}
            <Controller
              name="specialty"
              control={control}
              rules={{ required: 'Especialidade é obrigatória' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Especialidade"
                  fullWidth
                  required
                  select
                  size="small"
                  error={Boolean(errors.specialty)}
                  helperText={errors.specialty?.message}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      backgroundColor: '#fafafa',
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.875rem',
                    }
                  }}
                >
                  {VALID_SPECIALTIES.map(specialty => (
                    <MenuItem key={specialty} value={specialty} sx={{ fontSize: '0.875rem' }}>
                      {specialty.charAt(0).toUpperCase() + specialty.slice(1).replace('-', ' ')}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            {/* Convênio */}
            <Controller
              name="insurance"
              control={control}
              rules={{ required: 'Convênio é obrigatório' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Convênio"
                  fullWidth
                  required
                  select
                  size="small"
                  error={Boolean(errors.insurance)}
                  helperText={errors.insurance?.message}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      backgroundColor: '#fafafa',
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.875rem',
                    }
                  }}
                >
                  {VALID_INSURANCES.map(insurance => (
                    <MenuItem key={insurance} value={insurance} sx={{ fontSize: '0.875rem' }}>
                      {insurance.split('-').map(word =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            {/* Total de sessões */}
            <Controller
              name="totalSessions"
              control={control}
              rules={{
                required: 'Total de sessões é obrigatório',
                min: {
                  value: 1,
                  message: 'Mínimo 1 sessão'
                },
                max: {
                  value: 999,
                  message: 'Máximo 999 sessões'
                }
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Total de sessões"
                  fullWidth
                  required
                  type="number"
                  size="small"
                  error={Boolean(errors.totalSessions)}
                  helperText={errors.totalSessions?.message}
                  inputProps={{ min: 1, max: 999 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      backgroundColor: '#fafafa',
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.875rem',
                    }
                  }}
                />
              )}
            />

            {/* Data de expiração */}
            <Controller
              name="expiresAt"
              control={control}
              rules={{
                required: 'Data de validade é obrigatória',
                validate: (value) => {
                  const selectedDate = new Date(value);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  if (selectedDate < today) {
                    return 'Data não pode ser anterior a hoje';
                  }
                  return true;
                }
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Data de validade"
                  fullWidth
                  required
                  type="date"
                  size="small"
                  error={Boolean(errors.expiresAt)}
                  helperText={errors.expiresAt?.message}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      backgroundColor: '#fafafa',
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.875rem',
                    }
                  }}
                />
              )}
            />

            {/* Observações */}
            <Controller
              name="notes"
              control={control}
              rules={{
                maxLength: {
                  value: 500,
                  message: 'Máximo 500 caracteres'
                }
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Observações"
                  fullWidth
                  multiline
                  rows={2}
                  size="small"
                  error={Boolean(errors.notes)}
                  helperText={errors.notes?.message}
                  placeholder="Ex: Autorização condicionada a avaliação inicial"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      backgroundColor: '#fafafa',
                      '& textarea': {
                        fontSize: '0.875rem',
                      }
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '0.875rem',
                    }
                  }}
                />
              )}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #f0f0f0' }}>
          <Button
            onClick={handleClose}
            disabled={isSubmitting}
            startIcon={<X size={16} />}
            sx={{
              textTransform: 'none',
              fontSize: '0.8125rem',
              color: '#666',
              '&:hover': {
                backgroundColor: '#f5f5f5',
              }
            }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={<Save size={16} />}
            sx={{
              textTransform: 'none',
              fontSize: '0.8125rem',
              backgroundColor: '#1976d2',
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: '#1565c0',
                boxShadow: 'none',
              }
            }}
          >
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default InsuranceGuideForm;