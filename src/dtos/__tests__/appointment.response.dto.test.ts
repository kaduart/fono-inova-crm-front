import { describe, it, expect } from 'vitest';
import { mapAppointmentResponseDTO, mapAppointmentListResponseDTO } from '../appointment.response.dto';

describe('appointment.response.dto', () => {
    it('deve mapear operationalStatus do backend para status e operationalStatus', () => {
        const raw = {
            _id: '123',
            date: '2026-07-03',
            time: '10:00',
            operationalStatus: 'confirmed',
            clinicalStatus: 'pending',
            patient: { _id: 'p1', fullName: 'Paciente Teste' },
            doctor: { _id: 'd1', fullName: 'Dr. Teste' },
        };

        const dto = mapAppointmentResponseDTO(raw);

        expect(dto.status).toBe('confirmed');
        expect(dto.operationalStatus).toBe('confirmed');
    });

    it('deve mapear status alternativo quando operationalStatus ausente', () => {
        const raw = {
            _id: '456',
            date: '2026-07-03',
            time: '11:00',
            status: 'completed',
            patient: { _id: 'p2', fullName: 'Paciente Dois' },
            doctor: { _id: 'd2', fullName: 'Dr. Dois' },
        };

        const dto = mapAppointmentResponseDTO(raw);

        expect(dto.status).toBe('completed');
        expect(dto.operationalStatus).toBe('completed');
    });

    it('deve retornar scheduled como padrao quando status nao informado', () => {
        const raw = {
            _id: '789',
            date: '2026-07-03',
            patient: { _id: 'p3', fullName: 'Paciente Tres' },
            doctor: { _id: 'd3', fullName: 'Dr. Tres' },
        };

        const dto = mapAppointmentResponseDTO(raw);

        expect(dto.status).toBe('scheduled');
        expect(dto.operationalStatus).toBe('scheduled');
    });

    it('deve mapear lista de appointments mantendo operationalStatus', () => {
        const rawList = [
            { _id: '1', operationalStatus: 'confirmed', date: '2026-07-03', patient: { _id: 'p1', fullName: 'A' }, doctor: { _id: 'd1', fullName: 'Dr A' } },
            { _id: '2', operationalStatus: 'completed', date: '2026-07-03', patient: { _id: 'p2', fullName: 'B' }, doctor: { _id: 'd2', fullName: 'Dr B' } },
        ];

        const dtos = mapAppointmentListResponseDTO(rawList);

        expect(dtos[0].operationalStatus).toBe('confirmed');
        expect(dtos[1].operationalStatus).toBe('completed');
    });
});
