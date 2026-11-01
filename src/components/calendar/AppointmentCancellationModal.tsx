import { Stethoscope, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from '../../utils/toast';
import type { SelectedEvent } from '../../utils/types/types';
import { extractErrorMessage } from '../../utils/errorUtils';
import { resolveAppointmentFinancialAmounts } from '../../utils/appointmentFinancialAmounts';
import { resolveBillingType } from '../../utils/appointmentBillingType';
import CancelAppointmentDialog from './CancelAppointmentDialog';
import { toRequestedAtISO, type CancelExtras, type CancelRequester } from './CancelRequesterPicker';

interface Props {
    event: SelectedEvent;
    onCancelAppointment: (id: string, reason: string, extras?: CancelExtras) => Promise<void>;
    onClose: () => void;
    zIndex?: number;
    financialContext?: Pick<CancelExtras, 'paymentMethod' | 'billingType' | 'sessionValue'>;
}

/** Cancelamento independente do modal de detalhes: um formulário, uma gravação. */
export default function AppointmentCancellationModal({ event, onCancelAppointment, onClose, zIndex, financialContext }: Props) {
    const [requester, setRequester] = useState<CancelRequester | null>(null);
    const [requestedAt, setRequestedAt] = useState('');
    const [reason, setReason] = useState('');
    const [notifyPatient, setNotifyPatient] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const inFlight = useRef(false);
    useEffect(() => {
        setRequester(null); setRequestedAt(''); setReason(''); setNotifyPatient(true); setError('');
    }, [event.id]);

    const submit = async () => {
        if (inFlight.current || !requester || !reason.trim()) return;
        inFlight.current = true;
        setSaving(true); setError('');
        try {
            await onCancelAppointment(event.id, reason.trim(), {
                paymentMethod: event.paymentMethod || '',
                billingType: resolveBillingType(event),
                sessionValue: resolveAppointmentFinancialAmounts(event).amountDueNow,
                ...financialContext,
                cancelRequester: requester,
                cancelRequestedAt: toRequestedAtISO(requestedAt),
                notifyPatient,
            });
            onClose();
        } catch (cause) {
            const message = extractErrorMessage(cause, 'Não foi possível cancelar. Seus dados foram mantidos; tente novamente.');
            setError(message);
            toast.error(message);
        } finally {
            inFlight.current = false;
            setSaving(false);
        }
    };
    const when = [event.formattedDate, !event.formattedDate?.includes(event.startTime || '::') ? event.startTime : null].filter(Boolean).join(' · ');
    return <CancelAppointmentDialog
        summary={<div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-2">
            <div className="min-w-0"><p className="flex items-start gap-2 font-semibold text-gray-900"><UserRound size={16} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" /><span className="break-words">{event.patient?.fullName || 'Paciente não informado'}</span></p><p className="mt-1.5 flex items-start gap-2 text-xs text-gray-600"><Stethoscope size={16} className="shrink-0 text-gray-500" aria-hidden="true" /><span className="break-words">{event.doctor?.fullName || 'Profissional não informado'}</span></p></div>
            <p className="shrink-0 text-xs font-medium leading-5 text-gray-600">{when}</p>
        </div>}
        cancelRequester={requester} setCancelRequester={(value) => {setRequester(value); setError('');}}
        cancelRequestedAt={requestedAt} setCancelRequestedAt={setRequestedAt}
        cancelReason={reason} setCancelReason={(value) => {setReason(value); setError('');}}
        notifyPatient={notifyPatient} setNotifyPatient={setNotifyPatient}
        isCancelling={saving} cancelError={error}
        onConfirm={submit} onClose={onClose} zIndex={zIndex}
    />;
}
