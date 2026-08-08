import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BillingTypeSelector from './BillingTypeSelector';
import LiminarBillingFields from './LiminarBillingFields';

describe('BillingTypeSelector', () => {
    it('expõe somente particular e convênio no fluxo comum', () => {
        render(<BillingTypeSelector value="particular" onChange={vi.fn()} />);

        expect(screen.getByRole('button', { name: 'Particular' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Convênio' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Liminar' })).not.toBeInTheDocument();
    });

    it('preserva liminar como origem judicial quando não é editável', () => {
        render(<BillingTypeSelector value="liminar" onChange={vi.fn()} />);

        expect(screen.getByText('Liminar')).toBeInTheDocument();
        expect(screen.getByText('(judicial)')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('permite a opção liminar somente quando explicitamente habilitada', () => {
        const onChange = vi.fn();
        render(
            <BillingTypeSelector
                value="particular"
                onChange={onChange}
                showLiminar
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Liminar' }));
        expect(onChange).toHaveBeenCalledWith('liminar');
    });
});

describe('LiminarBillingFields', () => {
    it('mostra valor, saldo e processo judicial sem campos de convênio', () => {
        render(
            <LiminarBillingFields
                value={160}
                onChange={vi.fn()}
                creditBalance={25710}
                processNumber="5959911-12-2025.8.09.0006"
            />,
        );

        expect(screen.getByText('Valor da sessão judicial *')).toBeInTheDocument();
        expect(screen.getByDisplayValue(/160,00/)).toBeInTheDocument();
        expect(screen.getByText(/Saldo judicial: R\$ 25710,00/)).toBeInTheDocument();
        expect(screen.getByText(/5959911-12-2025\.8\.09\.0006/)).toBeInTheDocument();
        expect(screen.queryByText('Convênio')).not.toBeInTheDocument();
    });
});
