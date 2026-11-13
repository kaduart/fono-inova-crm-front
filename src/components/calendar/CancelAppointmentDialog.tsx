import { XCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ModalHeader, ModalFooter } from '../../pages/Financial/components/formKit';
import type { ReactNode } from 'react';
import CancelRequesterPicker, { type CancelRequester } from './CancelRequesterPicker';

interface Props {
    title?: string;
    summary: ReactNode;
    cancelRequester: CancelRequester | null;
    setCancelRequester: (value: CancelRequester) => void;
    cancelRequestedAt: string;
    setCancelRequestedAt: (value: string) => void;
    cancelReason: string;
    setCancelReason: (value: string) => void;
    notifyPatient: boolean;
    setNotifyPatient: (value: boolean) => void;
    isCancelling: boolean;
    cancelError: string;
    onConfirm: () => void;
    onClose: () => void;
    onBack?: () => void;
    zIndex?: number;
}

/** Janela compartilhada; a gravação e as regras financeiras permanecem nos comandos existentes. */
export default function CancelAppointmentDialog({
    title = 'Cancelar agendamento', summary, cancelRequester, setCancelRequester,
    cancelRequestedAt, setCancelRequestedAt, cancelReason, setCancelReason,
    notifyPatient, setNotifyPatient, isCancelling, cancelError,
    onConfirm, onClose, onBack,
}: Props) {
    const missing = [
        ...(!cancelRequester ? ['quem solicitou'] : []),
        ...(!cancelReason.trim() ? ['o motivo'] : []),
    ];
    const hint = missing.length ? 'Falta informar ' + missing.join(' e ') + '.' : '';

    return (
        <Modal
            open
            onClose={() => { if (!isCancelling) onClose(); }}
            labelledBy="cancel-dialog-title"
            zIndexClass="z-[1400]"
            panelClassName="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] bg-white text-left shadow-2xl sm:rounded-[20px]"
        >
            <ModalHeader
                icon={<XCircle className="w-6 h-6" />}
                color="#DC2626"
                title={title}
                onClose={() => { if (!isCancelling) onClose(); }}
                titleId="cancel-dialog-title"
                closeLabel="Fechar janela"
                closeDisabled={isCancelling}
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="space-y-5 text-left text-sm">
                    <div className="rounded-2xl border border-gray-200 px-4 py-3 text-sm">{summary}</div>
                    {cancelError && (
                        <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-red-800">
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{cancelError}</span>
                        </div>
                    )}
                    <CancelRequesterPicker
                        value={cancelRequester} onChange={setCancelRequester}
                        requestedAt={cancelRequestedAt} onRequestedAtChange={setCancelRequestedAt}
                        disabled={isCancelling} helper={!cancelRequester ? 'Selecione quem solicitou.' : undefined}
                    />
                    <div>
                        <label htmlFor="cancel-reason" className="mb-2 block font-medium text-gray-800">
                            Motivo do cancelamento <span className="text-red-600">*</span>
                        </label>
                        <textarea
                            id="cancel-reason" value={cancelReason}
                            onChange={(event) => setCancelReason(event.target.value)}
                            disabled={isCancelling} rows={2}
                            className="block w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-gray-900 caret-emerald-700 placeholder:text-gray-500 transition-colors focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:bg-gray-50"
                            placeholder="Descreva o que aconteceu..."
                            aria-describedby={!cancelReason.trim() ? 'cancel-reason-hint' : undefined}
                        />
                        {!cancelReason.trim() && <p id="cancel-reason-hint" role="status" className="sr-only">Informe o motivo.</p>}
                    </div>

                    <label htmlFor="notify-patient" className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-gray-700">
                        <input
                            id="notify-patient" name="notify-patient" type="checkbox"
                            disabled={isCancelling} checked={notifyPatient}
                            onChange={(event) => setNotifyPatient(event.target.checked)}
                            style={{ accentColor: '#059669' }}
                            className="h-4 w-4 shrink-0 rounded border-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                        />
                        <span>
                            <span className="font-medium">Notificar paciente por WhatsApp</span>
                            <span className="ml-1 text-xs text-gray-500">após salvar</span>
                        </span>
                    </label>
                </div>
            </div>

            <ModalFooter
                accent="red"
                cancelLabel="Voltar"
                onCancel={onBack || onClose}
                onSubmit={onConfirm}
                submitting={isCancelling}
                submitDisabled={!!hint}
                submitTitle={hint}
                submitLabel="Confirmar cancelamento"
                submittingLabel="Cancelando..."
                summary={hint || null}
            />
        </Modal>
    );
}
