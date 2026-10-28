import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TherapyPackageCard from '../TherapyPackageCard';
import { packageService } from '../../../services/packageService';
import { toast } from 'react-toastify';

vi.mock('../../../services/packageService', () => ({ packageService: { inactivatePackage: vi.fn() } }));
vi.mock('../../../services/appointmentService', () => ({ default: {} }));
vi.mock('../../../services/financialSummaryService', () => ({ getPatientFinancialSummary: async () => ({ particularPaid: 910, sessionDebt: 0, completedSessions: 8 }) }));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('../SessionListItem', () => ({ SessionListItem: () => null }));
vi.mock('../SessionModal', () => ({ SessionModal: () => null }));
vi.mock('../PatientMiniCalendar', () => ({ PatientMiniCalendar: () => null }));
vi.mock('../PatientBalanceModal', () => ({ PatientBalanceModal: () => null }));
vi.mock('../../calendar/CancelAppointmentDialog', () => ({ default: () => null }));

const props = (paymentType = 'partial') => ({
  pack: { _id: 'package-id', status: 'active', type: 'therapy', paymentType, sessionsRemaining: 12,
    totalSessions: 20, sessionsDone: 8, sessionValue: 130, totalValue: 2600, totalPaid: 910,
    sessions: [], payments: [], searchFields: { patientName: 'Paciente local', doctorName: 'Profissional local' },
    sessionType: 'psicologia', remaining: 1690, balance: 1690 } as any,
  patient: { _id: 'patient-id', fullName: 'Paciente local' } as any,
  doctors: [], onUseSession: vi.fn(), onRefresh: vi.fn(),
});
beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);
describe('Card — inativação decidida pelo backend', () => {
  it.each(['partial', 'full', 'per-session'])('abre confirmação para %s mesmo com saldo contratual', async type => {
    render(<TherapyPackageCard {...props(type)} />);
    fireEvent.click(screen.getByTitle('Clique para inativar este pacote'));
    expect(screen.getByRole('button', { name: 'Sim, inativar' })).toBeTruthy();
    expect(packageService.inactivatePackage).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });
  it('chama a API somente após confirmar e atualiza a lista', async () => {
    vi.mocked(packageService.inactivatePackage).mockResolvedValue({ data: { sessionsCanceled: 0 } } as any);
    const p = props(); render(<TherapyPackageCard {...p} />);
    fireEvent.click(screen.getByTitle('Clique para inativar este pacote'));
    fireEvent.click(screen.getByRole('button', { name: 'Sim, inativar' }));
    await waitFor(() => expect(packageService.inactivatePackage).toHaveBeenCalledWith('package-id'));
    await waitFor(() => expect(p.onRefresh).toHaveBeenCalledOnce());
  });
  it('mantém a proteção de pré-pagos e mostra a explicação devolvida pelo backend', async () => {
    const message = 'Cancele ou transfira as sessões restantes primeiro.';
    vi.mocked(packageService.inactivatePackage).mockRejectedValue({ response: { status: 409, data: { error: { code: 'PACKAGE_INACTIVATION_REQUIRES_PER_SESSION', message } } } });
    const p = props('full'); render(<TherapyPackageCard {...p} />);
    fireEvent.click(screen.getByTitle('Clique para inativar este pacote'));
    fireEvent.click(screen.getByRole('button', { name: 'Sim, inativar' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
    expect(p.onRefresh).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sim, inativar' })).toBeTruthy();
  });
});
