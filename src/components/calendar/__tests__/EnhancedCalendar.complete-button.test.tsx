import { describe, it, expect } from 'vitest';

// 🎯 Teste de regressao: garante que o mapper DTO expoe operationalStatus,
// prerequisito para o EnhancedCalendar exibir o botao "Realizar" em appointments confirmed.
// Antes da correcao, AppointmentDTO so tinha 'status'; codigo do calendario lia
// appointment.operationalStatus (undefined), caia no fallback 'scheduled' e mostrava
// o botao "Confirmar" em vez de "Realizar".

describe('EnhancedCalendar - botao de completar em appointment confirmed', () => {
    const confirmedAppointment = {
        _id: 'appt-confirmed-123',
        id: 'appt-confirmed-123',
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        date: '2026-07-03',
        time: '10:00',
        reason: 'Teste',
        operationalStatus: 'confirmed',
        clinicalStatus: 'pending',
        duration: 60,
        sessionType: 'fonoaudiologia',
        paymentAmount: 150,
        paymentStatus: 'pending',
        serviceType: 'individual_session',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    it('DTO deve preservar operationalStatus=confirmed para o calendar usar', async () => {
        const { mapAppointmentListResponseDTO } = await import('../../../dtos/appointment.response.dto');
        const dtos = mapAppointmentListResponseDTO([confirmedAppointment]);

        expect(dtos[0].status).toBe('confirmed');
        expect(dtos[0].operationalStatus).toBe('confirmed');
    });
});
