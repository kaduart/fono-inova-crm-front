import {
  Cancel as CancelledIcon,
  CheckCircle as CompletedIcon,
  Paid as PaidIcon,
  HourglassTop as PendingIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { CheckCircleIcon } from 'lucide-react';

// 🔹 Ajuste de status em inglês
const getStatusIcon = (clinicalStatus: string, operationalStatus: string) => {
  if (clinicalStatus === 'completed') return <CompletedIcon color="success" />;
  if (clinicalStatus === 'missed') return <CancelledIcon color="error" />;
  if (operationalStatus === 'paid') return <PaidIcon color="success" />;
  if (operationalStatus === 'canceled') return <CancelledIcon color="error" />;
  if (operationalStatus === 'confirmed') return <CompletedIcon color="info" />;
  return <PendingIcon color="info" />;
};

const getStatusLabel = (clinicalStatus: string, operationalStatus: string) => {
  if (clinicalStatus === 'in_progress') return 'Em atendimento';
  if (clinicalStatus === 'completed') return 'Atendimento concluído';
  if (clinicalStatus === 'missed') return 'Paciente faltou';
  if (operationalStatus === 'canceled') return 'Cancelado';
  if (operationalStatus === 'confirmed') return 'Confirmado';
  if (operationalStatus === 'paid') return 'Pagamento confirmado';
  return 'Agendado';
};

const AppointmentItem = ({ appointment, onUpdateStatus }) => {
  return (
    <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="subtitle1" fontWeight="bold">
            {appointment.patientName}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            <TimeIcon fontSize="small" />
            <Typography variant="body2">
              {new Date(appointment.date).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Typography>
            <Chip label={appointment.specialty} size="small" variant="outlined" />
          </Stack>
        </Box>

        <Box sx={{ textAlign: 'right' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title={getStatusLabel(appointment.clinicalStatus, appointment.operationalStatus)}>
              {getStatusIcon(appointment.clinicalStatus, appointment.operationalStatus)}
            </Tooltip>
            <Typography variant="caption">
              {getStatusLabel(appointment.clinicalStatus, appointment.operationalStatus)}
            </Typography>
          </Stack>

          {appointment.clinicalStatus === 'pending' && (
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Tooltip title="Iniciar atendimento">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => onUpdateStatus('in_progress')}
                >
                  <PersonIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          )}

          {appointment.clinicalStatus === 'in_progress' && (
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Tooltip title="Concluir atendimento">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => onUpdateStatus('completed')}
                >
                  <CheckCircleIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Paciente faltou">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onUpdateStatus('missed')}
                >
                  <CancelledIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Box>
      </Stack>
    </Box>
  );
};

export default AppointmentItem;
