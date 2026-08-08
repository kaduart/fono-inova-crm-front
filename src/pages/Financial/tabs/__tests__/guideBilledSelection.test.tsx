import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GuidePendingBillingSection, { PatientDrawer, type PendingGuide } from '../GuidePendingBillingSection';

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

    it('deixa a seleção de faturamento somente dentro do drawer do paciente', () => {
        render(
            <GuidePendingBillingSection
                {...baseProps}
                onToggleGuide={vi.fn()}
                drawerAction="send_documents"
                phase="pendingBilling"
                onDrawerAction={vi.fn()}
            />
        );

        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        fireEvent.click(screen.getByText('Unimed Anápolis'));
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        fireEvent.click(screen.getByText('Paciente Teste'));
        expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    });

    it('mostra resumo correto e executa recebimento dentro do drawer', () => {
        const onReceiveSelectedGuides = vi.fn();
        render(
            <PatientDrawer
                open
                patientName="Paciente Teste"
                provider="unimed-anapolis"
                guides={[billedGuide]}
                selectedGuides={new Set(['guide-billed'])}
                convenios={[]}
                onToggleGuide={vi.fn()}
                onEditGuide={vi.fn()}
                onCloseGuide={vi.fn()}
                onClose={vi.fn()}
                drawerAction="receive"
                phase="billed"
                phaseLabel="faturada(s)"
                onDrawerAction={onReceiveSelectedGuides}
            />
        );

        expect(screen.getByText('sessões faturadas')).toBeInTheDocument();
        expect(screen.getByText('a receber')).toBeInTheDocument();
        expect(screen.getByText('Aguardando recebimento')).toBeInTheDocument();
        expect(screen.queryByText(/não aparece.*na lista abaixo/i)).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /marcar como recebido/i }));
        expect(onReceiveSelectedGuides).toHaveBeenCalledWith(['guide-billed']);
    });

    it('prepara o faturamento pelas guias escolhidas dentro do drawer A Faturar', () => {
        const onPrepareBilling = vi.fn();
        render(
            <PatientDrawer
                open
                patientName="Paciente Teste"
                provider="unimed-anapolis"
                guides={[billedGuide]}
                selectedGuides={new Set(['guide-billed'])}
                convenios={[]}
                onToggleGuide={vi.fn()}
                onEditGuide={vi.fn()}
                onCloseGuide={vi.fn()}
                onClose={vi.fn()}
                drawerAction="send_documents"
                phase="pendingBilling"
                phaseLabel="para faturar"
                onDrawerAction={onPrepareBilling}
            />
        );

        expect(screen.getByText('A faturar · documentos pendentes')).toBeInTheDocument();
        expect(screen.getByText('sessões a faturar')).toBeInTheDocument();
        expect(screen.getByText('Próxima ação: preparar faturamento')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /preparar faturamento/i }));
        expect(onPrepareBilling).toHaveBeenCalledWith(['guide-billed']);
    });

    it('inclui automaticamente todas as guias do mês no modo mensal', () => {
        const onPrepareBilling = vi.fn();
        const monthlyGuides: PendingGuide[] = [
            { ...billedGuide, guideId: 'guide-month-1', number: '3001', billingMode: 'per_month' },
            { ...billedGuide, guideId: 'guide-month-2', number: '3002', billingMode: 'per_month' }
        ];

        render(
            <PatientDrawer
                open
                patientName="Paciente Teste"
                provider="unimed-anapolis"
                guides={monthlyGuides}
                selectedGuides={new Set()}
                convenios={[]}
                onToggleGuide={vi.fn()}
                onEditGuide={vi.fn()}
                onCloseGuide={vi.fn()}
                onClose={vi.fn()}
                drawerAction="send_documents"
                phase="pendingBilling"
                phaseLabel="para faturar"
                onDrawerAction={onPrepareBilling}
            />
        );

        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        expect(screen.getByText(/todas as sessões do mês serão incluídas automaticamente/i)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /preparar faturamento/i }));
        expect(onPrepareBilling).toHaveBeenCalledWith(['guide-month-1', 'guide-month-2']);
    });

    it('abre a competência pendente mais antiga quando o mês selecionado não possui sessões', () => {
        const onPrepareBilling = vi.fn();
        const overdueGuide: PendingGuide = {
            ...billedGuide,
            guideId: 'guide-overdue',
            insurance: 'bradesco-saude',
            billingMode: 'per_month',
            patient: { fullName: 'Paciente Atrasado' },
            sessions: [{
                sessionId: 'session-overdue',
                paymentId: 'payment-overdue',
                phase: 'pendingBilling',
                value: 150,
                date: '2026-06-10'
            }]
        };

        render(
            <GuidePendingBillingSection
                {...baseProps}
                guides={[overdueGuide]}
                month="2026-08"
                onToggleGuide={vi.fn()}
                drawerAction="send_documents"
                phase="pendingBilling"
                onDrawerAction={onPrepareBilling}
            />
        );

        fireEvent.click(screen.getByText('Bradesco Saúde'));
        fireEvent.click(screen.getByText('Paciente Atrasado'));
        expect(screen.getByText('Competência 2026-06')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /preparar faturamento/i }));
        expect(onPrepareBilling).toHaveBeenCalledWith(['guide-overdue'], '2026-06');
    });

    it('padroniza Aguardando Faturamento com cards completos e ação no drawer', () => {
        const onBill = vi.fn();
        render(
            <PatientDrawer
                open
                patientName="Paciente Teste"
                provider="unimed-anapolis"
                guides={[billedGuide]}
                selectedGuides={new Set(['guide-billed'])}
                convenios={[]}
                onToggleGuide={vi.fn()}
                onEditGuide={vi.fn()}
                onCloseGuide={vi.fn()}
                onClose={vi.fn()}
                drawerAction="bill"
                phase="documentationSent"
                phaseLabel="documentada(s)"
                onDrawerAction={onBill}
            />
        );

        expect(screen.getByText('Documentos enviados · pronto para faturar')).toBeInTheDocument();
        expect(screen.getByText('Próxima ação: continuar faturamento')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /continuar faturamento/i }));
        expect(onBill).toHaveBeenCalledWith(['guide-billed']);
    });
});
