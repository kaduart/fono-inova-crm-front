import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TherapyPackageManager from '../TherapyPackageManager';
import TherapyPackageTable from '../TherapyPackageTable';
import { packageService } from '../../../services/packageService';

vi.mock('../../../services/packageService', () => ({
  packageService: { inactivatePackage: vi.fn(), deletePackage: vi.fn() },
}));
vi.mock('react-toastify', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const makePackage = (paymentType: string, status = 'active') => ({
  _id: `${paymentType}-id`, patient: 'patient-id', professional: 'doctor-id',
  sessionType: 'fonoaudiologia', totalSessions: 4, sessions: [], sessionsDone: 0,
  sessionValue: 100, payments: [], status, totalPaid: 0, balance: 400,
  remaining: 400, totalValue: 400, credit: 0, paymentType,
  searchFields: { patientName: 'Paciente', doctorName: 'Profissional' },
} as any);

describe('Gerenciador de Pacotes — inativação segura', () => {
  beforeEach(() => vi.clearAllMocks());

  it('oferece inativação somente para per-session e explica o bloqueio dos antecipados', () => {
    render(<TherapyPackageTable packages={[
      makePackage('per-session'), makePackage('full'), makePackage('partial'), makePackage('prepaid'),
    ]} currentPage={1} totalPages={1} onEdit={vi.fn()} onInactivate={vi.fn()} onPageChange={vi.fn()} />);
    expect(screen.getAllByTitle('Inativar pacote')).toHaveLength(1);
    expect(screen.getAllByTitle('Este pacote possui valor antecipado e exige transferência, crédito ou estorno antes do encerramento')).toHaveLength(3);
    expect(screen.queryByTitle('Excluir')).not.toBeInTheDocument();
  });

  it('confirma, chama /inactivate pelo service e atualiza a tabela sem usar DELETE', async () => {
    vi.mocked(packageService.inactivatePackage).mockResolvedValue({} as any);
    const onRefresh = vi.fn();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><TherapyPackageManager
      packages={[makePackage('per-session')]} patient={{ _id: 'patient-id', fullName: 'Paciente' } as any}
      doctors={[]} totalPages={1} onRefresh={onRefresh}
    /></QueryClientProvider>);

    fireEvent.click(screen.getByTitle('Inativar pacote'));
    expect(screen.getByText(/sessões não concluídas serão canceladas/i)).toBeInTheDocument();
    expect(screen.getByText(/sessões concluídas e pagamentos recebidos serão preservados/i)).toBeInTheDocument();
    expect(screen.getByText(/movido para Inativos/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sim, inativar' }));

    await waitFor(() => expect(packageService.inactivatePackage).toHaveBeenCalledWith('per-session-id'));
    expect(packageService.deletePackage).not.toHaveBeenCalled();
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
