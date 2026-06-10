// src/components/appointments/AppointmentList.tsx
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { AppointmentDTO } from '../../dtos/appointment.response.dto';
import { Button } from '../ui/Button';
import { getAppointmentVisualStatus } from '../../utils/statusHelper';

interface AppointmentListProps {
    appointments: AppointmentDTO[];
    onUpdateStatus: (appointmentId: string, status: string) => void;
    onPatientClick?: (patient: any) => void;
    compact?: boolean;
}

function isLiminarSession(apt: AppointmentDTO): boolean {
    return (apt.raw?.serviceType === 'liminar_session')
        || (apt.raw?.billingType === 'liminar')
        || (apt.patientJourneyType === 'continuous_treatment');
}

interface LiminarGroup {
    key: string;
    representative: AppointmentDTO;
    count: number;
    nextTime?: string;
    nextDate?: string;
}

function groupLiminarSessions(apts: AppointmentDTO[]): LiminarGroup[] {
    const map = new Map<string, AppointmentDTO[]>();
    for (const apt of apts) {
        const patientId = apt.patient?.id || apt.patient?.raw?._id || 'unknown';
        const specialty = apt.specialty || apt.raw?.specialty || 'geral';
        const key = `${patientId}::${specialty}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(apt);
    }
    return Array.from(map.entries()).map(([key, group]) => {
        // Ordena por data+hora para pegar o próximo
        const sorted = [...group].sort((a, b) => {
            const da = `${a.date || ''}${a.time || ''}`;
            const db = `${b.date || ''}${b.time || ''}`;
            return da.localeCompare(db);
        });
        const next = sorted[0];
        return { key, representative: next, count: group.length, nextTime: next.time, nextDate: next.date };
    });
}

export default function AppointmentList({
    appointments,
    onUpdateStatus,
    onPatientClick,
    compact = false
}: AppointmentListProps) {
    const appointmentsList = appointments ?? [];

    if (appointmentsList.length === 0) {
        return <p className="text-gray-500 text-center py-4">Nenhum agendamento encontrado</p>;
    }

    const regularApts = appointmentsList.filter(a => !isLiminarSession(a));
    const liminarApts = appointmentsList.filter(isLiminarSession);
    const liminarGroups = groupLiminarSessions(liminarApts);

    return (
        <div className="space-y-2">
            {/* Sessões regulares */}
            {regularApts.map((appointment, index) => (
                <div
                    key={appointment.id || appointment._id}
                    className={`
                        border-b border-gray-100 p-4
                        hover:bg-gradient-to-r hover:from-green-50 hover:to-cyan-50
                        transition-all duration-200
                        cursor-pointer group
                        ${index === 0 && liminarGroups.length === 0 ? 'rounded-t-lg' : ''}
                        ${index === regularApts.length - 1 && liminarGroups.length === 0 ? 'rounded-b-lg border-b-0' : ''}
                    `}
                    onClick={() => onPatientClick?.(appointment.patient)}
                >
                    <div className="flex justify-between items-center">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <h3 className="font-semibold text-gray-900 text-base group-hover:text-green-600 transition-colors">
                                    {appointment.patient?.fullName || appointment.patient?.name || appointment.patientInfo?.fullName || 'Desconhecido'}
                                </h3>
                                {(() => {
                                    const visualStatus = getAppointmentVisualStatus(
                                        appointment.operationalStatus,
                                        appointment.clinicalStatus
                                    );
                                    return (
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${visualStatus.color}`}>
                                            {visualStatus.label}
                                        </span>
                                    );
                                })()}
                                {(appointment.patientJourneyType === 'new_patient' || (!appointment.patientJourneyType && appointment.isFirstVisit)) && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                        Novo Paciente
                                    </span>
                                )}
                                {appointment.patientJourneyType === 'new_specialty' && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 border border-violet-200">
                                        Nova Especialidade
                                    </span>
                                )}
                                {appointment.isReturningAfter45Days && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                                        Retorno 45+ dias
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                                <span className="font-medium">{new Date(appointment.date).toLocaleDateString('pt-BR')}</span>
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
                            {appointment.operationalStatus !== 'completed' &&
                             appointment.operationalStatus !== 'canceled' &&
                             appointment.clinicalStatus !== 'completed' && (
                                <>
                                    <Button variant="outline" size="sm"
                                        onClick={(e) => { e.stopPropagation(); onUpdateStatus(appointment.id || appointment._id, 'completed'); }}
                                        className="bg-white hover:bg-green-50 border-green-200 hover:border-green-400 text-green-700">
                                        <CheckCircle className="h-4 w-4 mr-1" />Concluir
                                    </Button>
                                    <Button variant="outline" size="sm"
                                        onClick={(e) => { e.stopPropagation(); onUpdateStatus(appointment.id || appointment._id, 'canceled'); }}
                                        className="bg-white hover:bg-red-50 border-red-200 hover:border-red-400 text-red-700">
                                        <XCircle className="h-4 w-4 mr-1" />Cancelar
                                    </Button>
                                </>
                            )}
                            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
                        </div>
                    </div>
                </div>
            ))}

            {/* Grupos de liminar — 1 card por paciente+especialidade */}
            {liminarGroups.map((group, index) => {
                const apt = group.representative;
                const patientName = apt.patient?.fullName || apt.patient?.name || apt.patientInfo?.fullName || 'Desconhecido';
                const specialty = apt.specialty || apt.raw?.specialty || '';
                return (
                    <div
                        key={group.key}
                        className={`
                            border-b border-orange-100 p-4 bg-orange-50
                            hover:bg-orange-100 transition-all duration-200 cursor-pointer group
                            ${index === liminarGroups.length - 1 ? 'rounded-b-lg border-b-0' : ''}
                        `}
                        onClick={() => onPatientClick?.(apt.patient)}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1 flex-wrap">
                                    <h3 className="font-semibold text-gray-900 text-base group-hover:text-orange-700 transition-colors">
                                        {patientName}
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                                        ⚖️ Liminar
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                        {group.count} {group.count === 1 ? 'sessão' : 'sessões'}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                    {specialty && <span className="font-medium uppercase text-xs text-orange-600">{specialty}</span>}
                                    {specialty && <span className="text-gray-400">•</span>}
                                    <span className="text-gray-500">Próxima: <span className="font-semibold">{group.nextTime}</span></span>
                                    {group.nextDate && (
                                        <>
                                            <span className="text-gray-400">•</span>
                                            <span className="text-gray-500">{new Date(group.nextDate).toLocaleDateString('pt-BR')}</span>
                                        </>
                                    )}
                                </p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-orange-300 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}