/**
 * Rascunho da evolução no modal (fase 1 da sprint prontuário, 03/11/2026).
 * - grava no aparelho enquanto digita
 * - sobe ao servidor a cada 10 s quando há agendamento
 * - fechar guarda o rascunho ("terminar depois") e reabrir recupera
 * - evolução já finalizada para o autosave e limpa o aparelho
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';

vi.mock('../../../utils/toast', () => ({ toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../../ui/ConfirmHost', () => ({ confirmDialog: vi.fn().mockResolvedValue(true) }));

import { NewEvaluationModal } from '../NewEvaluationModal';
import { toast } from '../../../utils/toast';

const KEY = 'appt:abc';
const typeText = (txt: string) => {
    const ta = screen.getByPlaceholderText(/Descreva detalhadamente/i);
    fireEvent.change(ta, { target: { value: txt } });
};
const flush = async (ms: number) => { await act(async () => { vi.advanceTimersByTime(ms); }); await act(async () => { await Promise.resolve(); }); };

describe('NewEvaluationModal · rascunho', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        // tests/setup.ts troca o localStorage por mocks vazios; aqui ele guarda de verdade.
        const mem = new Map<string, string>();
        const ls = window.localStorage as unknown as Record<'getItem' | 'setItem' | 'removeItem' | 'clear', ReturnType<typeof vi.fn>>;
        ls.getItem.mockImplementation((k: string) => (mem.has(k) ? mem.get(k) : null));
        ls.setItem.mockImplementation((k: string, v: string) => { mem.set(k, String(v)); });
        ls.removeItem.mockImplementation((k: string) => { mem.delete(k); });
        ls.clear.mockImplementation(() => mem.clear());
    });
    afterEach(() => { cleanup(); vi.useRealTimers(); });

    it('grava no aparelho e sobe ao servidor em até 10 s', async () => {
        const onAutosave = vi.fn().mockResolvedValue({ lastAutosaveAt: '2026-11-03T14:10:00.000Z' });
        render(<NewEvaluationModal open onClose={vi.fn()} onSave={vi.fn()} draftKey={KEY} onAutosave={onAutosave} loadServerDraft={async () => null} />);
        await flush(0);
        typeText('Lucas pediu "mais bola" 3 vezes');
        await flush(500);
        const local = JSON.parse(localStorage.getItem(`evo-draft:${KEY}`) || 'null');
        expect(local?.form?.content).toBe('Lucas pediu "mais bola" 3 vezes');
        await flush(10000);
        expect(onAutosave).toHaveBeenCalledTimes(1);
        expect(onAutosave.mock.calls[0][0].form.content).toBe('Lucas pediu "mais bola" 3 vezes');
        expect(onAutosave.mock.calls[0][1]).toBeNull(); // 1º save não tem base
        expect(screen.getByRole('status').textContent).toMatch(/Rascunho salvo/);
    });

    it('fechar guarda e não pede para descartar; reabrir recupera o texto', async () => {
        const onClose = vi.fn();
        const { unmount } = render(<NewEvaluationModal open onClose={onClose} onSave={vi.fn()} draftKey={KEY} />);
        await flush(0);
        typeText('texto da sessão');
        await flush(500);
        fireEvent.click(screen.getByRole('button', { name: /Fechar e terminar depois/i }));
        await flush(0);
        expect(onClose).toHaveBeenCalled();
        unmount();

        render(<NewEvaluationModal open onClose={vi.fn()} onSave={vi.fn()} draftKey={KEY} />);
        await flush(0);
        expect((screen.getByPlaceholderText(/Descreva detalhadamente/i) as HTMLTextAreaElement).value).toBe('texto da sessão');
        expect(toast.info).toHaveBeenCalled();
    });

    it('finalizar com sucesso limpa o rascunho do aparelho', async () => {
        const onSave = vi.fn().mockResolvedValue(true);
        render(<NewEvaluationModal open onClose={vi.fn()} onSave={onSave} draftKey={KEY} />);
        await flush(0);
        typeText('pronto');
        await flush(500);
        expect(localStorage.getItem(`evo-draft:${KEY}`)).not.toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /Finalizar evolução/i }));
        await flush(0);
        expect(onSave).toHaveBeenCalled();
        expect(localStorage.getItem(`evo-draft:${KEY}`)).toBeNull();
    });

    it('se o servidor diz que já foi finalizada, para o autosave e limpa o aparelho', async () => {
        const err = Object.assign(new Error('x'), { draftError: 'finalized' });
        const onAutosave = vi.fn().mockRejectedValue(err);
        render(<NewEvaluationModal open onClose={vi.fn()} onSave={vi.fn()} draftKey={KEY} onAutosave={onAutosave} />);
        await flush(0);
        typeText('tarde demais');
        await flush(10500);
        expect(onAutosave).toHaveBeenCalledTimes(1);
        typeText('tarde demais 2');
        await flush(10500);
        expect(onAutosave).toHaveBeenCalledTimes(1);
        expect(localStorage.getItem(`evo-draft:${KEY}`)).toBeNull();
        expect(screen.getByRole('status').textContent).toMatch(/Já finalizada/);
    });

    it('sem internet mantém no aparelho e mostra o aviso', async () => {
        const err = Object.assign(new Error('x'), { draftError: 'offline' });
        const onAutosave = vi.fn().mockRejectedValue(err);
        render(<NewEvaluationModal open onClose={vi.fn()} onSave={vi.fn()} draftKey={KEY} onAutosave={onAutosave} />);
        await flush(0);
        typeText('sem rede');
        await flush(10500);
        expect(screen.getByRole('status').textContent).toMatch(/Sem internet/);
        expect(JSON.parse(localStorage.getItem(`evo-draft:${KEY}`) || '{}').form.content).toBe('sem rede');
    });
});
