// Auditoria do Dashboard admin (31/10/2026), B6: N assinantes = 1 requisição,
// e o intervalo pausa com a aba oculta.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSharedPoll } from '../sharedPoll';

const setHidden = (hidden: boolean) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
};

describe('createSharedPoll', () => {
    beforeEach(() => { vi.useFakeTimers(); setHidden(false); });
    afterEach(() => { vi.useRealTimers(); });

    it('dois assinantes fazem uma única busca', async () => {
        const fetcher = vi.fn(async () => 1);
        const poll = createSharedPoll(fetcher, 1000);
        const a = vi.fn(); const b = vi.fn();
        const ua = poll.subscribe(a); const ub = poll.subscribe(b);
        await vi.advanceTimersByTimeAsync(0);
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(b).toHaveBeenLastCalledWith({ data: 1, error: false, loading: false });
        ua(); ub();
    });

    it('não busca enquanto a aba está oculta e busca ao voltar', async () => {
        const fetcher = vi.fn(async () => 1);
        const poll = createSharedPoll(fetcher, 1000);
        const u = poll.subscribe(() => {});
        await vi.advanceTimersByTimeAsync(0);
        setHidden(true);
        await vi.advanceTimersByTimeAsync(5000);
        expect(fetcher).toHaveBeenCalledTimes(1);
        setHidden(false);
        await vi.advanceTimersByTimeAsync(0);
        expect(fetcher).toHaveBeenCalledTimes(2);
        u();
    });

    it('erro vira error=true, não zero', async () => {
        const poll = createSharedPoll(async () => { throw new Error('x'); }, 1000);
        const fn = vi.fn();
        const u = poll.subscribe(fn);
        await vi.advanceTimersByTimeAsync(0);
        expect(fn).toHaveBeenLastCalledWith({ data: null, error: true, loading: false });
        u();
    });
});
