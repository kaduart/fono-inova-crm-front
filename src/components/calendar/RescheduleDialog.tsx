import { CalendarClock, Loader2, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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

const normalizeSlots = (raw: unknown): SlotInfo[] => {
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

    return createPortal(
        <div
            className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget && !submitting) onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Mudar data do agendamento"
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-auto">
                <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <CalendarClock size={20} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base font-bold text-gray-800">
                                {target.reactivating ? 'Reativar e remarcar' : 'Mudar data'}
                            </h3>
                            <p className="text-xs text-gray-500 truncate">
                                {target.patientName} · {target.doctorName}
                                {target.specialtyLabel ? ` · ${target.specialtyLabel}` : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors shrink-0 disabled:opacity-50"
                        aria-label="Fechar"
                    >
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    <p className="text-xs text-gray-500">
                        Atual: <span className="font-semibold text-gray-700">{formatBR(target.currentDate)} às {target.currentTime}</span>
                    </p>

                    {target.reactivating && (
                        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            Este agendamento está <strong>cancelado</strong>. Ao confirmar, ele volta como agendado na nova data
                            (sessão e pacote são restaurados; pagamentos voltam como pendentes).
                        </div>
                    )}

                    <div>
                        <label htmlFor="reschedule-date" className="block text-xs font-semibold text-gray-600 mb-1">
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
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {holiday && (
                            <p className="mt-1 text-xs text-red-600">
                                🗓️ {getHolidayName?.(date) || 'Feriado'} — sem atendimento neste dia.
                            </p>
                        )}
                    </div>

                    <div>
                        <p className="block text-xs font-semibold text-gray-600 mb-1">Horário</p>
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
                            <div className="grid grid-cols-4 gap-2" role="listbox" aria-label="Horários livres">
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
                                            className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                                                selected
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : isCurrent
                                                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                        : !info.available
                                                            ? 'bg-gray-50 text-gray-300 border-gray-200 line-through cursor-not-allowed'
                                                            : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
                                            }`}
                                            title={isCurrent ? 'Horário atual deste agendamento' : !info.available ? (info.label || 'Horário indisponível') : undefined}
                                        >
                                            {slot}
                                            {isCurrent && <span className="block text-3xs font-normal leading-none mt-0.5">atual</span>}
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

                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                        className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {submitting && <Loader2 size={14} className="animate-spin" />}
                        {submitting
                            ? 'Remarcando…'
                            : date && time && !isSameAsCurrent
                                ? `${target.reactivating ? 'Reativar para' : 'Remarcar para'} ${formatBR(date)} às ${time}`
                                : target.reactivating ? 'Reativar e remarcar' : 'Remarcar'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default RescheduleDialog;
