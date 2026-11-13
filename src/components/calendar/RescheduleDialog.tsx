import { CalendarClock, Check, Clock, Loader2, Stethoscope, UserRound } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { ModalHeader, ModalFooter, inputClass } from '../../pages/Financial/components/formKit';

export interface RescheduleTarget {
    id: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    specialtyLabel?: string;
    /** YYYY-MM-DD */
    currentDate: string;
    /** HH:mm */
    currentTime: string;
    /** Pré-preenchimento (ex.: destino de um arrastar). Quando ausente, parte da data atual. */
    initialDate?: string;
    initialTime?: string;
    /** Agendamento cancelado: confirmar reativa e remarca (backend restaura sessão/pacote/pagamento). */
    reactivating?: boolean;
}

interface RescheduleDialogProps {
    target: RescheduleTarget | null;
    onClose: () => void;
    onFetchAvailableSlots: (params: { doctorId: string; date: string }) => Promise<string[]>;
    onConfirm: (id: string, data: { date: string; time: string; reason?: string }) => Promise<void>;
    isHoliday?: (dateStr: string) => boolean;
    getHolidayName?: (dateStr: string) => string;
}

/** A API devolve objetos {time, available, reason, label}; aceitamos string simples também. */
interface SlotInfo {
    time: string;
    available: boolean;
    label?: string;
}

export const normalizeSlots = (raw: unknown): SlotInfo[] => {
    const list = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as any)?.slots)
            ? (raw as any).slots
            : Array.isArray((raw as any)?.data)
                ? (raw as any).data
                : [];
    return list
        .map((item: any): SlotInfo | null => {
            if (typeof item === 'string') return { time: item, available: true };
            if (item && typeof item.time === 'string') {
                return { time: item.time, available: item.available !== false, label: item.label };
            }
            return null;
        })
        .filter((s: SlotInfo | null): s is SlotInfo => !!s);
};

const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

const formatBR = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

const extractMessage = (err: any): string =>
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    'Não foi possível remarcar. Tente novamente.';

