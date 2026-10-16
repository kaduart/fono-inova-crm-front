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


function renderCompletion(overrides: any = {}) {
    const onCompleteAppointment = vi.fn().mockResolvedValue(undefined);
    render(<GroupedAppointmentDetailModal isOpen initialTab="confirm" onClose={vi.fn()} doctors={[]}
        event={{ ...event, sessionValue:150, paymentAmount:150, paymentMethod:'pix', serviceType:'individual_session', ...overrides }}
        onCancelAppointment={vi.fn()} onCompleteAppointment={onCompleteAppointment} onEditAppointment={vi.fn()} />);
    return onCompleteAppointment;
}
const prepaid = { _id:'pkg',model:'prepaid',paymentType:'full',financialStatus:'paid',totalSessions:10,sessionsDone:2 };
describe('conclusão: particular avulso, pacote pré-pago e por sessão', () => {
    beforeEach(() => vi.clearAllMocks());
    it('pré-pago mostra o pagamento no pacote sem pedir novo recebimento', async () => {
        renderCompletion({package:prepaid,serviceType:'package_session',paymentMethod:''});
        expect(await screen.findByText('Pagamento vinculado ao pacote pré-pago')).toBeInTheDocument();
        expect(screen.queryByText('Formas de Pagamento')).not.toBeInTheDocument();
        expect(screen.queryByText(/Valor recebido agora/)).not.toBeInTheDocument();
        expect(screen.queryByText('Conta Corrente do Paciente')).not.toBeInTheDocument();
    });
    it('concluir pré-pago não envia recebimento, método ou split fictícios', async () => {
        const complete = renderCompletion({package:prepaid,serviceType:'package_session',paymentMethod:''});
        fireEvent.click(await screen.findByRole('button',{name:/Realizar Atendimento/i}));
        await waitFor(() => expect(complete).toHaveBeenCalled());
        const data = complete.mock.calls[0][1];
        expect(data).not.toHaveProperty('paymentMethod');
        expect(data).not.toHaveProperty('paymentAmount');
        expect(data).not.toHaveProperty('sessionValue');
        expect(data).not.toHaveProperty('splitMethods');
        expect(data).not.toHaveProperty('addToBalance');
    });
    it('pacote por sessão mantém recebimento e split de pagamento', async () => {
        const complete = renderCompletion({package:{...prepaid,model:'per_session',paymentType:'per-session'},serviceType:'package_session'});
        expect(await screen.findByText('Formas de Pagamento')).toBeInTheDocument();
        expect(screen.queryByText('Pacote pré-pago')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button',{name:/Realizar Atendimento/i}));
        await waitFor(() => expect(complete).toHaveBeenCalled());
        expect(complete.mock.calls[0][1].splitMethods).toEqual([expect.objectContaining({amount:150,method:'pix'})]);
    });
    it('particular avulso mantém formulário de recebimento', async () => {
        renderCompletion();
        expect(await screen.findByText('Formas de Pagamento')).toBeInTheDocument();
        expect(screen.queryByText('Pagamento vinculado ao pacote pré-pago')).not.toBeInTheDocument();
    });
    it('convênio mantém valor tabela e não vira pré-pago', async () => {
        renderCompletion({billingType:'convenio',paymentMethod:'convenio',insuranceProvider:'Unimed',insuranceValue:80,package:{...prepaid,type:'convenio'}});
        expect(await screen.findByText('Valor Tabela')).toBeInTheDocument();
        expect(screen.queryByText('Formas de Pagamento')).not.toBeInTheDocument();
        expect(screen.queryByText('Pagamento vinculado ao pacote pré-pago')).not.toBeInTheDocument();
    });
    it('vínculo sem modelo conhecido não afirma que o pacote está pago', async () => {
        renderCompletion({package:{_id:'pkg'},serviceType:'package_session'});
        expect(await screen.findByText('Sessão de pacote')).toBeInTheDocument();
        expect(screen.queryByText('Pacote Pago')).not.toBeInTheDocument();
        expect(screen.getByText('Formas de Pagamento')).toBeInTheDocument();
    });
});
