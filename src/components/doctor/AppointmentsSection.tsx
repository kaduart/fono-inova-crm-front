import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { Box, Paper, Typography } from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from "date-fns/locale";
import { Calendar, ClipboardCheck, Mail, MapPin, Phone, User, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface Patient {
    _id: string;
    fullName: string;
    dateOfBirth?: string;
    gender?: string;
    phone?: string;
    email?: string;
    address?: {
        street?: string;
        number?: string;
        district?: string;
        city?: string;
        state?: string;
        zipCode?: string;
    };
    healthPlan?: {
        name?: string;
        policyNumber?: string;
    };
    appointments?: any[];
}

interface Appointment {
    _id: string;
    date: string;
    time: string;
    status: string;
    clinicalStatus: string;
    operationalStatus: string;
    patient: Patient;
}

interface AppointmentsSectionProps {
    patients: Patient[];
}

const statusConfig = {
    agendado: { backgroundColor: '#6366f1', textColor: '#ffffff', label: 'Agendado' },
    confirmado: { backgroundColor: '#3b82f6', textColor: '#ffffff', label: 'Confirmado' },
    concluído: { backgroundColor: '#10b981', textColor: '#ffffff', label: 'Concluído' },
    cancelado: { backgroundColor: '#ef4444', textColor: '#ffffff', label: 'Cancelado' },
    pendente: { backgroundColor: '#f59e0b', textColor: '#ffffff', label: 'Pendente' }
};

const getStatusConfig = (status: string) => {
    const lowerStatus = status.toLowerCase();
    return statusConfig[lowerStatus] || statusConfig.pendente;
};


const AppointmentsSection: React.FC<AppointmentsSectionProps> = ({ patients }) => {
    const calendarRef = useRef<FullCalendar>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Função para transformar pacientes e agendamentos em eventos
    const transformPatientsToEvents = (patientsData: Patient[]) => {
        const events = [];

        patientsData.forEach(patient => {
            patient.appointments?.forEach(appointmentId => {
                // Mock dos dados do agendamento - substitua por dados reais
                const appointment = {
                    _id: appointmentId,
                    date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Data aleatória nos próximos 30 dias
                    time: `${Math.floor(Math.random() * 12) + 8}:${Math.random() > 0.5 ? '00' : '30'}`, // Hora aleatória
                    status: ['agendado', 'confirmado', 'concluído', 'cancelado'][Math.floor(Math.random() * 4)],
                    clinicalStatus: ['pendente', 'avaliado', 'tratado'][Math.floor(Math.random() * 3)],
                    operationalStatus: ['pendente', 'confirmado', 'cancelado'][Math.floor(Math.random() * 3)],
                    patient: patient
                };

                events.push({
                    id: appointment._id,
                    title: `${patient.fullName} - ${appointment.time}`,
                    start: appointment.date,
                    end: new Date(new Date(appointment.date).getTime() + 30 * 60000).toISOString(),
                    extendedProps: {
                        appointment,
                        operationalStatus: appointment.operationalStatus
                    }
                });
            });
        });

        return events;
    };

    const events = transformPatientsToEvents(patients);

    const handleEventClick = (arg: any) => {
        setSelectedAppointment(arg.event.extendedProps.appointment);
        setIsModalOpen(true);
    };

    const formatFullDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        } catch {
            return 'Data inválida';
        }
    };

    const formatAddress = (address: any) => {
        if (!address) return 'Endereço não informado';

        const parts = [
            address.street,
            address.number,
            address.district,
            address.city,
            address.state,
            address.zipCode
        ].filter(Boolean);

        return parts.join(', ') || 'Endereço incompleto';
    };

    const getStatusClass = (status: string) => {
        const config = getStatusConfig(status);
        return {
            backgroundColor: config.backgroundColor, // cor sólida
            color: config.textColor,
            borderLeft: `3px solid ${config.backgroundColor}`,
            fontWeight: 600,
            boxShadow: `0 0 6px ${config.backgroundColor}55` // leve brilho
        };
    };


    return (
        <Box sx={{ p: 3 }}>
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        headerToolbar={{
                            left: "prev,next today",
                            center: "title",
                            right: "dayGridMonth,timeGridWeek,timeGridDay"
                        }}
                        locale={ptBR}
                        initialView="dayGridMonth"
                        weekends
                        events={events}
                        eventClick={handleEventClick}
                        height="75vh"
                        contentHeight="auto"
                        aspectRatio={1.8}
                        eventContent={(arg) => {
                            const status = arg.event.extendedProps.operationalStatus || 'agendado';
                            const config = getStatusConfig(status);

                            return (
                                <div className={`flex flex-col p-2 rounded-lg border-l-[3px] transition-all duration-200 hover:shadow-xs`}
                                    style={{
                                        backgroundColor: `${config.backgroundColor}10`,
                                        borderLeftColor: config.backgroundColor,
                                        color: config.textColor,
                                        backdropFilter: 'blur(2px)'
                                    }}>
                                    <div className="flex items-start gap-2">
                                        <span className="text-xs font-medium flex-shrink-0 bg-white/30 px-1 rounded">
                                            {arg.timeText}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate leading-tight">
                                                {arg.event.title.split(' - ')[0]}
                                            </p>
                                            <p className="text-xs truncate opacity-80 leading-tight">
                                                {arg.event.title.split(' - ')[1]}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[0.65rem] mt-1 font-medium px-2 py-0.5 rounded-full self-start shadow-xs"
                                        style={{
                                            backgroundColor: config.backgroundColor,
                                            color: 'white',
                                            boxShadow: `0 1px 2px ${config.backgroundColor}50`
                                        }}>
                                        {config.label}
                                    </span>
                                </div>
                            );
                        }}
                        dayHeaderContent={(arg) => (
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                {arg.text.substring(0, 3)}
                            </span>
                        )}
                        dayCellContent={(arg) => (
                            <div className="flex justify-end p-1">
                                <span className={`text-sm rounded-full w-7 h-7 flex items-center justify-center transition-all ${arg.isToday
                                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold shadow-sm'
                                    : 'text-gray-700 hover:bg-gray-100'
                                    }`}>
                                    {arg.dayNumberText}
                                </span>
                            </div>
                        )}
                        eventClassNames="cursor-pointer hover:!opacity-90 transition-all duration-200"
                        dayCellClassNames="hover:bg-gray-50/50 transition-colors duration-200"
                        dayMaxEventRows={4}
                        eventDisplay="block"
                        eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                    />
                </div>
            </div>

            {/* Modal de detalhes */}
            {isModalOpen && selectedAppointment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white z-10 p-4 border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">
                                Detalhes do Agendamento
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="flex flex-col md:flex-row gap-6 mb-6">
                                <div className="flex items-center justify-center bg-gray-100 rounded-lg w-16 h-16">
                                    <User size={32} className="text-gray-600" />
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">
                                        {selectedAppointment.patient.fullName}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="px-3 py-1 rounded-full text-sm font-medium" style={getStatusClass(selectedAppointment.status)}>
                                            {selectedAppointment.status}
                                        </span>
                                        <div>
                                            Clínico:
                                            <span className="px-3 py-1 rounded-full text-sm font-medium" style={getStatusClass(selectedAppointment.clinicalStatus)}>
                                                {selectedAppointment.clinicalStatus}
                                            </span>
                                        </div>
                                        <div>
                                            Operacional:
                                            <span className="px-3 py-1 rounded-full text-sm font-medium" style={getStatusClass(selectedAppointment.operationalStatus)}>
                                                {selectedAppointment.operationalStatus}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 rounded-lg p-4 mb-6">
                                <div className="flex items-center">
                                    <Calendar className="text-blue-600 mr-3" size={20} />
                                    <div>
                                        <p className="text-sm text-blue-700 font-medium">
                                            Data e Horário
                                        </p>
                                        <p className="text-lg font-semibold text-blue-800">
                                            {formatFullDate(selectedAppointment.date)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h4 className="text-md font-semibold text-gray-700 mb-3">
                                        Informações do Paciente
                                    </h4>

                                    <div className="space-y-4">
                                        {selectedAppointment.patient.phone && (
                                            <div className="flex items-start">
                                                <Phone className="text-gray-500 mt-0.5 mr-3" size={18} />
                                                <div>
                                                    <p className="text-sm text-gray-500">Telefone</p>
                                                    <p className="font-medium">{selectedAppointment.patient.phone}</p>
                                                </div>
                                            </div>
                                        )}

                                        {selectedAppointment.patient.email && (
                                            <div className="flex items-start">
                                                <Mail className="text-gray-500 mt-0.5 mr-3" size={18} />
                                                <div>
                                                    <p className="text-sm text-gray-500">Email</p>
                                                    <p className="font-medium">{selectedAppointment.patient.email}</p>
                                                </div>
                                            </div>
                                        )}

                                        {selectedAppointment.patient.dateOfBirth && (
                                            <div className="flex items-start">
                                                <Calendar className="text-gray-500 mt-0.5 mr-3" size={18} />
                                                <div>
                                                    <p className="text-sm text-gray-500">Nascimento</p>
                                                    <p className="font-medium">
                                                        {format(new Date(selectedAppointment.patient.dateOfBirth), 'dd/MM/yyyy')}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-md font-semibold text-gray-700 mb-3">
                                        Endereço
                                    </h4>

                                    {selectedAppointment.patient.address ? (
                                        <div className="flex items-start">
                                            <MapPin className="text-gray-500 mt-0.5 mr-3" size={18} />
                                            <div>
                                                <p className="font-medium">
                                                    {formatAddress(selectedAppointment.patient.address)}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic">Endereço não informado</p>
                                    )}

                                    <h4 className="text-md font-semibold text-gray-700 mt-6 mb-3">
                                        Plano de Saúde
                                    </h4>

                                    {selectedAppointment.patient.healthPlan?.name ? (
                                        <div>
                                            <p className="font-medium">
                                                {selectedAppointment.patient.healthPlan.name}
                                            </p>
                                            {selectedAppointment.patient.healthPlan.policyNumber && (
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Nº: {selectedAppointment.patient.healthPlan.policyNumber}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic">Plano não informado</p>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-sm text-gray-600 mb-1">ID do Agendamento</p>
                                <p className="font-mono text-gray-800 break-all">
                                    {selectedAppointment._id}
                                </p>
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-white border-t p-4 flex justify-end space-x-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Fechar
                            </button>
                            <button
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                            >
                                <ClipboardCheck className="mr-2" size={18} />
                                Marcar como Concluído
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
                <Typography variant="h6" gutterBottom>Legenda</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {Object.entries(statusConfig).map(([status, config]) => (
                        <Box key={status} sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{
                                width: 16,
                                height: 16,
                                backgroundColor: config.backgroundColor,
                                mr: 1,
                                borderRadius: '4px'
                            }} />
                            <Typography variant="body2">{config.label}</Typography>
                        </Box>
                    ))}
                </Box>
            </Paper>
        </Box>
    );
};

export default AppointmentsSection;