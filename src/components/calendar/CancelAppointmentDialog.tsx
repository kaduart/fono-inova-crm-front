import { Dialog, DialogContent } from '@mui/material';
import { Loader2, X, XCircle } from 'lucide-react';
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
    onConfirm, onClose, onBack, zIndex = 1400,
}: Props) {
    const missing = [
        ...(!cancelRequester ? ['quem solicitou'] : []),
        ...(!cancelReason.trim() ? ['o motivo'] : []),
    ];
    const hint = missing.length ? 'Falta informar ' + missing.join(' e ') + '.' : '';

    return (
        <Dialog
            open fullWidth maxWidth="sm" aria-labelledby="cancel-dialog-title"
            onClose={() => { if (!isCancelling) onClose(); }}
            sx={{ zIndex }}
            PaperProps={{ sx: {
                borderRadius: 3, margin: { xs: 1.5, sm: 3 },
                width: { xs: 'calc(100% - 24px)', sm: 'calc(100% - 48px)' },
                maxHeight: { xs: 'calc(100dvh - 24px)', sm: 'calc(100dvh - 48px)' },
                textAlign: 'left', outline: 0,
            } }}
        >
            <header className="shrink-0 px-5 pb-0 pt-5 sm:px-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"><XCircle size={19} /></span><h2 id="cancel-dialog-title" className="text-lg font-semibold leading-tight tracking-tight text-gray-900">{title}</h2></div>
                    <button
                        type="button" aria-label="Fechar janela" disabled={isCancelling} onClick={onClose}
                        className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-200/60 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50"
                    ><X size={20} /></button>
                </div>
                <div className="mt-4 rounded-lg bg-gray-50 px-3 py-3 text-sm">{summary}</div>
            </header>

            <DialogContent sx={{ px: { xs: 2.5, sm: 3 }, py: 2.5, minHeight: 0 }}>
                <div className="space-y-5 text-left text-sm">
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

                </div>
            </DialogContent>

            <footer className="shrink-0 border-t border-gray-200 bg-gray-50/70 px-5 py-4 sm:px-6">
                    <label htmlFor="notify-patient" className="mb-3 flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
                        <input
                            id="notify-patient" name="notify-patient" type="checkbox"
                            disabled={isCancelling} checked={notifyPatient}
                            onChange={(event) => setNotifyPatient(event.target.checked)}
                            style={{ accentColor: '#1E7A64' }}
                            className="h-4 w-4 shrink-0 rounded border-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                        />
                        <span>
                            <span className="font-medium">Notificar paciente por WhatsApp</span>
                            <span className="ml-1 text-xs text-gray-500">· após salvar</span>
                        </span>
                    </label>
                <div className="grid grid-cols-[auto_1fr] items-center gap-2 sm:flex sm:justify-end">
                <button
                    type="button" disabled={isCancelling} onClick={onBack || onClose}
                    className="min-h-11 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50"
                >Voltar</button>
                <span title={hint || undefined} className="min-w-0">
                    <button
                        type="button" onClick={onConfirm} disabled={isCancelling || !!hint}
                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-3 text-sm font-semibold leading-tight text-white transition-colors hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 sm:px-4"
                    >
                        {isCancelling ? <Loader2 size={16} className="shrink-0 animate-spin" /> : <XCircle size={16} className="shrink-0" />}
                        {isCancelling ? 'Cancelando...' : 'Confirmar cancelamento'}
                    </button>
                </span>
                </div>
            </footer>
        </Dialog>
    );
}
