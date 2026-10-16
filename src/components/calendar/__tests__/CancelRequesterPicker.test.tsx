import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CancelRequesterPicker, { toRequestedAtISO } from '../CancelRequesterPicker';

describe('CancelRequesterPicker', () => {
    it('não vem com nenhuma opção marcada por padrão', () => {
        render(<CancelRequesterPicker value={null} onChange={() => {}} />);
        const radios = screen.getAllByRole('radio');
        expect(radios).toHaveLength(3);
        radios.forEach((r) => expect(r).toHaveAttribute('aria-checked', 'false'));
    });

    it('oferece paciente/responsável, profissional e clínica e propaga a escolha', () => {
        const onChange = vi.fn();
        render(<CancelRequesterPicker value={null} onChange={onChange} />);

        fireEvent.click(screen.getByRole('radio', { name: /Paciente\/responsável/i }));
        fireEvent.click(screen.getByRole('radio', { name: /Profissional/i }));
        fireEvent.click(screen.getByRole('radio', { name: /Clínica/i }));

        expect(onChange.mock.calls.map((c) => c[0])).toEqual(['patient', 'professional', 'clinic']);
    });

    it('marca somente a opção selecionada', () => {
        render(<CancelRequesterPicker value="professional" onChange={() => {}} />);
        expect(screen.getByRole('radio', { name: /Profissional/i })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByRole('radio', { name: /Clínica/i })).toHaveAttribute('aria-checked', 'false');
    });

    it('data/hora do pedido: escondida sem handler; com handler abre o campo opcional', () => {
        const { rerender } = render(<CancelRequesterPicker value="patient" onChange={() => {}} />);
        expect(screen.queryByText(/outro momento/i)).not.toBeInTheDocument();

        const onRequestedAtChange = vi.fn();
        rerender(
            <CancelRequesterPicker value="patient" onChange={() => {}} requestedAt="" onRequestedAtChange={onRequestedAtChange} />
        );
        fireEvent.click(screen.getByText(/outro momento/i));
        expect(onRequestedAtChange).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/));
    });
});

describe('toRequestedAtISO', () => {
    it('vazio → undefined (backend assume "agora")', () => {
        expect(toRequestedAtISO('')).toBeUndefined();
    });
    it('datetime-local válido → ISO; inválido → undefined', () => {
        expect(toRequestedAtISO('2026-09-09T10:30')).toMatch(/^2026-09-09T\d{2}:30:00\.000Z$|^2026-09-0\dT/);
        expect(toRequestedAtISO('lixo')).toBeUndefined();
    });
});
