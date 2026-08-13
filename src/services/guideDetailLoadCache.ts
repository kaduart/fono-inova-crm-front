export class StaleGuideDetailError extends Error {}

export class GuideDetailLoadCache<T> {
    private cache = new Map<string, T>();
    private inflight = new Map<string, Promise<T>>();
    private generation = 0;

    load(key: string, fetcher: () => Promise<T>): Promise<T> {
        const cached = this.cache.get(key);
        if (cached !== undefined) return Promise.resolve(cached);
        const active = this.inflight.get(key);
        if (active) return active;

        const generation = this.generation;
        const request = fetcher().then(value => {
            if (generation !== this.generation) throw new StaleGuideDetailError('Detalhes ficaram desatualizados; tente novamente');
            this.cache.set(key, value);
            return value;
        });
        this.inflight.set(key, request);
        void request.finally(() => {
            if (this.inflight.get(key) === request) this.inflight.delete(key);
        }).catch(() => undefined);
        return request;
    }

    invalidate(): void {
        this.generation++;
        this.cache.clear();
        this.inflight.clear();
    }
}
