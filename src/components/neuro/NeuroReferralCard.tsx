// Ficha do paciente (terapeuta): indicar consulta com neuropediatra para o laudo, ou confirmar/descartar
// a sugestão automática. A recepção vê o resultado em "Candidatos a neuro" e oferece à família.
import { Brain } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import neuroReferralApi, { type NeuroReferral, type NeuroReferralReason } from '../../services/neuroReferralService';
import { notifyApiError } from '../../utils/notifyApiError';
import { toast } from '../../utils/toast';
import { NEURO_MATCHED_IN_LABELS, NEURO_REASON_LABELS, NEURO_STATUS_META } from '../../utils/neuroReferral';

const REASONS: NeuroReferralReason[] = ['tea', 'tdah', 'atraso_desenvolvimento', 'outro'];
const ACTIVE = ['a_confirmar', 'indicado', 'oferecido'];

const btn = 'inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60';

export default function NeuroReferralCard({ patientId }: { patientId: string }) {
    const [current, setCurrent] = useState<NeuroReferral | null>(null);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [reasons, setReasons] = useState<NeuroReferralReason[]>([]);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const mine = await neuroReferralApi.list('all', patientId); // mais recente primeiro
            setCurrent(mine.find(r => ACTIVE.includes(r.status)) || mine[0] || null);
        } catch {
            setCurrent(null); // card é opcional: sem acesso/erro, não atrapalha a ficha
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    useEffect(() => { load(); }, [load]);

    const refer = async () => {
        setBusy(true);
        try {
            await neuroReferralApi.refer(patientId, reasons, note.trim() || undefined);
            toast.success('Indicação enviada para a recepção oferecer a consulta');
            setOpen(false);
            await load();
        } catch (err) {
            notifyApiError(err, 'Não foi possível indicar');
        } finally {
            setBusy(false);
        }
    };

    const discard = async () => {
        if (!current) return;
        setBusy(true);
        try {
            await neuroReferralApi.update(current._id, { status: 'descartado', note: note.trim() || undefined });
            toast.success('Sugestão descartada');
            await load();
        } catch (err) {
            notifyApiError(err, 'Não foi possível descartar');
        } finally {
            setBusy(false);
        }
    };

    if (loading) return null;
    const status = current?.status;
    const isActive = !!status && ACTIVE.includes(status);
    const toggle = (r: NeuroReferralReason) => setReasons(prev => (prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]));

    return (
        <section className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-500/30 dark:bg-violet-500/10" aria-label="Consulta com neuropediatra">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                    <Brain size={18} className="mt-0.5 shrink-0 text-violet-700 dark:text-violet-300" aria-hidden />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">Consulta com neuropediatra (laudo)</p>
                        {!current && <p className="text-sm text-gray-600">Tem sinais de TEA ou TDAH? Indique e a recepção oferece a consulta à família.</p>}
                        {current && (
                            <p className="text-sm text-gray-700">
                                <span className="font-medium">{NEURO_STATUS_META[current.status].label}</span>
                                {current.status === 'a_confirmar' && current.matchedTerms.length > 0 && (
                                    <> · o sistema achou “{current.matchedTerms.join(', ')}” na {current.matchedIn.map(w => NEURO_MATCHED_IN_LABELS[w] || w).join(' e ')}. Confirma a indicação?</>
                                )}
                                {current.reasons.length > 0 && current.status !== 'a_confirmar' && <> · {current.reasons.map(r => NEURO_REASON_LABELS[r]).join(', ')}</>}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {(!isActive || status === 'a_confirmar') && !open && (
                        <button type="button" className={`${btn} bg-violet-700 text-white hover:bg-violet-800`} onClick={() => { setReasons(current?.reasons || []); setOpen(true); }}>
                            {status === 'a_confirmar' ? 'Confirmar indicação' : 'Indicar consulta neuro'}
                        </button>
                    )}
                    {status === 'a_confirmar' && !open && (
                        <button type="button" disabled={busy} className={`${btn} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`} onClick={discard}>
                            Sem indicação
                        </button>
                    )}
                </div>
            </div>

            {open && (
                <div className="mt-3 space-y-3 border-t border-violet-200 pt-3 dark:border-violet-500/30">
                    <fieldset>
                        <legend className="mb-1 text-xs font-medium text-gray-600">Motivo</legend>
                        <div className="flex flex-wrap gap-2">
                            {REASONS.map(r => (
                                <label key={r} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${reasons.includes(r) ? 'border-violet-600 bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-100' : 'border-gray-300 bg-white text-gray-700'}`}>
                                    <input type="checkbox" className="sr-only" checked={reasons.includes(r)} onChange={() => toggle(r)} />
                                    {NEURO_REASON_LABELS[r]}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-600">Observação para a recepção (opcional, não vai para a família)</span>
                        <textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} rows={2}
                            className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900" />
                    </label>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={busy || reasons.length === 0} className={`${btn} bg-violet-700 text-white hover:bg-violet-800`} onClick={refer}>
                            {busy ? 'Enviando…' : 'Enviar para a recepção'}
                        </button>
                        <button type="button" className={`${btn} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`} onClick={() => setOpen(false)}>Cancelar</button>
                    </div>
                </div>
            )}
        </section>
    );
}
