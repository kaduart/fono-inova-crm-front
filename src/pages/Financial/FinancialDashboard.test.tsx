import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import FinancialDashboard from './FinancialDashboard';

// Mocks dos componentes filhos para isolar o comportamento das tabs
vi.mock('./UnifiedCashflowTab', () => ({
    default: () => <div data-testid="tab-caixa-unificado">Caixa & Fluxo</div>,
}));

vi.mock('../../components/financial/PaymentPage', () => ({
    default: () => <div data-testid="tab-pagamentos">Pagamentos</div>,
}));

vi.mock('./tabs/InsuranceTab', () => ({
    default: () => <div data-testid="tab-convenios">Convênios</div>,
}));

vi.mock('./tabs/ExpensesTab', () => ({
    default: () => <div data-testid="tab-despesas">Despesas</div>,
}));

vi.mock('./tabs/FinancialDashboardTab', () => ({
    default: () => <div data-testid="tab-dashboard">Dashboard</div>,
}));

vi.mock('./tabs/PlanningTab', () => ({
    default: () => <div data-testid="tab-planejamento">Planejamento Anual</div>,
}));

vi.mock('../ProfessionalResults/ProfessionalResultsPage', () => ({
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
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deve iniciar na primeira tab quando não há query param', async () => {
        renderWithRouter('/admin/financial');

        await waitFor(() => {
            expect(screen.getByTestId('tab-caixa-unificado')).toBeInTheDocument();
        });
        expect(screen.getByRole('button', { name: /caixa & fluxo/i })).toHaveClass('font-semibold');
    });

    it('deve restaurar a tab a partir do query param ?financialTab=dashboard', async () => {
        renderWithRouter('/admin/financial?financialTab=dashboard');

        await waitFor(() => {
            expect(screen.getByTestId('tab-dashboard')).toBeInTheDocument();
        }, { timeout: 3000 });
        expect(screen.getByRole('button', { name: /dashboard/i })).toHaveClass('font-semibold');
    });

    it('deve restaurar a tab a partir do query param ?financialTab=despesas', async () => {
        renderWithRouter('/admin/financial?financialTab=despesas');

        await waitFor(() => {
            expect(screen.getByTestId('tab-despesas')).toBeInTheDocument();
        }, { timeout: 3000 });
        expect(screen.getByRole('button', { name: /despesas/i })).toHaveClass('font-semibold');
    });

    it('deve voltar para a primeira tab quando o query param é inválido', async () => {
        renderWithRouter('/admin/financial?financialTab=tab-inexistente');

        await waitFor(() => {
            expect(screen.getByTestId('tab-caixa-unificado')).toBeInTheDocument();
        });
        expect(screen.getByRole('button', { name: /caixa & fluxo/i })).toHaveClass('font-semibold');
    });

    it('deve atualizar a URL ao trocar de tab', async () => {
        renderWithRouter('/admin/financial');

        await waitFor(() => {
            expect(screen.getByTestId('tab-caixa-unificado')).toBeInTheDocument();
        });

        const dashboardButton = screen.getByRole('button', { name: /dashboard/i });
        fireEvent.click(dashboardButton);

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

        const expensesButton = screen.getByRole('button', { name: /despesas/i });
        fireEvent.click(expensesButton);

        await waitFor(() => {
            const search = screen.getByTestId('location-search').textContent;
            expect(search).toContain('foo=bar');
            expect(search).toContain('financialTab=despesas');
        });
    });
});
