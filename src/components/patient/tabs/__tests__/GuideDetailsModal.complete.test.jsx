/**
 * Foco: "Concluir" pelo card da guia de Convênio (GuideDetailsModal).
 *
 * Não testa o AppointmentDetailModal em si (componente pesado, já usado e
 * testado em produção via calendário/Liminar/PaymentPage — ver também
 * EnhancedCalendar.complete-button.test.tsx) — mocka ele como um stub com
 * botões que disparam os callbacks diretamente, pra isolar e provar
 * exatamente o que o GuideDetailsModal faz quando onCompleteAppointment é
 * chamado. Isso prova o wrapper (handleCompleteFromModal); NÃO prova o
 * payload/comportamento do modal real — para isso, ver a suíte do próprio
 * AppointmentDetailModal (rodada junto no final deste arquivo).
 *
 * Reusa completeAppointment de AppointmentsContext (mesmo primitivo que a
 * agenda real usa via useAppointments.ts/AppointmentsContext.tsx) — já faz
 * o polling do 202 assíncrono e detecta lock liberado por falha de worker.
 * Só trata como sucesso quando: (a) completeAppointment resolve sem
 * _lockReleased, ou (b) erro com `idempotent===true` explícito, ou (c) um
 * refetch (appointmentService.getStatus) confirma operationalStatus==='completed'
 * apesar do erro. Qualquer outro erro propaga — modal continua aberto.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// PatientMiniCalendar usa @fullcalendar, que exige medição real de layout —
// quebra em jsdom ("Cannot read properties of null (reading 'style')").
// GuideDetailsModal abre em viewMode='calendar' por padrão; o teste troca pra
// 'lista' antes de qualquer asserção, então o mini-calendário nunca chega a
// ser útil aqui — mockado como stub inerte.
vi.mock('../../../patients/PatientMiniCalendar', () => ({
  PatientMiniCalendar: () => <div data-testid="mini-calendar-stub" />,
}));
import toast from 'react-hot-toast';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const cancelMock = vi.fn();
const updateMock = vi.fn();
const getStatusMock = vi.fn();
vi.mock('../../../../services/appointmentService', () => ({
  appointmentService: {
    cancel: (...args) => cancelMock(...args),
    update: (...args) => updateMock(...args),
    getStatus: (...args) => getStatusMock(...args),
  },
}));

// completeAppointment vem do contexto global (mesmo primitivo da agenda real,
// que faz polling de 202 e detecta lock liberado) — não de appointmentService
// direto. Mockado aqui pra controlar precisamente resolve/reject/atraso.
const completeCtxMock = vi.fn();
vi.mock('../../../../contexts/AppointmentsContext', () => ({
  useAppointmentsContext: () => ({ completeAppointment: completeCtxMock }),
}));

const getGuideAppointmentsMock = vi.fn();
vi.mock('../../../../services/insuranceGuideApi', () => ({
  getGuideAppointments: (...args) => getGuideAppointmentsMock(...args),
  updateGuideAppointmentsBulk: vi.fn(),
  supersedeGuide: vi.fn(),
  getGuides: vi.fn().mockResolvedValue([]),
  moveAppointmentToGuide: vi.fn(),
}));

vi.mock('../../../../hooks/useInsurancePlan', () => ({
  useInsurancePlan: () => ({ data: null, isLoading: false, isError: false, refetch: vi.fn() }),
  insurancePlanQueryKey: (id) => ['insurance-plan', id],
}));

vi.mock('../../../../services/doctorService', () => ({
  default: { getActiveDoctors: vi.fn().mockResolvedValue({ data: [] }) },
}));

vi.mock('../../../../services/api', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { data: [] } }) },
}));

// Stub leve do AppointmentDetailModal real — expõe os 3 callbacks como
// botões, sem reimplementar (nem depender de) a UI real da agenda.
vi.mock('../../../calendar/appointmentDetailModal', () => ({
  default: ({ isOpen, event, onCompleteAppointment, onCancelAppointment, onEditAppointment }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="appointment-detail-modal-stub">
        <span data-testid="modal-event-id">{event?.id}</span>
        <button onClick={() => {
          // Mesmo comportamento do AppointmentDetailModal real: captura o
          // reject (erro real fica visível via toast, o stub não recria a UI
          // de erro do modal de verdade) pra não gerar unhandled rejection.
          onCompleteAppointment(event.id, { billingType: 'convenio', insuranceValue: 80 }).catch(() => {});
        }}>
          Realizar Atendimento
        </button>
        <button onClick={() => onCancelAppointment(event.id, 'motivo teste')}>Cancelar</button>
        <button onClick={() => onEditAppointment(event.id, { date: '2026-08-20', time: '10:00' })}>Salvar</button>
      </div>
    );
  },
}));

import { GuideDetailsModal } from '../PatientInsuranceTab';

const baseGuide = {
  _id: 'guide-1',
  number: '16173376',
  specialty: 'terapia_ocupacional',
  insurance: 'unimed-anapolis',
  totalSessions: 10,
  usedSessions: 1,
};

const scheduledAppt = {
  _id: 'appt-scheduled-1',
  patient: { _id: 'patient-1', fullName: 'Ícaro' },
  doctor: { _id: 'doctor-1', fullName: 'Dra. Teste' },
  date: '2026-08-21T00:00:00.000Z',
  time: '15:20',
  operationalStatus: 'pre_agendado',
  billingType: 'convenio',
  paymentMethod: 'convenio',
  insuranceProvider: 'unimed-anapolis',
  insuranceValue: 80,
  sessionValue: 80,
  specialty: 'terapia_ocupacional',
  serviceType: 'session',
};

describe('GuideDetailsModal — Concluir pelo card (Convênio)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGuideAppointmentsMock.mockResolvedValue([scheduledAppt]);
  });

  // viewMode abre em 'calendar' por padrão — os ícones de ação só existem na
  // view 'list' (o mini-calendário é mockado e não expõe os botões da linha).
  async function switchToListView() {
    fireEvent.click(await screen.findByText('Lista'));
  }

  async function openModalAndClickComplete() {
    await switchToListView();
    fireEvent.click(await screen.findByTitle('Editar'));
    await screen.findByTestId('appointment-detail-modal-stub');
    fireEvent.click(screen.getByText('Realizar Atendimento'));
  }

  it('clicar em "Realizar Atendimento" chama completeAppointment (contexto) com o id certo e fecha o modal só após sucesso', async () => {
    completeCtxMock.mockResolvedValue({ success: true, data: { operationalStatus: 'completed' } });
    const onUpdate = vi.fn();
    render(<GuideDetailsModal guide={baseGuide} onClose={vi.fn()} onUpdate={onUpdate} />);
    await waitFor(() => expect(getGuideAppointmentsMock).toHaveBeenCalled());
    await openModalAndClickComplete();

    await waitFor(() => expect(completeCtxMock).toHaveBeenCalledWith('appt-scheduled-1', expect.objectContaining({ billingType: 'convenio' })));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Sessão concluída'));
    await waitFor(() => expect(screen.queryByTestId('appointment-detail-modal-stub')).not.toBeInTheDocument());
    expect(onUpdate).toHaveBeenCalled();
    expect(getGuideAppointmentsMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('bloqueador 4 — enquanto completeAppointment está pendente (202 em polling), o modal NÃO fecha nem mostra sucesso', async () => {
    let resolveComplete;
    completeCtxMock.mockReturnValue(new Promise((resolve) => { resolveComplete = resolve; }));
    render(<GuideDetailsModal guide={baseGuide} onClose={vi.fn()} onUpdate={vi.fn()} />);
    await waitFor(() => expect(getGuideAppointmentsMock).toHaveBeenCalled());
    await openModalAndClickComplete();

    await waitFor(() => expect(completeCtxMock).toHaveBeenCalled());
    // Ainda "processando" do lado do contexto (ex: aguardando pollAppointmentStatus
    // internamente) — o modal precisa continuar aberto, sem toast de sucesso.
    expect(screen.getByTestId('appointment-detail-modal-stub')).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalledWith('Sessão concluída');

    // Só agora o polling "terminou" do lado do contexto
    resolveComplete({ success: true, _isAsyncProcessing: true, _completed: true });

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Sessão concluída'));
    await waitFor(() => expect(screen.queryByTestId('appointment-detail-modal-stub')).not.toBeInTheDocument());
  });

  it('bloqueador 4 — lock liberado por falha de worker (_lockReleased) é tratado como falha, modal continua aberto', async () => {
    completeCtxMock.mockResolvedValue({ success: true, _isAsyncProcessing: true, _completed: false, _lockReleased: true });
    getStatusMock.mockResolvedValue({ data: { data: { operationalStatus: 'pre_agendado' } } });
    const onUpdate = vi.fn();
    render(<GuideDetailsModal guide={baseGuide} onClose={vi.fn()} onUpdate={onUpdate} />);
    await waitFor(() => expect(getGuideAppointmentsMock).toHaveBeenCalled());
    await openModalAndClickComplete();

    await waitFor(() => expect(completeCtxMock).toHaveBeenCalled());
    expect(screen.getByTestId('appointment-detail-modal-stub')).toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalledWith('Sessão concluída');
  });

  it('409 idempotente explícito (retry/duplo-clique) é tratado como sucesso — fecha e atualiza normalmente', async () => {
    const idempotentError = { response: { status: 409, data: { idempotent: true, message: 'Sessão já estava completada' } } };
    completeCtxMock.mockRejectedValue(idempotentError);
    const onUpdate = vi.fn();
    render(<GuideDetailsModal guide={baseGuide} onClose={vi.fn()} onUpdate={onUpdate} />);
    await waitFor(() => expect(getGuideAppointmentsMock).toHaveBeenCalled());
    await openModalAndClickComplete();

    await waitFor(() => expect(completeCtxMock).toHaveBeenCalled());
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Sessão concluída'));
    await waitFor(() => expect(screen.queryByTestId('appointment-detail-modal-stub')).not.toBeInTheDocument());
    expect(onUpdate).toHaveBeenCalled();
    // 409 idempotente não precisa de refetch pra confirmar
    expect(getStatusMock).not.toHaveBeenCalled();
  });

  it('bloqueador 3 — 409 real (CONFIRM_FAILED, não idempotente) NÃO é engolido: refetch confirma que não completou, erro propaga e modal continua aberto', async () => {
    const confirmFailedError = { response: { status: 409, data: { errorCode: 'CONFIRM_FAILED', message: 'Não foi possível confirmar o agendamento' } } };
    completeCtxMock.mockRejectedValue(confirmFailedError);
    getStatusMock.mockResolvedValue({ data: { data: { operationalStatus: 'scheduled' } } });
    const onUpdate = vi.fn();
    render(<GuideDetailsModal guide={baseGuide} onClose={vi.fn()} onUpdate={onUpdate} />);
    await waitFor(() => expect(getGuideAppointmentsMock).toHaveBeenCalled());
    await openModalAndClickComplete();

    await waitFor(() => expect(completeCtxMock).toHaveBeenCalled());
    // confirmou via refetch que NÃO completou -> erro real, propaga
    await waitFor(() => expect(getStatusMock).toHaveBeenCalledWith('appt-scheduled-1'));
    expect(screen.getByTestId('appointment-detail-modal-stub')).toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalledWith('Sessão concluída');
  });

  it('bloqueador 3 — 409 real mas refetch confirma completed (ambiguidade de rede): trata como sucesso', async () => {
    const ambiguousError = { response: { status: 409, data: { errorCode: 'CONFIRM_FAILED', message: 'timeout' } } };
    completeCtxMock.mockRejectedValue(ambiguousError);
    getStatusMock.mockResolvedValue({ data: { data: { operationalStatus: 'completed' } } });
    const onUpdate = vi.fn();
    render(<GuideDetailsModal guide={baseGuide} onClose={vi.fn()} onUpdate={onUpdate} />);
    await waitFor(() => expect(getGuideAppointmentsMock).toHaveBeenCalled());
    await openModalAndClickComplete();

    await waitFor(() => expect(getStatusMock).toHaveBeenCalledWith('appt-scheduled-1'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Sessão concluída'));
    await waitFor(() => expect(screen.queryByTestId('appointment-detail-modal-stub')).not.toBeInTheDocument());
    expect(onUpdate).toHaveBeenCalled();
  });

  it('erro real (500, sem idempotência e refetch também não confirma completed) NÃO fecha o modal nem chama onUpdate', async () => {
    const realError = { response: { status: 500, data: { message: 'Erro no servidor' } } };
    completeCtxMock.mockRejectedValue(realError);
    getStatusMock.mockRejectedValue(new Error('network error'));
    const onUpdate = vi.fn();
    render(<GuideDetailsModal guide={baseGuide} onClose={vi.fn()} onUpdate={onUpdate} />);
    await waitFor(() => expect(getGuideAppointmentsMock).toHaveBeenCalled());
    await openModalAndClickComplete();

    await waitFor(() => expect(completeCtxMock).toHaveBeenCalled());
    expect(screen.getByTestId('appointment-detail-modal-stub')).toBeInTheDocument();
    expect(onUpdate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalledWith('Sessão concluída');
  });

  it('sessão completed: ícones de editar/mover ficam desabilitados (não abre o modal)', async () => {
    getGuideAppointmentsMock.mockResolvedValue([
      { ...scheduledAppt, _id: 'appt-done-1', operationalStatus: 'completed' },
    ]);
    render(<GuideDetailsModal guide={baseGuide} onClose={vi.fn()} onUpdate={vi.fn()} />);
    await waitFor(() => expect(getGuideAppointmentsMock).toHaveBeenCalled());
    await switchToListView();

    const editIcon = await screen.findByTitle('Sessão já concluída — não pode ser editada/cancelada');
    const moveIcon = screen.getByTitle('Sessão já concluída — não pode ser movida');
    expect(editIcon).toBeDisabled();
    expect(moveIcon).toBeDisabled();

    fireEvent.click(editIcon);
    fireEvent.click(moveIcon);
    expect(screen.queryByTestId('appointment-detail-modal-stub')).not.toBeInTheDocument();
    expect(screen.queryByText(/Mover atendimento entre guias/)).not.toBeInTheDocument();
  });
});
