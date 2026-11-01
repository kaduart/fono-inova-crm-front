// Painéis de inteligência do paciente (mesmo padrão do Dashboard admin): frequência,
// presença, especialidades e tendência. Só contagens de agenda (status operacional);
// nenhum valor financeiro é calculado aqui (DOMAIN_INVARIANTS: KPIs financeiros só no back).
import { Activity, CalendarCheck2, ChevronDown, Stethoscope, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import AnimatedValue from '../ui/insight/AnimatedValue';
import BarList from '../ui/insight/BarList';
import Sparkline from '../ui/insight/Sparkline';
import { specialtyText } from '../commercial/commercialCopy';

interface ApptLike {
  date?: string; time?: string; operationalStatus?: string; status?: string;
  specialty?: string; sessionType?: string; serviceType?: string;
}

const DAY = 86_400_000;
const DONE = new Set(['completed', 'paid', 'concluido', 'realizado']);
const MISSED = new Set(['missed', 'faltou', 'no_show']);
const CANCELED = new Set(['canceled', 'cancelled', 'cancelado', 'force_cancelled']);

const statusOf = (a: ApptLike) => a.operationalStatus || a.status || '';
const ymdToMs = (ymd?: string) => (ymd ? new Date(`${ymd.slice(0, 10)}T12:00:00`).getTime() : NaN);

export function computePatientInsights(appts: ApptLike[], now = Date.now()) {
  const past90 = now - 90 * DAY;
  const weeks: number[] = Array(12).fill(0);
  let done90 = 0; let missed90 = 0; let canceled90 = 0;
  const bySpec: Record<string, number> = {};
  let last4 = 0; let prev4 = 0;
  let lastDoneMs = 0;

  for (const a of appts) {
    const t = ymdToMs(a.date);
    if (!Number.isFinite(t) || t > now) continue;
    const st = statusOf(a);
    const isDone = DONE.has(st);
    if (isDone && t > lastDoneMs) lastDoneMs = t;
    const ago = Math.floor((now - t) / (7 * DAY));
    if (isDone && ago < 12) weeks[11 - ago] += 1;
    if (isDone && ago < 4) last4 += 1;
    else if (isDone && ago < 8) prev4 += 1;
    if (t >= past90) {
      if (isDone) done90 += 1;
      else if (MISSED.has(st)) missed90 += 1;
      else if (CANCELED.has(st)) canceled90 += 1;
      if (!CANCELED.has(st)) {
        const k = a.serviceType === 'evaluation' ? 'avaliacao' : (a.specialty || a.sessionType || 'outros');
        bySpec[k] = (bySpec[k] || 0) + 1;
      }
    }
  }
  const attended = done90 + missed90;
  const presence = attended > 0 ? Math.round((done90 / attended) * 100) : null;
  const perWeek = weeks.slice(-8).reduce((s, n) => s + n, 0) / 8;
  // Com menos de 3 sessões na base, a porcentagem engana (1 → 6 vira +500%).
  const trend = prev4 >= 3 ? Math.round(((last4 - prev4) / prev4) * 100) : null;
  const daysSinceDone = lastDoneMs ? Math.floor((now - lastDoneMs) / DAY) : null;
  return { weeks, done90, missed90, canceled90, presence, perWeek, trend, last4, prev4, bySpec, daysSinceDone };
}

function Tile({ icon, label, value, hint, tone = 'slate', children }: { icon: React.ReactNode; label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'slate' | 'emerald' | 'amber' | 'red'; children?: React.ReactNode }) {
  const toneCls = { slate: 'text-slate-900 dark:text-slate-50', emerald: 'text-emerald-700 dark:text-emerald-300', amber: 'text-amber-700 dark:text-amber-300', red: 'text-red-600 dark:text-red-400' }[tone];
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className="text-slate-400 dark:text-slate-500" aria-hidden>{icon}</span>{label}
      </div>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${toneCls}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export default function PatientInsights({ appointments }: { appointments: ApptLike[] }) {
  const ins = useMemo(() => computePatientInsights(appointments || []), [appointments]);
  const specItems = Object.entries(ins.bySpec)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, v]) => ({ key: k, label: k === 'avaliacao' ? 'Avaliação' : (specialtyText(k) || k).replace(/^./, (c) => c.toUpperCase()), value: v, display: `${v}` }));

  if (!appointments?.length) return null;

  const trendTone = ins.trend === null ? 'slate' : ins.trend <= -30 ? 'red' : ins.trend < 0 ? 'amber' : 'emerald';
  const presenceTone = ins.presence === null ? 'slate' : ins.presence < 75 ? 'red' : ins.presence < 90 ? 'amber' : 'emerald';

  // Frase de leitura para o comercial: o que fazer com esses números.
  const reading = ins.daysSinceDone !== null && ins.daysSinceDone > 21
    ? `Última sessão realizada há ${ins.daysSinceDone} dias. Vale um contato de retomada.`
    : ins.trend !== null && ins.trend <= -30
      ? `A frequência caiu ${Math.abs(ins.trend)}% nas últimas 4 semanas. Risco de abandono: converse com a família.`
      : ins.presence !== null && ins.presence < 80
        ? `Presença de ${ins.presence}% nos últimos 90 dias. Confirmar na véspera ajuda a reduzir faltas.`
        : ins.perWeek >= 0.9
          ? 'Frequência estável. Bom momento para falar em pacote ou renovação.'
          : null;

  return (
    <section aria-label="Inteligência do paciente" className="mb-5 text-left">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile icon={<Activity size={14} />} label="Frequência (12 semanas)"
          value={<><AnimatedValue value={ins.perWeek.toFixed(1).replace('.', ',')} /><span className="ml-1 text-sm font-medium text-slate-500">/semana</span></>}
          hint="Média das últimas 8 semanas, só sessões realizadas">
          <Sparkline values={ins.weeks} tone={trendTone === 'red' ? 'red' : trendTone === 'amber' ? 'amber' : 'emerald'} />
        </Tile>
        <Tile icon={ins.trend !== null && ins.trend < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />} label="Tendência" tone={trendTone}
          value={ins.trend === null ? <AnimatedValue value={ins.last4} /> : <>{ins.trend > 0 ? '+' : ins.trend < 0 ? '−' : ''}<AnimatedValue value={`${Math.abs(ins.trend)}%`} /></>}
          hint={ins.trend === null ? `sessões nas últimas 4 semanas (${ins.prev4} nas 4 anteriores, pouco para comparar)` : `${ins.last4} sessões nas últimas 4 semanas contra ${ins.prev4} nas 4 anteriores`} />
        <Tile icon={<CalendarCheck2 size={14} />} label="Presença (90 dias)" tone={presenceTone}
          value={ins.presence === null ? '—' : <AnimatedValue value={`${ins.presence}%`} />}
          hint={`${ins.done90} realizadas · ${ins.missed90} falta${ins.missed90 === 1 ? '' : 's'} · ${ins.canceled90} cancelada${ins.canceled90 === 1 ? '' : 's'}`} />
        <Tile icon={<Stethoscope size={14} />} label="Especialidades (90 dias)" value={<AnimatedValue value={specItems.length} />}>
          {specItems.length > 0 ? <BarList items={specItems} /> : <p className="text-xs text-slate-500">Sem sessões no período</p>}
        </Tile>
      </div>
      {reading && (
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">{reading}</p>
      )}
    </section>
  );
}

/** Seção recolhível no padrão do Dashboard admin (resumo no cabeçalho, nada some). */
export function FoldSection({ title, meta, icon, defaultOpen = false, children }: { title: string; meta?: React.ReactNode; icon: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white text-left dark:border-slate-700 dark:bg-slate-900">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:hover:bg-slate-800/60">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" aria-hidden>{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-slate-900 dark:text-slate-50">{title}</span>
          {meta && <span className="block text-xs text-slate-600 dark:text-slate-400">{meta}</span>}
        </span>
        <ChevronDown size={18} className={`shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && <div className="border-t border-slate-100 p-4 dark:border-slate-800">{children}</div>}
    </section>
  );
}
