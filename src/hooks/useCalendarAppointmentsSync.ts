import { useEffect } from 'react';

interface CalendarRange {
    startDate?: string;
    endDate?: string;
}

interface UseCalendarAppointmentsSyncParams {
    /** Aba de agenda ativa ('Calendário' ou 'Pré-Agendamentos'). */
    isCalendarTab: boolean;
    /** A aba de agenda já foi aberta alguma vez (range inicial definido). */
    hasLoaded: boolean;
    range: CalendarRange;
    fetchAppointments: (filters?: any) => Promise<void> | void;
}

/**
 * Mantém o array compartilhado do AppointmentsContext alinhado ao mês visível do calendário.
 *
 * O contexto guarda UM único conjunto de agendamentos, que qualquer tela sobrescreve
 * (ex: Financeiro → Pagamentos busca só "hoje"). Por isso a busca não pode depender apenas
 * de o range mudar: ao (re)entrar na agenda o range costuma ser o mesmo de antes, e sem
 * refazer a busca o calendário exibiria o que a outra tela deixou (só o dia de hoje).
 * O próprio fetchAppointments faz o cache por período — se o contexto já tem este mês,
 * é no-op (sem requisição).
 */
export function useCalendarAppointmentsSync({
    isCalendarTab,
    hasLoaded,
    range,
    fetchAppointments,
}: UseCalendarAppointmentsSyncParams) {
    useEffect(() => {
        if (isCalendarTab && hasLoaded && range.startDate && range.endDate) {
            console.log('📅 AdminDashboard: Buscando appointments para range:', range);
            fetchAppointments({ ...range, light: true });
        }
    }, [fetchAppointments, range.startDate, range.endDate, hasLoaded, isCalendarTab]);
}
