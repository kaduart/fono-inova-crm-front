/**
 * Campo "Data de nascimento" do formulário de paciente: digitar 14101985 tem que virar
 * 14/10/1985 (antes: ficava tudo na primeira casa, sem as barras) e salvar o dia certo.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PatientForm from '../PatientForm';

const getDateInput = () => screen.getByPlaceholderText('dd/mm/aaaa') as HTMLInputElement;

describe('PatientForm — data de nascimento', () => {
    it('digitar 14101985 aplica a máscara dd/mm/aaaa', () => {
        render(<PatientForm onSuccess={vi.fn()} />);
        const input = getDateInput();

        fireEvent.change(input, { target: { value: '14101985' } });

        expect(input.value).toBe('14/10/1985');
    });

    it('digitando passo a passo, as barras entram sozinhas', () => {
        render(<PatientForm onSuccess={vi.fn()} />);
        const input = getDateInput();

        fireEvent.change(input, { target: { value: '141' } });
        expect(input.value).toBe('14/1');

        fireEvent.change(input, { target: { value: '14/101' } });
        expect(input.value).toBe('14/10/1');
    });

    it('não deixa acumular lixo: colar texto cheio de caracteres vira só a data', () => {
        render(<PatientForm onSuccess={vi.fn()} />);
        const input = getDateInput();

        fireEvent.change(input, { target: { value: '10101010014/10/1985' } });

        expect(input.value).toBe('10/10/1010');
    });
});
