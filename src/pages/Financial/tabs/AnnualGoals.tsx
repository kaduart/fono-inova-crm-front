// src/pages/Financial/tabs/AnnualGoals.tsx
// Metas do ano: os 12 meses lado a lado (meta × realizado). Todos os números vêm do back
// (GET /planning/annual), com a mesma regra da Meta Realizada usada em Indicadores.
import { useCallback, useEffect, useState } from 'react';
import { planningService, type AnnualPlanning, type AnnualMonthStatus } from '../../../services/planningService';
import { KpiStrip, Pill, brl, type Tone } from '../components/finUi';
import GoalBar from '../../../components/ui/insight/GoalBar';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const STATUS: Record<AnnualMonthStatus, { label: string; tone: Tone; bar: string }> = {
  batida: { label: 'Batida', tone: 'green', bar: 'bg-emerald-500' },
  nao_batida: { label: 'Não batida', tone: 'red', bar: 'bg-rose-500' },
  no_ritmo: { label: 'No ritmo', tone: 'blue', bar: 'bg-sky-500' },
  abaixo_do_ritmo: { label: 'Abaixo do ritmo', tone: 'amber', bar: 'bg-amber-500' },
  futuro: { label: 'A vir', tone: 'gray', bar: 'bg-gray-300' },
  sem_meta: { label: 'Sem meta', tone: 'gray', bar: 'bg-gray-300' },
};

interface Props {
  year: number;
  selectedMonth: number;
  onSelect: (month: number) => void;
  /** Muda quando uma meta é criada, editada ou excluída, para recarregar. */
  reloadKey?: unknown;
}

export default function AnnualGoals({ year, selectedMonth, onSelect, reloadKey }: Props) {
  const [data, setData] = useState<AnnualPlanning | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await planningService.getAnnual(year);
      setData(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load, reloadKey]);

  if (error) {
    return (
      <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700 flex items-center justify-between gap-3">
        <span>Não foi possível carregar as metas de {year}.</span>
        <button type="button" onClick={load} className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium hover:bg-gray-50">Tentar de novo</button>
      </div>
    );
  }

  const t = data?.totals;
  const diff = t?.diferencaAteAgora ?? 0;

  return (
    <section className="mb-4" aria-label={`Metas de ${year}`}>
      <KpiStrip
        cols={4}
        loading={loading && !data}
        items={[
          { label: `Meta de ${year}`, value: brl(t?.metaAno), sub: `${t?.mesesComMeta ?? 0} de 12 meses com meta`, hero: true },
          { label: 'Realizado no ano', value: brl(t?.realizadoAno), sub: t?.percentualAno != null ? `${t.percentualAno.toLocaleString('pt-BR')}% da meta do ano` : 'sem meta cadastrada' },
          { label: 'Contra a meta até hoje', value: `${diff >= 0 ? '+' : '−'}${brl(Math.abs(diff))}`, sub: `meta até hoje ${brl(t?.metaAteAgora)}`, danger: diff < 0 },
          { label: 'Meses batidos', value: `${t?.mesesBatidos ?? 0} de ${t?.mesesFechados ?? 0}`, sub: 'meses já fechados' },
        ]}
      />

      {/* Novo design (Tremor): o ano numa barra só, com o traço de onde deveria estar hoje. */}
      {!!t?.metaAno && (
        <div className="mt-3">
          <GoalBar
            label={`Ano de ${year}: realizado × meta`}
            done={t.realizadoAno ?? 0}
            goal={t.metaAno}
            pace={t.metaAteAgora ?? null}
            tone={diff < 0 ? 'amber' : 'emerald'}
            right={<><b className="text-gray-900 dark:text-gray-50">{brl(t.realizadoAno)}</b> de {brl(t.metaAno)}</>}
          />
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {(data?.months ?? Array.from({ length: 12 }, () => null as any)).map((m, i) => {
          const month = m?.month ?? i + 1;
          const on = month === selectedMonth;
          const st = m ? STATUS[m.status as AnnualMonthStatus] : STATUS.sem_meta;
          const pct = Math.min(100, Math.max(0, m?.percentual ?? 0));
          return (
            <button
              key={month}
              type="button"
              aria-pressed={on}
              onClick={() => onSelect(month)}
              className={`text-left rounded-xl border p-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                on ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 dark:bg-emerald-500/10' : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-white/10 dark:bg-[#161d1b] dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-sm font-bold text-gray-900">{MONTHS[month - 1]}{m?.isCurrent ? ' · atual' : ''}</span>
                {m && <Pill tone={st.tone}>{st.label}</Pill>}
              </div>
              <p className="mt-1 text-xs text-gray-500 tabular-nums">Meta {m?.meta ? brl(m.meta) : '—'}</p>
              <p className="text-sm font-semibold text-gray-800 tabular-nums">{m?.realizado != null ? brl(m.realizado) : '—'}</p>
              <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
                <div className={`h-full ${st.bar}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-gray-500 tabular-nums">
                {m?.percentual != null ? `${m.percentual.toLocaleString('pt-BR')}%` : m?.isFuture ? 'ainda não começou' : 'sem meta'}
                {m?.falta ? ` · faltam ${brl(m.falta)}` : ''}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
