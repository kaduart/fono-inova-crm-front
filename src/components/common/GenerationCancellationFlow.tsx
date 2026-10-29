import { useEffect, useRef, useState } from 'react';
import CancellationEntryForm from './CancellationEntryForm';
import { ArrowRight, Check, LoaderCircle } from 'lucide-react';
import type { HistoricalCancellation } from '../../services/historicalCancellationTypes';

type Props = {
  specialties: string[];
  contextKey: string;
  disabled?: boolean;
  onRun: (rows: HistoricalCancellation[], dryRun: boolean) => Promise<any>;
  onApplied: () => void;
};
export default function GenerationCancellationFlow({ specialties, contextKey, disabled, onRun, onApplied }: Props) {
  const [rows, setRows] = useState<HistoricalCancellation[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const revision = useRef(0);
  useEffect(() => { revision.current++; setPreview(null); setError(''); }, [contextKey, rows]);
  async function run(dryRun: boolean) {
    const current = revision.current;
    setBusy(true); setError('');
    try {
      if (rows.some(r => !r.date || !r.time || !r.doctorId || !r.reason.trim() || !['patient', 'professional', 'clinic'].includes(r.cancelRequester) || !Number.isFinite(r.sessionValue) || r.sessionValue < 0)) throw new Error('Complete as datas canceladas: horário, profissional, valor, motivo e quem solicitou.');
      const result = await onRun(rows, dryRun);
      if (current !== revision.current) return;
      if (dryRun) setPreview(result); else onApplied();
    } catch (err: any) {
      setPreview(null);
      setError(err?.response?.data?.error?.message || err?.response?.data?.message || err.message || 'Não foi possível conferir a geração.');
    } finally { setBusy(false); }
  }
  return <div className="text-left">
    <div className="mb-5 mt-5 border-t border-slate-200 pt-5">
      <CancellationEntryForm specialties={specialties} embedded onDraftChange={setRows} disabled={busy} />
    </div>
    {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
    {preview && <div aria-live="polite" className="mb-3 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
      <p className="font-semibold">Prévia — nada foi salvo</p>
      <p>{preview.appointmentsGenerated ?? preview.created ?? 0} próxima(s) sessão(ões) a gerar.</p>
      <p>{preview.cancellations?.created ?? 0} cancelamento(s) a registrar; {preview.cancellations?.preserved ?? 0} já existente(s), preservado(s).</p>
      {preview.cancellations?.decisions?.map((row: any, index: number) => <p key={index}>{row.date.split('-').reverse().join('/')} às {row.time} · {row.specialty.replace(/_/g, ' ')} · {row.action === 'preserve' ? 'cancelado existente' : 'novo cancelado'}</p>)}
      {preview.totalCost != null && <p>Custo das próximas sessões: {Number(preview.totalCost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
      {(preview.saldoInsuficiente || preview.limiteSessoesAtingido) && <p>Algumas sessões não cabem nos limites do contrato. Confira a quantidade acima.</p>}
    </div>}
    <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-1 pb-1 pt-4">
      <p className="max-w-[240px] text-xs leading-5 text-slate-500">{preview ? 'Revise a prévia antes de confirmar.' : 'Confira as datas antes de salvar.'}</p>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        {preview && <button type="button" onClick={() => run(true)} disabled={busy || disabled} className="min-h-10 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Recalcular</button>}
        <button type="button" onClick={() => run(!preview)} disabled={busy || disabled} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:flex-none">
          {busy ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" /> : preview ? <Check size={16} /> : <ArrowRight size={16} />}
          {busy ? (preview ? 'Salvando…' : 'Conferindo…') : preview ? 'Confirmar e gerar' : 'Conferir geração'}
        </button>
      </div>
    </div>
  </div>;
}
