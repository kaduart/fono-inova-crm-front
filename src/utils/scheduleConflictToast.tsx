import toast from 'react-hot-toast';
import { extractScheduleConflictMessage } from './errorUtils';

/**
 * Toast único de conflito de agenda.
 *
 * Por que existe: o modal de edição mostrava o toast e ainda dava `throw err`,
 * e o caller mostrava outro — dois toasts para o mesmo 409. O `id` fixo faz o
 * react-hot-toast substituir em vez de empilhar, então quantos call sites
 * chamarem, só aparece um.
 *
 * Destaca nome e horário porque é o que se lê primeiro para decidir o remarque.
 * Usa os campos estruturados do 409 (`conflict.type/doctorName/patientName/time`)
 * em vez de procurar os nomes dentro da frase pronta.
 *
 * @returns true se era um conflito de agenda e o toast foi exibido.
 */
export function showScheduleConflictToast(error: unknown): boolean {
    const fallbackMessage = extractScheduleConflictMessage(error);
    if (!fallbackMessage) return false;

    const data = (error as any)?.response?.data;
    const conflict = data?.conflict;
    const canHighlight = Boolean(conflict?.time && (conflict?.patientName || conflict?.doctorName));

    const body = canHighlight ? (
        conflict.type === 'patient' ? (
            <>
                <strong>{conflict.patientName}</strong> já tem atendimento às{' '}
                <strong>{conflict.time}</strong> com <strong>{conflict.doctorName}</strong>.
            </>
        ) : (
            <>
                <strong>{conflict.doctorName}</strong> atende{' '}
                <strong>{conflict.patientName}</strong> às <strong>{conflict.time}</strong>
                {conflict.operationalStatus === 'pre_agendado' && ' (pré-agendado)'}.
            </>
        )
    ) : (
        fallbackMessage
    );

    toast.error(
        () => (
            <div className="flex flex-col gap-1">
                <div className="font-semibold text-sm">⚠️ Horário ocupado</div>
                <div className="text-sm leading-snug">{body}</div>
                {canHighlight && data?.suggestion && (
                    <div className="text-xs opacity-75">{data.suggestion}</div>
                )}
            </div>
        ),
        {
            id: 'schedule-conflict',
            duration: 8000,
            style: { maxWidth: '420px', borderLeft: '4px solid #ef4444' },
        }
    );

    return true;
}
