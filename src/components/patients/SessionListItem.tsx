import { 
    AlertTriangle, 
    BookOpenText, 
    CalendarCheck, 
    CheckCircle, 
    Clock4, 
    Edit, 
    XCircle,
    MoreVertical,
    DollarSign,
    FileText,
    Sparkles
} from "lucide-react";
import { formatDateToDMY } from "../../utils/dateFormat";
import { ISession } from '../../utils/types/types';
import { useState } from 'react';

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
    const [isHovered, setIsHovered] = useState(false);
    const sessionDate = new Date(session.date);
    const isDateValid = !isNaN(sessionDate.getTime());

    const [dateStr, timeStr] = isDateValid
        ? [session.date, session.time]
        : ['--/--/----', '--:--'];

    const isOverdue = session.status === 'pending' && isDateValid && sessionDate < new Date();
    const isToday = isDateValid && sessionDate.toDateString() === new Date().toDateString();

    return (
        <li 
            className={`relative p-4 mb-3 rounded-xl border-2 transition-all duration-300 group cursor-pointer
                ${getCardStyle(session.status, isOverdue, isToday)}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Efeito de brilho no hover */}
            {isHovered && (
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-green-500/5 rounded-xl" />
            )}

            {/* Header com número da sessão e ações */}
            <div className="flex justify-between items-start mb-3 relative z-10">
                <div className="flex items-center gap-3">
                    {/* 🔥 NOVO: Checkbox de seleção (só para sessões agendadas) */}
                    {canSelect && onToggleSelect && (
                        <label 
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-center cursor-pointer p-1 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    onToggleSelect();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                            />
                        </label>
                    )}

                    {/* Ícone de status com badge */}
                    <div className="relative">
                        <div className={`p-2 rounded-lg ${getIconBackground(session.status)}`}>
                            {getStatusIcon(session.status, session.isPaid)}
                        </div>
                        {session.isPaid && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                        )}
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-lg">
                                {sessionNumber}ª Sessão
                            </span>
                            {isToday && (
                                <span className="px-2 py-1 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-medium rounded-full">
                                    Hoje
                                </span>
                            )}
                            {isOverdue && (
                                <span className="px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-medium rounded-full">
                                    Atrasada
                                </span>
                            )}
                        </div>

                        {/* Status e informações de pagamento */}
                        <div className="flex items-center gap-3 mt-1">
                            <StatusBadge status={session.status} isPaid={session.isPaid} />
                            
                            {session.status === 'completed' && !session.isPaid && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Pagamento Pendente</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Menu de ações */}
                <div className={`flex items-center gap-1 transition-all duration-300 ${
                    isHovered ? 'opacity-100' : 'opacity-0'
                }`}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(session);
                        }}
                        className="p-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all duration-200 shadow-sm"
                        title="Editar sessão"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    
                    {session.status === 'pending' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onUse(session);
                            }}
                            className="p-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-lg hover:from-emerald-600 hover:to-green-600 transition-all duration-200 shadow-sm"
                            title="Usar sessão"
                        >
                            <Sparkles className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Informações da sessão */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                {/* Data e Horário */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/50 px-3 py-2 rounded-lg border border-gray-200">
                        <CalendarCheck className="w-4 h-4 text-emerald-600" />
                        {isDateValid ? (
                            <>
                                <span className="font-medium text-gray-900">{formatDateToDMY(dateStr)}</span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-900">{timeStr}</span>
                            </>
                        ) : (
                            <span className="text-gray-500">Data não informada</span>
                        )}
                    </div>
                </div>

                {/* Informações adicionais */}
                <div className="flex flex-wrap gap-2">
                    {/* Falta justificada */}
                    {session.status === 'canceled' && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 text-sm">
                            <FileText className="w-4 h-4" />
                            <span>Falta justificada:</span>
                            <span className="font-semibold">
                                {session.confirmedAbsence ? 'Sim' : 'Não'}
                            </span>
                        </div>
                    )}

                    {/* Valor do pagamento */}
                    {session.paymentAmount > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 text-sm">
                            <DollarSign className="w-4 h-4" />
                            <span>Valor:</span>
                            <span className="font-semibold">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                }).format(session.paymentAmount)}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Notas */}
            {session.notes && (
                <div className="mt-3 relative z-10">
                    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <FileText className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <div className="text-xs font-medium text-gray-700 mb-1">Observações</div>
                            <div className="text-sm text-gray-600">{session.notes}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Barra inferior indicadora */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 rounded-b-xl ${
                getStatusBarColor(session.status, session.isPaid)
            }`} />
        </li>
    );
};

