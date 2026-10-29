import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import doctorService from '../../services/doctorService';
import type { HistoricalCancellation, HistoricalCancellationResult } from '../../services/historicalCancellationTypes';

type Draft = Omit<HistoricalCancellation, 'sessionValue' | 'cancelRequester'> & { sessionValue: string; cancelRequester: '' | HistoricalCancellation['cancelRequester'] };
type Props = { embedded?: boolean; disabled?: boolean; onDraftChange?: (rows: HistoricalCancellation[]) => void; specialties: string[]; onSubmit?: (rows: HistoricalCancellation[], dryRun: boolean) => Promise<HistoricalCancellationResult>; onRecorded?: () => void; onPendingChange?: (pending: boolean) => void };
const inputClass = 'mt-1 h-10 w-full text-left rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600';

export default function CancellationEntryForm({ specialties, onSubmit, onRecorded, onPendingChange, embedded = false, disabled = false, onDraftChange }: Props) {
  const [rows, setRows] = useState<Draft[]>([]);
  const [doctors, setDoctors] = useState<Array<{ _id: string; fullName: string }>>([]);
  const [preview, setPreview] = useState<HistoricalCancellationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => { onPendingChange?.(rows.length > 0 || busy); }, [rows.length, busy, onPendingChange]);
  useEffect(() => {
    if (!rows.length) return;
    let active = true;
    doctorService.getActiveDoctors().then(res => { if (active) setDoctors(res?.data ?? []); })
      .catch(() => { if (active) setError('Não foi possível carregar os profissionais. Tente novamente fechando e abrindo o formulário.'); });
    return () => { active = false; };
  }, [rows.length > 0]);
  useEffect(() => { onDraftChange?.(rows.map(r => ({ ...r, sessionValue: r.sessionValue === '' ? NaN : Number(r.sessionValue), cancelRequester: r.cancelRequester as HistoricalCancellation['cancelRequester'] }))); }, [rows, onDraftChange]);
  const change = (index: number, patch: Partial<Draft>) => {
    setRows(previous => previous.map((r, i) => i === index ? { ...r, ...patch } : r));
    setPreview(null); setError(''); setMessage('');
  };
  function add() {
    const specialty = specialties[0] || '';
    setRows(previous => [...previous, { specialty, date: '', time: '', doctorId: '', sessionValue: '', reason: '', cancelRequester: '' }]);
    setPreview(null); setMessage('');
  }
  async function submit(dryRun: boolean) {
    setBusy(true); setError(''); setMessage('');
    try {
      if (rows.some(r => !r.date || !r.time || !r.doctorId || !r.reason.trim() || !r.cancelRequester || r.sessionValue === '')) {
        throw new Error('Preencha data, horário, profissional, valor, motivo e solicitante de cada cancelamento.');
      }
      const data = rows.map(r => ({ ...r, sessionValue: Number(r.sessionValue), cancelRequester: r.cancelRequester as HistoricalCancellation['cancelRequester'] }));
      if (!onSubmit) return;
      const result = await onSubmit(data, dryRun);
      setPreview(result);
      if (!dryRun && !result.conflicts.length) {
        setMessage(`${result.created} cancelamento(s) registrado(s); ${result.preserved} já existente(s), preservado(s).`);
        setRows([]); setPreview(null); onRecorded?.();
      }
    } catch (err: any) {
      const conflict = err?.response?.data;
      if (Array.isArray(conflict?.conflicts)) setPreview(conflict);
      setError(err?.response?.data?.error?.message || (typeof err?.response?.data?.error === 'string' ? err.response.data.error : null) || err.message || 'Erro ao registrar cancelamentos.');
    } finally { setBusy(false); }
  }
  return (
    <section className="text-left" aria-label="Cancelamentos históricos">
      <h4 className="text-sm font-semibold text-slate-800">Registrar data cancelada</h4>
      <p className="mt-1 text-sm text-slate-600">Adicione o atendimento que foi cancelado e não aparece na agenda.</p>
      {rows.map((row, index) => (
        <fieldset key={index} disabled={busy || disabled} className="mt-4 space-y-3 border-b border-slate-200 pb-4 text-left">
          <legend className="text-left text-sm font-semibold text-slate-700">Cancelamento {index + 1}</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="block text-left text-xs font-medium text-slate-700">Especialidade<select className={inputClass} value={row.specialty} onChange={e => change(index, { specialty: e.target.value })}>
              {specialties.map(key => <option key={key} value={key}>{key.replace(/_/g, ' ')}</option>)}
            </select></label>
            <label className="block text-left text-xs font-medium text-slate-700">Profissional<select className={inputClass} value={row.doctorId} onChange={e => change(index, { doctorId: e.target.value })}>
              <option value="">Selecione quem atenderia</option>{doctors.map(d => <option key={d._id} value={d._id}>{d.fullName}</option>)}
            </select></label>
            <label className="block text-left text-xs font-medium text-slate-700">Data do atendimento<input className={inputClass} type="date" value={row.date} onChange={e => change(index, { date: e.target.value })} /></label>
            <label className="block text-left text-xs font-medium text-slate-700">Horário original<input className={inputClass} type="time" value={row.time} onChange={e => change(index, { time: e.target.value })} /></label>
            <label className="block text-left text-xs font-medium text-slate-700">Valor da sessão (R$)<input aria-label="Valor informado da sessão (R$)" className={inputClass} type="number" min="0" step="0.01" value={row.sessionValue} onChange={e => change(index, { sessionValue: e.target.value })} /></label>
            <label className="block text-left text-xs font-medium text-slate-700">Quem solicitou?<select className={inputClass} value={row.cancelRequester} onChange={e => change(index, { cancelRequester: e.target.value as Draft['cancelRequester'] })}>
              <option value="">Selecione</option><option value="patient">Paciente/responsável</option><option value="professional">Terapeuta</option><option value="clinic">Clínica</option>
            </select></label>
          </div>
          <label className="block text-left text-xs font-medium text-slate-700">Motivo<textarea className={inputClass + " h-auto min-h-[60px]"} maxLength={2000} rows={2} value={row.reason} onChange={e => change(index, { reason: e.target.value })} /></label>
          <button type="button" className="inline-flex items-center gap-1 text-sm text-red-700 underline disabled:opacity-50" onClick={() => { setRows(prev => prev.filter((_, i) => i !== index)); setPreview(null); setError(''); }}><X size={16} />Remover</button>
        </fieldset>
      ))}
      <button type="button" disabled={busy || disabled || rows.length >= 50} onClick={add} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50"><Plus size={16} />{rows.length ? 'Adicionar outra data' : 'Adicionar cancelamento ausente'}</button>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mt-3 text-sm text-emerald-800">{message}</p>}
      {preview && <div className="mt-3 space-y-2 text-sm text-slate-700" aria-live="polite">
        {preview.decisions.map((r, i) => <p key={i}>{r.date.split('-').reverse().join('/')} · {r.time} · {r.specialty.replace(/_/g, ' ')}: {r.action === 'create' ? 'será criado como cancelado' : r.action === 'preserve' ? 'já existe cancelado; será preservado' : 'em conferência; existe atendimento nesse horário'}</p>)}
        {preview.conflicts.length > 0 && <p className="text-red-700">Nenhum registro será salvo enquanto houver conflito neste lote. Remova a linha conflitante para salvar os casos independentes.</p>}
      </div>}
      {!embedded && rows.length > 0 && <div className="sticky bottom-0 -mx-1 mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-1 py-3">
        <button type="button" disabled={busy || disabled} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50" onClick={() => submit(true)}>{busy ? 'Conferindo…' : 'Conferir cancelamentos'}</button>
        <button type="button" disabled={busy || !preview || preview.conflicts.length > 0} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50" onClick={() => submit(false)}>Salvar cancelamentos</button>
      </div>}
    </section>
  );
}
