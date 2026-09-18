import { Clock } from 'lucide-react';
import { getStatusConfig } from '../utils/appointmentStatus';

export interface HeroInstrumentPanelAppointment {
  _id?: string;
  patientName: string;
  time: string;
  status: string;
  specialty?: string;
}

interface HeroInstrumentPanelProps {
  appointments: HeroInstrumentPanelAppointment[];
  revenue: number;
}

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
    </span>
  );
}

export function HeroInstrumentPanel({ appointments, revenue }: HeroInstrumentPanelProps) {
  return (
    <div className="w-full rounded-2xl border border-gray-100 bg-white p-4 shadow-xl sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <LiveDot />
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Painel do dia</span>
      </div>

      {appointments.length > 0 ? (
        <ul className="mb-4 space-y-2">
          {appointments.map((apt, i) => {
            const cfg = getStatusConfig(apt.status);
            return (
              <li
                key={apt._id || i}
                className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2"
              >
                <Clock className="h-4 w-4 shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">{apt.patientName}</p>
                  <p className="truncate text-xs text-gray-500">
                    {apt.time}{apt.specialty ? ` · ${apt.specialty}` : ''}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bgColor} ${cfg.color}`}>
                  {cfg.label}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-gray-400">Nenhum agendamento hoje.</p>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <div>
          <p className="text-xs text-gray-500">Faturamento do mês</p>
          <p className="text-lg font-bold tabular-nums text-gray-900">{formatCurrency(revenue)}</p>
        </div>
      </div>
    </div>
  );
}
