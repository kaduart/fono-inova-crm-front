import { AlertTriangle, BookOpenText, CalendarCheck, CheckCircle, Clock4, Edit, XCircle } from "lucide-react";
import { ISession } from '../../utils/types/types';
import { formatDateToDMY } from "../../utils/dateFormat";

export interface SessionListItemProps {
    session: ISession;
    sessionNumber: number;
    onEdit: (session: ISession) => void;
    onUse: (session: ISession) => void;
}

export const SessionListItem = ({ session, sessionNumber, onEdit, onUse }: SessionListItemProps) => {
    const sessionDate = new Date(session.date);
    const isDateValid = !isNaN(sessionDate.getTime());
    console.log('session qeu vem do pai', session)
    console.log('sessionDate', sessionDate)
    console.log('isDateValid', isDateValid)

    const [dateStr, timeStr] = isDateValid
        ? [session.date, session.time]
        : ['--/--/----', '--:--'];


    console.log('dateStr', dateStr)
    console.log('timeStr', timeStr)

    const isOverdue = session.status === 'pending' && isDateValid && sessionDate < new Date();
    console.log('isOverdue', isOverdue)

    return (
        <li className={`p-3 mb-3 rounded-lg grid grid-cols-[1fr_auto] gap-4 items-center 
            ${getStatusColor(session.status, isOverdue)} group`}
        >
            <div className="mb-0 col-span-full flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    {session.isPaid === true && (
                        <CheckCircle className="text-green-600" size={18} />
                    )}&nbsp;
                    <span className="text-blue-600 font-semibold">
                        {sessionNumber}ª Sessão
                    </span>
                    <div className="text-sm text-gray-700 flex items-center gap-2 mb-1">

                        {/* Falta justificada (para canceladas) */}
                        {session.status === 'canceled' && (
                            <div className="text-xs text-red-500 mt-2 flex items-center gap-1">
                                <span>Falta justificada:</span>
                                <span className="font-medium text-gray-700">
                                    {session.confirmedAbsence ?
                                        <b>Sim</b> :
                                        <b>Não</b>
                                    }
                                </span>
                            </div>
                        )}

                    </div>
                    {isOverdue && (
                        <span className="text-red-500 text-sm">(Atrasada)</span>
                    )}
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(session);
                        }}
                        className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                        title="Atualizar sessão"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <hr className="w-full mt-0 border-gray-300" />

            <div className="col-span-full">
                <div className="flex justify-between items-center gap-2 text-sm">
                    <div className="flex justify-end items-center mt-2">
                        {isDateValid ? (
                            <>
                                <span className="font-medium">{formatDateToDMY(dateStr)}</span>
                                <span className="text-gray-400">&nbsp; às &nbsp;</span>
                                <span className="text-gray-600">{timeStr}</span>

                            </>
                        ) : (
                            <span className="text-gray-400">Data não informada</span>
                        )}
                    </div>
                    {/* Status e pagamento */}
                    <div className="flex justify-end items-center mt-2">
                        <StatusBadge status={session.status} isPaid={session.isPaid} />
                        {session.status === 'completed' && !session.isPaid && (
                            <div className="text-red-500 text-xs flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Pagamento Pendente</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {session.notes && (
                <div className="text-xs text-gray-500 mt-1 italic">
                    📌 Obs: {session.notes}
                </div>
            )}
        </li>
    );
};

// Função auxiliar para cores de fundo
const getStatusColor = (status: string, isOverdue: boolean) => {

    if (isOverdue) return 'bg-orange-50 hover:bg-orange-100';

    switch (status) {
        case 'scheduled': return 'bg-green-50 hover:bg-green-100';
        case 'completed': return 'bg-gray-50 hover:bg-gray-100';
        case 'pending': return 'bg-blue-50 hover:bg-blue-100';
        case 'canceled': return 'bg-red-50 hover:bg-red-100';
        default: return 'bg-gray-50 hover:bg-gray-100';
    }
};

const StatusBadge = ({ status, isPaid }: { status: string, isPaid: boolean }) => {
    type SessionStatus = 'completed' | 'pending' | 'canceled' | 'schedule';

    const statusConfig = {
        completed: {
            icon: <CalendarCheck className="w-4 h-4 text-green-600" />,
            text: 'Sessão Realizada',
            color: 'green'
        },
        pending: {
            icon: <BookOpenText className="w-4 h-4 text-blue-600" />,
            text: 'Disponível para agendamento',
            color: 'blue'
        },
        canceled: {
            icon: <XCircle className="w-4 h-4 text-red-600" />,
            text: 'Cancelada',
            color: 'red'
        },
        schedule: {
            icon: <Clock4 className="w-4 h-4 text-red-600" />,
            text: 'Agendada',
            color: 'blue'
        },
    }[status as SessionStatus];

    return (
        <div className={`flex items-center gap-1 text-${statusConfig?.color}-600`}>
            {statusConfig?.icon}
            <span className="text-xs font-medium">{statusConfig?.text}</span>
            {status === 'completed' && !isPaid && (
                <span className="text-red-500 text-xs ml-1">(Não Pago)</span>
            )}
        </div>

    );
};
