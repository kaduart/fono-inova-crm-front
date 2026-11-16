// Sessões futuras do paciente, montadas a partir dos agendamentos (pacote, liminar, convênio e
// avulso). A rota antiga de "sessões futuras pagas" só enxerga o legado e vem vazia.
import { CalendarClock, CalendarPlus } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { getSpecialtyLabel } from '../../constants/specialties';
import { FoldSection } from './PatientInsights';

interface ApptLike {
  _id?: string; id?: string; date?: string; time?: string; operationalStatus?: string; status?: string;
  serviceType?: string; specialty?: string; sessionType?: string; billingType?: string; insuranceProvider?: string;
  doctor?: { fullName?: string; name?: string }; doctorName?: string;
  package?: unknown; liminarContract?: unknown;
}

const HIDDEN = new Set(['canceled', 'cancelled', 'cancelado', 'completed', 'missed']);
const LIMIT = 6;

function coverage(a: ApptLike): { label: string; cls: string } {
  if (a.liminarContract) return { label: 'Liminar', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' };
  if (a.package) return { label: 'Pacote', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' };
  if (a.billingType === 'convenio') return { label: a.insuranceProvider ? `Convênio (${a.insuranceProvider})` : 'Convênio', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' };
  return { label: 'Avulso', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' };
}

export default function UpcomingSessionsCard({ appointments, onSchedule, children }: { appointments: ApptLike[]; onSchedule?: () => void; children?: React.ReactNode }) {
  const [all, setAll] = useState(false);
  const upcoming = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const nowKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    return (appointments || [])
      .filter((a) => a?.date && !HIDDEN.has(a.operationalStatus || a.status || ''))
      .map((a) => ({ a, key: `${String(a.date).slice(0, 10)} ${a.time || '23:59'}` }))
      .filter(({ key }) => key >= nowKey)
      .sort((x, y) => x.key.localeCompare(y.key))
      .map(({ a }) => a);
  }, [appointments]);

  const shown = all ? upcoming : upcoming.slice(0, LIMIT);
  const meta = upcoming.length === 0 ? 'Nenhuma sessão agendada' : `${upcoming.length} ${upcoming.length === 1 ? 'sessão agendada' : 'sessões agendadas'}`;

  return (
    <FoldSection icon={<CalendarClock size={16} />} title="Sessões futuras" meta={meta} defaultOpen>
      {upcoming.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-left">
          <p className="text-sm text-slate-600 dark:text-slate-300">Nada agendado daqui para frente. Marque a próxima sessão para manter a frequência.</p>
          {onSchedule && (
            <button type="button" onClick={onSchedule}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors duration-quick hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              <CalendarPlus size={15} aria-hidden /> Agendar sessão
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 text-left dark:divide-slate-800">
          {shown.map((a, i) => {
            const d = new Date(String(a.date).slice(0, 10) + 'T12:00:00');
            const cov = coverage(a);
            const who = a.doctor?.fullName || a.doctor?.name || a.doctorName;
            const what = a.serviceType === 'evaluation' ? 'Avaliação' : getSpecialtyLabel(a.specialty || a.sessionType);
            return (
              <li key={a._id || a.id || i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-slate-50 py-1 dark:bg-slate-800">
                  <span className="text-lg font-bold leading-none text-slate-900 dark:text-slate-50">{d.toLocaleDateString('pt-BR', { day: '2-digit' })}</span>
                  <span className="text-xs text-slate-500">{d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}{a.time ? ` às ${a.time}` : ''} · {what}
                  </p>
                  {who && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{who}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cov.cls}`}>{cov.label}</span>
              </li>
            );
          })}
        </ul>
      )}
      {upcoming.length > LIMIT && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-3 text-sm font-medium text-emerald-700 hover:text-emerald-800 focus:outline-none focus-visible:underline dark:text-emerald-300">
          {all ? 'Mostrar menos' : `Ver as ${upcoming.length} sessões`}
        </button>
      )}
      {children}
    </FoldSection>
  );
}
