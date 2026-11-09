import { useState } from 'react';
import { UserX } from 'lucide-react';
import { PATIENT_INACTIVATION_REASONS, type PatientInactivationReason } from '../../constants/patientInactivationReasons';

interface Props {
  open: boolean;
  patientName?: string;
  /** Texto da próxima sessão ainda agendada, se houver (ex.: "12/11 às 10:40"). */
  nextSessionLabel?: string | null;
  loading?: boolean;
  onConfirm: (reason: PatientInactivationReason, note: string) => void;
  onClose: () => void;
}

/**
 * Inativar paciente com motivo (Kadu, 09/11/2026). O motivo é obrigatório e
 * vem de uma lista fixa para dar para filtrar depois (campanhas de retorno).
 * Não cancela a agenda: só avisa se ainda há sessão marcada.
 */
export default function PatientInactivateModal({ open, patientName, nextSessionLabel, loading = false, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState<PatientInactivationReason | ''>('');
  const [note, setNote] = useState('');
  if (!open) return null;

  const close = () => { if (!loading) { setReason(''); setNote(''); onClose(); } };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={close}>
      <div role="dialog" aria-modal="true" aria-labelledby="inactivate-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800"><UserX className="h-5 w-5 text-slate-700 dark:text-slate-200" /></div>
          <h3 id="inactivate-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Inativar {patientName || 'paciente'}
          </h3>
        </div>

        <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Por que o paciente parou?</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {(Object.keys(PATIENT_INACTIVATION_REASONS) as PatientInactivationReason[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setReason(key)}
              aria-pressed={reason === key}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors ${
                reason === key
                  ? 'bg-emerald-600 text-white ring-emerald-600'
                  : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700'
              }`}
            >
              {PATIENT_INACTIVATION_REASONS[key]}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300" htmlFor="inactivate-note">Observação (opcional)</label>
        <textarea
          id="inactivate-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Ex.: achou o pacote caro, pode voltar em março"
          className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />

        {nextSessionLabel && (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            Ainda tem sessão marcada ({nextSessionLabel}). A agenda não é cancelada sozinha: cancele pela agenda se for o caso.
          </p>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={close} disabled={loading} className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            Voltar
          </button>
          <button
            type="button"
            disabled={!reason || loading}
            onClick={() => reason && onConfirm(reason, note.trim())}
            className="flex-1 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Inativando…' : 'Inativar'}
          </button>
        </div>
      </div>
    </div>
  );
}
