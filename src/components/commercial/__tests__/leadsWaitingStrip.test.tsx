// Fila "Lead sem resposta" (20/11/2026): responsável, motivo e contagem da Amanda. Dados fictícios.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { WaitingLead } from '../../../services/commercialService';

const register = vi.fn<(p: unknown) => Promise<object>>(async () => ({}));
vi.mock('../../../services/commercialService', () => ({
    commercialService: { registerContact: register },
}));

const { LeadsWaitingStrip, assigneeLabel } = await import('../CommercialParts');

const lead = (over: Partial<WaitingLead>): WaitingLead => ({
    leadId: 'l1', name: 'Lead Ana', phone: '62999990000', therapyArea: 'fono', origin: null, status: 'novo',
    waitingSince: new Date(Date.now() - 10 * 60_000).toISOString(), waitingMinutes: 10, lastMessage: 'oi',
    waitKey: 'handoff|A|A', reason: 'handoff' as const, handoffAt: new Date(Date.now() - 10 * 60_000).toISOString(), handoffMotivo: 'pediu atendente',
    assignee: { kind: 'atendente' as const, id: 'u1', name: 'Ana Recepção' }, ...over,
});

describe('assigneeLabel', () => {
    it('mostra o nome, "Ninguém assumiu" ou "Responsável não identificado"', () => {
        expect(assigneeLabel({ kind: 'atendente', id: 'u1', name: 'Ana Recepção' })).toBe('Ana Recepção');
        expect(assigneeLabel({ kind: 'ninguem' })).toBe('Ninguém assumiu');
        expect(assigneeLabel({ kind: 'nao_identificado' })).toBe('Responsável não identificado');
        expect(assigneeLabel(undefined)).toBe('Ninguém assumiu');
    });
});

describe('LeadsWaitingStrip', () => {
    it('mostra responsável, motivo do encaminhamento e a contagem à parte da Amanda', () => {
        render(<LeadsWaitingStrip withAmanda={4} onChanged={() => {}} items={[
            lead({}),
            lead({ leadId: 'l2', name: 'Lead Agenda', assignee: { kind: 'nao_identificado' } }),
            lead({ leadId: 'l3', name: 'Lead Novo', assignee: { kind: 'ninguem' }, reason: 'nova_mensagem', handoffMotivo: null }),
        ]} />);
        expect(screen.getByText('3 leads esperando resposta da equipe')).toBeTruthy();
        expect(screen.getByText('4 conversas com a Amanda agora')).toBeTruthy();
        expect(screen.getByText('Ana Recepção')).toBeTruthy();
        expect(screen.getByText('Responsável não identificado')).toBeTruthy();
        expect(screen.getByText('Ninguém assumiu')).toBeTruthy();
        expect(screen.getAllByText(/Encaminhado pela Amanda: pediu atendente/).length).toBe(2);
        expect(screen.getByText(/Nova mensagem/)).toBeTruthy();
    });

    it('sem ninguém esperando, mostra só a contagem da Amanda', () => {
        render(<LeadsWaitingStrip withAmanda={1} onChanged={() => {}} items={[]} />);
        expect(screen.getByText(/1 conversa com a Amanda agora/)).toBeTruthy();
        expect(screen.queryByRole('heading')).toBeNull();
    });

    it('"Marcar como respondido" registra lead_reply e recarrega a fila', async () => {
        const onChanged = vi.fn();
        render(<LeadsWaitingStrip onChanged={onChanged} items={[lead({})]} />);
        fireEvent.click(screen.getByRole('button', { name: 'Marcar como respondido' }));
        await waitFor(() => expect(register).toHaveBeenCalledWith(expect.objectContaining({ targetType: 'lead', targetId: 'l1', kind: 'lead_reply', waitKey: 'handoff|A|A' })));
        await waitFor(() => expect(onChanged).toHaveBeenCalled());
    });

    it('marcou e a Amanda encaminhou de novo: o lead reaparece sem recarregar a página', async () => {
        const { rerender } = render(<LeadsWaitingStrip onChanged={() => {}} items={[lead({})]} />);
        fireEvent.click(screen.getByRole('button', { name: 'Marcar como respondido' }));
        await waitFor(() => expect(screen.queryByText('Lead Ana')).toBeNull());
        // a próxima busca da fila traz o mesmo lead com um novo encaminhamento (outra waitKey)
        rerender(<LeadsWaitingStrip onChanged={() => {}} items={[lead({ waitKey: 'handoff|B|B' })]} />);
        expect(screen.getByText('Lead Ana')).toBeTruthy();
    });

    it('servidor responde 409 (a espera mudou): não some, avisa e recarrega a fila', async () => {
        register.mockImplementationOnce(async () => { throw Object.assign(new Error('conflito'), { response: { status: 409 } }); });
        const onChanged = vi.fn();
        render(<LeadsWaitingStrip onChanged={onChanged} items={[lead({})]} />);
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Marcar como respondido' })); });
        expect(screen.getByText('Lead Ana')).toBeTruthy();
        expect(screen.getByRole('status').textContent).toContain('a conversa mudou');
        expect(onChanged).toHaveBeenCalled();
    });
});
