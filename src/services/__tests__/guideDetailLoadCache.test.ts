import { describe, expect, it, vi } from 'vitest';
import { GuideDetailLoadCache, StaleGuideDetailError } from '../guideDetailLoadCache';

describe('GuideDetailLoadCache', () => {
    it('deduplica guideId + phase simultâneos e mantém cache só na instância da tela', async () => {
        const cache = new GuideDetailLoadCache<string>();
        const fetcher = vi.fn().mockResolvedValue('detalhe');
        const [first, second] = await Promise.all([cache.load('g1:billed', fetcher), cache.load('g1:billed', fetcher)]);
        expect([first, second]).toEqual(['detalhe', 'detalhe']);
        expect(fetcher).toHaveBeenCalledOnce();
        await cache.load('g1:billed', fetcher);
        expect(fetcher).toHaveBeenCalledOnce();
        await new GuideDetailLoadCache<string>().load('g1:billed', fetcher);
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('não armazena erro como resultado válido', async () => {
        const cache = new GuideDetailLoadCache<string>();
        const fetcher = vi.fn().mockRejectedValueOnce(new Error('falha')).mockResolvedValueOnce('retry');
        await expect(cache.load('g1:billed', fetcher)).rejects.toThrow('falha');
        await expect(cache.load('g1:billed', fetcher)).resolves.toBe('retry');
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('invalida após mutação e impede resposta antiga fora de ordem', async () => {
        const cache = new GuideDetailLoadCache<string>();
        let releaseOld!: (value: string) => void;
        const old = cache.load('g1:billed', () => new Promise(resolve => { releaseOld = resolve; }));
        cache.invalidate();
        const fresh = cache.load('g1:billed', async () => 'novo');
        releaseOld('antigo');
        await expect(old).rejects.toBeInstanceOf(StaleGuideDetailError);
        await expect(fresh).resolves.toBe('novo');
        await expect(cache.load('g1:billed', async () => 'incorreto')).resolves.toBe('novo');
    });
});
