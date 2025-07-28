import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Box, Paper, Typography } from '@mui/material';
import { ptBR } from "date-fns/locale";
import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import appointmentService, { OPERATIONAL_STATUS_CONFIG, StatusConfig } from '../../services/appointmentService';
import { mergeDateAndTime } from '../../utils/dateFormat';
import { IAppointment, IDoctor, IPatient, ScheduleAppointment, SelectedEvent } from '../../utils/types/types';
import ScheduleAppointmentModal from '../patients/ScheduleAppointmentModal';
import AppointmentDetailModal from './appointmentDetailModal';

interface EnhancedCalendarProps {
    appointments: IAppointment[];
    doctors: IDoctor[];
    patients: IPatient[];
    onDateClick: (arg: DateClickArg) => void;
    onNewAppointment: (data: IAppointment) => Promise<void>;
    onCancelAppointment: (id: string, reason: string) => Promise<void>;
    onCompleteAppointment: (id: string) => Promise<void>;
    onEditAppointment: (id: string, data: any) => Promise<void>;
    onFetchAvailableSlots: (params: { doctorId: string; date: string }) => Promise<string[]>;
    statusConfig?: StatusConfig;
    openModalAppointment?: boolean;
    closeModalSignal?: number;
}

const EnhancedCalendar: React.FC<EnhancedCalendarProps> = ({
    appointments,
    doctors,
    patients,
    onDateClick,
    onNewAppointment,
    onCancelAppointment,
    onCompleteAppointment,
    onEditAppointment,
    openModalAppointment,
    closeModalSignal,
    onFetchAvailableSlots,
    statusConfig = OPERATIONAL_STATUS_CONFIG
}) => {
    const calendarRef = useRef<FullCalendar | null>(null);
    const [openSchedule, setOpenSchedule] = useState(false);
    const [appointmentData, setAppointmentData] = useState<IAppointment | null>(null);
    const [mode, setMode] = useState<'create' | 'edit'>('create');
    const [isAppointmentDetailModalOpen, setIsAppointmentDetailModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        patientId: '',
        doctorId: '',
        date: '',
        time: '',
        reason: '',
        status: 'agendado'
    });

    useEffect(() => {
        if (closeModalSignal && closeModalSignal > 0) {
            setOpenSchedule(false);
            setSelectedEvent(null); // Se necessário
            //setIsAppointmentDetailModalOpen(false); // Se necessário
        }
    }, [closeModalSignal]);

    useEffect(() => {
        console.log('Appointments updated:', appointments);
    }, [appointments])

    const getStatusConfig = (status: string) => {
        if (statusConfig[status]) return statusConfig[status];
        if (OPERATIONAL_STATUS_CONFIG[status]) return OPERATIONAL_STATUS_CONFIG[status];
        return {
            backgroundColor: '#CCCCCC',
            textColor: '#000000',
            label: status.charAt(0).toUpperCase() + status.slice(1)
        };
    };
