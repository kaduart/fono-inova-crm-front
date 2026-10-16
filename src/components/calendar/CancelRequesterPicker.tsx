import { Building2, Stethoscope, UserRound } from 'lucide-react';
import { useId, type ReactNode } from 'react';

/**
 * Quem SOLICITOU o cancelamento. É o dado principal do relatório de compromisso,
 * por isso: obrigatório, três opções à vista e NENHUMA marcada por padrão.
 * (Quem registrou o cancelamento — a secretária — é salvo automaticamente pelo backend.)
 */
export type CancelRequester = 'patient' | 'professional' | 'clinic';

export const CANCEL_REQUESTER_LABELS: Record<CancelRequester, string> = {
    patient: 'Paciente/responsável',
    professional: 'Profissional',
    clinic: 'Clínica',
};

const OPTIONS: { value: CancelRequester; icon: ReactNode; hint: string }[] = [
    { value: 'patient', icon: <UserRound className="h-4 w-4" />, hint: 'Família ou o próprio paciente pediu' },
    { value: 'professional', icon: <Stethoscope className="h-4 w-4" />, hint: 'O terapeuta não poderá atender' },
    { value: 'clinic', icon: <Building2 className="h-4 w-4" />, hint: 'Erro de agenda, sala ou estrutura' },
];

/**
 * Terceiro argumento de `onCancelAppointment(id, reason, extras)`. Os handlers
 * existentes já espalham esse objeto no payload do PATCH /cancel, então o
 * solicitante viaja por aqui sem mudar nenhuma assinatura.
 */
export type CancelExtras = {
    paymentMethod?: string;
    billingType?: string;
    sessionValue?: number;
    cancelRequester?: CancelRequester;
    cancelRequestedAt?: string; // ISO — só quando informado manualmente
    /** Avisar o paciente por WhatsApp DEPOIS de salvar o cancelamento (backend respeita true/false). */
    notifyPatient?: boolean;
};

interface Props {
    value: CancelRequester | null;
    onChange: (v: CancelRequester) => void;
    /** valor do input datetime-local ('' = "agora"). Omitir os dois para esconder o campo de data. */
    requestedAt?: string;
    onRequestedAtChange?: (v: string) => void;
    disabled?: boolean;
    helper?: string;
}

/** Converte o valor de <input type="datetime-local"> (hora local) em ISO; '' → undefined. */
export function toRequestedAtISO(localValue: string): string | undefined {
    if (!localValue) return undefined;
    const d = new Date(localValue);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Valor máximo para o input (agora, sem segundos) — o pedido não pode estar no futuro. */
function nowLocalInput(): string {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
}

export default function CancelRequesterPicker({ value, onChange, requestedAt = '', onRequestedAtChange, disabled, helper }: Props) {
    const fieldId = useId();
    const showDateInput = requestedAt !== '';
    const canPickDate = typeof onRequestedAtChange === 'function';

    return (
        <div>
            <p id={`${fieldId}-label`} className="mb-1.5 text-sm font-medium text-gray-800">
                Quem solicitou o cancelamento? <span className="text-red-600">*</span>
            </p>

            <div role="radiogroup" aria-labelledby={`${fieldId}-label`} aria-describedby={helper ? fieldId + '-hint' : undefined} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {OPTIONS.map((opt) => {
                    const selected = value === opt.value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            title={opt.hint}
                            disabled={disabled}
                            onClick={() => onChange(opt.value)}
                            tabIndex={selected || (!value && opt.value === 'patient') ? 0 : -1}
                            onKeyDown={(e) => {
                                const direction = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 0;
                                if (!direction) return;
                                e.preventDefault();
                                const next = OPTIONS[(OPTIONS.findIndex(o => o.value === opt.value) + direction + OPTIONS.length) % OPTIONS.length];
                                onChange(next.value);
                                const radios = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
                                radios?.[OPTIONS.findIndex(o => o.value === next.value)]?.focus();
                            }}
                            className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60 ${
                                selected
                                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                            }`}
                        >
                            <span className={selected ? 'text-emerald-700' : 'text-gray-500'}>{opt.icon}</span>
                            <span className="flex-1 text-left">{CANCEL_REQUESTER_LABELS[opt.value]}</span>
                            
                        </button>
                    );
                })}
            </div>

            {helper && <p id={fieldId + '-hint'} role="status" className="sr-only">{helper}</p>}
            {canPickDate && (
                <div className="mt-2.5 text-xs text-gray-600">
                    {!showDateInput ? (
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => onRequestedAtChange?.(nowLocalInput())}
                            className="text-left text-gray-600 underline decoration-dotted underline-offset-2 hover:text-gray-700"
                        >
                            Informar outro momento para o pedido
                        </button>
                    ) : (
                        <div className="flex flex-wrap items-center gap-2">
                            <label htmlFor={`${fieldId}-date`} className="font-medium">Pedido recebido em</label>
                            <input
                                id={`${fieldId}-date`}
                                type="datetime-local"
                                max={nowLocalInput()}
                                value={requestedAt}
                                disabled={disabled}
                                onChange={(e) => onRequestedAtChange?.(e.target.value)}
                                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                            />
                            <button
                                type="button"
                                disabled={disabled}
                                onClick={() => onRequestedAtChange?.('')}
                                className="text-gray-500 underline hover:text-gray-700"
                            >
                                usar agora
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