// Funções auxiliares melhoradas
const getCardStyle = (status: string, isOverdue: boolean, isToday: boolean) => {
    if (isToday) return 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 shadow-md hover:shadow-lg';
    if (isOverdue) return 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 shadow-sm hover:shadow-md';

    switch (status) {
        case 'scheduled': 
            return 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 shadow-sm hover:shadow-md';
        case 'completed': 
            return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 shadow-sm hover:shadow-md';
        case 'pending': 
            return 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 shadow-sm hover:shadow-md';
        case 'canceled': 
            return 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200 shadow-sm hover:shadow-md';
        default: 
            return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 shadow-sm hover:shadow-md';
    }
};

const getIconBackground = (status: string) => {
    switch (status) {
        case 'completed': return 'bg-emerald-100 text-emerald-600';
        case 'pending': return 'bg-blue-100 text-blue-600';
        case 'canceled': return 'bg-red-100 text-red-600';
        case 'scheduled': return 'bg-cyan-100 text-cyan-600';
        default: return 'bg-gray-100 text-gray-600';
    }
};

const getStatusIcon = (status: string, isPaid?: boolean) => {
    const iconClass = "w-5 h-5";
    
    if (isPaid) {
        return <CheckCircle className={`${iconClass} text-emerald-600`} />;
    }

    switch (status) {
        case 'completed':
            return <CalendarCheck className={iconClass} />;
        case 'pending':
            return <BookOpenText className={iconClass} />;
        case 'canceled':
            return <XCircle className={iconClass} />;
        case 'scheduled':
            return <Clock4 className={iconClass} />;
        default:
            return <BookOpenText className={iconClass} />;
    }
};

const getStatusBarColor = (status: string, isPaid?: boolean) => {
    if (isPaid) return 'bg-gradient-to-r from-emerald-500 to-green-500';
    
    switch (status) {
        case 'completed': return 'bg-gradient-to-r from-emerald-500 to-green-500';
        case 'pending': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
        case 'canceled': return 'bg-gradient-to-r from-red-500 to-pink-500';
        case 'scheduled': return 'bg-gradient-to-r from-cyan-500 to-blue-500';
        default: return 'bg-gradient-to-r from-gray-400 to-gray-500';
    }
};

const StatusBadge = ({ status, isPaid }: { status: string, isPaid?: boolean }) => {
    const statusConfig = {
        completed: {
            icon: <CalendarCheck className="w-4 h-4" />,
            text: 'Realizada',
            color: 'text-emerald-700 bg-emerald-100 border-emerald-200'
        },
        pending: {
            icon: <BookOpenText className="w-4 h-4" />,
            text: 'Disponível',
            color: 'text-blue-700 bg-blue-100 border-blue-200'
        },
        canceled: {
            icon: <XCircle className="w-4 h-4" />,
            text: 'Cancelada',
            color: 'text-red-700 bg-red-100 border-red-200'
        },
        scheduled: {
            icon: <Clock4 className="w-4 h-4" />,
            text: 'Agendada',
            color: 'text-cyan-700 bg-cyan-100 border-cyan-200'
        },
    }[status] || {
        icon: <BookOpenText className="w-4 h-4" />,
        text: 'Indefinido',
        color: 'text-gray-700 bg-gray-100 border-gray-200'
    };

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${statusConfig.color}`}>
            {statusConfig.icon}
            <span>{statusConfig.text}</span>
            {status === 'completed' && !isPaid && (
                <span className="text-red-500 text-xs ml-1">(Não Pago)</span>
            )}
        </div>
    );
};