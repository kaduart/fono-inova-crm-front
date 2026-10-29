// src/components/doctor/overview/OverviewSidePanels.tsx
// Coluna lateral do Dashboard do terapeuta: Pendências (evoluções, sessões sem confirmação,
// aniversários — o que antes ficava em "Alertas e Pendências"), Amanhã e Meu mês.
// "Meu mês" substitui o card "Estatísticas da Especialidade", que dependia de stats.specialties
// (o backend nunca enviou) e ficava sempre vazio.
import { FileText } from 'lucide-react';
import type { PendingEvolution } from '../../../services/evolutionService';
import { firstName, isUnconfirmed, patientOf, tomorrowLocal } from './agendaUtils';
import { toDateString } from '../../../utils/dateUtils';

type Patient = { _id: string; fullName: string };

const panel = 'overflow-hidden rounded-2xl border border-gray-200 bg-white';
const head = 'flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3';
const sub = 'px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-wide text-gray-600';
const row = 'flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2.5 last:border-b-0';
const btnSoft = 'inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-800 hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

function daysAgoLabel(iso?: string | null) {
    if (!iso) return '';
    const day = toDateString(iso);
    const [y, m, d] = day.split('-').map(Number);
    const then = new Date(y, m - 1, d);
    const now = new Date();
    const diff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - then.getTime()) / 86400000);
    if (diff <= 0) return 'atendido hoje';
    if (diff === 1) return 'atendido ontem';
    return `atendido há ${diff} dias`;
}

interface PendingProps {
    pendingEvolutions: PendingEvolution[];
    todayAppointments: any[];
    birthdayPatients: any[];
    onRegisterEvolution: (p: Patient) => void;
    onOpenPatient: (p: Patient) => void;
    onSeeAgenda: () => void;
}

export function PendingPanel({ pendingEvolutions, todayAppointments, birthdayPatients, onRegisterEvolution, onOpenPatient, onSeeAgenda }: PendingProps) {
    const unconfirmed = todayAppointments.filter(isUnconfirmed);
    const total = pendingEvolutions.length + unconfirmed.length + birthdayPatients.length;
    const today = new Date();

    return (
        <section aria-labelledby="pending-title" className={panel}>
            <div className={head}>
                <h2 id="pending-title" className="text-base font-semibold text-gray-900">Pendências</h2>
                {total > 0 && (
                    <span className="inline-flex min-w-6 justify-center rounded-full border border-amber-200 bg-amber-50 px-2 text-xs font-bold text-amber-800" aria-label={`${total} pendências`}>{total}</span>
                )}
            </div>

            {total === 0 && <p className="px-4 py-4 text-sm text-gray-600">Tudo em dia: nenhuma evolução pendente e nenhuma sessão sem confirmação hoje.</p>}

            {pendingEvolutions.length > 0 && (
                <>
                    <h3 className={sub}>Evoluções pendentes · {pendingEvolutions.length}</h3>
                    <ul>
                        {pendingEvolutions.map(p => (
                            <li key={p._id} className={row}>
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 break-words">{p.fullName}</p>
                                    <p className="text-xs text-gray-600">{daysAgoLabel(p.lastCompletedDate)}</p>
                                </div>
                                <button type="button" className={btnSoft} onClick={() => onRegisterEvolution({ _id: p._id, fullName: p.fullName })}>
                                    <FileText className="h-4 w-4" aria-hidden />Registrar
                                </button>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            {unconfirmed.length > 0 && (
                <>
                    <h3 className={sub}>Hoje sem confirmação · {unconfirmed.length}</h3>
                    <ul>
                        {unconfirmed.map(a => {
                            const p = patientOf(a);
                            return (
                                <li key={a._id} className={row}>
                                    <button type="button" onClick={() => onOpenPatient(p)} className="min-w-0 text-left hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                                        <span className="font-semibold tabular-nums text-gray-900">{a.time}</span>
                                        <span className="text-gray-800"> · {p.fullName}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="px-4 pb-3">
                        <button type="button" onClick={onSeeAgenda} className="text-sm font-medium text-emerald-800 underline-offset-2 hover:underline">Ver na agenda</button>
                    </div>
                </>
            )}

            {birthdayPatients.length > 0 && (
                <>
                    <h3 className={sub}>Aniversários do mês · {birthdayPatients.length}</h3>
                    <ul>
                        {birthdayPatients.map(p => {
                            // dateOfBirth é meia-noite UTC do dia pretendido: sempre getUTC*
                            const dob = new Date(p.dateOfBirth);
                            const isToday = dob.getUTCDate() === today.getDate();
                            const when = new Date(today.getFullYear(), dob.getUTCMonth(), dob.getUTCDate());
                            const age = today.getFullYear() - dob.getUTCFullYear();
                            const passed = dob.getUTCDate() < today.getDate();
                            return (
                                <li key={p._id} className={row}>
                                    <button type="button" onClick={() => onOpenPatient(p)} className="min-w-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                                        <p className="font-semibold text-gray-900 break-words hover:underline">{p.fullName}</p>
                                        <p className="text-xs text-gray-600">
                                            {isToday ? 'hoje' : when.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })} · {passed ? 'fez' : 'faz'} {age} {age === 1 ? 'ano' : 'anos'}
                                        </p>
                                    </button>
                                    {isToday && <span className="shrink-0 rounded-full border border-green-200 bg-green-50 px-2 text-xs font-semibold text-green-800">Hoje</span>}
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </section>
    );
}

export function TomorrowPanel({ futureAppointments }: { futureAppointments: any[] }) {
    const tomorrow = tomorrowLocal();
    const list = futureAppointments
        .filter(a => toDateString(a.date) === tomorrow)
        .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
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
                        <p className="font-semibold text-gray-900">{list.length} {list.length === 1 ? 'sessão' : 'sessões'}</p>
                        <p className="text-sm text-gray-600">primeira às {list[0].time} · {firstName(patientOf(list[0]).fullName)}</p>
                    </>
                )}
            </div>
        </section>
    );
}

export function MonthPanel({ stats }: { stats: any }) {
    const items = [
        { label: 'Concluídas', value: stats?.monthlyCompleted },
        { label: 'Agendadas', value: stats?.monthlyAppointments },
        { label: 'Faltas', value: stats?.monthlyMissed },
        { label: 'Canceladas', value: stats?.monthlyCanceled },
    ];
    const month = new Date().toLocaleDateString('pt-BR', { month: 'long' });
    return (
        <section aria-labelledby="month-title" className={panel}>
            <div className={head}>
                <h2 id="month-title" className="text-base font-semibold text-gray-900">Meu mês</h2>
                <span className="text-sm text-gray-600">{month}</span>
            </div>
            <dl className="grid grid-cols-2 gap-px bg-gray-200">
                {items.map(i => (
                    <div key={i.label} className="bg-white px-4 py-2.5">
                        <dt className="text-xs text-gray-600">{i.label}</dt>
                        <dd className="text-lg font-bold tabular-nums text-gray-900">{typeof i.value === 'number' ? i.value : '—'}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
