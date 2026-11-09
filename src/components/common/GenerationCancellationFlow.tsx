import { useEffect, useRef, useState } from 'react';
import CancellationEntryForm from './CancellationEntryForm';
import { ArrowRight, Check, LoaderCircle } from 'lucide-react';
import type { HistoricalCancellation } from '../../services/historicalCancellationTypes';
import { extractApiError } from '../../utils/errorUtils';

type ExistingAppointment = { specialty?: string; doctorName?: string | null; guideNumber?: string | null; status?: string; liminar?: boolean };
type ConflictLine = { date?: string; time?: string; message?: string | null; reason?: string | null; existing?: ExistingAppointment[] };
type FlowError = { title: string | null; message: string; action: string | null; lines: string[] };

const STATUS_LABELS: Record<string, string> = { scheduled: 'agendado', pre_agendado: 'pré-agendado', confirmed: 'confirmado', pending: 'pendente', completed: 'realizado', canceled: 'cancelado', cancelled: 'cancelado' };
const brDate = (iso?: string) => String(iso || '').slice(0, 10).split('-').reverse().join('/');
const label = (value?: string) => { const t = String(value || '').replace(/_/g, ' ').trim(); return t ? t[0].toUpperCase() + t.slice(1) : 'Atendimento'; };
function describeLine(c: ConflictLine): string {
  const when = `${brDate(c.date)} às ${c.time ?? ''}`.trim();
  if (c.existing?.length) {
    const what = c.existing.map(e => `${label(e.specialty)}${e.doctorName ? ` com ${e.doctorName}` : ''}${e.guideNumber ? ` (guia ${e.guideNumber})` : e.liminar ? ' (liminar)' : ''}${e.status ? `, ${STATUS_LABELS[e.status] ?? e.status}` : ''}`).join(' e ');
    return `${when} — já existe ${what}`;
  }
  return `${when} — ${c.reason || c.message || 'já existe atendimento nesse horário'}`;
}
/** Lê o envelope padrão (MENSAGERIA_PADRAO) e, em respostas antigas, a lista de conflitos crua. */
function toFlowError(err: unknown): FlowError {
  const info = extractApiError(err, 'Não foi possível conferir a geração.');
  const data = (err as { response?: { data?: { conflicts?: unknown; conflictSlots?: unknown } } })?.response?.data;
  const raw = info.items.length ? info.items : Array.isArray(data?.conflicts) ? data.conflicts : Array.isArray(data?.conflictSlots) ? data.conflictSlots : [];
  const lines = (raw as ConflictLine[]).filter(c => c && c.date).map(describeLine);
  if (!lines.length) return { title: null, message: info.message, action: null, lines: [] };
  return { title: info.title || 'Nada foi gerado — confira as datas abaixo', message: info.message, action: info.action || 'Tire essas datas da lista de cancelamentos ou ajuste o atendimento existente pela agenda e confira de novo. Nada foi salvo.', lines };
}

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
  const [error, setError] = useState<FlowError | null>(null);
  const revision = useRef(0);
  useEffect(() => { revision.current++; setPreview(null); setError(null); }, [contextKey, rows]);
  async function run(dryRun: boolean) {
    const current = revision.current;
    setBusy(true); setError(null);
    try {
      if (rows.some(r => !r.date || !r.time || !r.doctorId || !r.reason.trim() || !['patient', 'professional', 'clinic'].includes(r.cancelRequester) || !Number.isFinite(r.sessionValue) || r.sessionValue < 0)) throw new Error('Complete as datas canceladas: horário, profissional, valor, motivo e quem solicitou.');
      const result = await onRun(rows, dryRun);
      if (current !== revision.current) return;
      if (dryRun) setPreview(result); else onApplied();
    } catch (err: unknown) {
      setPreview(null);
      setError(toFlowError(err));
    } finally { setBusy(false); }
  }
  return <div className="text-left">
    <div className="mb-5 mt-5 border-t border-slate-200 pt-5">
      <CancellationEntryForm specialties={specialties} embedded onDraftChange={setRows} disabled={busy} />
    </div>
    {error && (error.lines.length
      ? <div role="alert" className="mb-3 space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-semibold">{error.title}</p>
          <ul className="list-disc space-y-1 pl-5">{error.lines.map((line, index) => <li key={index}>{line}</li>)}</ul>
          {error.action && <p>{error.action}</p>}
        </div>
      : <p role="alert" className="mb-3 whitespace-pre-line text-sm text-red-700">{error.message}</p>)}
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
