// src/components/appointments/AppointmentList.tsx
import { CheckCircle, XCircle } from 'lucide-react';
import { Appointment } from '../../utils/types';
import { Button } from '../ui/Button';

interface AppointmentListProps {
    appointments: Appointment[];
    onUpdateStatus: (appointmentId: string, status: string) => void;
}

export default function AppointmentList({ appointments, onUpdateStatus }: AppointmentListProps) {
    if (appointments.length === 0) {
        return <p className="text-gray-500 text-center py-4">Nenhum agendamento encontrado</p>;
    }

    return (
        <div className="space-y-4">
            {appointments.map(appointment => (
                <div key={appointment._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-medium">{appointment.patientId.fullName}</h3>
                            <p className="text-sm text-gray-500">
                                {new Date(appointment.date).toLocaleDateString('pt-BR')} às {appointment.time}
                            </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${appointment.status === 'confirmado'
                            ? 'bg-green-100 text-green-800'
                            : appointment.status === 'cancelado'
                                ? 'bg-red-100 text-red-800'
                                : appointment.status === 'concluído'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {appointment.status}
                        </span>
                    </div>
                    <p className="mt-2 text-sm">{appointment.reason}</p>

                    {appointment.status !== 'concluído' && appointment.status !== 'cancelado' && (
                        <div className="mt-4 flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onUpdateStatus(appointment._id, 'concluído')}
                            >
                                <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                                Concluirss
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onUpdateStatus(appointment._id, 'cancelado')}
                            >
                                <XCircle className="h-4 w-4 mr-1 text-red-500" />
                                Cancelar
                            </Button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}