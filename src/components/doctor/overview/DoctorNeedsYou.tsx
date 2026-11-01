// "Precisa de você" do painel do terapeuta — mesmo padrão do Dashboard admin:
// cartões com contagem que abrem um painel lateral com a fila e a ação pronta.
// Filas: evoluções pendentes, sessões de hoje sem confirmação, pacientes em risco
// (derivePatientRisk, mesma regra da aba Inteligência) e aniversários do mês.
// "Contatado" grava em /v2/commercial/contacts, que é só da equipe (admin/secretária).
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { AlertCircle, CalendarPlus, ChevronRight, FileText } from 'lucide-react';
import { useState } from 'react';
import type { PendingEvolution } from '../../../services/evolutionService';
import type { PatientRisk } from '../../../utils/derivePatientRisk';
import { QueueRow, SidePanel, useContact } from '../../commercial/CommercialParts';
import { confirmationNudgeMessage, daysText, reactivationMessage, rescheduleMessage, specialtyText } from '../../commercial/commercialCopy';
import { firstName, isUnconfirmed, patientOf } from './agendaUtils';
import { toDateString } from '../../../utils/dateUtils';

type Patient = { _id: string; fullName: string };
type PanelKey = 'evolutions' | 'confirm' | 'risk' | 'birthdays' | null;

interface Props {
    pendingEvolutions: PendingEvolution[];
    /** A busca de evoluções pendentes falhou (não dá para dizer que está em dia). */
    pendingError?: boolean;
    todayAppointments: any[];
    birthdayPatients: any[];
    riskPatients: PatientRisk[];
    riskLoading?: boolean;
    specialty?: string;
    /** Admin/secretária: pode registrar "Contatado". */
    canRegisterContact: boolean;
    onRegisterEvolution: (p: Patient) => void;
    onOpenPatient: (p: Patient) => void;
    onSchedule: (patientId: string, patientName: string, hints?: { lastSessionType?: string }) => void;
}

const TONE = {
    warn: 'text-amber-700 dark:text-amber-400',
    bad: 'text-red-700 dark:text-red-400',
    info: 'text-blue-700 dark:text-blue-400',
    pink: 'text-pink-700 dark:text-pink-400',
} as const;

function daysSince(iso?: string | null): number | null {
    if (!iso) return null;
    const [y, m, d] = toDateString(iso).split('-').map(Number);
    if (!y) return null;
    const now = new Date();
    return Math.max(0, Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(y, m - 1, d).getTime()) / 86_400_000));
}

const rowBtn = 'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800';

