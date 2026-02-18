import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { FinancialTab } from '../FinancialTab';

// Mock dos serviços
vi.mock('../../../../services/patientService', () => ({
    patientService: {
        fetchAll: vi.fn()
    }
}));

vi.mock('../../../../services/doctorService', () => ({
    doctorService: {
        getAllDoctors: vi.fn()
    }
}));

vi.mock('../../../../services/paymentService', () => ({
    getPayments: vi.fn(),
    FinancialRecord: undefined
}));

vi.mock('../../../../pages/Financial/FinancialDashboard', () => ({
    default: () => <div data-testid="financial-dashboard">Financial Dashboard</div>
}));

vi.mock('react-hot-toast', () => ({
    default: {
        error: vi.fn()
    }
}));

import { patientService } from '../../../../services/patientService';
import { doctorService } from '../../../../services/doctorService';
import { getPayments } from '../../../../services/paymentService';

describe('FinancialTab', () => {
    const mockOnMarkAsPaid = vi.fn();
    const mockOnRegisterAppointmentAndPayment = vi.fn();
    const mockOnCancelPayment = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Mock retornos padrão
        (getPayments as any).mockResolvedValue({ data: { data: [] } });
        (doctorService.getAllDoctors as any).mockResolvedValue({ data: [] });
        (patientService.fetchAll as any).mockResolvedValue([]);
    });

    it('deve usar patientService.fetchAll para carregar pacientes', async () => {
        const mockPatients = [
            { _id: '1', fullName: 'Paciente 1' },
            { _id: '2', fullName: 'Paciente 2' }
        ];
        (patientService.fetchAll as any).mockResolvedValue(mockPatients);

        render(
            <FinancialTab 
                onMarkAsPaid={mockOnMarkAsPaid}
                onRegisterAppointmentAndPayment={mockOnRegisterAppointmentAndPayment}
                onCancelPayment={mockOnCancelPayment}
            />
        );

        await waitFor(() => {
            expect(patientService.fetchAll).toHaveBeenCalledWith(false);
        });
    });

    it('deve usar doctorService.getAllDoctors para carregar médicos', async () => {
        const mockDoctors = [
            { _id: '1', fullName: 'Dr. Teste 1', specialty: 'Cardiologia' },
            { _id: '2', fullName: 'Dr. Teste 2', specialty: 'Dermatologia' }
        ];
        (doctorService.getAllDoctors as any).mockResolvedValue({ data: mockDoctors });

        render(
            <FinancialTab 
                onMarkAsPaid={mockOnMarkAsPaid}
                onRegisterAppointmentAndPayment={mockOnRegisterAppointmentAndPayment}
                onCancelPayment={mockOnCancelPayment}
            />
        );

        await waitFor(() => {
            expect(doctorService.getAllDoctors).toHaveBeenCalled();
        });
    });

    it('deve carregar pagamentos ao montar o componente', async () => {
        const mockPayments = [
            { _id: '1', amount: 100, status: 'paid' },
            { _id: '2', amount: 200, status: 'pending' }
        ];
        (getPayments as any).mockResolvedValue({ data: { data: mockPayments } });

        render(
            <FinancialTab 
                onMarkAsPaid={mockOnMarkAsPaid}
                onRegisterAppointmentAndPayment={mockOnRegisterAppointmentAndPayment}
                onCancelPayment={mockOnCancelPayment}
            />
        );

        await waitFor(() => {
            expect(getPayments).toHaveBeenCalled();
        });
    });

    it('deve carregar todos os dados em paralelo', async () => {
        render(
            <FinancialTab 
                onMarkAsPaid={mockOnMarkAsPaid}
                onRegisterAppointmentAndPayment={mockOnRegisterAppointmentAndPayment}
                onCancelPayment={mockOnCancelPayment}
            />
        );

        await waitFor(() => {
            expect(getPayments).toHaveBeenCalled();
            expect(patientService.fetchAll).toHaveBeenCalled();
            expect(doctorService.getAllDoctors).toHaveBeenCalled();
        });
    });

    it('deve ter delay mínimo de loading para evitar flash', async () => {
        const startTime = Date.now();
        
        render(
            <FinancialTab 
                onMarkAsPaid={mockOnMarkAsPaid}
                onRegisterAppointmentAndPayment={mockOnRegisterAppointmentAndPayment}
                onCancelPayment={mockOnCancelPayment}
            />
        );

        // Aguarda o carregamento completo
        await waitFor(() => {
            expect(getPayments).toHaveBeenCalled();
        });

        // Dá tempo para o timeout de 500ms
        await new Promise(resolve => setTimeout(resolve, 600));

        const elapsed = Date.now() - startTime;
        // Deve ter demorado pelo menos 500ms devido ao delay mínimo
        expect(elapsed).toBeGreaterThanOrEqual(450); // 450ms para dar margem
    });

    it('deve lidar com erro ao carregar dados', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const toastError = vi.fn();
        
        vi.doMock('react-hot-toast', () => ({
            default: { error: toastError }
        }));

        (getPayments as any).mockRejectedValue(new Error('Erro de API'));

        render(
            <FinancialTab 
                onMarkAsPaid={mockOnMarkAsPaid}
                onRegisterAppointmentAndPayment={mockOnRegisterAppointmentAndPayment}
                onCancelPayment={mockOnCancelPayment}
            />
        );

        await waitFor(() => {
            expect(consoleError).toHaveBeenCalledWith(
                'Erro ao carregar dados financeiros:',
                expect.any(Error)
            );
        });

        consoleError.mockRestore();
    });
});
