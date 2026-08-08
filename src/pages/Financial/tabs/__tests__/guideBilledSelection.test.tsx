import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GuidePendingBillingSection, { type PendingGuide } from '../GuidePendingBillingSection';

vi.mock('../../../../hooks/useConvenios', () => ({
    useConvenios: () => ({ convenios: [], isLoading: false })
}));

const billedGuide: PendingGuide = {
    guideId: 'guide-billed',
    number: '2027',
    insurance: 'unimed-anapolis',
    patient: { fullName: 'Paciente Teste' },
    billingMode: 'per_guide',
    pendingSessions: 2,
    pendingValue: 280,
    sessions: [
        { sessionId: 's1', paymentId: 'pay-1', phase: 'billed', value: 140 },
        { sessionId: 's2', paymentId: 'pay-2', phase: 'billed', value: 140 }
    ]
};

const baseProps = {
    guides: [billedGuide],
    selectedGuides: new Set<string>(),
    orphanSessions: [],
    loading: false,
    onRefresh: vi.fn(),
    month: '2026-08',
    phaseLabel: 'faturada(s)'
};

describe('GuidePendingBillingSection — seleção no bucket billed', () => {
    it('exibe checkbox e permite selecionar a guia faturada', () => {
        const onToggleGuide = vi.fn();
        render(<GuidePendingBillingSection {...baseProps} onToggleGuide={onToggleGuide} readOnly={false} />);

        const checkbox = screen.getAllByRole('checkbox')[0];
        expect(checkbox).toBeInTheDocument();
        fireEvent.click(checkbox);
        expect(onToggleGuide).toHaveBeenCalledWith('guide-billed');
    });

    it('não exibe checkbox quando a aba é somente leitura', () => {
        render(<GuidePendingBillingSection {...baseProps} onToggleGuide={vi.fn()} readOnly />);
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });
});
