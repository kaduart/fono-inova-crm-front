import { 
    AlertTriangle, 
    BookOpenText, 
    CalendarCheck, 
    Clock4, 
    Edit, 
    XCircle,
    DollarSign,
    FileText,
    Sparkles
} from "lucide-react";
import { formatDateToDMY } from "../../utils/dateFormat";
import { ISession } from '../../utils/types/types';
import { AppointmentOrigin } from './AppointmentOrigin';

export interface SessionListItemProps {
    session: ISession;
    sessionNumber: number;
    onEdit: (session: ISession) => void;
    onUse: (session: ISession) => void;
    // 🔥 NOVO: Props de seleção
    isSelected?: boolean;
    onToggleSelect?: () => void;
    canSelect?: boolean;
}

export const SessionListItem = ({ 
    session, 
    sessionNumber, 
    onEdit, 
    onUse,
    isSelected = false,
    onToggleSelect,
    canSelect = false
}: SessionListItemProps) => {
    const sessionDate = new Date(session.date);
    const isDateValid = !isNaN(sessionDate.getTime());

    // Normaliza para "YYYY-MM-DD" independente do formato recebido (ISO completo, Date object, etc.)
    const normalizedDate = isDateValid
        ? sessionDate.toISOString().split('T')[0]
        : null;

    const [dateStr, timeStr] = normalizedDate
        ? [normalizedDate, session.time]
        : ['--/--/----', '--:--'];

    const isOverdue = session.status === 'pending' && isDateValid && sessionDate < new Date();
    const isToday = isDateValid && sessionDate.toDateString() === new Date().toDateString();

    const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    const isCanceled = (session.status as string) === 'canceled' || (session.status as string) === 'cancelled';
    const dayMonth = isDateValid ? formatDateToDMY(dateStr).slice(0, 5) : '--/--';
    const year = isDateValid ? formatDateToDMY(dateStr).slice(6) : '';
    const accent = isToday ? 'border-l-emerald-500' : isOverdue ? 'border-l-orange-500' : getAccent(session.status, session.isPaid);

    return (
        <li
            className={`group flex items-start gap-3 rounded-xl border border-l-4 border-gray-200 bg-white p-3 transition-colors duration-quick hover:bg-gray-50 sm:items-center sm:gap-4 sm:p-3.5 ${accent} ${isSelected ? 'ring-2 ring-emerald-500/40' : ''}`}
        >
            {canSelect && onToggleSelect && (
                <label className="flex min-h-11 min-w-8 shrink-0 cursor-pointer items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={onToggleSelect}
                        aria-label={`Selecionar ${sessionNumber}ª sessão`}
                        className="h-4 w-4 cursor-pointer rounded text-emerald-600 focus:ring-emerald-500"
                    />
                </label>
            )}

            <div className="w-16 shrink-0 text-center sm:w-20">
                <p className="text-lg font-bold leading-none tabular-nums text-gray-900">{dayMonth}</p>
                <p className="mt-1 text-xs tabular-nums text-gray-500">{isDateValid ? `${timeStr} · ${year}` : 'Sem data'}</p>
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-gray-900">{sessionNumber}ª sessão</span>
                    <StatusBadge status={session.status} isPaid={session.isPaid} />
                    {isToday && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">Hoje</span>}
                    {isOverdue && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">Atrasada</span>}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                    <AppointmentOrigin appointment={session} />
                    {session.status === 'completed' && !session.isPaid && (
                        <span className="inline-flex items-center gap-1 font-medium text-red-700"><AlertTriangle className="h-3 w-3" /> Pagamento pendente</span>
                    )}
                    {isCanceled && (
                        <span className="inline-flex items-center gap-1 text-amber-700"><FileText className="h-3 w-3" /> Falta justificada: {session.confirmedAbsence ? 'sim' : 'não'}</span>
                    )}
                    {(session.paymentAmount ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 tabular-nums"><DollarSign className="h-3 w-3" /> {brl(session.paymentAmount ?? 0)}</span>
                    )}
                </div>
                {session.notes && <p className="mt-1.5 line-clamp-2 text-xs text-gray-500">{session.notes}</p>}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
                {session.status === 'pending' && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onUse(session); }}
                        className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors duration-quick hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        title="Usar sessão"
                        aria-label="Usar sessão"
                    >
                        <Sparkles className="h-4 w-4" />
                    </button>
                )}
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(session); }}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors duration-quick hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    title="Editar sessão"
                    aria-label="Editar sessão"
                >
                    <Edit className="h-4 w-4" />
                </button>
            </div>
        </li>
    );
};

const getAccent = (status: string, isPaid?: boolean) => {
    if (isPaid) return 'border-l-emerald-500';
    switch (status) {
        case 'completed': return 'border-l-emerald-500';
        case 'canceled':
        case 'cancelled': return 'border-l-red-400';
        case 'unpaid': return 'border-l-amber-400';
        case 'scheduled': return 'border-l-sky-400';
        case 'pending': return 'border-l-blue-400';
        default: return 'border-l-gray-300';
    }
};

const StatusBadge = ({ status, isPaid }: { status: string, isPaid?: boolean }) => {
    const statusConfig = {
        completed: {
            icon: <CalendarCheck className="h-3 w-3" />,
            text: 'Realizada',
            color: 'text-emerald-700 bg-emerald-100 border-emerald-200'
        },
        pending: {
            icon: <BookOpenText className="h-3 w-3" />,
            text: 'Disponível',
            color: 'text-blue-700 bg-blue-100 border-blue-200'
        },
        canceled: {
            icon: <XCircle className="h-3 w-3" />,
            text: 'Cancelada',
            color: 'text-red-700 bg-red-100 border-red-200'
        },
        cancelled: {
            icon: <XCircle className="h-3 w-3" />,
            text: 'Cancelada',
            color: 'text-red-700 bg-red-100 border-red-200'
        },
        unpaid: {
            icon: <Clock4 className="h-3 w-3" />,
            text: 'Pendente',
            color: 'text-amber-700 bg-amber-100 border-amber-200'
        },
        scheduled: {
            icon: <Clock4 className="h-3 w-3" />,
            text: 'Agendada',
            color: 'text-cyan-700 bg-cyan-100 border-cyan-200'
        },
    }[status] || {
        icon: <BookOpenText className="h-3 w-3" />,
        text: 'Indefinido',
        color: 'text-gray-700 bg-gray-100 border-gray-200'
    };

    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${statusConfig.color}`}>
            {statusConfig.icon}
            <span>{statusConfig.text}</span>
            {status === 'completed' && !isPaid && (
                <span className="ml-1 text-red-600">(não pago)</span>
            )}
        </div>
    );
};
