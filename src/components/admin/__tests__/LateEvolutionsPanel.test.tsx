import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LateEvolutionsPanel, lateEvolutionsDetail, lateReminderMessage } from '../LateEvolutionsPanel';
import type { LateEvolutionsSummary } from '../../../services/evolutionService';

vi.mock('../../commercial/commercialCopy', async (orig) => ({ ...(await orig<object>()), openWhatsApp: vi.fn(() => true) }));

const item = (fullName: string, daysLate: number, draft = false) => ({
    _id: fullName, fullName, daysLate, lastCompletedDate: '2026-10-30T00:00:00.000Z', lastEvolutionDate: null,
    lastAppointmentId: `a-${fullName}`, lastCompletedTime: '14:00',
    draft: draft ? { evolutionId: 'e', appointmentId: 'a', lastAutosaveAt: null } : null,
});
const data: LateEvolutionsSummary = {
    total: 3, drafts: 1, oldestDaysLate: 6,
    doctors: [
        { doctorId: 'd1', fullName: 'Ana Souza', specialty: 'fonoaudiologia', phoneNumber: '62999990000', pendingCount: 2, draftCount: 1, oldestDaysLate: 6, items: [item('Pedro Lima', 6), item('Helena Costa', 0, true)] },
        { doctorId: 'd2', fullName: 'Bruna Reis', specialty: 'psicologia', phoneNumber: null, pendingCount: 1, draftCount: 0, oldestDaysLate: 1, items: [item('Davi Rocha', 1)] },
    ],
};

describe('Evoluções em atraso', () => {
    it('resumo da linha do Precisa de você', () => {
        expect(lateEvolutionsDetail(data)).toBe('2 terapeutas · mais antiga há 6 dias · 1 rascunho');
        expect(lateEvolutionsDetail({ doctors: [], total: 0, drafts: 0, oldestDaysLate: 0 })).toBe('');
    });

    it('mensagem de lembrete cita os pacientes pelo primeiro nome', () => {
        expect(lateReminderMessage(data.doctors[0])).toBe('Oi, Ana! Ficaram 2 evoluções para fechar no sistema (Pedro e Helena). Consegue finalizar hoje? Obrigado!');
    });

    it('filtra por mais de 2 dias e por rascunho; sem telefone desativa o lembrete', () => {
        render(<LateEvolutionsPanel data={data} onClose={() => {}} />);
        expect(screen.getByText('Pedro Lima')).toBeTruthy();
        expect(screen.getByText('rascunho salvo')).toBeTruthy();
        const lembrar = screen.getAllByRole('button', { name: /Lembrar/ });
        expect((lembrar[1] as HTMLButtonElement).disabled).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: /Mais de 2 dias/ }));
        expect(screen.getByText('Pedro Lima')).toBeTruthy();
        expect(screen.queryByText('Davi Rocha')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /Só rascunhos/ }));
        expect(screen.getByText('Helena Costa')).toBeTruthy();
        expect(screen.queryByText('Pedro Lima')).toBeNull();
    });
});
