// src/components/doctor/overview/DayBar.tsx
// Resumo do dia no topo do Dashboard: data, progresso REAL das sessões de hoje e próxima sessão.
// Substitui o banner de boas-vindas que exibia "Progresso do Dia 65%" fixo.
import { aptDateTime, isCanceled, isCompleted, isMissed, minutesUntil, patientOf, relativeLabel } from './agendaUtils';

interface Props {
    doctorName: string;
    specialty?: string;
    todayAppointments: any[];
    nextAppointment: any | null;
    nextIsToday: boolean;
}

const SPECIALTY_LABEL: Record<string, string> = {
    fonoaudiologia: 'Fonoaudiologia',
    psicologia: 'Psicologia',
    terapia_ocupacional: 'Terapia Ocupacional',
    fisioterapia: 'Fisioterapia',
    psicopedagogia: 'Psicopedagogia',
    neuropsicologia: 'Neuropsicologia',
    musicoterapia: 'Musicoterapia',
};

export default function DayBar({ doctorName, specialty, todayAppointments, nextAppointment, nextIsToday }: Props) {
    const total = todayAppointments.length;
    const canceled = todayAppointments.filter(isCanceled).length;
    const missed = todayAppointments.filter(isMissed).length;
    const done = todayAppointments.filter(isCompleted).length;
    const valid = total - canceled;
    const pct = (n: number) => (total ? (n / total) * 100 : 0);

    const dateLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    const nextWhen = nextAppointment ? aptDateTime(nextAppointment) : null;
    const nextPatient = nextAppointment ? patientOf(nextAppointment) : null;
    const nextHint = nextAppointment
        ? nextIsToday
            ? `Próxima · ${relativeLabel(minutesUntil(nextWhen))}`
            : `Próxima · ${nextWhen?.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}`
        : 'Próxima';

    const lostParts = [canceled && `${canceled} cancelada${canceled > 1 ? 's' : ''}`, missed && `${missed} falta${missed > 1 ? 's' : ''}`].filter(Boolean);

    return (
        <section aria-label="Resumo do dia" className="grid grid-cols-1 items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]">
            <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900 first-letter:uppercase">{dateLabel}</h1>
                <p className="text-sm text-gray-600">
                    {doctorName}{specialty ? ` · ${SPECIALTY_LABEL[specialty] || specialty}` : ''}
                </p>
            </div>

            <div className="min-w-0">
                {total === 0 ? (
                    <p className="text-sm font-medium text-gray-700">Nenhuma sessão na agenda de hoje</p>
                ) : (
                    <>
                        <div className="flex justify-between gap-2 text-sm">
                            <span className="font-semibold text-gray-900">{done} de {valid} {valid === 1 ? 'sessão concluída' : 'sessões concluídas'}</span>
                            {lostParts.length > 0 && <span className="text-gray-600">{lostParts.join(' · ')}</span>}
                        </div>
                        <div
                            className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-gray-200"
                            role="img"
                            aria-label={`${done} concluídas, ${canceled + missed} canceladas ou faltas, ${total - done - canceled - missed} restantes, de ${total}`}
                        >
                            <span className="h-full bg-emerald-600" style={{ width: `${pct(done)}%` }} />
                            <span className="h-full bg-red-200" style={{ width: `${pct(canceled + missed)}%` }} />
                        </div>
                    </>
                )}
            </div>

            <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-emerald-100 sm:col-span-2 lg:col-span-1 bg-emerald-50 px-3 py-2.5">
                <div className="min-w-0">
                    <p className="text-xs text-gray-600">{nextHint}</p>
                    <p className="font-semibold text-gray-900 break-words">{nextPatient ? nextPatient.fullName : 'Sem próximas sessões'}</p>
                </div>
                {nextAppointment && (
                    <span className="text-2xl font-bold tabular-nums text-emerald-800">{nextAppointment.time}</span>
                )}
            </div>
        </section>
    );
}
