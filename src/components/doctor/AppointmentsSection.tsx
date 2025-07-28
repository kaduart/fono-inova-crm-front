import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
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
    futureAppointments: Appointment[];
}

const AppointmentsSection: React.FC<AppointmentsSectionProps> = ({ futureAppointments }) => {
    const calendarRef = useRef<FullCalendar>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Converter os agendamentos para eventos do FullCalendar
    const events = futureAppointments?.map(app => ({
        id: app._id,
        title: app.patient.fullName,
        start: app.date,
        end: new Date(new Date(app.date).getTime() + 30 * 60000).toISOString(), // 30 minutos de duração
        extendedProps: {
            appointment: app
        }
    }));

    // Função para lidar com clique em evento
    const handleEventClick = (arg: any) => {
        setSelectedAppointment(arg.event.extendedProps.appointment);
        setIsModalOpen(true);
    };
    // Funções de formatação
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
        switch (status.toLowerCase()) {
            case 'agendado':
                return 'bg-yellow-100 text-yellow-800';
            case 'confirmado':
                return 'bg-blue-100 text-blue-800';
            case 'concluído':
                return 'bg-green-100 text-green-800';
            case 'cancelado':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
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
                eventClick={handleEventClick}
                height="auto"
                eventDisplay="block"
                eventTimeFormat={{
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }}
                eventContent={(arg) => (
                    <div className="flex flex-col p-1">
                        <span className="text-xs font-medium text-gray-800">
                            {arg.timeText}
                        </span>
                        <span className="text-sm font-semibold truncate">
                            {arg.event.title}
                        </span>
                    </div>
                )}
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

            {/* Modal de detalhes do agendamento */}
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
                            {/* Cabeçalho */}
                            <div className="flex flex-col md:flex-row gap-6 mb-6">
                                <div className="flex items-center justify-center bg-gray-100 rounded-lg w-16 h-16">
                                    <User size={32} className="text-gray-600" />
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">
                                        {selectedAppointment.patient.fullName}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(selectedAppointment.status)}`}>
                                            {selectedAppointment.status}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(selectedAppointment.clinicalStatus)}`}>
                                            Clínico: {selectedAppointment.clinicalStatus}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusClass(selectedAppointment.operationalStatus)}`}>
                                            Operacional: {selectedAppointment.operationalStatus}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Data e horário */}
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

                            {/* Informações do paciente */}
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

                            {/* ID do agendamento */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-sm text-gray-600 mb-1">ID do Agendamento</p>
                                <p className="font-mono text-gray-800 break-all">
                                    {selectedAppointment._id}
                                </p>
                            </div>
                        </div>

                        {/* Rodapé */}
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
        </div>
    );
};

export default AppointmentsSection;