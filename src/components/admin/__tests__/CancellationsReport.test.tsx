import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

const getReport = vi.fn();
const getDetails = vi.fn();

vi.mock('../../../services/cancellationReportService', () => ({
    default: { getReport: (...a: any[]) => getReport(...a), getDetails: (...a: any[]) => getDetails(...a) },
}));

import CancellationsReport from '../CancellationsReport';

const report: any = {
    period: { startDate: '2026-10-01', endDate: '2026-10-31' },
    summary: { totalAppointments: 200, totalCanceled: 100, cancelRate: 50, lessThan24h: 12, absences: 7, automaticCancellations: 3, unspecified: 0, unspecifiedByChannel: {} },
    coverage: { total: 100, identified: 100, percent: 100 },
    byRequester: [
        { requester: 'patient', label: 'Paciente/responsável', count: 70, percent: 70, lessThan24h: 8 },
        { requester: 'professional', label: 'Profissional', count: 25, percent: 25, lessThan24h: 4 },
        { requester: 'clinic', label: 'Clínica', count: 5, percent: 5, lessThan24h: 0 },
        { requester: 'unspecified', label: 'Não informado', count: 0, percent: 0, lessThan24h: 0 },
    ],
    comparison: {
        previousPeriod: { startDate: '2026-09-01', endDate: '2026-09-30' },
        total: { current: 100, previous: 90, diff: 10 },
        byRequester: [
            { requester: 'patient', current: 70, previous: 60, diff: 10 },
            { requester: 'professional', current: 25, previous: 28, diff: -3 },
            { requester: 'clinic', current: 5, previous: 2, diff: 3 },
            { requester: 'unspecified', current: 0, previous: 0, diff: 0 },
        ],
        coverage: { current: { total: 100, identified: 100, percent: 100 }, previous: { total: 90, identified: 90, percent: 100 } },
        byRequesterReliable: true,
    },
    professionals: [
        { doctorId: 'd1', name: 'Dra. Ana', specialty: 'fonoaudiologia', totalAppointments: 20, canceledTotal: 9, requestedByProfessional: 5, requestedByPatients: 4, requestedByClinic: 0, unspecified: 0, lessThan24hByProfessional: 2, lastRequestedByProfessional: '2026-10-14', professionalRate: 25, agendaCancelRate: 45 },
        { doctorId: 'd2', name: 'Dr. Só Pacientes', specialty: null, totalAppointments: 10, canceledTotal: 3, requestedByProfessional: 0, requestedByPatients: 3, requestedByClinic: 0, unspecified: 0, lessThan24hByProfessional: 0, professionalRate: 0, agendaCancelRate: 30 },
    ],
    patients: [
        { patientId: 'p1', name: 'Maria Souza', totalAppointments: 10, canceledTotal: 4, requestedByPatient: 3, requestedByProfessional: 1, requestedByClinic: 0, unspecified: 0, lessThan24hByPatient: 1, lastRequestedByPatient: '2026-10-10', patientRate: 30 },
        { patientId: 'p2', name: 'João Lima', totalAppointments: 8, canceledTotal: 1, requestedByPatient: 1, requestedByProfessional: 0, requestedByClinic: 0, unspecified: 0, lessThan24hByPatient: 0, lastRequestedByPatient: '2026-10-02', patientRate: 12 },
        { patientId: 'p3', name: 'Só Profissional', totalAppointments: 8, canceledTotal: 2, requestedByPatient: 0, requestedByProfessional: 2, requestedByClinic: 0, unspecified: 0, lessThan24hByPatient: 0, patientRate: 0 },
    ],
};

const detail = {
    appointmentId: 'a1', date: '2026-09-10', time: '10:00', specialty: 'fonoaudiologia',
    patientId: 'p2', patientName: 'Paciente Dois', doctorId: 'd1', doctorName: 'Dra. Ana',
    requester: 'professional', requesterLabel: 'Profissional', reason: 'Congresso',
    requestedAt: null, requestedAtApproximate: true, registeredAt: '2026-09-10T09:00:00.000Z', registeredBy: 'Secretária Maria',
    hoursInAdvance: 4, lessThan24h: true,
};

beforeEach(() => {
    getReport.mockReset().mockResolvedValue(report);
    getDetails.mockReset().mockResolvedValue([detail]);
});

