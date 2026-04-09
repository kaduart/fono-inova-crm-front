/**
 * 🧪 Testes de Componente - TherapyPackageFormModal
 * 
 * Testa:
 * - Renderização do modal
 * - Busca de débitos por especialidade
 * - Seleção de débitos
 * - Submissão com selectedDebts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TherapyPackageFormModal from '../TherapyPackageFormModal';
import API from '../../../services/api';

// Mock do API
vi.mock('../../../services/api', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn()
    }
}));

// Mock do toast
vi.mock('react-toastify', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

const mockPatient = {
    _id: 'patient-123',
    patientId: 'patient-123',
    fullName: 'Paciente Teste',
    phone: '61999999999'
};

const mockDoctors = [
    { _id: 'doctor-1', fullName: 'Dr. Fono', specialty: 'fonoaudiologia' },
    { _id: 'doctor-2', fullName: 'Dr. Psico', specialty: 'psicologia' }
];

describe('TherapyPackageFormModal', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } }
        });
        vi.clearAllMocks();
    });

    const renderModal = (props = {}) => {
        return render(
            <QueryClientProvider client={queryClient}>
                <TherapyPackageFormModal
                    initialData={null}
                    patient={mockPatient}
                    doctors={mockDoctors}
                    onClose={vi.fn()}
                    onSubmit={vi.fn()}
                    {...props}
                />
            </QueryClientProvider>
        );
    };

    it('deve renderizar o modal corretamente', () => {
        renderModal();
        
        expect(screen.getByText('Criar Novo Pacote')).toBeInTheDocument();
        expect(screen.getByText(`Criar pacote para ${mockPatient.fullName}`)).toBeInTheDocument();
    });

    it('deve buscar débitos ao selecionar especialidade', async () => {
        // Mock da resposta do balance/details
        const mockDebits = [
            {
                _id: 'debit-1',
                amount: 130,
                specialty: 'fonoaudiologia',
                description: 'Sessão 01/04/2026',
                transactionDate: '2026-04-01T10:00:00Z'
            },
            {
                _id: 'debit-2',
                amount: 130,
                specialty: 'fonoaudiologia',
                description: 'Sessão 08/04/2026',
                transactionDate: '2026-04-08T10:00:00Z'
            }
        ];

        (API.get as jest.Mock).mockResolvedValueOnce({
            data: {
                data: mockDebits,
                summary: { totalAmount: 260, count: 2 }
            }
        });

        renderModal();

        // Selecionar especialidade
        const specialtySelect = screen.getByLabelText(/Tipo de Sessão/i);
        fireEvent.change(specialtySelect, { target: { value: 'fonoaudiologia' } });

        // Aguardar a chamada API
        await waitFor(() => {
            expect(API.get).toHaveBeenCalledWith(
                `/patients/${mockPatient.patientId}/balance/details`,
                { params: { specialty: 'fonoaudiologia' } }
            );
        });

        // Verificar se os débitos aparecem
        await waitFor(() => {
            expect(screen.getByText(/2 débito\(s\) pendente\(s\)/i)).toBeInTheDocument();
        });
    });

    it('deve mostrar apenas débitos da especialidade selecionada', async () => {
        // Mock para fonoaudiologia
        (API.get as jest.Mock).mockResolvedValueOnce({
            data: {
                data: [
                    { _id: 'debit-fono', amount: 130, specialty: 'fonoaudiologia', description: 'Fono 1' }
                ],
                summary: { totalAmount: 130, count: 1 }
            }
        });

        renderModal();

        // Selecionar fonoaudiologia
        const specialtySelect = screen.getByLabelText(/Tipo de Sessão/i);
        fireEvent.change(specialtySelect, { target: { value: 'fonoaudiologia' } });

        await waitFor(() => {
            expect(screen.getByText(/Fono 1/i)).toBeInTheDocument();
        });

        // Mock para psicologia (retorna vazio)
        (API.get as jest.Mock).mockResolvedValueOnce({
            data: { data: [], summary: { totalAmount: 0, count: 0 } }
        });

        // Mudar para psicologia
        fireEvent.change(specialtySelect, { target: { value: 'psicologia' } });

        await waitFor(() => {
            expect(API.get).toHaveBeenCalledWith(
                `/patients/${mockPatient.patientId}/balance/details`,
                { params: { specialty: 'psicologia' } }
            );
        });
    });

    it('deve permitir selecionar/desselecionar débitos', async () => {
        const mockDebits = [
            { _id: 'debit-1', amount: 130, specialty: 'fonoaudiologia', description: 'Sessão 1' },
            { _id: 'debit-2', amount: 130, specialty: 'fonoaudiologia', description: 'Sessão 2' }
        ];

        (API.get as jest.Mock).mockResolvedValueOnce({
            data: {
                data: mockDebits,
                summary: { totalAmount: 260, count: 2 }
            }
        });

        renderModal();

        // Selecionar especialidade
        const specialtySelect = screen.getByLabelText(/Tipo de Sessão/i);
        fireEvent.change(specialtySelect, { target: { value: 'fonoaudiologia' } });

        // Aguardar débitos aparecerem
        await waitFor(() => {
            expect(screen.getByText(/Sessão 1/i)).toBeInTheDocument();
        });

        // Desselecionar um débito
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(2);

        fireEvent.click(checkboxes[0]); // Desselecionar primeiro

        // Verificar que apenas 1 está selecionado
        await waitFor(() => {
            expect(screen.getByText(/1 sessão\(ões\) serão absorvidas/i)).toBeInTheDocument();
        });
    });

    it('deve enviar selectedDebts ao criar pacote', async () => {
        const mockDebits = [
            { _id: 'debit-1', amount: 130, specialty: 'fonoaudiologia', description: 'Sessão 1' }
        ];

        (API.get as jest.Mock)
            // Busca de débitos
            .mockResolvedValueOnce({
                data: { data: mockDebits, summary: { totalAmount: 130, count: 1 } }
            })
            // Criação do pacote
            .mockResolvedValueOnce({
                data: { package: { _id: 'package-123' } }
            });

        const onSubmitMock = vi.fn();
        renderModal({ onSubmit: onSubmitMock });

        // Preencher formulário
        const specialtySelect = screen.getByLabelText(/Tipo de Sessão/i);
        fireEvent.change(specialtySelect, { target: { value: 'fonoaudiologia' } });

        const doctorSelect = screen.getByLabelText(/Profissional/i);
        fireEvent.change(doctorSelect, { target: { value: 'doctor-1' } });

        await waitFor(() => {
            expect(screen.getByText(/Sessão 1/i)).toBeInTheDocument();
        });

        // Clicar em criar pacote
        const submitButton = screen.getByText(/Criar Pacote/i);
        fireEvent.click(submitButton);

        // Verificar que o POST foi chamado com selectedDebts
        await waitFor(() => {
            expect(API.post).toHaveBeenCalledWith(
                '/api/packages',
                expect.objectContaining({
                    selectedDebts: ['debit-1'],
                    patientId: mockPatient.patientId,
                    sessionType: 'fonoaudiologia'
                })
            );
        });
    });

    it('deve mostrar mensagem quando não há débitos', async () => {
        (API.get as jest.Mock).mockResolvedValueOnce({
            data: { data: [], summary: { totalAmount: 0, count: 0 } }
        });

        renderModal();

        const specialtySelect = screen.getByLabelText(/Tipo de Sessão/i);
        fireEvent.change(specialtySelect, { target: { value: 'fonoaudiologia' } });

        await waitFor(() => {
            expect(API.get).toHaveBeenCalled();
        });

        // Não deve mostrar a seção de débitos
        expect(screen.queryByText(/débito\(s\) pendente\(s\)/i)).not.toBeInTheDocument();
    });
});
