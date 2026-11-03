import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AnamnesisModal from '../AnamnesisModal';

vi.mock('../../../../ui/ConfirmHost', () => ({ confirmDialog: vi.fn(async () => true) }));

describe('Anamnese: etapas 3 a 7', () => {
    it('não mostra mais "Em breve" e as sugestões preenchem e vão no salvar', () => {
        const onSave = vi.fn();
        render(<AnamnesisModal open onClose={() => {}} onSave={onSave} patient={{ _id: 'p1', fullName: 'Lucas Teste' }} />);
        for (const label of ['Histórico Familiar', 'Desenvolvimento', 'Hábitos', 'Aspectos Escolares', 'Observações']) {
            fireEvent.click(screen.getAllByRole('button', { name: new RegExp(label) })[0]);
            expect(screen.queryByText(/Em breve/)).toBeNull();
        }
        fireEvent.click(screen.getAllByRole('button', { name: /Hábitos/ })[0]);
        fireEvent.click(screen.getByRole('button', { name: '+ Acorda à noite' }));
        fireEvent.click(screen.getByRole('button', { name: '+ Demora a dormir' }));
        expect((screen.getByLabelText('Sono') as HTMLTextAreaElement).value).toBe('Acorda à noite; Demora a dormir');
        // Sugestão marcada desmarca no segundo toque
        fireEvent.click(screen.getByRole('button', { name: '✓ Acorda à noite' }));
        expect((screen.getByLabelText('Sono') as HTMLTextAreaElement).value).toBe('Demora a dormir');
        // single: substitui
        fireEvent.click(screen.getByRole('button', { name: '+ Até 1 h' }));
        fireEvent.click(screen.getByRole('button', { name: '+ Mais de 3 h' }));
        expect((screen.getByLabelText('Tempo de tela por dia') as HTMLInputElement).value).toBe('Mais de 3 h');

        fireEvent.click(screen.getAllByRole('button', { name: /Histórico Familiar/ })[0]);
        fireEvent.change(screen.getByLabelText('Mãe: idade'), { target: { value: '34' } });

        fireEvent.click(screen.getAllByRole('button', { name: /Conclusões/ })[0]);
        fireEvent.click(screen.getByRole('button', { name: /Salvar Anamnese/ }));
        const sent = onSave.mock.calls[0][0];
        expect(sent.content.habits.sleep).toBe('Demora a dormir');
        expect(sent.content.habits.screenTime).toBe('Mais de 3 h');
        expect(sent.content.familyHistory.parents.mother.age).toBe('34');
        expect(sent.content.familyHistory.parents.father.education).toBe('');
    });
});
