/**
 * Cobre dois fixes de 2026-09-22 no mesmo componente:
 *
 * 1. Extração de dia/mês em UTC: dateOfBirth é gravado como meia-noite UTC representando
 *    o dia pretendido, sem semântica de horário. Ler com getDate()/getMonth() LOCAIS em
 *    Brasília (UTC-3) volta pro dia anterior — "hoje" nunca acendia e o card mostrava
 *    "PASSOU" um dia antes do real. Fix: sempre getUTCDate()/getUTCMonth(). Ver mesmo fix
 *    em DashboardContentOptimized.tsx, pages/doctor/DoctorDashboard.tsx e back/routes/patient.js.
 *
 * 2. Pedido do usuário: o card deve abrir mostrando só quem faz aniversário HOJE, não a
 *    lista inteira do mês — "Todo mês" vira uma opção, não o padrão.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BirthdayCard from '../BirthdayCard';
import { sendBirthdayMessage } from '../../../services/whatsappService';

vi.mock('../../../services/whatsappService', () => ({
    sendBirthdayMessage: vi.fn(),
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const MARIA = { _id: 'maria', fullName: 'Maria Luiza Gomes Silva', dateOfBirth: '2023-09-22T00:00:00.000Z', phone: '' };
const PEDRO = { _id: 'pedro', fullName: 'Pedro Henrique Silva', dateOfBirth: '2017-09-01T00:00:00.000Z', phone: '' };
const RAFAEL = { _id: 'rafael', fullName: 'Rafael Lima Silva', dateOfBirth: '2024-09-26T00:00:00.000Z', phone: '' };

describe('BirthdayCard', () => {
    beforeEach(() => {
        vi.mocked(sendBirthdayMessage).mockReset().mockResolvedValue({ success: true, sent: true });
        // 15h em Brasília (UTC-3) de 22/09/2026 — bem longe da meia-noite, não é um caso de borda de fuso.
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-22T15:00:00-03:00'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('por padrão mostra só quem faz aniversário hoje, mesmo com o mês inteiro na lista', () => {
        render(<BirthdayCard patients={[PEDRO, MARIA, RAFAEL]} />);

        expect(screen.getByText('HOJE')).toBeInTheDocument();
        expect(screen.getByText('Maria Luiza Gomes Silva')).toBeInTheDocument();
        expect(screen.queryByText('Pedro Henrique Silva')).not.toBeInTheDocument();
        expect(screen.queryByText('Rafael Lima Silva')).not.toBeInTheDocument();
        expect(screen.getByText((_, node) => node?.textContent === '22 de setembro – 1 paciente')).toBeInTheDocument();
    });

    it('extrai o dia em UTC — dateOfBirth de hoje não aparece deslocado um dia pro passado', () => {
        render(<BirthdayCard patients={[MARIA]} />);

        expect(screen.getByText('HOJE')).toBeInTheDocument();
        expect(screen.queryByText('PASSOU')).not.toBeInTheDocument();
        // getDate() local (bug) devolveria 21 — confirma que o dia exibido é o 22 real.
        expect(screen.getByText('22 de setembro')).toBeInTheDocument();
    });

    it('sem ninguém fazendo aniversário hoje, mostra o estado vazio "hoje" (não esconde o mês inteiro)', () => {
        render(<BirthdayCard patients={[PEDRO, RAFAEL]} />);

        expect(screen.getByText('Nenhum aniversariante hoje')).toBeInTheDocument();
    });

    it('alternando pra "Todo mês", mostra todo mundo do mês, cada um com o dia UTC correto', () => {
        render(<BirthdayCard patients={[PEDRO, MARIA, RAFAEL]} />);

        fireEvent.click(screen.getByRole('button', { name: 'Ver todo o mês' }));

        expect(screen.getByText((_, node) => node?.textContent === 'setembro – 3 pacientes')).toBeInTheDocument();
        expect(screen.getByText('Pedro Henrique Silva')).toBeInTheDocument();
        expect(screen.getByText('Rafael Lima Silva')).toBeInTheDocument();
        // Pedro (dia 1) já passou de verdade — segue marcado; Maria (hoje) não.
        expect(screen.getAllByText('PASSOU')).toHaveLength(1);
        expect(screen.getAllByText('HOJE')).toHaveLength(1);
    });
    describe('enviar mensagem de aniversário (WhatsApp)', () => {
        const MARIA_TEL = { ...MARIA, phone: '(62) 99124-2993' };

        it('clicar no sino pede ao backend o envio do parabéns daquele paciente', async () => {
            render(<BirthdayCard patients={[MARIA_TEL]} />);

            await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Enviar lembrete' })); });

            expect(sendBirthdayMessage).toHaveBeenCalledTimes(1);
            expect(sendBirthdayMessage).toHaveBeenCalledWith('maria');
        });

        it('depois de enviar, o botão fica travado e não envia de novo', async () => {
            render(<BirthdayCard patients={[MARIA_TEL]} />);
            const btn = screen.getByRole('button', { name: 'Enviar lembrete' });

            await act(async () => { fireEvent.click(btn); });

            expect(btn).toBeDisabled();
            fireEvent.click(btn);
            expect(sendBirthdayMessage).toHaveBeenCalledTimes(1);
        });

        it('se o backend avisar que já foi enviado (409, ex.: cron das 10h), só trava o botão', async () => {
            vi.mocked(sendBirthdayMessage).mockRejectedValueOnce({ response: { status: 409 } });
            render(<BirthdayCard patients={[MARIA_TEL]} />);
            const btn = screen.getByRole('button', { name: 'Enviar lembrete' });

            await act(async () => { fireEvent.click(btn); });

            expect(btn).toBeDisabled();
        });

        it('sem telefone cadastrado o botão fica desabilitado e nada é enviado', () => {
            render(<BirthdayCard patients={[MARIA]} />);

            const btn = screen.getByRole('button', { name: 'Enviar lembrete' });
            expect(btn).toBeDisabled();
            fireEvent.click(btn);
            expect(sendBirthdayMessage).not.toHaveBeenCalled();
        });

        it('quem não faz aniversário hoje (já passou) não pode receber a mensagem', () => {
            render(<BirthdayCard patients={[{ ...PEDRO, phone: '62999990000' }]} />);
            fireEvent.click(screen.getByRole('button', { name: 'Ver todo o mês' }));

            expect(screen.getByRole('button', { name: 'Enviar lembrete' })).toBeDisabled();
        });

        it('falha no envio não trava o botão (dá pra tentar de novo)', async () => {
            vi.mocked(sendBirthdayMessage).mockRejectedValueOnce(new Error('boom'));
            render(<BirthdayCard patients={[MARIA_TEL]} />);
            const btn = screen.getByRole('button', { name: 'Enviar lembrete' });

            await act(async () => { fireEvent.click(btn); });

            expect(btn).not.toBeDisabled();
        });
    });
});
