// src/components/doctor/overview/agendaUtils.ts
// Helpers da aba Dashboard do terapeuta. "Hoje" é sempre a data LOCAL (America/Sao_Paulo):
// toISOString() vira o dia seguinte depois das 21h e escondia a agenda à noite.
import { toDateString } from '../../../utils/dateUtils';

export const todayLocal = () => toDateString(new Date());

export const tomorrowLocal = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toDateString(d);
};

/** Status operacional real (o backend antigo mandava `status`, o atual manda `operationalStatus`). */
export const opStatus = (apt: any): string => apt?.operationalStatus || apt?.status || 'scheduled';

export const CANCELED_STATUSES = ['canceled', 'force_cancelled', 'suspended'];
export const isCanceled = (apt: any) => CANCELED_STATUSES.includes(opStatus(apt));
export const isCompleted = (apt: any) => opStatus(apt) === 'completed';
export const isMissed = (apt: any) => opStatus(apt) === 'missed';
/** Ainda aguarda atendimento (pre_agendado entra em todo filtro ativo — DOMAIN_INVARIANTS). */
export const isOpen = (apt: any) => ['pre_agendado', 'scheduled', 'confirmed', 'pending'].includes(opStatus(apt));
export const isUnconfirmed = (apt: any) => ['pre_agendado', 'scheduled', 'pending'].includes(opStatus(apt));

/** Data+hora local do atendimento (date vem como dia em UTC; time é "HH:mm" local). */
export function aptDateTime(apt: any): Date | null {
    const day = toDateString(apt?.date);
    if (!day) return null;
    const [h, m] = String(apt?.time || '00:00').split(':').map(Number);
    const [y, mo, d] = day.split('-').map(Number);
    return new Date(y, mo - 1, d, h || 0, m || 0);
}

export const patientOf = (apt: any) => {
    const p = apt?.patient || apt?.patientInfo || {};
    return {
        _id: p._id || p.id || apt?.patientId || '',
        fullName: p.fullName || p.name || apt?.patientName || 'Paciente',
        phone: p.phone || '',
        dateOfBirth: p.dateOfBirth,
    };
};

/** Link do WhatsApp com DDI 55; null quando o telefone não tem dígitos suficientes. */
export function whatsappLink(phone?: string): string | null {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length < 10) return null;
    const full = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`;
    return `https://wa.me/${full}`;
}

export function minutesUntil(date: Date | null): number | null {
    if (!date) return null;
    return Math.round((date.getTime() - Date.now()) / 60000);
}

export function relativeLabel(mins: number | null): string {
    if (mins === null) return '';
    if (mins <= 0) return 'agora';
    if (mins < 60) return `em ${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `em ${h}h${String(m).padStart(2, '0')}` : `em ${h}h`;
}

export const firstName = (name: string) => String(name || '').split(' ')[0];
