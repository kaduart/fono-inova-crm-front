// Aviso de "possível paciente duplicado" enquanto o cadastro é digitado (03/11/2026).
// Caso que motivou: "BENJAMIN MARCAL BALDEZ" x "Benjamin Marçal Baldez" — mesma criança,
// dois cadastros. A regra fica no back (GET /api/patients/check-duplicate); aqui só mostramos.
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DuplicateCandidate, patientDuplicatesService } from '../../services/patientDuplicatesService';

export interface DuplicateQuery {
  fullName?: string | null;
  dateOfBirth?: Date | string | null;
  phone?: string | null;
  cpf?: string | null;
  excludeId?: string | null;
}

const toBirth = (v?: Date | string | null) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const fmtBirth = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : null);
const fmtPhone = (p: string | null) => {
  if (!p) return null;
  const d = p.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return p;
};

/** Busca cadastros parecidos com debounce. Silencioso em erro (o back ainda trava no salvar). */
export function usePossibleDuplicates(query: DuplicateQuery, enabled = true) {
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const name = (query.fullName || '').trim();
  const birth = toBirth(query.dateOfBirth);
  const phone = (query.phone || '').replace(/\D/g, '');
  const cpf = (query.cpf || '').replace(/\D/g, '');

  useEffect(() => {
    if (!enabled || name.replace(/\s/g, '').length < 3) {
      setCandidates([]);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const r = await patientDuplicatesService.check(
          { fullName: name, dateOfBirth: birth, phone: phone.length >= 8 ? phone : null, cpf: cpf.length === 11 ? cpf : null, excludeId: query.excludeId },
          ctrl.signal
        );
        setCandidates(r.possiveisDuplicados || []);
      } catch {
        // cancelado ou sem permissão: não mostra nada
      } finally {
        if (abortRef.current === ctrl) setLoading(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [enabled, name, birth, phone, cpf, query.excludeId]);

  return { candidates, loading };
}

interface NoticeProps {
  candidates: DuplicateCandidate[];
  confirmedDistinct: boolean;
  onConfirmedDistinctChange: (v: boolean) => void;
  /** Ao clicar em "usar este cadastro". Se ausente, abre a ficha em nova aba. */
  onUseExisting?: (c: DuplicateCandidate) => void;
  showError?: boolean;
}

export function PossibleDuplicatesNotice({ candidates, confirmedDistinct, onConfirmedDistinctChange, onUseExisting, showError }: NoticeProps) {
  if (!candidates.length) return null;
  const strong = candidates.some((c) => c.level === 'forte');

  return (
    <div
      role="alert"
      className={`rounded-xl border p-4 text-sm ${showError && !confirmedDistinct
        ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40'
        : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'}`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {strong ? 'Este paciente provavelmente já tem cadastro' : 'Já existe paciente com nome parecido'}
          </p>
          <p className="mt-0.5 text-gray-600 dark:text-gray-400">
            Confira antes de criar outro. Cadastro em dobro divide o histórico, a agenda e o financeiro.
          </p>

          <ul className="mt-3 space-y-2">
            {candidates.map((c) => (
              <li key={c._id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
                <span className="font-medium text-gray-900 dark:text-gray-100">{c.fullName}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {[fmtBirth(c.dateOfBirth) && `nasc. ${fmtBirth(c.dateOfBirth)}`, fmtPhone(c.phone) || 'sem telefone', c.healthPlan].filter(Boolean).join(' · ')}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c.level === 'forte'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'}`}>
                  {c.reasons.join(' + ')}
                </span>
                <span className="ml-auto">
                  {onUseExisting ? (
                    <button type="button" onClick={() => onUseExisting(c)}
                      className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700">
                      Usar este cadastro
                    </button>
                  ) : (
                    <a href={`/patient-dashboard/${c._id}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-600 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950">
                      Abrir ficha <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <label className="mt-3 flex cursor-pointer items-center gap-2 text-gray-800 dark:text-gray-200">
            <input type="checkbox" checked={confirmedDistinct} onChange={(e) => onConfirmedDistinctChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
            Conferi: é outra pessoa, pode criar o cadastro novo
          </label>
          {showError && !confirmedDistinct && (
            <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
              Marque a confirmação acima ou abra o cadastro existente.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