export default function DoctorNeedsYou(props: Props) {
    const { pendingEvolutions, pendingError, todayAppointments, birthdayPatients, riskPatients, riskLoading, specialty, canRegisterContact, onRegisterEvolution, onOpenPatient, onSchedule } = props;
    const [panel, setPanel] = useState<PanelKey>(null);
    const [animRef] = useAutoAnimate<HTMLDivElement>();
    const { done, mark } = useContact();

    const unconfirmed = todayAppointments.filter(isUnconfirmed);
    // Risco alto primeiro; dentro do nível, quem está há mais tempo sem sessão.
    const risk = [...riskPatients].sort((a, b) => (a.riskLevel === b.riskLevel ? b.daysSinceLastSession - a.daysSinceLastSession : a.riskLevel === 'high' ? -1 : b.riskLevel === 'high' ? 1 : 0));
    const highRisk = risk.filter(r => r.riskLevel === 'high').length;

    const items = [
        { key: 'evolutions' as const, count: pendingEvolutions.length, tone: 'warn' as const, title: 'Evoluções pendentes', cta: 'Registrar',
          detail: pendingEvolutions.length ? `Mais antiga: ${pendingEvolutions.map(p => p.fullName.split(' ')[0]).slice(0, 3).join(', ')}` : '' },
        { key: 'confirm' as const, count: unconfirmed.length, tone: 'info' as const, title: 'Hoje sem confirmação', cta: 'Ver e confirmar',
          detail: unconfirmed.slice(0, 3).map(a => `${a.time} ${firstName(patientOf(a).fullName)}`).join(' · ') },
        { key: 'risk' as const, count: risk.length, tone: 'bad' as const, title: 'Pacientes em risco', cta: 'Ver quem retomar',
          detail: risk.length ? `${highRisk ? `${highRisk} com risco alto. ` : ''}Faltas, frequência baixa ou sem próxima sessão.` : '' },
        { key: 'birthdays' as const, count: birthdayPatients.length, tone: 'pink' as const, title: 'Aniversários do mês', cta: 'Ver lista',
          detail: birthdayPatients.slice(0, 3).map(p => `${firstName(p.fullName)} (${new Date(p.dateOfBirth).getUTCDate()})`).join(' · ') },
    ];
    const visible = items.filter(i => i.count > 0);

    return (
        <section aria-labelledby="doctor-needs-you" className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-3 flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-600 dark:text-amber-400" aria-hidden />
                <h2 id="doctor-needs-you" className="text-base font-bold text-gray-900 dark:text-gray-50">Precisa de você hoje</h2>
                {riskLoading && <span className="text-xs text-gray-500 dark:text-gray-400">atualizando…</span>}
            </div>
            {pendingError && (
                <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                    Não foi possível conferir as evoluções pendentes agora. Confira na aba Evolução ou tente atualizar.
                </p>
            )}
            {visible.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">{pendingError
                    ? 'Sessões de hoje confirmadas e nenhum paciente em risco.'
                    : 'Tudo em dia: evoluções registradas, sessões de hoje confirmadas e nenhum paciente em risco.'}</p>
            ) : (
                <div ref={animRef} className={`grid gap-3 sm:grid-cols-2 ${visible.length >= 4 ? 'xl:grid-cols-4' : visible.length === 3 ? 'xl:grid-cols-3' : ''}`}>
                    {visible.map(item => (
                        <button key={item.key} type="button" onClick={() => setPanel(item.key)}
                            className="group flex min-w-0 flex-col items-start rounded-lg border border-gray-200 p-3.5 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-gray-700 dark:hover:border-emerald-700 dark:hover:bg-emerald-500/5">
                            <span className="flex items-baseline gap-2">
                                <span className={`text-2xl font-bold tabular-nums ${TONE[item.tone]}`}>{item.count}</span>
                                <span className="font-semibold text-gray-900 dark:text-gray-50">{item.title}</span>
                            </span>
                            {item.detail && <span className="mt-0.5 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{item.detail}</span>}
                            <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                {item.cta} <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {panel === 'evolutions' && (
                <SidePanel title="Evoluções pendentes" kicker="Precisa de você" subtitle="Sessões concluídas sem evolução registrada." onClose={() => setPanel(null)}>
                    <ul className="flex flex-col gap-2">
                        {pendingEvolutions.map(p => (
                            <li key={p._id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                                <div className="min-w-0">
                                    <button type="button" onClick={() => onOpenPatient({ _id: p._id, fullName: p.fullName })} className="font-semibold text-gray-900 hover:underline dark:text-gray-50">{p.fullName}</button>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Atendido {daysText(daysSince(p.lastCompletedDate))}</p>
                                </div>
                                <button type="button" onClick={() => { setPanel(null); onRegisterEvolution({ _id: p._id, fullName: p.fullName }); }}
                                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
                                    <FileText size={14} aria-hidden /> Registrar
                                </button>
                            </li>
                        ))}
                    </ul>
                </SidePanel>
            )}

            {panel === 'confirm' && (
                <SidePanel title="Hoje sem confirmação" kicker="Precisa de você" subtitle="Mensagem curta para confirmar a sessão de hoje." onClose={() => setPanel(null)}>
                    <ul className="flex flex-col gap-2">
                        {unconfirmed.map(a => {
                            const p = patientOf(a);
                            return (
                                <QueueRow key={a._id} title={`${a.time} · ${p.fullName}`}
                                    lines={[specialtyText(a.specialty || specialty) || null]}
                                    phone={p.phone} message={confirmationNudgeMessage({ name: p.fullName, when: `hoje às ${a.time}` })}
                                    extra={<button type="button" onClick={() => onOpenPatient(p)} className={rowBtn}>Abrir paciente</button>} />
                            );
                        })}
                    </ul>
                </SidePanel>
            )}

            {panel === 'risk' && (
                <SidePanel title="Pacientes em risco" kicker="Precisa de você" subtitle="Quem faltou, está com frequência baixa ou sem próxima sessão. Retome antes que abandone." onClose={() => setPanel(null)}>
                    <ul className="flex flex-col gap-2">
                        {risk.map(r => {
                            const missedLast = r.flags.includes('missed');
                            const message = missedLast
                                ? rescheduleMessage({ name: r.patient.fullName, specialty })
                                : reactivationMessage({ name: r.patient.fullName, specialty });
                            return (
                                <QueueRow key={r.patient._id}
                                    title={`${r.patient.fullName}${r.riskLevel === 'high' ? ' · risco alto' : ''}`}
                                    lines={[
                                        r.reasons.join(' · '),
                                        `Última sessão ${daysText(Number.isFinite(r.daysSinceLastSession) ? r.daysSinceLastSession : null)}${r.nextAppointment?.date ? ` · próxima em ${toDateString(r.nextAppointment.date).split('-').reverse().slice(0, 2).join('/')}` : ' · sem próxima sessão'}`,
                                        r.patient.legalGuardian ? `Responsável: ${r.patient.legalGuardian}` : null,
                                    ]}
                                    phone={r.patient.phone} message={message}
                                    state={done[r.patient._id]}
                                    onContacted={canRegisterContact ? () => { void mark('patient', r.patient._id, 'reactivation'); } : undefined}
                                    extra={
                                        <button type="button" onClick={() => { setPanel(null); onSchedule(r.patient._id, r.patient.fullName, { lastSessionType: r.lastSessionType }); }} className={rowBtn}>
                                            <CalendarPlus size={14} aria-hidden /> Agendar
                                        </button>
                                    } />
                            );
                        })}
                    </ul>
                </SidePanel>
            )}

            {panel === 'birthdays' && (
                <SidePanel title="Aniversários do mês" kicker="Precisa de você" subtitle="A clínica manda a mensagem automática no dia, às 10h. Vale um parabéns na sessão." onClose={() => setPanel(null)}>
                    <ul className="flex flex-col gap-2">
                        {birthdayPatients.map(p => {
                            // dateOfBirth é meia-noite UTC do dia pretendido: sempre getUTC*
                            const dob = new Date(p.dateOfBirth);
                            const today = new Date();
                            const day = dob.getUTCDate();
                            const isToday = day === today.getDate();
                            const age = today.getFullYear() - dob.getUTCFullYear();
                            const when = new Date(today.getFullYear(), dob.getUTCMonth(), day).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
                            return (
                                <li key={p._id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                                    <button type="button" onClick={() => onOpenPatient(p)} className="min-w-0 text-left">
                                        <span className="block font-semibold text-gray-900 hover:underline dark:text-gray-50">{p.fullName}</span>
                                        <span className="block text-sm text-gray-600 dark:text-gray-400">{isToday ? 'hoje' : when} · {day < today.getDate() ? 'fez' : 'faz'} {age} {age === 1 ? 'ano' : 'anos'}</span>
                                    </button>
                                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${isToday ? 'bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                                        {isToday ? 'Hoje' : `Dia ${day}`}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </SidePanel>
            )}
        </section>
    );
}
