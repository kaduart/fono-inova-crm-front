import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import FinancialDashboard from './FinancialDashboard';

// Mocks dos componentes filhos para isolar o comportamento das tabs
vi.mock('./UnifiedCashflowTab', () => ({
    default: ({ onDateChange }: { onDateChange?: (date: string) => void }) => <div data-testid="tab-caixa-unificado">Caixa & Fluxo<button onClick={() => onDateChange?.('2000-10-19')}>Consultar dia específico</button></div>,
}));

vi.mock('../../components/financial/PaymentPage', () => ({
    default: () => <div data-testid="tab-pagamentos">Pagamentos</div>,
}));

vi.mock('./tabs/InsuranceTab', () => ({
    default: ({ month, year, onPeriodChange }: { month: number; year: number; onPeriodChange: (month: number, year: number) => void }) => (
        <div data-testid="tab-convenios">
            <span data-testid="convenios-period">{month}/{year}</span>
            <button type="button" onClick={() => onPeriodChange(6, 2025)}>Alterar competência interna</button>
        </div>
    ),
}));

vi.mock('./tabs/ExpensesTab', () => ({
    default: () => <div data-testid="tab-despesas">Despesas</div>,
}));

vi.mock('./tabs/IndicadoresTab', () => ({
    default: () => <div data-testid="tab-dashboard">Dashboard</div>,
}));

vi.mock('./tabs/PlanningTab', () => ({
    default: () => <div data-testid="tab-planejamento">Planejamento Anual</div>,
}));

vi.mock('./tabs/ProfissionaisTab', () => ({
    default: () => <div data-testid="tab-profissionais">Profissionais</div>,
}));

const LocationInspector = () => {
    const location = useLocation();
    return <div data-testid="location-search">{location.search}</div>;
};

const renderWithRouter = (initialEntry = '/admin/financial') => {
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
                <Route path="/admin/financial" element={
                    <>
                        <FinancialDashboard
                            patients={[]}
                            doctors={[]}
                            initialPayments={[]}
                            onMarkAsPaid={vi.fn()}
                            registerAppointmentAndPaymentFuture={vi.fn()}
                            onCancelPayment={vi.fn()}
                        />
                        <LocationInspector />
                    </>
                } />
            </Routes>
        </MemoryRouter>
    );
};

describe('FinancialDashboard - persistência de tab via URL', () => {
    afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
    beforeEach(() => {
        vi.clearAllMocks();
        // O prefetch de abas não faz parte deste teste de navegação.
        vi.stubGlobal('requestIdleCallback', vi.fn());
    });

    it('desmarca Hoje ao escolher outra data e restaura ao selecionar Hoje', () => {
        renderWithRouter('/admin/financial');
        const today = screen.getByRole('button', { name: 'Hoje', exact: true });
        expect(today).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'Consultar dia específico' }));
        expect(today).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(today);
        expect(today).toHaveAttribute('aria-pressed', 'true');
    });

    it('deve iniciar na primeira tab quando não há query param', async () => {
        renderWithRouter('/admin/financial');

        await waitFor(() => {
            expect(screen.getByTestId('tab-caixa-unificado')).toBeInTheDocument();
        });
        expect(screen.getByRole('tab', { name: /caixa & fluxo/i })).toHaveAttribute('aria-selected', 'true');
    });

    it('deve restaurar a tab a partir do query param ?financialTab=dashboard', async () => {
        renderWithRouter('/admin/financial?financialTab=dashboard');

        await waitFor(() => {
            expect(screen.getByTestId('tab-dashboard')).toBeInTheDocument();
        }, { timeout: 3000 });
        expect(screen.getByRole('tab', { name: /resultados/i })).toHaveAttribute('aria-selected', 'true');
    });

    it('deve restaurar a tab a partir do query param ?financialTab=despesas', async () => {
        renderWithRouter('/admin/financial?financialTab=despesas');

        await waitFor(() => {
            expect(screen.getByTestId('tab-despesas')).toBeInTheDocument();
        }, { timeout: 3000 });
        expect(screen.getByRole('tab', { name: /despesas/i })).toHaveAttribute('aria-selected', 'true');
    });

    it('deve voltar para a primeira tab quando o query param é inválido', async () => {
        renderWithRouter('/admin/financial?financialTab=tab-inexistente');

        await waitFor(() => {
            expect(screen.getByTestId('tab-caixa-unificado')).toBeInTheDocument();
        });
        expect(screen.getByRole('tab', { name: /caixa & fluxo/i })).toHaveAttribute('aria-selected', 'true');
    });

    it('deve atualizar a URL ao trocar de tab', async () => {
        renderWithRouter('/admin/financial');

        await waitFor(() => {
            expect(screen.getByTestId('tab-caixa-unificado')).toBeInTheDocument();
        });

        const dashboardButton = screen.getByRole('tab', { name: /resultados/i });
        await act(async () => { fireEvent.click(dashboardButton); });

        await waitFor(() => {
            expect(screen.getByTestId('location-search')).toHaveTextContent('financialTab=dashboard');
        });

        await waitFor(() => {
            expect(screen.getByTestId('tab-dashboard')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('deve manter outros query params ao trocar de tab', async () => {
        renderWithRouter('/admin/financial?foo=bar');

        await waitFor(() => {
            expect(screen.getByTestId('tab-caixa-unificado')).toBeInTheDocument();
        });

        const expensesButton = screen.getByRole('tab', { name: /despesas/i });
        fireEvent.click(expensesButton);

        await waitFor(() => {
            const search = screen.getByTestId('location-search').textContent;
            expect(search).toContain('foo=bar');
            expect(search).toContain('financialTab=despesas');
        });
    });

    it('sincroniza o seletor interno de convênios com o cabeçalho e a URL', async () => {
        renderWithRouter('/admin/financial?financialTab=convenios&financialMonth=9&financialYear=2026');

        await waitFor(() => {
            expect(screen.getByTestId('convenios-period')).toHaveTextContent('9/2026');
        });

        fireEvent.click(screen.getByRole('button', { name: /alterar competência interna/i }));

        await waitFor(() => {
            expect(screen.getByTestId('convenios-period')).toHaveTextContent('6/2025');
            expect(screen.getByRole('combobox', { name: /mês financeiro/i })).toHaveValue('6');
            expect(screen.getByRole('combobox', { name: /ano financeiro/i })).toHaveValue('2025');
            const search = screen.getByTestId('location-search').textContent;
            expect(search).toContain('financialMonth=6');
            expect(search).toContain('financialYear=2025');
        });
    });

    it('propaga a alteração do cabeçalho para o filtro interno de convênios', async () => {
        renderWithRouter('/admin/financial?financialTab=convenios&financialMonth=9&financialYear=2026');

        fireEvent.change(screen.getByRole('combobox', { name: /mês financeiro/i }), { target: { value: '6' } });

        await waitFor(() => {
            expect(screen.getByTestId('convenios-period')).toHaveTextContent('6/2026');
        });
    });
});
