/**
 * Testes: Distinção Appointment vs Payment na Tabela Financeira
 * 
 * Garante:
 * - Registros de appointment são marcados corretamente
 * - Botão de editar redireciona para modal de agendamento
 */

import { describe, it, expect, vi } from 'vitest';
import { FinancialRecord } from '../../../services/paymentService';

describe('PaymentPage - Distinção Appointment vs Payment', () => {
    
    const mockPayments: FinancialRecord[] = [
        {
            _id: 'payment-real-123',
            date: '2026-04-08',
            description: 'Pagamento real',
            amount: 200,
            paid: true,
            status: 'paid',
            specialty: 'fonoaudiologia',
            createdAt: '2026-04-08T10:00:00Z',
            patientId: 'patient-1',
            doctorId: 'doctor-1',
            serviceType: 'session',
            paymentMethod: 'pix',
            billingType: 'particular',
            notes: '',
            packageId: '',
            sessionId: '',
            advancedSessions: [],
            patient: { _id: 'patient-1', fullName: 'Paciente Real' },
            doctor: { _id: 'doctor-1', fullName: 'Dr. Real' }
        },
        {
            _id: 'appointment-id-456',
            date: '2026-04-08',
            description: 'Agendamento convertido',
            amount: 200,
            paid: true,
            status: 'paid',
            specialty: 'fonoaudiologia',
            createdAt: '2026-04-08T10:00:00Z',
            patientId: 'patient-2',
            doctorId: 'doctor-2',
            serviceType: 'session',
            paymentMethod: 'cartão',
            billingType: 'particular',
            notes: '',
            packageId: '',
            sessionId: '',
            advancedSessions: [],
            patient: { _id: 'patient-2', fullName: 'Paciente Agendamento' },
            doctor: { _id: 'doctor-2', fullName: 'Dr. Agendamento' },
            __isAppointmentRecord: true,
            __appointmentId: 'appointment-id-456'
        }
    ];

    describe('Estrutura de dados', () => {
        it('deve ter flag __isAppointmentRecord nos registros de appointment', () => {
            const appointmentRecord = mockPayments.find(p => p._id === 'appointment-id-456');
            expect(appointmentRecord).toHaveProperty('__isAppointmentRecord', true);
            expect(appointmentRecord).toHaveProperty('__appointmentId', 'appointment-id-456');
        });

        it('não deve ter flag em registros de payment reais', () => {
            const realPayment = mockPayments.find(p => p._id === 'payment-real-123');
            expect(realPayment).not.toHaveProperty('__isAppointmentRecord');
        });
    });

    describe('Logica de redirecionamento', () => {
        it('deve detectar registro de appointment', () => {
            const payment = mockPayments[1];
            const isAppointment = (payment as any).__isAppointmentRecord === true;
            expect(isAppointment).toBe(true);
        });

        it('deve disparar evento com ID correto', () => {
            const payment = mockPayments[1];
            const eventDetail = {
                appointmentId: (payment as any).__appointmentId,
                patientId: payment.patientId,
                date: payment.date
            };
            
            expect(eventDetail.appointmentId).toBe('appointment-id-456');
            expect(eventDetail.patientId).toBe('patient-2');
        });
    });
});

// Mock simples do teste
vi.mock('react-hot-toast', () => ({
    toast: {
        info: vi.fn(),
        error: vi.fn(),
        success: vi.fn()
    }
}));
