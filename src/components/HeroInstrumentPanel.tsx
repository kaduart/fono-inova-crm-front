import { useEffect, useRef, useState } from 'react';
import { Clock, TrendingUp } from 'lucide-react';

type AppointmentStatus = 'confirmed' | 'pending';

const APPOINTMENTS: { patient: string; time: string; status: AppointmentStatus }[] = [
  { patient: 'Maria Souza', time: '09:00 · Fonoaudiologia', status: 'confirmed' },
  { patient: 'João Pereira', time: '10:30 · Avaliação', status: 'pending' },
  { patient: 'Ana Clara Lima', time: '11:15 · Terapia ABA', status: 'confirmed' },
];

const STATUS_STYLE: Record<AppointmentStatus, { label: string; className: string }> = {
  confirmed: { label: 'Confirmado', className: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  pending: { label: 'Aguardando', className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
};

const REVENUE_TARGET = 12480;

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
    </span>
  );
}

export function HeroInstrumentPanel() {
  const [revenue, setRevenue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setRevenue(REVENUE_TARGET);
      return;
    }

    const duration = 1100;
    const start = performance.now();
    let frame: number;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setRevenue(Math.round(REVENUE_TARGET * easeOutExpo(progress)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className="panel-rise-item w-full rounded-2xl border border-gray-100 bg-white p-4 shadow-xl sm:p-6"
      style={{ '--panel-delay': '0ms' } as React.CSSProperties}
    >
      <div className="mb-4 flex items-center gap-2">
        <LiveDot />
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Painel do dia</span>
      </div>

      <ul className="mb-4 space-y-2">
        {APPOINTMENTS.map((apt, i) => (
          <li
            key={apt.patient}
            className="panel-rise-item flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2"
            style={{ '--panel-delay': `${140 + i * 90}ms` } as React.CSSProperties}
          >
            <Clock className="h-4 w-4 shrink-0 text-gray-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-800">{apt.patient}</p>
              <p className="text-xs text-gray-500">{apt.time}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[apt.status].className}`}>
              {STATUS_STYLE[apt.status].label}
            </span>
          </li>
        ))}
      </ul>

      <div
        className="panel-rise-item flex items-center justify-between border-t border-gray-100 pt-4"
        style={{ '--panel-delay': '420ms' } as React.CSSProperties}
      >
        <div>
          <p className="text-xs text-gray-500">Faturamento do mês</p>
          <p className="text-lg font-bold tabular-nums text-gray-900">{formatCurrency(revenue)}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-200">
          <TrendingUp className="h-3 w-3" />
          +18%
        </div>
      </div>
    </div>
  );
}
