import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { AnalyticsTab } from '../AnalyticsTab';

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
    getPayments: vi.fn()
}));

vi.mock('../../../Dashboard/SiteAnalyticsDashboard', () => ({
    default: () => <div data-testid="site-analytics-dashboard">Dashboard</div>
}));

vi.mock('react-hot-toast', () => ({
    default: {
        error: vi.fn()
    }
}));

import patientService from '../../../../services/patientService';
import doctorService from '../../../../services/doctorService';
import { getPayments } from '../../../../services/paymentService';

describe('AnalyticsTab', () => {
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

    it('deve usar doctorService.getAllDoctors em vez de getDoctors importado separadamente', async () => {
        render(
            <AnalyticsTab 
                onMarkAsPaid={mockOnMarkAsPaid}
                onRegisterAppointmentAndPayment={mockOnRegisterAppointmentAndPayment}
                onCancelPayment={mockOnCancelPayment}
            />
        );

        await waitFor(() => {
            expect(doctorService.getAllDoctors).toHaveBeenCalled();
        });
    });

    it('deve usar patientService.fetchAll em vez de getPatients importado separadamente', async () => {
        render(
            <AnalyticsTab 
                onMarkAsPaid={mockOnMarkAsPaid}
                onRegisterAppointmentAndPayment={mockOnRegisterAppointmentAndPayment}
                onCancelPayment={mockOnCancelPayment}
            />
        );

        await waitFor(() => {
            expect(patientService.fetchAll).toHaveBeenCalledWith(false);
        });
    });

    it('deve carregar pagamentos do período atual (mês)', async () => {
        render(
            <AnalyticsTab 
                onMarkAsPaid={mockOnMarkAsPaid}
                onRegisterAppointmentAndPayment={mockOnRegisterAppointmentAndPayment}
                onCancelPayment={mockOnCancelPayment}
            />
        );

        await waitFor(() => {
            expect(getPayments).toHaveBeenCalledWith({ period: 'month' });
        });
    });

    it('deve carregar todos os dados em paralelo', async () => {
        render(
            <AnalyticsTab 
                onMarkAsPaid={mockOnMarkAsPaid}
                onRegisterAppointmentAndPayment={mockOnRegisterAppointmentAndPayment}
                onCancelPayment={mockOnCancelPayment}
            />
        );

        await waitFor(() => {
            expect(getPayments).toHaveBeenCalled();
            expect(doctorService.getAllDoctors).toHaveBeenCalled();
            expect(patientService.fetchAll).toHaveBeenCalled();
        });
    });

    it('não deve ter função getDoctors ou getPatients importadas globalmente no escopo', async () => {
        // Este teste verifica que não há referência a funções não definidas
        // Se o código tentar chamar getDoctors() ou getPatients() diretamente, daria erro
        
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        render(
            <AnalyticsTab 
                onMarkAsPaid={mockOnMarkAsPaid}
                onRegisterAppointmentAndPayment={mockOnRegisterAppointmentAndPayment}
                onCancelPayment={mockOnCancelPayment}
            />
        );

        await waitFor(() => {
            // Não deve ter erro de "getDoctors is not defined"
            const errors = consoleError.mock.calls.filter(call => 
                call[0]?.includes?.('getDoctors is not defined') ||
                call[0]?.includes?.('getPatients is not defined')
            );
            expect(errors).toHaveLength(0);
        });

        consoleError.mockRestore();
    });
});
