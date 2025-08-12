// src/pages/doctor/components/TodayAppointmentsCard.tsx
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import AppointmentList from '../appointments/AppointmentList';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';

export default function TodayAppointmentsCard({
    appointments,
    showAll,
    onToggleShow,
    onUpdateStatus
}: {
    appointments: any[];
    showAll: boolean;
    onToggleShow: () => void;
    onUpdateStatus: (id: string, status: string) => void;
}) {
    const displayedAppointments = showAll ? appointments : appointments.slice(0, 3);

    return (
        <Card className="h-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="h-5 w-5" />
                        <span className="font-medium">Agendamentos de Hoje</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleShow}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        {showAll ? 'Mostrar menos' : 'Ver todas'}
                        {showAll ? (
                            <ChevronUp className="h-4 w-4 ml-1" />
                        ) : (
                            <ChevronDown className="h-4 w-4 ml-1" />
                        )}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {appointments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        Nenhum agendamento para hoje
                    </div>
                ) : (
                    <AppointmentList
                        appointments={displayedAppointments}
                        onUpdateStatus={onUpdateStatus}
                        compact={!showAll}
                    />
                )}
            </CardContent>
        </Card>
    );
}