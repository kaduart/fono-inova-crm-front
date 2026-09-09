import { beforeEach, describe, expect, it, vi } from 'vitest';
import API from '../api';
import packageService from '../packageService';

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedAPI = API as unknown as {
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
};

describe('packageService V2 — sessões de pacote', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preserva os vínculos retroativos na mesma requisição de criação', async () => {
    mockedAPI.post.mockResolvedValue({ data: { success: true, data: { packageId: 'pkg-1' } } });
    await packageService.createPackage({
      type: 'therapy', paymentType: 'full', calculationMode: 'sessions',
      totalSessions: 2, totalValue: 400, sessionValue: 200, preConsumedCount: 1,
      retroactivePaymentIds: ['payment-1'], retroactivePaymentMethod: 'pix', retroactivePaymentDate: '2026-09-01',
      payments: [{ amount: 200, method: 'pix', date: '2026-09-01' }]
    } as any);
    expect(mockedAPI.post).toHaveBeenCalledTimes(1);
    expect(mockedAPI.post).toHaveBeenCalledWith('/v2/packages', expect.objectContaining({
      retroactivePaymentIds: ['payment-1'], preConsumedCount: 1,
      retroactivePaymentMethod: 'pix', retroactivePaymentDate: '2026-09-01'
    }));
  });

  it('cria uma nova sessão pelo endpoint canônico de appointments com vínculo do pacote', async () => {
    mockedAPI.post.mockResolvedValue({ data: { success: true, data: { _id: 'appt-1' } } });

    await packageService.createSession('pkg-1', {
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      date: '2026-08-20' as any,
      time: '10:00',
      sessionType: 'fonoaudiologia' as any,
      value: 150,
      notes: 'observação',
    });

    expect(mockedAPI.post).toHaveBeenCalledWith('/v2/appointments', expect.objectContaining({
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      package: 'pkg-1',
      serviceType: 'package_session',
      operationalStatus: 'scheduled',
    }));
  });

  it('cancela somente os appointmentIds pedidos e expõe falha parcial', async () => {
    mockedAPI.patch
      .mockResolvedValueOnce({ data: { success: true } })
      .mockRejectedValueOnce({ response: { data: { message: 'já concluída' } } });

    const result = await packageService.bulkCancelSessions('pkg-1', ['appt-1', 'appt-2']);

    expect(mockedAPI.patch).toHaveBeenCalledTimes(2);
    expect(mockedAPI.patch).toHaveBeenNthCalledWith(1, '/v2/appointments/appt-1/cancel', expect.any(Object));
    expect(mockedAPI.patch).toHaveBeenNthCalledWith(2, '/v2/appointments/appt-2/cancel', expect.any(Object));
    expect(result).toMatchObject({
      success: false,
      canceledCount: 1,
      canceledIds: ['appt-1'],
      totalRequested: 2,
    });
    expect(result.failedIds).toEqual([{ appointmentId: 'appt-2', error: 'já concluída' }]);
  });
});