const RescheduleDialog: React.FC<RescheduleDialogProps> = ({
    target,
    onClose,
    onFetchAvailableSlots,
    onConfirm,
    isHoliday,
    getHolidayName,
}) => {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [slots, setSlots] = useState<SlotInfo[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [slotsError, setSlotsError] = useState(false);
    const [hint, setHint] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const timeRef = useRef('');
    timeRef.current = time;

    // Reinicia sempre que um novo alvo é aberto
    useEffect(() => {
        if (!target) return;
        setDate(target.initialDate || target.currentDate);
        setTime(target.initialTime || '');
        setSlots([]);
        setHint('');
        setError('');
        setSubmitting(false);
    }, [target]);

    const holiday = !!date && !!isHoliday?.(date);

    // Busca horários livres do profissional no dia escolhido
    useEffect(() => {
        if (!target || !date || !target.doctorId || holiday) {
            setSlots([]);
            return;
        }
        let cancelled = false;
        setLoadingSlots(true);
        setSlotsError(false);
        onFetchAvailableSlots({ doctorId: target.doctorId, date })
            .then((result) => {
                if (cancelled) return;
                const list = normalizeSlots(result);
                setSlots(list);
                // Horário pré-preenchido (arrastar) que não está livre: limpa e avisa
                const prev = timeRef.current;
                const freeTimes = list.filter((s) => s.available).map((s) => s.time);
                if (prev && prev !== target.currentTime && !freeTimes.includes(prev)) {
                    setTime('');
                    setHint(`${prev} não está livre neste dia — escolha outro horário.`);
                } else {
                    setHint('');
                }
            })
            .catch(() => {
                if (cancelled) return;
                setSlots([]);
                setSlotsError(true);
            })
            .finally(() => {
                if (!cancelled) setLoadingSlots(false);
            });
        return () => {
            cancelled = true;
        };
    }, [target, date, holiday, onFetchAvailableSlots]);

    // O horário atual do próprio agendamento só aparece no mesmo dia (marcado como "atual")
    const visibleSlots = useMemo(() => {
        if (!target) return [] as SlotInfo[];
        const byTime = new Map<string, SlotInfo>(slots.map((s) => [s.time, s]));
        if (date === target.currentDate && target.currentTime) {
            // no próprio dia o horário do agendamento aparece "ocupado" pela API — é o dele
            byTime.set(target.currentTime, { time: target.currentTime, available: false });
        }
        return Array.from(byTime.values()).sort((a, b) => a.time.localeCompare(b.time));
    }, [slots, date, target]);

    const hasFreeSlot = visibleSlots.some(
        (s) => s.available && !(date === target?.currentDate && s.time === target?.currentTime)
    );

    if (!target) return null;

    const isSameAsCurrent = date === target.currentDate && time === target.currentTime;
    const canConfirm = !!date && !!time && !isSameAsCurrent && !holiday && !submitting;

    const handleConfirm = async () => {
        if (!canConfirm) return;
        setSubmitting(true);
        setError('');
        try {
            await onConfirm(target.id, { date, time });
            onClose();
        } catch (err) {
            setError(extractMessage(err));
            setSubmitting(false);
        }
    };

    return (
        <Modal
            open
            onClose={() => !submitting && onClose()}
            labelledBy="reschedule-title"
            zIndexClass="z-[100000]"
            panelClassName="flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[20px] bg-white text-left shadow-2xl sm:rounded-[20px]"
        >
            <>
                <ModalHeader
                    icon={<CalendarClock className="w-6 h-6" />}
                    color="#059669"
                    title={target.reactivating ? 'Reativar e remarcar' : 'Mudar data'}
                    subtitle={target.patientName}
                    onClose={() => !submitting && onClose()}
                    titleId="reschedule-title"
                />

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-5 pt-1 sm:px-6">
                    <div className="space-y-2 rounded-2xl border border-gray-200 px-4 py-3">
                        <p className="flex items-start gap-2 text-sm font-semibold text-gray-900"><UserRound size={16} className="mt-0.5 shrink-0 text-emerald-700" /><span className="break-words">{target.patientName}</span></p>
                        <p className="flex items-start gap-2 text-xs text-gray-600"><Stethoscope size={16} className="shrink-0" /><span className="break-words">{target.doctorName}{target.specialtyLabel ? ' · ' + target.specialtyLabel : ''}</span></p>
                        <p className="flex items-center gap-2 text-xs text-gray-600"><Clock size={16} className="shrink-0" /><span>Atual: <strong className="font-medium text-gray-800">{formatBR(target.currentDate)} às {target.currentTime}</strong></span></p>
                    </div>

                    {target.reactivating && (
                        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            Este agendamento está <strong>cancelado</strong>. Ao confirmar, ele volta como agendado na nova data
                            (sessão e pacote são restaurados; pagamentos voltam como pendentes).
                        </div>
                    )}

                    <div className="w-48 max-w-full">
                        <label htmlFor="reschedule-date" className="mb-1.5 block text-xs font-semibold text-gray-600">
                            Nova data
                        </label>
                        <input
                            id="reschedule-date"
                            type="date"
                            min={todayStr()}
                            value={date}
                            onChange={(e) => {
                                setDate(e.target.value);
                                setTime('');
                                setHint('');
                                setError('');
                            }}
                            className={inputClass('emerald')}
                        />
                        {holiday && (
                            <p className="mt-1 text-xs text-red-600">
                                🗓️ {getHolidayName?.(date) || 'Feriado'} — sem atendimento neste dia.
                            </p>
                        )}
                    </div>

                    <div>
                        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2"><p className="text-xs font-semibold text-gray-600">Horário</p><span className="flex flex-wrap items-center gap-3 text-xs text-gray-600"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-emerald-400 bg-emerald-50" />Disponível</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-700" />Selecionado</span><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-amber-300 bg-amber-50" />Atual</span></span></div>
                        {loadingSlots ? (
                            <div className="flex items-center gap-2 text-xs text-gray-500 py-3">
                                <Loader2 size={14} className="animate-spin" /> Buscando horários livres…
                            </div>
                        ) : slotsError ? (
                            <p className="text-xs text-red-600 py-2">Não foi possível carregar os horários. Tente trocar a data.</p>
                        ) : visibleSlots.length === 0 ? (
                            <p className="text-xs text-gray-500 py-2">
                                {holiday ? 'Escolha outra data.' : 'Nenhum horário configurado neste dia para este profissional.'}
                            </p>
                        ) : (
                            <>
                            {!hasFreeSlot && (
                                <p className="text-xs text-amber-700 mb-2">Todos os horários deste dia estão ocupados. Escolha outra data.</p>
                            )}
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="listbox" aria-label="Horários livres">
                                {visibleSlots.map((info) => {
                                    const slot = info.time;
                                    const isCurrent = date === target.currentDate && slot === target.currentTime;
                                    const selected = slot === time;
                                    return (
                                        <button
                                            key={slot}
                                            type="button"
                                            role="option"
                                            aria-selected={selected}
                                            disabled={isCurrent || !info.available}
                                            onClick={() => {
                                                setTime(slot);
                                                setHint('');
                                                setError('');
                                            }}
                                            className={`relative flex min-h-11 flex-col items-center justify-center rounded-lg border px-2 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                                                selected
                                                    ? 'bg-emerald-700 text-white border-emerald-700 ring-2 ring-emerald-700 ring-offset-1'
                                                    : isCurrent
                                                        ? 'bg-amber-50 text-amber-800 border-amber-300 cursor-not-allowed'
                                                        : !info.available
                                                            ? 'bg-gray-50 text-gray-400 border-transparent cursor-not-allowed'
                                                            : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:border-emerald-600 hover:bg-emerald-100'
                                            }`}
                                            title={isCurrent ? 'Horário atual deste agendamento' : !info.available ? (info.label || 'Horário indisponível') : undefined}
                                        >
                                            {selected && <Check size={12} className="absolute right-1 top-1" aria-hidden="true" />}
                                            {slot}
                                            {isCurrent && <span className="block text-2xs font-normal leading-none mt-0.5">atual</span>}
                                        </button>
                                    );
                                })}
                            </div>
                            </>
                        )}
                        {hint && <p className="mt-2 text-xs text-amber-600">{hint}</p>}
                    </div>

                    {error && (
                        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
                            {error}
                        </div>
                    )}
                </div>

                <ModalFooter
                    accent="emerald"
                    onCancel={onClose}
                    onSubmit={handleConfirm}
                    submitting={submitting}
                    submitDisabled={!canConfirm}
                    submitLabel={date && time && !isSameAsCurrent ? `${target.reactivating ? 'Reativar para' : 'Remarcar para'} ${formatBR(date)} às ${time}` : target.reactivating ? 'Reativar e remarcar' : 'Remarcar'}
                    submittingLabel="Remarcando..."
                />
            </>
        </Modal>
    );
};

export default RescheduleDialog;
