// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RescheduleDialog, { RescheduleTarget } from '../RescheduleDialog';

const target: RescheduleTarget = {
    id: 'appt-1',
    patientName: 'Nicolas Lucca',
    doctorId: 'doc-1',
    doctorName: 'Luis Henrique',
    specialtyLabel: 'Terapia Ocupacional',
    currentDate: '2099-10-08',
    currentTime: '16:00',
};

// Formato real da API (/available-slots): objetos com available/reason/label
const apiSlots = [
    { time: '08:00', available: true },
    { time: '09:00', available: true },
    { time: '10:00', available: true },
    { time: '11:00', available: false, reason: 'appointment', label: 'Horário Ocupado' },
];

const setup = (overrides: Partial<React.ComponentProps<typeof RescheduleDialog>> = {}) => {
    const onFetchAvailableSlots = vi.fn().mockResolvedValue(apiSlots);
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
        <RescheduleDialog
            target={target}
            onClose={onClose}
            onFetchAvailableSlots={onFetchAvailableSlots}
            onConfirm={onConfirm}
            {...overrides}
        />
    );
    return { onFetchAvailableSlots, onConfirm, onClose };
};

const changeDate = (value: string) =>
    fireEvent.change(screen.getByLabelText('Nova data') as HTMLInputElement, { target: { value } });

describe('RescheduleDialog', () => {
    afterEach(() => cleanup());

    it('não renderiza nada sem alvo', () => {
        const { container } = render(
            <RescheduleDialog
                target={null}
                onClose={vi.fn()}
                onFetchAvailableSlots={vi.fn()}
                onConfirm={vi.fn()}
            />
        );
        expect(container.innerHTML).toBe('');
        expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    });

    it('busca horários livres do profissional e mostra o horário atual desabilitado no mesmo dia', async () => {
        const { onFetchAvailableSlots } = setup();

        await waitFor(() =>
            expect(onFetchAvailableSlots).toHaveBeenCalledWith({ doctorId: 'doc-1', date: '2099-10-08' })
        );
        await screen.findByText('08:00');

        const current = screen.getByText('16:00').closest('button') as HTMLButtonElement;
        expect(current.disabled).toBe(true);
        expect(screen.getByText('atual')).toBeTruthy();
    });

    it('não quebra com slots em objeto e deixa o horário ocupado desabilitado com o motivo', async () => {
        setup();
        await screen.findByText('09:00');

        const busy = screen.getByText('11:00').closest('button') as HTMLButtonElement;
        expect(busy.disabled).toBe(true);
        expect(busy.getAttribute('title')).toBe('Horário Ocupado');
        // clicar no ocupado não habilita confirmar
        fireEvent.click(busy);
        expect((screen.getByRole('button', { name: /^Remarcar/ }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('avisa quando todos os horários do dia estão ocupados', async () => {
        setup({ onFetchAvailableSlots: vi.fn().mockResolvedValue([{ time: '08:00', available: false, label: 'Horário Ocupado' }]) });
        expect(await screen.findByText(/Todos os horários deste dia estão ocupados/)).toBeTruthy();
    });

    it('mantém Confirmar desabilitado até escolher um horário diferente do atual', async () => {
        setup();
        await screen.findByText('09:00');

        const confirm = screen.getByRole('button', { name: /^Remarcar/ }) as HTMLButtonElement;
        expect(confirm.disabled).toBe(true);

        fireEvent.click(screen.getByText('09:00'));
        expect((screen.getByRole('button', { name: /Remarcar para/ }) as HTMLButtonElement).disabled).toBe(false);
    });

    it('ao trocar a data busca de novo os horários e limpa a seleção', async () => {
        const { onFetchAvailableSlots } = setup();
        await screen.findByText('09:00');
        fireEvent.click(screen.getByText('09:00'));

        changeDate('2099-10-12');

        await waitFor(() =>
            expect(onFetchAvailableSlots).toHaveBeenLastCalledWith({ doctorId: 'doc-1', date: '2099-10-12' })
        );
        // sem horário selecionado de novo → botão de confirmar desabilitado
        await waitFor(() =>
            expect((screen.getByRole('button', { name: /^Remarcar/ }) as HTMLButtonElement).disabled).toBe(true)
        );
        // fora do dia atual, 16:00 não é mais oferecido
        expect(screen.queryByText('16:00')).toBeNull();
    });

    it('confirma com data e horário escolhidos e fecha o diálogo', async () => {
        const { onConfirm, onClose } = setup();
        await screen.findByText('10:00');

        changeDate('2099-10-12');
        await screen.findByText('10:00');
        fireEvent.click(screen.getByText('10:00'));
        fireEvent.click(screen.getByRole('button', { name: /Remarcar para 12\/10\/2099 às 10:00/ }));

        await waitFor(() =>
            expect(onConfirm).toHaveBeenCalledWith('appt-1', { date: '2099-10-12', time: '10:00' })
        );
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('mostra o erro da API inline e não fecha quando a remarcação falha (ex.: guia vencida)', async () => {
        const onConfirm = vi.fn().mockRejectedValue({
            response: { data: { message: 'A guia #16323329 vence em 20/10/2026. Escolha uma data até esse dia.' } },
        });
        const { onClose } = setup({ onConfirm });
        await screen.findByText('09:00');

        fireEvent.click(screen.getByText('09:00'));
        fireEvent.click(screen.getByRole('button', { name: /Remarcar para/ }));

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain('vence em 20/10/2026');
        expect(onClose).not.toHaveBeenCalled();
        // botão volta a ficar disponível para tentar outro horário
        expect((screen.getByRole('button', { name: /Remarcar para/ }) as HTMLButtonElement).disabled).toBe(false);
    });

    it('bloqueia feriado: avisa, não busca horários e desabilita confirmar', async () => {
        const isHoliday = (d: string) => d === '2099-12-25';
        const { onFetchAvailableSlots } = setup({ isHoliday, getHolidayName: () => 'Natal' });
        await screen.findByText('09:00');
        onFetchAvailableSlots.mockClear();

        changeDate('2099-12-25');

        expect(await screen.findByText(/Natal — sem atendimento/)).toBeTruthy();
        expect(onFetchAvailableSlots).not.toHaveBeenCalled();
        expect((screen.getByRole('button', { name: /^Remarcar/ }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('pré-preenchimento (arrastar): horário ocupado é limpo com aviso', async () => {
        setup({
            target: { ...target, initialDate: '2099-10-12', initialTime: '11:30' },
        });

        expect(await screen.findByText(/11:30 não está livre/)).toBeTruthy();
        expect((screen.getByRole('button', { name: /^Remarcar/ }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('pré-preenchimento (arrastar): horário livre fica selecionado e pronto para confirmar', async () => {
        setup({
            target: { ...target, initialDate: '2099-10-12', initialTime: '09:00' },
        });

        const confirm = await screen.findByRole('button', { name: /Remarcar para 12\/10\/2099 às 09:00/ });
        expect((confirm as HTMLButtonElement).disabled).toBe(false);
    });
});
