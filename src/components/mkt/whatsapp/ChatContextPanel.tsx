// Painel à direita da conversa: quem é (lead ou paciente), de onde veio, em que etapa está e o
// próximo passo. Só leitura, exceto "Marcar como respondido", que registra o contato na fila
// comercial (mesma rota do Dashboard: POST /v2/commercial/contacts).
import { CalendarPlus, Check } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useContacts } from '../../../contexts/ContactsContext';
import { commercialService } from '../../../services/commercialService';
import { patientService } from '../../../services/patientService';
import type { Contact } from '../../../services/whatsappService';
import { specialtyText } from '../../commercial/commercialCopy';
import { isPatientContact, nextStep, stageLabel } from './chatHelpers';

const Row: React.FC<{ k: string; children: React.ReactNode }> = ({ k, children }) => (
    <>
        <dt className="text-gray-500 dark:text-gray-400">{k}</dt>
        <dd className="m-0 text-right text-gray-900 dark:text-gray-100">{children}</dd>
    </>
);

const fmtDate = (iso?: string | null, withTime = false) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const s = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');
    return withTime ? `${s} · ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : s;
};

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ChatContextPanel: React.FC<{ contact: Contact }> = ({ contact }) => {
    const navigate = useNavigate();
    const { updateContact } = useContacts();
    const [patient, setPatient] = useState<any | null>(null);
    const [saving, setSaving] = useState(false);
    const lead = contact.lead;
    const isPatient = isPatientContact(contact);
    const waiting = contact.lastDirection === 'inbound';

    useEffect(() => {
        setPatient(null);
        if (!contact.patientId) return;
        let alive = true;
        patientService.getById(contact.patientId).then(p => { if (alive) setPatient(p); }).catch(() => { /* painel segue sem os dados */ });
        return () => { alive = false; };
    }, [contact.patientId]);

    const markAnswered = async () => {
        if (!contact.leadId || saving) return;
        setSaving(true);
        try {
            await commercialService.registerContact({ targetType: 'lead', targetId: String(contact.leadId), kind: 'lead_reply' });
            updateContact(contact._id, { lastDirection: 'outbound' });
            toast.success('Marcado como respondido');
        } catch {
            toast.error('Não foi possível marcar agora');
        } finally {
            setSaving(false);
        }
    };

    const openAgenda = () => {
        // Lead (não paciente): abre a Agenda já com o modal de avaliação preenchido.
        if (!isPatient) {
            try {
                sessionStorage.setItem('pendingScheduleLead', JSON.stringify({
                    fullName: contact.name || '',
                    phone: contact.phone || '',
                    serviceType: 'evaluation',
                }));
            } catch { /* sem storage: segue só abrindo a agenda */ }
        }
        navigate('/admin?tab=Calend%C3%A1rio');
        toast.info(isPatient
            ? `Agenda aberta. Escolha o horário para ${contact.name?.split(' ')[0] || 'o contato'}.`
            : `Avaliação de ${contact.name?.split(' ')[0] || 'o lead'} iniciada. Escolha o profissional e o horário.`);
    };

    // Mesmo critério da lista de pacientes (PatientList.debtOf): positivo = valor em aberto
    const debt = Number(patient?.balance?.current ?? 0);

    return (
        <aside className="hidden w-[280px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-gray-200 bg-white p-4 text-[13px] xl:flex dark:border-gray-800 dark:bg-gray-900" aria-label="Contexto da conversa">
            {isPatient ? (
                <section className="grid gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Paciente</h3>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                        <Row k="Próxima sessão">{fmtDate(patient?.nextAppointment, true)}</Row>
                        <Row k="Última sessão">{fmtDate(patient?.lastAppointment)}</Row>
                        <Row k="Em aberto">{debt > 0 ? <span className="font-semibold text-red-600 dark:text-red-400">{brl(debt)}</span> : '—'}</Row>
                        {patient?.mainComplaint && <Row k="Queixa">{patient.mainComplaint}</Row>}
                    </dl>
                </section>
            ) : (
                <section className="grid gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Lead</h3>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                        <Row k="Origem">{lead?.origin || '—'}</Row>
                        <Row k="Interesse">{specialtyText(lead?.therapyArea) || '—'}</Row>
                        {lead?.age != null && <Row k="Idade">{lead.age} {lead.age === 1 ? 'ano' : 'anos'}</Row>}
                        <Row k="Etapa">{stageLabel(lead?.stage)}</Row>
                        <Row k="1º contato">{fmtDate(lead?.createdAt, true)}</Row>
                    </dl>
                </section>
            )}

            <div className="rounded-xl bg-amber-50 p-3 text-gray-900 dark:bg-amber-500/10 dark:text-gray-100">
                <b className="mb-0.5 block text-[11.5px] uppercase tracking-wide text-amber-700 dark:text-amber-300">Próximo passo</b>
                {nextStep(isPatient ? 'paciente' : lead?.stage, waiting)}
            </div>

            <div className="grid gap-1.5">
                <button type="button" onClick={openAgenda}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-700">
                    <CalendarPlus size={15} aria-hidden /> {isPatient ? 'Abrir agenda' : 'Agendar avaliação'}
                </button>
                {waiting && contact.leadId && (
                    <button type="button" onClick={markAnswered} disabled={saving}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
                        <Check size={15} aria-hidden /> Marcar como respondido
                    </button>
                )}
            </div>
        </aside>
    );
};

export default ChatContextPanel;
