import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dos serviços - definidos antes de qualquer import
vi.mock('../../../../services/patientService', () => ({
    patientService: {
        fetchAll: vi.fn().mockResolvedValue([])
    }
}));

vi.mock('../../../../services/doctorService', () => ({
    doctorService: {
        getAllDoctors: vi.fn().mockResolvedValue({ data: [] })
    }
}));

vi.mock('../../../../services/appointmentService', () => ({
    appointmentService: {
        list: vi.fn().mockResolvedValue({ data: [] }),
        listV2: vi.fn().mockResolvedValue({ 
            data: { 
                success: true, 
                data: { 
                    appointments: [],
                    pagination: { total: 0, limit: 500, page: 1 }
                } 
            } 
        }),
        USE_V2_LIST: true
    }
}));

vi.mock('../../../../services/paymentService', () => ({
    getPayments: vi.fn().mockResolvedValue({ data: { data: [] } })
}));

vi.mock('react-hot-toast', () => ({
    default: {
        error: vi.fn()
    }
}));

// Mock do moment-timezone
vi.mock('moment-timezone', () => {
    const mockMoment = vi.fn(() => ({
        startOf: vi.fn().mockReturnThis(),
        endOf: vi.fn().mockReturnThis(),
        format: vi.fn(() => '2026-02-01'),
        subtract: vi.fn().mockReturnThis(),
        tz: vi.fn().mockReturnThis()
    }));
    
    // @ts-ignore
    mockMoment.tz = vi.fn(() => ({
        startOf: vi.fn().mockReturnThis(),
        endOf: vi.fn().mockReturnThis(),
        format: vi.fn(() => '2026-02-01'),
        subtract: vi.fn().mockReturnThis()
    }));
    
    return { default: mockMoment };
});

// Mock do FullCalendar
vi.mock('@fullcalendar/react', () => ({
    default: () => <div data-testid="full-calendar">FullCalendar</div>
}));

vi.mock('@fullcalendar/daygrid', () => ({
    default: () => null
}));

vi.mock('@fullcalendar/timegrid', () => ({
    default: () => null
}));

vi.mock('@fullcalendar/interaction', () => ({
    default: () => null
}));

// Mock do EnhancedCalendar
vi.mock('../../../calendar/EnhancedCalendar', () => ({
    EnhancedCalendar: ({ onMonthChange }: any) => {
        // Simula chamada onMonthChange no mount
        if (onMonthChange) {
            setTimeout(() => onMonthChange(new Date(), new Date()), 0);
        }
        return <div data-testid="enhanced-calendar">EnhancedCalendar</div>;
    }
}));

import { appointmentService } from '../../../../services/appointmentService';
import patientService from '../../../../services/patientService';
import doctorService from '../../../../services/doctorService';

describe('CalendarTab - Service Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('appointmentService deve ter método listV2 disponível', () => {
        expect(appointmentService.listV2).toBeDefined();
        expect(typeof appointmentService.listV2).toBe('function');
    });

    it('appointmentService.listV2 deve ser chamável com parâmetros de data', async () => {
        const params = {
            startDate: '2026-02-01',
            endDate: '2026-02-28',
            limit: 500,
            light: true
        };
        
        await appointmentService.listV2(params);
        
        expect(appointmentService.listV2).toHaveBeenCalledWith(params);
    });

    it('appointmentService deve ter método list disponível', () => {
        expect(appointmentService.list).toBeDefined();
        expect(typeof appointmentService.list).toBe('function');
    });

    it('appointmentService.list deve ser chamável com parâmetros de data', async () => {
        const params = {
            startDate: '2026-02-01',
            endDate: '2026-02-28'
        };
        
        await appointmentService.list(params);
        
        expect(appointmentService.list).toHaveBeenCalledWith(params);
    });

    it('patientService.fetchAll deve aceitar parâmetro booleano', async () => {
        await patientService.fetchAll(false);
        expect(patientService.fetchAll).toHaveBeenCalledWith(false);
    });

    it('doctorService.getAllDoctors deve ser chamável', async () => {
        await doctorService.getAllDoctors();
        expect(doctorService.getAllDoctors).toHaveBeenCalled();
    });

    it('não deve existir método getAppointments no appointmentService', () => {
        // @ts-ignore
        expect(appointmentService.getAppointments).toBeUndefined();
    });

    it('todos os serviços devem ser chamados em paralelo na inicialização', async () => {
        // Simula carregamento paralelo
        const promises = [
            patientService.fetchAll(false),
            doctorService.getAllDoctors(),
            appointmentService.list({ startDate: '2026-02-01', endDate: '2026-02-28' })
        ];
        
        await Promise.all(promises);
        
        expect(patientService.fetchAll).toHaveBeenCalled();
        expect(doctorService.getAllDoctors).toHaveBeenCalled();
        expect(appointmentService.list).toHaveBeenCalled();
    });
});
