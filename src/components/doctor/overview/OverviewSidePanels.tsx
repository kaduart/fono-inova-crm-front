// src/components/doctor/overview/OverviewSidePanels.tsx
// Painel "Amanhã" do Dashboard do terapeuta: quantas sessões, a primeira e quantas ainda
// estão sem confirmação (com atalho para a Agenda). Os antigos PendingPanel e MonthPanel
// saíram: "Precisa de você" e "Meu mês" (DoctorOverviewInsights) cobrem os dois.
import { ChevronRight } from 'lucide-react';
import { firstName, isCanceled, isUnconfirmed, patientOf, tomorrowLocal } from './agendaUtils';
import { toDateString } from '../../../utils/dateUtils';

const panel = 'overflow-hidden rounded-2xl border border-gray-200 bg-white';
const head = 'flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3';

export function TomorrowPanel({ futureAppointments, onSeeAgenda }: { futureAppointments: any[]; onSeeAgenda?: () => void }) {
    const tomorrow = tomorrowLocal();
    const list = futureAppointments
        .filter(a => toDateString(a.date) === tomorrow && !isCanceled(a))
        .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    const unconfirmed = list.filter(isUnconfirmed).length;
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return (
        <section aria-labelledby="tomorrow-title" className={panel}>
            <div className={head}>
                <h2 id="tomorrow-title" className="text-base font-semibold text-gray-900">Amanhã</h2>
                <span className="text-sm text-gray-600">{d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}</span>
            </div>
            <div className="px-4 py-3">
                {list.length === 0 ? (
                    <p className="text-sm text-gray-600">Nenhuma sessão marcada.</p>
                ) : (
                    <>
                        <p className="font-semibold text-gray-900">
                            {list.length} {list.length === 1 ? 'sessão' : 'sessões'}
                            {unconfirmed > 0 && <span className="font-medium text-amber-800 dark:text-amber-300"> · {unconfirmed} sem confirmação</span>}
                        </p>
                        <p className="text-sm text-gray-600">primeira às {list[0].time} · {firstName(patientOf(list[0]).fullName)}</p>
                        {onSeeAgenda && (
                            <button type="button" onClick={onSeeAgenda} className="mt-2 inline-flex items-center gap-0.5 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
                                Ver na agenda <ChevronRight size={14} aria-hidden />
                            </button>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
