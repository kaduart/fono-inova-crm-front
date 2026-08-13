import { afterEach, describe, expect, it, vi } from 'vitest';
import { beginCashflowLoad, waitForCashflowLoad } from '../financialLoadCoordinator';

describe('financialLoadCoordinator', () => {
    afterEach(() => vi.useRealTimers());

    it('libera a read-view somente após todas as cargas de cashflow terminarem', async () => {
        const finishFirst = beginCashflowLoad();
        const finishSecond = beginCashflowLoad();
        const released = vi.fn();
        const waiting = waitForCashflowLoad().then(released);

        finishFirst();
        await Promise.resolve();
        expect(released).not.toHaveBeenCalled();

        finishSecond();
        await waiting;
        expect(released).toHaveBeenCalledOnce();
    });

    it('não bloqueia a abertura direta quando não há cashflow ativo', async () => {
        await expect(waitForCashflowLoad()).resolves.toBeUndefined();
    });

    it('libera mais de uma read-view aguardando a mesma carga', async () => {
        const finish = beginCashflowLoad();
        const first = vi.fn();
        const second = vi.fn();
        const waits = Promise.all([waitForCashflowLoad().then(first), waitForCashflowLoad().then(second)]);
        finish();
        await waits;
        expect(first).toHaveBeenCalledOnce();
        expect(second).toHaveBeenCalledOnce();
    });

    it('finish idempotente cobre finally, erro e unmount sem deixar promise pendente', async () => {
        const finish = beginCashflowLoad();
        const waiting = waitForCashflowLoad();
        finish();
        finish();
        await expect(waiting).resolves.toBeUndefined();
        await expect(waitForCashflowLoad()).resolves.toBeUndefined();
    });

    it('possui escape de timeout e não espera indefinidamente', async () => {
        vi.useFakeTimers();
        const finish = beginCashflowLoad();
        const released = vi.fn();
        const waiting = waitForCashflowLoad().then(released);
        await vi.advanceTimersByTimeAsync(30_000);
        await waiting;
        expect(released).toHaveBeenCalledOnce();
        finish();
    });
});
