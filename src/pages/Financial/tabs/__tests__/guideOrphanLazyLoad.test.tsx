import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GuidePendingBillingSection from '../GuidePendingBillingSection';

const baseProps = {
    guides: [],
    selectedGuides: new Set<string>(),
    orphanSessions: [],
    loading: false,
    onToggleGuide: vi.fn(),
    onRefresh: vi.fn(),
    month: '2026-08',
    // convenios agora vem do pai (InsuranceTab) — o componente não busca mais
    // sozinho, ver GuidePendingBillingSectionProps.
    convenios: []
};

describe('GuidePendingBillingSection - órfãs lazy', () => {
    it('carrega sob demanda, permite retry e preserva criar/vincular', async () => {
        const onLoadOrphanSessions = vi.fn().mockResolvedValue(undefined);
        const { rerender } = render(
            <GuidePendingBillingSection
                {...baseProps}
                orphanSessionsCount={1}
                onLoadOrphanSessions={onLoadOrphanSessions}
                orphanSessionsError="Falha temporária"
            />
        );

        expect(screen.queryByText('Paciente Órfão')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
        expect(onLoadOrphanSessions).toHaveBeenCalledOnce();

        rerender(
            <GuidePendingBillingSection
                {...baseProps}
                orphanSessionsCount={1}
                onLoadOrphanSessions={onLoadOrphanSessions}
                orphanSessions={[{
                    sessionId: 'orphan-1', patient: { fullName: 'Paciente Órfão' },
                    insuranceProvider: 'unimed-anapolis', specialty: 'fonoaudiologia',
                    date: '2026-08-01', sessionValue: 140
                }]}
            />
        );
        fireEvent.click(screen.getByText('Unimed Anápolis'));
        expect(await screen.findByText('Paciente Órfão')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /criar guia/i })).toBeEnabled();
        expect(screen.getByRole('button', { name: /^vincular$/i })).toBeEnabled();
        expect(screen.getByRole('button', { name: /vincular automaticamente/i })).toBeEnabled();
    });

    it('bloqueia ações enquanto os detalhes estão carregando', () => {
        render(
            <GuidePendingBillingSection
                {...baseProps}
                orphanSessionsCount={1}
                orphanSessionsLoading
                onLoadOrphanSessions={vi.fn()}
            />
        );
        expect(screen.getByRole('button', { name: /carregando/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /vincular automaticamente/i })).toBeDisabled();
    });
});
