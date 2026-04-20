// src/components/doctor/TodayAppointmentsCard.tsx
import {
    Box,
    Button,
    Card,
    CardContent,
    CardHeader,
    Typography,
    useTheme
} from '@mui/material';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import AppointmentList from '../appointments/AppointmentList';
import { mapAppointmentListResponseDTO } from '../../dtos/appointment.response.dto';

export default function TodayAppointmentsCard({
    appointments,
    showAll,
    onToggleShow,
    onUpdateStatus,
    onPatientClick // ✅ NOVO
}: {
    appointments: any[];
    showAll: boolean;
    onToggleShow: () => void;
    onUpdateStatus: (id: string, status: string) => void;
    onPatientClick?: (patient: any) => void; // ✅ NOVO
}) {
    const theme = useTheme();
    const appointmentsList = mapAppointmentListResponseDTO(appointments ?? []);
    const displayedAppointments = showAll ? appointmentsList : appointmentsList.slice(0, 3);

    return (
        <Card
            sx={{
                height: '100%',
                borderRadius: 3,
                border: `1px solid ${theme.palette.divider}`,
                background: 'white',
                transition: 'all 0.3s ease',
                '&:hover': {
                    boxShadow: theme.shadows[4],
                }
            }}
        >
            <CardHeader
                sx={{
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    background: `linear-gradient(135deg, ${theme.palette.primary.light}10, ${theme.palette.secondary.light}05)`
                }}
                title={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'between', width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                            <Calendar
                                size={20}
                                color={theme.palette.primary.main}
                            />
                            <Typography variant="h6" sx={{ fontWeight: 600, color: 'grey.800' }}>
                                Agendamentos de Hoje
                            </Typography>
                        </Box>
                        <Button
                            variant="text"
                            size="small"
                            onClick={onToggleShow}
                            endIcon={showAll ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            sx={{
                                color: 'grey.600',
                                fontWeight: 500,
                                '&:hover': {
                                    backgroundColor: 'rgba(0,0,0,0.04)',
                                    color: 'grey.800'
                                }
                            }}
                        >
                            {showAll ? 'Mostrar menos' : 'Ver todas'}
                        </Button>
                    </Box>
                }
            />
            <CardContent sx={{ p: 0 }}>
                {appointments?.length === 0 ? (
                    <Box sx={{
                        textAlign: 'center',
                        py: 6,
                        color: 'grey.500',
                        borderBottom: `1px solid ${theme.palette.divider}`
                    }}>
                        <Calendar size={48} color={theme.palette.grey[400]} style={{ marginBottom: '16px' }} />
                        <Typography variant="body1" sx={{ mb: 1 }}>
                            Nenhum agendamento para hoje
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'grey.600' }}>
                            Todos os compromissos aparecerão aqui
                        </Typography>
                    </Box>
                ) : (
                    <AppointmentList
                        appointments={displayedAppointments}
                        onUpdateStatus={onUpdateStatus}
                        onPatientClick={onPatientClick} // ✅ PASSAR CALLBACK
                        compact={!showAll}
                    />
                )}
            </CardContent>
        </Card>
    );
}