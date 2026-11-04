// Resumo da aba Agenda do paciente: próxima sessão, rotina por especialidade,
// presença recente e atendimentos passados sem baixa. Só lê os appointments que
// a tela já carrega — nenhuma regra nova, nenhuma chamada extra.
import { AlertTriangle, CalendarClock, Repeat } from 'lucide-react';
import { useMemo } from 'react';
import { Appointment } from '../../utils/types';
import { getSpecialtyLabel } from '../../constants/specialties';

const DONE = new Set(['completed', 'paid']);
const MISSED = new Set(['missed', 'no_show']);
const CANCELED = new Set(['canceled', 'cancelled', 'force_cancelled']);
const OPEN = new Set(['scheduled', 'confirmed', 'pre_agendado']);
const DAY = 86400000;
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Cor fixa por terapia (tokens --fx-* já trocam no tema escuro).
const SPEC_TONE: Record<string, string> = {
  fonoaudiologia: 'emerald', psicologia: 'violet', terapia_ocupacional: 'sky', psicopedagogia: 'amber',
  fisioterapia: 'rose', musicoterapia: 'teal', neuropsicologia: 'indigo', aba: 'orange',
};
const FALLBACK_TONES = ['blue', 'teal', 'orange', 'indigo', 'rose'];
function toneOf(sp: string, i: number) {
  const t = SPEC_TONE[sp] || FALLBACK_TONES[i % FALLBACK_TONES.length];
  const fg = t === 'rose' ? 'var(--fx-rose-700)' : `var(--fx-${t}-700)`;
  return { fg, bg: `var(--fx-${t}-50)` };
}
const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).map(w => w[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase();

function apptDate(a: Appointment): Date | null {
  const raw = a.start || `${String(a.date || '').substring(0, 10)}T${a.time || '00:00'}`;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

const statusOf = (a: Appointment) => String(a.operationalStatus || a.status || '');
const specialtyOf = (a: Appointment) => String(a.specialty || a.sessionType || '');

function relativeDay(d: Date, now: Date): string {
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(d) - start(now)) / DAY);
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'amanhã';
  return `em ${diff} dias`;
}

export function PatientAgendaSummary({ appointments }: { appointments: Appointment[] }) {
  const data = useMemo(() => {
    const now = new Date();
    const t = now.getTime();
    const items = appointments
      .map(a => ({ a, d: apptDate(a), s: statusOf(a) }))
      .filter((x): x is { a: Appointment; d: Date; s: string } => x.d !== null);

    const next = items
      .filter(x => x.d.getTime() >= t && OPEN.has(x.s))
      .sort((x, y) => x.d.getTime() - y.d.getTime())[0] ?? null;

    const in4w = items.filter(x => x.d.getTime() >= t && x.d.getTime() < t + 28 * DAY && OPEN.has(x.s));
    const unconfirmed = in4w.filter(x => x.s !== 'confirmed').length;

    const recent = items.filter(x => x.d.getTime() < t && x.d.getTime() >= t - 56 * DAY);
    const done = recent.filter(x => DONE.has(x.s)).length;
    const missed = recent.filter(x => MISSED.has(x.s)).length;
    const canceled = recent.filter(x => CANCELED.has(x.s)).length;
    const presence = done + missed > 0 ? Math.round((done / (done + missed)) * 100) : null;

    // Passou do horário (com 1h de folga) e ninguém deu baixa: fica fora do caixa, do pacote e da liminar.
    const noClosure = items
      .filter(x => OPEN.has(x.s) && x.d.getTime() < t - 3600000)
      .sort((x, y) => y.d.getTime() - x.d.getTime());

    // Rotina: dia da semana + horário mais frequentes por especialidade nas últimas 8 semanas (realizadas e futuras).
    const routineSrc = items.filter(x => x.d.getTime() >= t - 56 * DAY && (DONE.has(x.s) || OPEN.has(x.s)));
    const bySpec = new Map<string, { slots: Map<string, number>; doctors: Map<string, number>; weeks: Set<string> ; n: number }>();
    for (const x of routineSrc) {
      const sp = specialtyOf(x.a);
      if (!sp) continue;
      const e = bySpec.get(sp) ?? { slots: new Map(), doctors: new Map(), weeks: new Set(), n: 0 };
      const hh = `${String(x.d.getHours()).padStart(2, '0')}:${String(x.d.getMinutes()).padStart(2, '0')}`;
      const slot = `${x.d.getDay()}|${hh}`;
      e.slots.set(slot, (e.slots.get(slot) ?? 0) + 1);
      const doc = x.a.doctor?.fullName;
      if (doc) e.doctors.set(doc, (e.doctors.get(doc) ?? 0) + 1);
      const monday = new Date(x.d); monday.setHours(0, 0, 0, 0); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      e.weeks.add(String(monday.getTime()));
      e.n += 1;
      bySpec.set(sp, e);
    }
    const routine = [...bySpec.entries()]
      .map(([sp, e]) => {
        const slots = [...e.slots.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3)
          .map(([k]) => { const [dow, hh] = k.split('|'); return { dow: Number(dow), hh }; })
          .sort((a, b) => ((a.dow + 6) % 7) - ((b.dow + 6) % 7));
        const doctor = [...e.doctors.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        const perWeek = e.weeks.size > 0 ? e.n / e.weeks.size : 0;
        return { sp, slots, doctor, perWeek };
      })
      .filter(r => r.slots.length > 0)
      .sort((a, b) => b.perWeek - a.perWeek)
      .map((r, i) => ({ ...r, tone: toneOf(r.sp, i) }));

    // Semana típica: os horários da rotina agrupados por dia; conflito = duas terapias no mesmo dia e hora.
    const week = new Map<number, { hh: string; sp: string; tone: { fg: string; bg: string } }[]>();
    const seen = new Map<string, Set<string>>();
    for (const r of routine) for (const sl of r.slots) {
      const list = week.get(sl.dow) ?? [];
      list.push({ hh: sl.hh, sp: r.sp, tone: r.tone });
      week.set(sl.dow, list);
      const k = `${sl.dow}|${sl.hh}`;
      seen.set(k, (seen.get(k) ?? new Set()).add(r.sp));
    }
    for (const list of week.values()) list.sort((a, b) => a.hh.localeCompare(b.hh));
    const clashes = [...seen.values()].filter(v => v.size > 1).length;
    const days = WEEK_ORDER.filter(d => (d >= 1 && d <= 5) || week.has(d));
    const perWeekTotal = routine.reduce((sum, r) => sum + r.slots.length, 0);

    return { now, next, in4w: in4w.length, unconfirmed, done, missed, canceled, presence, noClosure, routine, week, days, clashes, perWeekTotal };
  }, [appointments]);

  const fmtDay = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
  const fmtTime = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const presenceTone = data.presence === null ? 'text-slate-500' : data.presence >= 85 ? 'text-emerald-700 dark:text-emerald-300' : data.presence >= 70 ? 'text-amber-700 dark:text-amber-300' : 'text-red-700 dark:text-red-300';

  return (
    <div className="mb-4 space-y-3">
      <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        {/* Próxima sessão: o que a secretária precisa confirmar primeiro */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="flex items-center gap-1.5 text-2xs font-medium text-slate-500 dark:text-slate-400"><CalendarClock className="h-3.5 w-3.5" aria-hidden />Próxima sessão</p>
          {data.next ? (
            <>
              <p className="mt-1 text-lg font-bold capitalize text-slate-900 dark:text-slate-100">
                {fmtDay(data.next.d)} · {fmtTime(data.next.d)}
                <span className="ml-2 align-middle text-xs font-semibold normal-case text-emerald-700 dark:text-emerald-300">{relativeDay(data.next.d, data.now)}</span>
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {getSpecialtyLabel(specialtyOf(data.next.a))}{data.next.a.doctor?.fullName ? ` com ${data.next.a.doctor.fullName}` : ''}
                {data.next.s !== 'confirmed' && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30">{data.next.s === 'pre_agendado' ? 'pré-agendada' : 'não confirmada'}</span>}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm font-semibold text-amber-800 dark:text-amber-300">Nenhuma sessão futura na agenda. Vale ligar e remarcar.</p>
          )}
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {data.in4w} {data.in4w === 1 ? 'sessão' : 'sessões'} nas próximas 4 semanas{data.unconfirmed > 0 ? `, ${data.unconfirmed} sem confirmação` : ''}.
          </p>
        </section>

        {/* Presença nas últimas 8 semanas */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-2xs font-medium text-slate-500 dark:text-slate-400">Presença nas últimas 8 semanas</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${presenceTone}`}>{data.presence === null ? '—' : `${data.presence}%`}</p>
          <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <div className="flex gap-1"><dt className="text-slate-500 dark:text-slate-400">Realizadas</dt><dd className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{data.done}</dd></div>
            <div className="flex gap-1"><dt className="text-slate-500 dark:text-slate-400">Faltas</dt><dd className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{data.missed}</dd></div>
            <div className="flex gap-1"><dt className="text-slate-500 dark:text-slate-400">Canceladas</dt><dd className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">{data.canceled}</dd></div>
          </dl>
        </section>
      </div>

      {data.noClosure.length > 0 && (
        <section className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            <strong className="tabular-nums">{data.noClosure.length}</strong> {data.noClosure.length === 1 ? 'atendimento passou' : 'atendimentos passaram'} do horário sem baixa
            {' '}(o mais recente em {data.noClosure[0].d.toLocaleDateString('pt-BR')}). Enquanto ninguém conclui ou marca falta, {data.noClosure.length === 1 ? 'ele fica' : 'eles ficam'} fora do caixa, do pacote e da liminar. No calendário {data.noClosure.length === 1 ? 'aparece' : 'aparecem'} com a borda tracejada.
          </p>
        </section>
      )}

      {data.routine.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Repeat className="h-4 w-4 text-slate-400" aria-hidden />Rotina da semana
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{data.perWeekTotal}</span> {data.perWeekTotal === 1 ? 'sessão' : 'sessões'} por semana em {data.routine.length} {data.routine.length === 1 ? 'terapia' : 'terapias'}
              {data.clashes > 0 && <span className="ml-2 font-semibold text-red-700 dark:text-red-300">{data.clashes === 1 ? '1 horário com duas terapias' : `${data.clashes} horários com duas terapias`}</span>}
            </p>
          </div>

          {/* Semana típica: uma coluna por dia, horários na cor da terapia */}
          <div className="-mx-4 mt-3 overflow-x-auto px-4 pb-1 [scroll-snap-type:x_mandatory]">
            <ol className="grid min-w-[560px] gap-2" style={{ gridTemplateColumns: `repeat(${data.days.length}, minmax(0, 1fr))` }}>
              {data.days.map(dow => {
                const items = data.week.get(dow) ?? [];
                const isToday = data.now.getDay() === dow;
                return (
                  <li key={dow} className={`rounded-lg p-2 [scroll-snap-align:start] ${isToday ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/30' : 'bg-slate-50 dark:bg-slate-800/60'}`}>
                    <p className={`text-xs font-semibold ${isToday ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}`}>
                      {WEEKDAY_FULL[dow]}{isToday && <span className="ml-1 font-normal">· hoje</span>}
                    </p>
                    {items.length === 0 ? (
                      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Livre</p>
                    ) : (
                      <ul className="mt-1.5 space-y-1">
                        {items.map(it => (
                          <li key={`${it.hh}-${it.sp}`} className="rounded-md bg-white py-1 pl-2 pr-1.5 shadow-[0_0_0_1px_var(--fx-slate-200)] dark:bg-slate-900" style={{ borderLeft: `3px solid ${it.tone.fg}` }}>
                            <span className="block text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">{it.hh}</span>
                            <span className="block truncate text-2xs text-slate-600 dark:text-slate-300">{getSpecialtyLabel(it.sp)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Quem atende e com que frequência */}
          <ul className="mt-3 grid gap-x-6 gap-y-2 border-t border-slate-100 pt-3 sm:grid-cols-2 dark:border-slate-800">
            {data.routine.map(r => (
              <li key={r.sp} className="flex items-center gap-2.5 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.tone.fg }} aria-hidden />
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-900 dark:text-slate-100">{getSpecialtyLabel(r.sp)}</span>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-2xs font-semibold tabular-nums" style={{ backgroundColor: r.tone.bg, color: r.tone.fg }}>
                  {r.perWeek >= 0.95 ? `${Math.round(r.perWeek)}× por semana` : 'quinzenal'}
                </span>
                {r.doctor && (
                  <span className="flex min-w-0 shrink items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300" title={r.doctor}>
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[0.6rem] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300" aria-hidden>{initials(r.doctor)}</span>
                    <span className="truncate">{r.doctor}</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default PatientAgendaSummary;
