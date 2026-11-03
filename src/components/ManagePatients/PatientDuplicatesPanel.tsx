// Possíveis pacientes duplicados + Mesclar (03/11/2026) — só admin.
// Back: GET /api/patients/duplicates/report, POST .../confirm-distinct, POST .../merge.
// Mesclar sempre mostra a prévia antes. Em produção a execução fica desligada
// (PATIENT_MERGE_ENABLED) até o Kadu liberar — aí a tela avisa e não muda nada.
import { ChevronDown, ChevronUp, Copy, GitMerge, RefreshCw, UserCheck } from 'lucide-react';
import { useCallback, useState } from 'react';
import { confirmDialog } from '../ui/ConfirmHost';
import { toast } from '../../utils/toast';
import { notifyApiError } from '../../utils/notifyApiError';
import { DuplicateGroup, DuplicatesReport, patientDuplicatesService } from '../../services/patientDuplicatesService';

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
const COLECAO: Record<string, string> = {
  appointments: 'agendamentos', sessions: 'sessões', payments: 'pagamentos', packages: 'pacotes',
  insuranceguides: 'guias de convênio', evolutions: 'evoluções', liminarcontracts: 'liminares',
  insurancebatches: 'lotes de convênio', billing_submissions: 'faturamentos', invoices: 'faturas',
  fiscalinvoices: 'notas fiscais', anamnesisreports: 'anamneses', medicalreports: 'relatórios médicos',
  schoolreports: 'relatórios escolares', patientdocuments: 'documentos', therapeuticplans: 'planos terapêuticos',
  peiplans: 'PEI', leads: 'leads', messages: 'mensagens', packages_view: 'pacotes (visão)', reminders: 'lembretes',
};
const ORIGEM: Record<string, string> = {
  erp: 'ERP', agenda_v2: 'Agenda', agenda_externa: 'Agenda externa', agenda_externa_v2: 'Agenda externa', lead: 'Lead',
};

function GroupCard({ group, onDone }: { group: DuplicateGroup; onDone: () => void }) {
  const [principal, setPrincipal] = useState(group.sugestaoPrincipal);
  const [busy, setBusy] = useState(false);

  const merge = async () => {
    const others = group.pacientes.filter((p) => p.id !== principal);
    const main = group.pacientes.find((p) => p.id === principal)!;
    setBusy(true);
    try {
      for (const dup of others) {
        const prev = await patientDuplicatesService.mergePreview(principal, dup.id);
        const total = prev.mover.reduce((s, m) => s + m.documentos, 0);
        const linhas = prev.mover.slice(0, 8).map((m) => `• ${COLECAO[m.collection] || m.collection}: ${m.documentos}`).join('\n');
        const ok = await confirmDialog(
          `Passar tudo de "${dup.nome}" para "${main.nome}"?\n\n${total} registro(s) mudam de cadastro:\n${linhas || '• nenhum'}\n\nSaldo: ${prev.saldo}.` +
          (prev.camposCompletados.length ? `\nCompleta no principal: ${prev.camposCompletados.join(', ')}.` : '') +
          `\n\nO cadastro "${dup.nome}" é arquivado e sai da lista.`,
          { title: 'Mesclar cadastros', confirmText: 'Mesclar', confirmColor: 'red' }
        );
        if (!ok) return;
        await patientDuplicatesService.merge(principal, dup.id);
      }
      toast.success('Cadastros mesclados');
      onDone();
    } catch (err) {
      const data = (err as { response?: { data?: { code?: string; errorCode?: string } } })?.response?.data;
      const code = data?.code || data?.errorCode;
      if (code === 'MERGE_DISABLED') {
        toast.info('Mesclar ainda está desligado neste ambiente. A prévia funcionou; peça a liberação para aplicar.');
      } else {
        notifyApiError(err, 'Erro ao mesclar');
      }
    } finally {
      setBusy(false);
    }
  };

  const distinct = async () => {
    const ok = await confirmDialog('Marcar estes cadastros como pessoas diferentes? Eles saem da lista de pendentes.', {
      title: 'São pessoas diferentes', confirmText: 'Confirmar', confirmColor: 'green',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await patientDuplicatesService.confirmDistinct(group.pacientes.map((p) => p.id));
      toast.success('Registrado: pessoas diferentes');
      onDone();
    } catch (err) {
      notifyApiError(err, 'Erro ao registrar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-gray-900">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        {group.criterios.map((c) => (
          <span key={c} className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">{c}</span>
        ))}
        {group.confirmedDistinct && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">já marcados como pessoas diferentes</span>
        )}
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-white/5">
        {group.pacientes.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
            <label className="flex min-w-0 cursor-pointer items-center gap-2">
              <input type="radio" name={`principal-${group.sugestaoPrincipal}`} checked={principal === p.id} onChange={() => setPrincipal(p.id)}
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500" aria-label={`Manter ${p.nome} como principal`} />
              <a href={`/patient-dashboard/${p.id}`} target="_blank" rel="noreferrer" className="truncate font-medium text-gray-900 hover:underline dark:text-gray-100">{p.nome}</a>
            </label>
            {principal === p.id && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">fica</span>}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {[`nasc. ${fmtDate(p.nascimento)}`, p.telefone || 'sem telefone', p.convenio, `${p.agendamentos} agend.`, p.origem && (ORIGEM[p.origem] || p.origem), p.criadoEm && `criado ${fmtDate(p.criadoEm)}`]
                .filter(Boolean).join(' · ')}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <button type="button" disabled={busy} onClick={distinct}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5">
          <UserCheck size={15} aria-hidden /> São pessoas diferentes
        </button>
        <button type="button" disabled={busy} onClick={merge}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
          <GitMerge size={15} aria-hidden /> {busy ? 'Aguarde…' : 'Mesclar no que fica'}
        </button>
      </div>
    </div>
  );
}

export default function PatientDuplicatesPanel({ onChanged }: { onChanged?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DuplicatesReport | null>(null);
  const [showConfirmed, setShowConfirmed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await patientDuplicatesService.report());
    } catch (err) {
      notifyApiError(err, 'Erro ao carregar duplicados');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !report) load();
  };

  const groups = (report?.duplicados || []).filter((g) => showConfirmed || !g.confirmedDistinct);

  return (
    <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/5">
      <button type="button" onClick={toggle} aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <Copy size={16} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
            Possíveis cadastros duplicados{report ? ` (${report.totalPendentes})` : ''}
          </span>
          <span className="block text-xs text-gray-600 dark:text-gray-400">Mesmo nome, mesmo CPF ou marcados ao cadastrar. Mescle ou marque como pessoas diferentes.</span>
        </span>
        {open ? <ChevronUp size={18} aria-hidden /> : <ChevronDown size={18} aria-hidden />}
      </button>

      {open && (
        <div className="space-y-3 border-t border-amber-200 px-4 py-3 dark:border-amber-500/20">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showConfirmed} onChange={(e) => setShowConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
              Mostrar também os já marcados como pessoas diferentes
            </label>
            <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-amber-100 dark:hover:bg-white/5">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} aria-hidden /> Atualizar
            </button>
          </div>
          {loading && !report && <p className="text-sm text-gray-500">Procurando duplicados…</p>}
          {report && groups.length === 0 && <p className="text-sm text-gray-600 dark:text-gray-300">Nenhum duplicado pendente.</p>}
          {groups.map((g) => (
            <GroupCard key={g.pacientes.map((p) => p.id).join('-')} group={g} onDone={() => { load(); onChanged?.(); }} />
          ))}
        </div>
      )}
    </section>
  );
}
