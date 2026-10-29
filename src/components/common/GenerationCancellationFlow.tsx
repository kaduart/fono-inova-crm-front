import { useEffect, useRef, useState } from 'react';
import CancellationEntryForm from './CancellationEntryForm';
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
    <details className="my-4 border-t border-slate-200 pt-3">
      <summary className="cursor-pointer py-2 text-sm font-semibold text-slate-700">Houve cancelamentos? Informar datas{rows.length ? ` (${rows.length})` : ''}</summary>
      <CancellationEntryForm specialties={specialties} embedded onDraftChange={setRows} disabled={busy} />
    </details>
    {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
    {preview && <div aria-live="polite" className="mb-3 space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
      <p className="font-semibold">Prévia — nada foi salvo</p>
      <p>{preview.appointmentsGenerated ?? preview.created ?? 0} próxima(s) sessão(ões) a gerar.</p>
      <p>{preview.cancellations?.created ?? 0} cancelamento(s) a registrar; {preview.cancellations?.preserved ?? 0} já existente(s), preservado(s).</p>
      {preview.cancellations?.decisions?.map((row: any, index: number) => <p key={index}>{row.date.split('-').reverse().join('/')} às {row.time} · {row.specialty.replace(/_/g, ' ')} · {row.action === 'preserve' ? 'cancelado existente' : 'novo cancelado'}</p>)}
      {preview.totalCost != null && <p>Custo das próximas sessões: {Number(preview.totalCost).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>}
      {(preview.saldoInsuficiente || preview.limiteSessoesAtingido) && <p>Algumas sessões não cabem nos limites do contrato. Confira a quantidade acima.</p>}
    </div>}
    <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white py-3">
      <button type="button" onClick={() => run(true)} disabled={busy || disabled} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">{busy ? 'Conferindo…' : 'Conferir geração'}</button>
      <button type="button" onClick={() => run(false)} disabled={busy || disabled || !preview} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">Confirmar e gerar</button>
    </div>
  </div>;
}