console.log('appointments', appointments)

    const events = appointments?.map(appointment => {
        // Converter a string ISO para objeto Date
        const dateObj = new Date(appointment.date);

        // Extrair horas e minutos do campo time
        const [hours, minutes] = appointment.time.split(':').map(Number);

        // Criar data completa combinando date e time
        const startDate = new Date(
            dateObj.getFullYear(),
            dateObj.getMonth(),
            dateObj.getDate(),
            hours,
            minutes
        );
        // Calcular data de término
        const duration = appointment.duration || 60;
        const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

        const operationalStatus = appointment.operationalStatus || 'agendado';
        const config = getStatusConfig(operationalStatus);

        return {
            id: appointment._id || appointment.id,
            title: `${appointment.patient?.fullName || 'Paciente'} - ${appointment.doctor?.fullName || 'Profissional'}`,
            start: startDate,  // Objeto Date unificado
            end: endDate,      // Objeto Date unificado
            extendedProps: {
                patient: appointment.patient,
                doctor: appointment.doctor,
                operationalStatus,
                clinicalStatus: appointment.clinicalStatus || 'pendente',
                reason: appointment.reason || '',
                specialty: appointment.specialty || '',
                duration: appointment.duration || 60
            },
            backgroundColor: config.backgroundColor,
            borderColor: config.backgroundColor,
            textColor: config.textColor,
        };
    });

    const handlePayloadToSlots = async (data: { doctorId: string; date: string }) => {
        setFormData(prev => ({ ...prev, ...data }));
        if (data.doctorId && data.date) {
            const slots = await onFetchAvailableSlots(data);
            setAvailableSlots(slots);
        }
    };
    const handleEventClick = (info: { event: any }) => {
        const { event } = info;
        const formattedDate = event.start
            ? new Intl.DateTimeFormat("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }).format(new Date(event.start))
            : "";
        const time = `${String(event.start.getHours()).padStart(2, '0')}:${String(event.start.getMinutes()).padStart(2, '0')}`;
        const extendedProps = event.extendedProps;
        setSelectedEvent({
            id: event.id,
            patient: {
                id: extendedProps.patient?._id || extendedProps.patient?.id || '',
                fullName: extendedProps.patient?.fullName || "Paciente não informado"
            },
            doctor: {
                id: extendedProps.doctor?._id || extendedProps.doctor?.id || '',
                fullName: extendedProps.doctor?.fullName || "Profissional não informado"
            },
            date: event.start ? new Date(event.start) : null,
            startTime: time,
            operationalStatus: extendedProps.operationalStatus || "agendado",
            clinicalStatus: extendedProps.clinicalStatus || "pendente",
            formattedDate,
            backgroundColor: event.backgroundColor,
            borderColor: event.borderColor,
            start: formattedDate,
            reason: extendedProps.reason || ""
        });

        setIsAppointmentDetailModalOpen(true);
    };

    const handleBooking = async (payload: ScheduleAppointment) => {

        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Usuário não autenticado. Por favor, faça login novamente.');
            return;
        }
        const mergedDate = mergeDateAndTime(payload.date, payload.time);
        if (isNaN(mergedDate.getTime())) {
            toast.error('Data/hora inválida');
            return;
        }
        payload.specialty = payload.sessionType;
        try {
            await appointmentService.create({
                ...payload,
                date: mergedDate.toISOString(),
                specialty: payload.sessionType
            });

            if (calendarRef.current) {
                calendarRef.current.getApi().refetchEvents();
            }


            toast.success('Sessão agendada e pagamento registrado com sucesso!');
            // setdataUpdateSlots(payload);
            setOpenSchedule(false);


        } catch (err: any) {
            toast.error(err.response.data.error || 'Erro ao agendar sessão');
        }
    };

    const handleOpenSchedule = (appointment: IAppointment | null = null, modeType: 'create' | 'edit' = 'create') => {
        setAppointmentData(appointment);
        setMode(modeType);
        setOpenSchedule(true);
    };

    return (
        <Box sx={{ p: 3 }}>
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h1 className="text-2xl font-bold text-gray-800">Calendário de Agendamentos</h1>
                    <button
                        onClick={() => handleOpenSchedule(null, 'create')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={16} />
                        Novo Agendamento
                    </button>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        headerToolbar={{
                            left: "prev,next today",
                            center: "title",
                            right: "dayGridMonth,timeGridWeek,timeGridDay",
                        }}
                        locale={ptBR}
                        initialView="dayGridMonth"
                        weekends
                        events={events}
                        dateClick={onDateClick}
                        eventClick={handleEventClick}
                        height="auto"
                        eventDisplay="block"
                        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                        eventContent={(arg) => {
                            // Obter o status operacional do evento
                            const status = arg.event.extendedProps.operationalStatus || 'agendado';
                            const config = getStatusConfig(status);

                            return (
                                <div
                                    className="flex flex-col p-1 rounded"
                                    style={{
                                        backgroundColor: config.backgroundColor,
                                        color: config.textColor,
                                        borderLeft: `3px solid ${config.backgroundColor}`
                                    }}
                                >
                                    <span className="text-xs font-medium">
                                        {arg.timeText}
                                    </span>
                                    <span className="text-sm font-semibold truncate">
                                        {arg.event.title.split(' - ')[0]}
                                    </span>
                                    <span className="text-xs truncate">
                                        {arg.event.title.split(' - ')[1]}
                                    </span>
                                    <span className="text-xxs mt-1 font-semibold">
                                        {config.label}
                                    </span>
                                </div>
                            );
                        }}
                        dayHeaderContent={(arg) => (
                            <span className="text-sm font-medium text-gray-600">
                                {arg.text.substring(0, 3)}
                            </span>
                        )}
                        dayCellContent={(arg) => (
                            <div className="flex justify-end p-1">
                                <span className={`text-sm ${arg.isToday ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                                    {arg.dayNumberText}
                                </span>
                            </div>
                        )}
                        eventClassNames="cursor-pointer"
                    />
                </div>
            </div>

            {/*     <ScheduleModal
                open={openSchedule}
                onClose={() => setOpenSchedule(false)}
                onSave={onNewAppointment}
                patients={patients}
                doctors={doctors}
                initialData={appointmentData}
                payloadToSlots={handlePayloadToSlots}
                availableSlots={availableSlots}
                mode={mode}
            /> */}

            <ScheduleAppointmentModal
                isOpen={openSchedule}
                initialData={null}
                doctors={doctors}
                patients={patients}
                //loading={false}
                // onSubmit={handleCloseScheduleModal}
                onClose={() => setOpenSchedule(false)}
                onSave={(appointment) => {
                    handleBooking(appointment);
                }
                }

            />


            <AppointmentDetailModal
                isOpen={isAppointmentDetailModalOpen}
                onClose={() => setIsAppointmentDetailModalOpen(false)}
                onCancelAppointment={onCancelAppointment}
                onCompleteAppointment={onCompleteAppointment}
                onEditAppointment={onEditAppointment}
                event={selectedEvent}
                doctors={doctors}
                patients={patients}
            /*   handleEditAppointment={(data) => {
                  if (selectedEvent?.id) {
                      onEditAppointment(selectedEvent.id, data);
                  }
              }} */
            />

            <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
                <Typography variant="h6" gutterBottom>Legenda</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {Object.entries(statusConfig).map(([status, config]) => (
                        <Box key={status} sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{
                                width: 16,
                                height: 16,
                                backgroundColor: config.backgroundColor,
                                mr: 1
                            }} />
                            <Typography variant="body2">{config.label}</Typography>
                        </Box>
                    ))}
                </Box>
            </Paper>
        </Box>
    );
};

export default EnhancedCalendar;