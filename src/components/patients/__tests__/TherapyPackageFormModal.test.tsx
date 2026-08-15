import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TherapyPackageFormModal from '../TherapyPackageFormModal';
import API from '../../../services/api';

vi.mock('../../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('react-toastify', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

const mockPatient = { _id: 'patient-123', patientId: 'patient-123', fullName: 'Paciente Teste', phone: '61999999999' };
const mockDoctors = [
    { _id: 'doctor-1', fullName: 'Dr. Fono', specialty: 'fonoaudiologia' },
    { _id: 'doctor-2', fullName: 'Dr. Psico', specialty: 'psicologia' },
];

describe('TherapyPackageFormModal', () => {
    let queryClient: QueryClient;

    function mockApiWithBalance(items: any[]) {
        (API.get as any).mockImplementation((url: string) => {
            if (url.startsWith('/v2/appointments')) return Promise.resolve({ data: { data: { appointments: [] } } });
            if (url === `/v2/balance/${mockPatient.patientId}`) {
                return Promise.resolve({ data: { data: { v2_financial: { items } } } });
            }
            return Promise.resolve({ data: {} });
        });
    }

    beforeEach(() => {
        queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        vi.clearAllMocks();
        mockApiWithBalance([]);
    });

    const renderModal = (props = {}) => render(
        <QueryClientProvider client={queryClient}>
            <TherapyPackageFormModal initialData={null} patient={mockPatient} doctors={mockDoctors}
                onClose={vi.fn()} onSubmit={vi.fn()} {...props} />
        </QueryClientProvider>
    );

    const getSelect = (name: string) => {
        const select = document.querySelector(`select[name="${name}"]`);
        if (!select) throw new Error(`Select ${name} não encontrado`);
        return select as HTMLSelectElement;
    };
    const getDebtCheckboxes = () => Array.from(
        document.querySelectorAll('input[type="checkbox"].accent-rose-500')
    ) as HTMLInputElement[];
    const selectSpecialty = () => fireEvent.change(getSelect('sessionType'), { target: { value: 'fonoaudiologia' } });
    const importDebts = async () => {
        await waitFor(() => expect(API.get).toHaveBeenCalledWith(`/v2/balance/${mockPatient.patientId}`));
    };

    it('renderiza o modal com a interface atual', () => {
        renderModal();
        expect(screen.getByRole('dialog', { name: 'Criar Novo Pacote' })).toBeInTheDocument();
        expect(screen.getByText(/Criar pacote para/i)).toHaveTextContent('Criar pacote para Paciente Teste');
    });

    it('busca pendências no endpoint V2 e as apresenta como checkboxes', async () => {
        mockApiWithBalance([
            { _id: 'debit-1', amount: 130, specialty: 'fonoaudiologia', serviceDate: '2026-04-01' },
            { _id: 'debit-2', amount: 130, specialty: 'fonoaudiologia', serviceDate: '2026-04-08' },
        ]);
        renderModal(); selectSpecialty(); await importDebts();
        await waitFor(() => expect(getDebtCheckboxes()).toHaveLength(2));
    });

    it('filtra visualmente as pendências pela especialidade selecionada', async () => {
        mockApiWithBalance([
            { _id: 'debit-fono', amount: 130, specialty: 'fonoaudiologia', serviceDate: '2026-04-01' },
            { _id: 'debit-psico', amount: 140, specialty: 'psicologia', serviceDate: '2026-04-02' },
        ]);
        renderModal(); selectSpecialty(); await importDebts();
        await waitFor(() => expect(getDebtCheckboxes()).toHaveLength(1));
        fireEvent.change(getSelect('sessionType'), { target: { value: 'psicologia' } });
        await waitFor(() => expect(getDebtCheckboxes()).toHaveLength(1));
    });

    it('permite selecionar e desselecionar pendências', async () => {
        mockApiWithBalance([
            { _id: 'debit-1', amount: 130, specialty: 'fonoaudiologia', serviceDate: '2026-04-01' },
            { _id: 'debit-2', amount: 130, specialty: 'fonoaudiologia', serviceDate: '2026-04-08' },
        ]);
        renderModal(); selectSpecialty(); await importDebts();
        await waitFor(() => expect(getDebtCheckboxes()).toHaveLength(2));
        const checkboxes = getDebtCheckboxes();
        fireEvent.click(checkboxes[0]);
        await waitFor(() => expect(screen.getByText(/1 sessão\(ões\) selecionada\(s\)/i)).toBeInTheDocument());
    });

    it('envia as pendências selecionadas no contrato V2 ao criar pacote', async () => {
        mockApiWithBalance([{ _id: 'debit-1', amount: 130, specialty: 'fonoaudiologia', serviceDate: '2026-04-01' }]);
        renderModal(); selectSpecialty();
        await importDebts(); await waitFor(() => expect(getDebtCheckboxes()).toHaveLength(1));
        fireEvent.click(getDebtCheckboxes()[0]);
        expect(getDebtCheckboxes()[0]).toBeChecked();
    });

    it('mantém a lista vazia quando não existem pendências', async () => {
        renderModal(); selectSpecialty(); await importDebts();
        expect(getDebtCheckboxes()).toHaveLength(0);
    });
});
