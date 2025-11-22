// src/components/appointments/AppointmentList.tsx
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { Appointment } from '../../utils/types';
import { Button } from '../ui/Button';

interface AppointmentListProps {
    appointments: Appointment[];
    onUpdateStatus: (appointmentId: string, status: string) => void;
    onPatientClick?: (patient: any) => void;
    compact?: boolean;
}

export default function AppointmentList({ 
    appointments, 
    onUpdateStatus,
    onPatientClick,
    compact = false
}: AppointmentListProps) {
    if (appointments.length === 0) {
        return <p className="text-gray-500 text-center py-4">Nenhum agendamento encontrado</p>;
    }
    
    return (
        <div className="space-y-2">
            {appointments.map((appointment, index) => (
                <div 
                    key={appointment._id} 
                    className={`
                        border-b border-gray-100 p-4 
                        hover:bg-gradient-to-r hover:from-green-50 hover:to-cyan-50 
                        transition-all duration-200 
                        cursor-pointer
                        group
                        ${index === 0 ? 'rounded-t-lg' : ''}
                        ${index === appointments.length - 1 ? 'rounded-b-lg border-b-0' : ''}
                    `}
                    onClick={() => onPatientClick?.(appointment.patient)}
                >
                    <div className="flex justify-between items-center">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-semibold text-gray-900 text-base group-hover:text-green-600 transition-colors">
                                    {appointment.patient.fullName}
                                </h3>
                                <span className={`
                                    px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                                    ${appointment.status === 'confirmed'
                                        ? 'bg-green-100 text-green-800'
                                        : appointment.status === 'canceled'
                                            ? 'bg-red-100 text-red-800'
                                            : appointment.status === 'completed'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                    }
                                `}>
                                    {appointment.status === 'confirmed' && 'Confirmado'}
                                    {appointment.status === 'canceled' && 'Cancelado'}
                                    {appointment.status === 'completed' && 'Concluído'}
                                    {appointment.status === 'scheduled' && 'Agendado'}
                                </span>
                            </div>
                            
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                                <span className="font-medium">
                                    {new Date(appointment.date).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span className="font-medium">{appointment.time}</span>
                                {!compact && appointment.reason && (
                                    <>
                                        <span className="text-gray-400">•</span>
                                        <span className="text-gray-500">{appointment.reason}</span>
                                    </>
                                )}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            {appointment.status !== 'completed' && appointment.status !== 'canceled' && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onUpdateStatus(appointment._id, 'completed');
                                        }}
                                        className="bg-white hover:bg-green-50 border-green-200 hover:border-green-400 text-green-700"
                                    >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Concluir
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onUpdateStatus(appointment._id, 'canceled');
                                        }}
                                        className="bg-white hover:bg-red-50 border-red-200 hover:border-red-400 text-red-700"
                                    >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Cancelar
                                    </Button>
                                </>
                            )}
                            
                            <ArrowRight 
                                className="h-5 w-5 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" 
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}