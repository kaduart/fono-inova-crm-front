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
    calendarEvents: any[];
}

const AppointmentsSection: React.FC<AppointmentsSectionProps> = ({ calendarEvents }) => {
    const calendarRef = useRef<FullCalendar>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleEventClick = (arg: any) => {
        setSelectedAppointment(arg.event.extendedProps);
        setIsModalOpen(true);
    };

    const formatFullDate = (isoString: string) => {
        try {
            const date = new Date(isoString);
            return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        } catch {
            return 'Data/horário inválido';
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
        switch (status?.toLowerCase()) {
            case 'pending':
            case 'pendente':
                return 'bg-yellow-100 text-yellow-800';
            case 'in_progress':
            case 'em andamento':
                return 'bg-blue-100 text-blue-800';
            case 'completed':
            case 'concluído':
                return 'bg-green-100 text-green-800';
            case 'missed':
            case 'faltou':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-600';
        }
    };

    const formatStatus = (status: string) => {
        const statusMap: Record<string, string> = {
            'pending': 'Pendente',
            'in_progress': 'Em Andamento',
            'completed': 'Concluído',
            'missed': 'Faltou'
        };
        return statusMap[status] || status;
    };

    return (
        <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 via-green-500 to-cyan-500 p-4 sm:p-8">
                <div className="flex items-center gap-3">
                    <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                    <div>
                        <h2 className="text-xl sm:text-3xl font-bold text-white">Calendário de Agendamentos</h2>
                        <p className="text-green-100 text-sm mt-1">
                            Clique nos eventos para ver detalhes completos
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-2 sm:p-8">
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-gray-100 p-2 sm:p-6 shadow-inner">
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
                        events={calendarEvents}
                        eventClick={handleEventClick}
                        height="auto"
                        eventDisplay="block"
                        eventTimeFormat={{
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        }}
                        buttonText={{
                            today: 'Hoje',
                            month: 'Mês',
                            week: 'Semana',
                            day: 'Dia'
                        }}
                        eventContent={(arg) => (
                            <div className="flex flex-col p-2 cursor-pointer hover:opacity-90 transition-opacity">
                                <span className="text-xs font-bold text-white">
                                    {arg.timeText}
                                </span>
                                <span className="text-sm font-semibold truncate text-white">
                                    {arg.event.title}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold mt-1 w-fit ${getStatusClass(arg.event.extendedProps.clinicalStatus)}`}>
                                    {formatStatus(arg.event.extendedProps.clinicalStatus)}
                                </span>
                            </div>
                        )}
                        dayHeaderContent={(arg) => (
                            <span className="text-sm font-bold text-gray-700">
                                {arg.text}
                            </span>
                        )}
                        dayCellContent={(arg) => (
                            <div className="flex justify-end p-2">
                                <span className={`text-sm ${arg.isToday ? 'font-bold text-green-600' : 'text-gray-700'}`}>
                                    {arg.dayNumberText}
                                </span>
                            </div>
                        )}
                        eventClassNames="cursor-pointer"
                    />
                </div>
            </div>

            {isModalOpen && selectedAppointment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-cyan-500 z-10 p-6 rounded-t-3xl flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <Calendar className="h-6 w-6" />
                                Detalhes do Agendamento
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-white hover:bg-white hover:bg-opacity-20 rounded-xl p-2 transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8">
                            <div className="flex flex-col md:flex-row gap-6 mb-8">
                                <div className="flex items-center justify-center bg-gradient-to-br from-green-100 to-cyan-100 rounded-2xl w-20 h-20 shadow-lg">
                                    <User size={40} className="text-green-600" />
                                </div>

                                <div className="flex-1">
                                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                                        {selectedAppointment.patient?.fullName || 'Paciente não informado'}
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusClass(selectedAppointment.clinicalStatus)}`}>
                                            Status: {formatStatus(selectedAppointment.clinicalStatus)}
                                        </span>
                                        <span className="px-4 py-2 rounded-full text-sm font-bold bg-purple-100 text-purple-800">
                                            {selectedAppointment.specialty}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 mb-8 border-2 border-blue-200">
                                <div className="flex items-center">
                                    <Calendar className="text-blue-600 mr-4" size={24} />
                                    <div>
                                        <p className="text-sm text-blue-700 font-bold uppercase tracking-wide">
                                            Data e Horário
                                        </p>
                                        <p className="text-xl font-bold text-blue-900 mt-1">
                                            {formatFullDate(selectedAppointment.start)}
                                        </p>
                                        <p className="text-sm text-blue-700 mt-1 font-semibold">
                                            Duração: {selectedAppointment.duration || 40} minutos
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200">
                                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <User size={20} className="text-green-600" />
                                        Informações do Paciente
                                    </h4>

                                    <div className="space-y-4">
                                        {selectedAppointment.patient?.phone && (
                                            <div className="flex items-start">
                                                <Phone className="text-green-600 mt-1 mr-3" size={20} />
                                                <div>
                                                    <p className="text-xs text-gray-500 font-semibold uppercase">Telefone</p>
                                                    <p className="font-bold text-gray-900">{selectedAppointment.patient.phone}</p>
                                                </div>
                                            </div>
                                        )}

                                        {selectedAppointment.patient?.email && (
                                            <div className="flex items-start">
                                                <Mail className="text-green-600 mt-1 mr-3" size={20} />
                                                <div>
                                                    <p className="text-xs text-gray-500 font-semibold uppercase">Email</p>
                                                    <p className="font-bold text-gray-900">{selectedAppointment.patient.email}</p>
                                                </div>
                                            </div>
                                        )}

                                        {selectedAppointment.patient?.dateOfBirth && (
                                            <div className="flex items-start">
                                                <Calendar className="text-green-600 mt-1 mr-3" size={20} />
                                                <div>
                                                    <p className="text-xs text-gray-500 font-semibold uppercase">Nascimento</p>
                                                    <p className="font-bold text-gray-900">
                                                        {format(new Date(selectedAppointment.patient.dateOfBirth), 'dd/MM/yyyy')}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200">
                                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <MapPin size={20} className="text-cyan-600" />
                                        Localização & Plano
                                    </h4>

                                    {selectedAppointment.patient?.address ? (
                                        <div className="flex items-start mb-6">
                                            <MapPin className="text-cyan-600 mt-1 mr-3" size={20} />
                                            <div>
                                                <p className="text-xs text-gray-500 font-semibold uppercase">Endereço</p>
                                                <p className="font-bold text-gray-900">
                                                    {formatAddress(selectedAppointment.patient.address)}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic mb-6">Endereço não informado</p>
                                    )}

                                    {selectedAppointment.patient?.healthPlan?.name ? (
                                        <div>
                                            <p className="text-xs text-gray-500 font-semibold uppercase">Plano de Saúde</p>
                                            <p className="font-bold text-gray-900 mt-1">
                                                {selectedAppointment.patient.healthPlan.name}
                                            </p>
                                            {selectedAppointment.patient.healthPlan.policyNumber && (
                                                <p className="text-sm text-gray-600 mt-1 font-semibold">
                                                    Nº: {selectedAppointment.patient.healthPlan.policyNumber}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic">Plano não informado</p>
                                    )}
                                </div>
                            </div>

                            {selectedAppointment.reason && (
                                <div className="bg-amber-50 rounded-2xl p-6 mb-8 border-2 border-amber-200">
                                    <h4 className="text-lg font-bold text-amber-900 mb-3">
                                        Motivo da Consulta
                                    </h4>
                                    <p className="text-gray-900 font-medium">{selectedAppointment.reason}</p>
                                </div>
                            )}

                            <div className="bg-gray-100 rounded-2xl p-6">
                                <p className="text-xs text-gray-500 font-semibold uppercase mb-2">ID do Agendamento</p>
                                <p className="font-mono text-sm text-gray-800 break-all font-bold">
                                    {selectedAppointment.id}
                                </p>
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-white border-t-2 p-6 flex justify-end space-x-3 rounded-b-3xl">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-all"
                            >
                                Fechar
                            </button>
                            <button className="px-6 py-3 bg-gradient-to-r from-green-600 to-cyan-500 text-white rounded-xl font-bold hover:from-green-700 hover:to-cyan-600 shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                                <ClipboardCheck size={20} />
                                Marcar como Concluído
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .fc {
                    font-family: inherit;
                }
                
                .fc .fc-button-primary {
                    background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%) !important;
                    border: none !important;
                    border-radius: 0.75rem !important;
                    font-weight: 700 !important;
                    padding: 0.625rem 1.25rem !important;
                    transition: all 0.3s ease !important;
                }
                
                .fc .fc-button-primary:hover {
                    background: linear-gradient(135deg, #059669 0%, #0891b2 100%) !important;
                    transform: translateY(-2px) !important;
                    box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3) !important;
                }
                
                .fc .fc-button-primary:disabled {
                    background: #e5e7eb !important;
                    opacity: 0.5 !important;
                }
                
                .fc .fc-button-primary:not(:disabled):active,
                .fc .fc-button-primary:not(:disabled).fc-button-active {
                    background: linear-gradient(135deg, #047857 0%, #0e7490 100%) !important;
                }
                
                .fc-theme-standard td,
                .fc-theme-standard th {
                    border-color: #e5e7eb !important;
                }
                
                .fc .fc-daygrid-day-number {
                    font-weight: 700 !important;
                    color: #374151 !important;
                    padding: 0.5rem !important;
                }
                
                .fc .fc-daygrid-day.fc-day-today {
                    background: linear-gradient(135deg, #d1fae5 0%, #cffafe 100%) !important;
                }
                
                .fc .fc-col-header-cell {
                    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%) !important;
                    font-weight: 800 !important;
                    color: #1f2937 !important;
                    padding: 1rem 0.5rem !important;
                    border: none !important;
                }
                
                .fc-event {
                    border-radius: 0.75rem !important;
                    padding: 0.5rem !important;
                    font-weight: 700 !important;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
                    border: none !important;
                    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3) !important;
                }
                
                .fc-event:hover {
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5) !important;
                }
                
                .fc .fc-toolbar-title {
                    font-size: 1.75rem !important;
                    font-weight: 800 !important;
                    color: #1f2937 !important;
                }
                
                .fc-direction-ltr .fc-toolbar > * > :not(:first-child) {
                    margin-left: 0.75rem !important;
                }
            `}</style>
        </div>
    );
};

export default AppointmentsSection;