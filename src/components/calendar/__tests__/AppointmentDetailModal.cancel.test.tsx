import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('react-toastify', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn(), warning: vi.fn() },
}));
vi.mock('../../../hooks/useConvenios', () => ({
    useConvenios: () => ({ convenios: [], isLoading: false }),
}));
vi.mock('../../../services/financialSummaryService', () => ({
    getPatientFinancialSummary: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../../services/liminarContractService', () => ({
    default: { getContractsByPatient: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../../../services/api', () => ({
    default: { get: vi.fn().mockResolvedValue({ data: [] }), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));
vi.mock('../../../services/appointmentService', () => ({
    default: { getStatus: vi.fn(), update: vi.fn() },
    appointmentService: { getStatus: vi.fn(), update: vi.fn() },
}));

import AppointmentCancellationModal from '../AppointmentCancellationModal';
import GroupedAppointmentDetailModal from '../appointmentDetailModal';

const event: any = {
    id: 'appt-1',
    patient: { id: 'p1', fullName: 'Maria Souza' },
    doctor: { id: 'd1', fullName: 'Dra. Ana' },
    date: new Date('2026-10-20T12:00:00Z'),
    startTime: '10:00',
    operationalStatus: 'scheduled',
    clinicalStatus: 'pending',
    reason: 'Sessão',
    formattedDate: '20/10/2026',
    backgroundColor: '#fff',
    borderColor: '#000',
    start: '2026-10-20T10:00:00',
    billingType: 'particular',
};

function setup() {
    const onCancelAppointment = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const view = () => <AppointmentCancellationModal event={event} onClose={onClose} onCancelAppointment={onCancelAppointment} />;
    const { rerender } = render(view());
    return { onCancelAppointment, onClose, reopen: () => { rerender(<></>); rerender(view()); } };
}

describe('AppointmentCancellationModal — janela única', () => {
    beforeEach(() => vi.clearAllMocks());

    it('botão bloqueado mostra o que falta; libera com solicitante + motivo e envia cancelRequester', async () => {
        const { onCancelAppointment } = setup();
        const btn = screen.getByRole('button', { name: /Confirmar cancelamento/i });

        expect(btn).toBeDisabled();
        // avisos junto de cada campo + tooltip combinado no botão
        expect(screen.getByText('Selecione quem solicitou.')).toBeInTheDocument();
        expect(screen.getByText('Informe o motivo.')).toBeInTheDocument();
        expect(btn.closest('span')).toHaveAttribute('title', 'Falta informar quem solicitou e o motivo.');

        fireEvent.click(screen.getByRole('radio', { name: /Paciente\/responsável/i }));
        expect(screen.queryByText('Selecione quem solicitou.')).not.toBeInTheDocument();
        expect(screen.getByText('Informe o motivo.')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText(/Motivo/i), { target: { value: 'Paciente doente' } });
        expect(btn).toBeEnabled();
        expect(screen.queryByText('Informe o motivo.')).not.toBeInTheDocument();

        fireEvent.click(btn);
        await waitFor(() => expect(onCancelAppointment).toHaveBeenCalled());
        const [id, reason, extras] = onCancelAppointment.mock.calls[0];
        expect(id).toBe('appt-1');
        expect(reason).toBe('Paciente doente');
        expect(extras.cancelRequester).toBe('patient');
    });

    it('WhatsApp: vem MARCADO por padrão e o valor escolhido vai no pedido (true/false)', async () => {
        const { onCancelAppointment } = setup();
        const box = screen.getByRole('checkbox', { name: /Notificar paciente por WhatsApp/i });
        expect(box).toBeChecked();

        fireEvent.click(screen.getByRole('radio', { name: /Clínica/i }));
        fireEvent.change(screen.getByLabelText(/Motivo/i), { target: { value: 'Sala em manutenção' } });
        fireEvent.click(screen.getByRole('button', { name: /Confirmar cancelamento/i }));
        await waitFor(() => expect(onCancelAppointment).toHaveBeenCalledTimes(1));
        expect(onCancelAppointment.mock.calls[0][2].notifyPatient).toBe(true);
    });

    it('WhatsApp desmarcado envia notifyPatient=false; campos são preservados se a API falhar', async () => {
        const { onCancelAppointment } = setup();
        onCancelAppointment.mockRejectedValueOnce(new Error('erro de API'));
        fireEvent.click(screen.getByRole('checkbox', { name: /Notificar paciente por WhatsApp/i }));
        fireEvent.click(screen.getByRole('radio', { name: /Profissional/i }));
        fireEvent.change(screen.getByLabelText(/Motivo/i), { target: { value: 'Congresso' } });
        fireEvent.click(screen.getByRole('button', { name: /Confirmar cancelamento/i }));

        await waitFor(() => expect(onCancelAppointment).toHaveBeenCalledTimes(1));
        expect(onCancelAppointment.mock.calls[0][2].notifyPatient).toBe(false);
        // erro de API: nada é apagado
        expect(await screen.findByLabelText(/Motivo/i)).toHaveValue('Congresso');
        expect(screen.getByRole('radio', { name: /Profissional/i })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByRole('checkbox', { name: /Notificar paciente por WhatsApp/i })).not.toBeChecked();
    });

    it('Voltar fecha a janela única sem abrir Detalhes', () => {
        const { onClose } = setup();
        fireEvent.click(screen.getByRole('button', { name: /^Voltar$/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });
    it('bloqueia envio duplicado enquanto o cancelamento está pendente', async () => {
        const { onCancelAppointment } = setup();
        onCancelAppointment.mockImplementationOnce(() => new Promise(() => {}));
        fireEvent.click(screen.getByRole('radio', { name: /Profissional/i }));
        fireEvent.change(screen.getByLabelText(/Motivo/i), { target: { value: 'Indisponibilidade' } });
        const button = screen.getByRole('button', { name: /Confirmar cancelamento/i });
        fireEvent.click(button);
        fireEvent.click(button);
        expect(onCancelAppointment).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: /Cancelando/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /Fechar janela/i })).toBeDisabled();
    });

    it('reabrir a janela restaura WhatsApp e exige uma nova seleção', async () => {
        const { reopen } = setup();
        fireEvent.click(screen.getByRole('radio', { name: /Clínica/i }));
        fireEvent.click(screen.getByRole('checkbox', { name: /Notificar paciente por WhatsApp/i }));
        fireEvent.click(screen.getByRole('button', { name: /^Voltar$/i }));
        reopen();
        expect(screen.getByRole('checkbox', { name: /Notificar paciente por WhatsApp/i })).toBeChecked();
        expect(screen.getByRole('radio', { name: /Clínica/i })).toHaveAttribute('aria-checked', 'false');
    });

    it('o modal agrupado possui somente Detalhes, Finalizar e Editar', () => {
        render(<GroupedAppointmentDetailModal isOpen onClose={vi.fn()} event={event} doctors={[]}
            onCancelAppointment={vi.fn()} onCompleteAppointment={vi.fn()} onEditAppointment={vi.fn()} />);
        expect(screen.getByRole('tab', { name: /Detalhes/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /Finalizar/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /Editar/i })).toBeInTheDocument();
        expect(screen.queryByRole('tab', { name: /Cancelar/i })).not.toBeInTheDocument();
    });

});
