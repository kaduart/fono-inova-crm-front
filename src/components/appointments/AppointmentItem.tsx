import React from 'react';
import { 
  Box, Typography, Chip, Stack, IconButton, Tooltip 
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  Person as PersonIcon,
  CheckCircle as CompletedIcon,
  Cancel as CancelledIcon,
  Paid as PaidIcon,
  HourglassTop as PendingIcon
} from '@mui/icons-material';
import { CheckCircleIcon } from 'lucide-react';

const getStatusIcon = (clinicalStatus, operationalStatus) => {
  if (clinicalStatus === 'concluído') return <CompletedIcon color="success" />;
  if (clinicalStatus === 'faltou') return <CancelledIcon color="error" />;
  if (operationalStatus === 'pago') return <PaidIcon color="success" />;
  return <PendingIcon color="info" />;
};

const getStatusLabel = (clinicalStatus, operationalStatus) => {
  if (clinicalStatus === 'em_andamento') return 'Em atendimento';
  if (clinicalStatus === 'concluído') return 'Atendimento concluído';
  if (clinicalStatus === 'faltou') return 'Paciente faltou';
  if (operationalStatus === 'cancelado') return 'Cancelado';
  if (operationalStatus === 'confirmado') return 'Confirmado';
  if (operationalStatus === 'pago') return 'Pagamento confirmado';
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
              {new Date(appointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
            <Chip 
              label={appointment.specialty} 
              size="small" 
              variant="outlined" 
            />
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
          
          {appointment.clinicalStatus === 'pendente' && (
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Tooltip title="Iniciar atendimento">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => onUpdateStatus('em_andamento')}
                >
                  <PersonIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
          
          {appointment.clinicalStatus === 'em_andamento' && (
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Tooltip title="Concluir atendimento">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => onUpdateStatus('concluído')}
                >
                  <CheckCircleIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Paciente faltou">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => onUpdateStatus('faltou')}
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