describe('CancellationsReport', () => {
    it('cards por solicitante mostram quantidade, % e comparação em texto (a mais/a menos)', async () => {
        render(<CancellationsReport />);
        const cards = await screen.findByRole('region', { name: 'Resumo por solicitante' });

        expect(cards).toHaveTextContent('Pacientes/responsáveis');
        expect(cards).toHaveTextContent('70');
        expect(cards).toHaveTextContent('70% dos cancelamentos');
        expect(cards).toHaveTextContent('10 a mais que no período anterior');
        expect(cards).toHaveTextContent('3 a menos que no período anterior');
    });

    it('período padrão é "Este mês" e o mesmo critério é enviado ao backend', async () => {
        render(<CancellationsReport />);
        await waitFor(() => expect(getReport).toHaveBeenCalled());
        const f = getReport.mock.calls[0][0];
        expect(f.startDate.endsWith('-01')).toBe(true);
        expect(screen.getByRole('button', { name: 'Este mês' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'Últimos 3 meses' }));
        await waitFor(() => expect(getReport.mock.calls.length).toBeGreaterThan(1));
    });

    it('aba de pacientes lista só quem o paciente pediu (3, 1) e não quem só teve pedidos do profissional', async () => {
        render(<CancellationsReport />);
        await screen.findByText('Maria Souza');
        expect(screen.getByText('João Lima')).toBeInTheDocument();
        expect(screen.queryByText('Só Profissional')).not.toBeInTheDocument();
        expect(screen.getByText('Último cancelamento')).toBeInTheDocument();
        expect(screen.queryByText(/N\/I|Taxa dele|Pedidos por ele/)).not.toBeInTheDocument();
    });

    it('aba de profissionais não atribui a ele os pedidos de pacientes da agenda', async () => {
        render(<CancellationsReport />);
        fireEvent.click(await screen.findByRole('tab', { name: /Profissionais que cancelaram/ }));
        expect(await screen.findByText('Dra. Ana')).toBeInTheDocument();
        expect(screen.queryByText('Dr. Só Pacientes')).not.toBeInTheDocument();
        expect(screen.getByText('Taxa sobre seus agendamentos')).toBeInTheDocument();
        expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('busca e filtro "3 ou mais cancelamentos"', async () => {
        render(<CancellationsReport />);
        await screen.findByText('Maria Souza');

        fireEvent.click(screen.getByRole('button', { name: '3 ou mais cancelamentos' }));
        expect(screen.getByText('Maria Souza')).toBeInTheDocument();
        expect(screen.queryByText('João Lima')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '3 ou mais cancelamentos' }));
        fireEvent.change(screen.getByPlaceholderText('Buscar por nome'), { target: { value: 'joão' } });
        expect(screen.getByText('João Lima')).toBeInTheDocument();
        expect(screen.queryByText('Maria Souza')).not.toBeInTheDocument();
    });

    it('"Ver histórico" abre painel lateral com motivo, antecedência, aproximação e quem registrou', async () => {
        render(<CancellationsReport />);
        fireEvent.click(await screen.findByRole('tab', { name: /Profissionais que cancelaram/ }));
        fireEvent.click(await screen.findByRole('button', { name: 'Ver histórico de Dra. Ana' }));

        await waitFor(() => expect(getDetails).toHaveBeenCalledWith(expect.objectContaining({ requester: 'professional', doctorId: 'd1' })));
        const dialog = await screen.findByRole('dialog');
        expect(await within(dialog).findByText('Congresso')).toBeInTheDocument();
        expect(dialog).toHaveTextContent('4 h antes');
        expect(dialog).toHaveTextContent('Menos de 24h');
        expect(dialog).toHaveTextContent('Aproximado: usamos a hora do registro');
        expect(dialog).toHaveTextContent('Secretária Maria');
    });

    it('sem nenhuma identificação: avisa e não mostra ranking nem 0% como conclusão', async () => {
        getReport.mockResolvedValue({
            ...report,
            summary: { ...report.summary, totalCanceled: 215, unspecified: 215, unspecifiedByChannel: { historico: 215 } },
            coverage: { total: 215, identified: 0, percent: 0 },
            byRequester: report.byRequester.map((r: any) => ({ ...r, count: r.requester === 'unspecified' ? 215 : 0, percent: r.requester === 'unspecified' ? 100 : 0 })),
        });
        render(<CancellationsReport />);

        expect(await screen.findByText(/Há 215 cancelamentos neste período sem identificação de quem solicitou/)).toBeInTheDocument();
        expect(screen.queryByRole('region', { name: 'Resumo por solicitante' })).not.toBeInTheDocument();
        await waitFor(() => expect(screen.getByRole('tab', { name: /Sem identificação/ })).toHaveAttribute('aria-selected', 'true'));
        expect(screen.queryByText('Maria Souza')).not.toBeInTheDocument();
    });

    it('comparação por solicitante indisponível quando a cobertura mudou muito', async () => {
        getReport.mockResolvedValue({
            ...report,
            summary: { ...report.summary, unspecified: 40, unspecifiedByChannel: { historico: 40 } },
            comparison: { ...report.comparison, byRequesterReliable: false, coverage: { current: { total: 100, identified: 60, percent: 60 }, previous: { total: 90, identified: 0, percent: 0 } } },
        });
        render(<CancellationsReport />);
        expect(await screen.findByText(/Comparação por solicitante indisponível/)).toBeInTheDocument();
        const cards = screen.getByRole('region', { name: 'Resumo por solicitante' });
        expect(cards).not.toHaveTextContent('a mais que no período anterior');
    });

    it('aba "Sem identificação" lista os atendimentos', async () => {
        render(<CancellationsReport />);
        fireEvent.click(await screen.findByRole('tab', { name: /Sem identificação/ }));
        await waitFor(() => expect(getDetails).toHaveBeenCalledWith(expect.objectContaining({ requester: 'unspecified' })));
        expect(await screen.findByText('Paciente Dois')).toBeInTheDocument();
    });

    it('exibe erro do backend sem quebrar a tela', async () => {
        getReport.mockRejectedValueOnce({ response: { data: { message: 'falhou feio' } } });
        render(<CancellationsReport />);
        expect(await screen.findByRole('alert')).toBeInTheDocument();
    });
});
