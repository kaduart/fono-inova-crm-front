// Resumo da sessão para a família (item 4 da sprint prontuário, 03/11/2026).
// O terapeuta completa a sugestão e envia pelo WhatsApp da clínica (fila). Nada sai sozinho.
// Regras: back/docs/FAMILY_COMMUNICATION.md.
import { Check, MessageCircle, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { fetchFamilySummary, FamilySummaryInfo, sendFamilySummary } from '../../services/evolutionService';
import { extractApiError } from '../../utils/errorUtils';
import { toast } from '../../utils/toast';
import { ModalShell } from '../ui/TailwindParts';

const PLACEHOLDER = /\[[^\]]*\]/;
const MAX = 1000;

interface Props {
    evolutionId: string | null;
    patientName?: string;
    /** Abriu logo depois de finalizar: o botão secundário vira "Agora não". */
    afterFinalize?: boolean;
    onClose: () => void;
    onSent?: (evolutionId: string) => void;
}

export default function FamilySummaryModal({ evolutionId, patientName, afterFinalize, onClose, onSent }: Props) {
    const [info, setInfo] = useState<FamilySummaryInfo | null>(null);
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    const load = async (id: string) => {
        setInfo(null); setError(null);
        try {
            const data = await fetchFamilySummary(id);
            setInfo(data);
            setText(data.sent?.text || data.suggestion);
        } catch (e) {
            setError(extractApiError(e)?.message || 'Não foi possível carregar o resumo.');
        }
    };
    useEffect(() => { if (evolutionId) load(evolutionId); }, [evolutionId]);

    const trimmed = text.trim();
    const problem = useMemo(() => {
        if (PLACEHOLDER.test(trimmed)) return 'Troque os trechos entre colchetes.';
        if (trimmed.length < 20) return 'Escreva o resumo.';
        if (trimmed.length > MAX) return `Máximo de ${MAX} caracteres.`;
        return null;
    }, [trimmed]);
    const sent = info?.sent?.status === 'queued' ? info.sent : null;

    const send = async () => {
        if (!evolutionId || problem || sending) return;
        setSending(true);
        try {
            const out = await sendFamilySummary(evolutionId, trimmed);
            setInfo(i => (i ? { ...i, sent: out } : i));
            toast.success('Resumo enviado para a família.');
            onSent?.(evolutionId);
        } catch (e) {
            toast.error(extractApiError(e)?.message || 'Não foi possível enviar agora.');
        } finally {
            setSending(false);
        }
    };

    return (
        <ModalShell open={!!evolutionId} onClose={onClose} labelledBy="fam-sum-title" className="max-h-[92vh] w-full max-w-lg rounded-none sm:rounded-2xl">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-slate-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{afterFinalize ? 'Evolução finalizada' : 'Família'}</p>
                <h2 id="fam-sum-title" className="mt-0.5 text-lg font-bold text-gray-900 dark:text-gray-50">Resumo para a família{patientName ? ` de ${patientName.split(' ')[0]}` : ''}</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Vai pelo WhatsApp da clínica{info?.phoneLast4 ? ` para o número final ${info.phoneLast4}` : ''}. Curto e acolhedor: um avanço e uma dica para casa.</p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
                {error ? (
                    <div className="py-6 text-center">
                        <p className="text-sm text-gray-800 dark:text-gray-200">{error}</p>
                        <button type="button" onClick={() => evolutionId && load(evolutionId)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200">
                            <RefreshCw size={14} aria-hidden /> Tentar de novo
                        </button>
                    </div>
                ) : !info ? (
                    <div className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800" aria-busy="true" />
                ) : sent ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300"><Check size={16} aria-hidden /> Enviado{sent.queuedAt ? ` em ${new Date(sent.queuedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : ''}</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-100">{sent.text}</p>
                    </div>
                ) : (
                    <>
                        {info.blockReason && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">{info.blockReason}</p>}
                        <label htmlFor="fam-sum-text" className="text-sm font-semibold text-gray-900 dark:text-gray-100">Mensagem</label>
                        <textarea id="fam-sum-text" rows={6} value={text} onChange={(e) => setText(e.target.value)} disabled={!info.canSend}
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-[15px] leading-relaxed focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:bg-gray-50 dark:border-gray-600 dark:bg-slate-800 dark:text-gray-100" />
                        <div className="mt-1 flex justify-between text-xs">
                            <span className={problem ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500'}>{problem || 'Pronto para enviar.'}</span>
                            <span className="text-gray-500">{trimmed.length}/{MAX}</span>
                        </div>
                    </>
                )}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-slate-800">
                <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-slate-800">
                    {sent ? 'Fechar' : afterFinalize ? 'Agora não' : 'Cancelar'}
                </button>
                {!sent && (
                    <button type="button" onClick={send} disabled={!info?.canSend || !!problem || sending}
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50">
                        <MessageCircle size={16} aria-hidden /> {sending ? 'Enviando…' : 'Enviar pelo WhatsApp'}
                    </button>
                )}
            </div>
        </ModalShell>
    );
}
