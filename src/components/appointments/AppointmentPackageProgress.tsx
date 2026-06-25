import { Package } from 'lucide-react';
import React from 'react';

interface AppointmentPackageProgressProps {
  appointment: any;
  className?: string;
}

/**
 * Exibe o progresso do pacote pré-pago de um agendamento.
 * Mostra: tipo da terapia, sessões realizadas / total, restantes e uma barra de progresso.
 * Útil para identificar na agenda quem está perto de renovar o pacote.
 */
export const AppointmentPackageProgress: React.FC<AppointmentPackageProgressProps> = ({
  appointment,
  className = '',
}) => {
  const pkg = appointment?.package;
  if (!pkg) return null;

  const totalSessions = Number(pkg.totalSessions ?? 0);
  const sessionsDone = Number(pkg.sessionsDone ?? 0);
  const sessionsRemaining = Number(
    pkg.remainingSessions ?? pkg.sessionsRemaining ?? Math.max(0, totalSessions - sessionsDone)
  );

  if (totalSessions <= 0) return null;

  const pct = totalSessions > 0 ? (sessionsDone / totalSessions) * 100 : 0;
  const sessionType = appointment.specialty || pkg.specialty || pkg.sessionType || 'Pacote';

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium text-purple-700 truncate flex items-center gap-1">
          <Package className="w-3 h-3" />
          {sessionType}
        </span>
        <span className="text-[10px] text-purple-600 font-semibold shrink-0">
          {sessionsDone}/{totalSessions}
        </span>
      </div>
      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-purple-400 rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="text-[9px] text-gray-400">
        {sessionsRemaining} restante{sessionsRemaining !== 1 ? 's' : ''}
      </span>
    </div>
  );
};

export default AppointmentPackageProgress;
