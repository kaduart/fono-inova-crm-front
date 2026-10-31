// src/utils/sharedPoll.ts
//
// Polling compartilhado: N componentes que precisam do mesmo dado fazem UMA
// requisição por intervalo (antes header e Dashboard pediam cada um a sua), e o
// intervalo pausa enquanto a aba do navegador está oculta, voltando com uma
// busca imediata ao reaparecer. Auditoria do Dashboard admin, 31/10/2026 (B6).

type Listener<T> = (state: PollState<T>) => void;
export interface PollState<T> { data: T | null; error: boolean; loading: boolean }

interface Poller<T> {
    subscribe: (fn: Listener<T>) => () => void;
    refresh: () => Promise<void>;
    getState: () => PollState<T>;
}

export function createSharedPoll<T>(fetcher: () => Promise<T>, intervalMs: number): Poller<T> {
    let state: PollState<T> = { data: null, error: false, loading: false };
    const listeners = new Set<Listener<T>>();
    let timer: ReturnType<typeof setInterval> | null = null;
    let inFlight: Promise<void> | null = null;
    let lastRun = 0;

    const emit = () => listeners.forEach(fn => fn(state));
    const hidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

    const refresh = () => {
        if (inFlight) return inFlight;
        state = { ...state, loading: true };
        emit();
        inFlight = fetcher()
            .then(data => { state = { data, error: false, loading: false }; })
            .catch(() => { state = { ...state, error: true, loading: false }; })
            .finally(() => { lastRun = Date.now(); inFlight = null; emit(); });
        return inFlight;
    };

    const start = () => {
        if (timer || hidden()) return;
        timer = setInterval(() => { if (!hidden()) refresh(); }, intervalMs);
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

    const onVisibility = () => {
        if (hidden()) { stop(); return; }
        if (Date.now() - lastRun >= intervalMs) refresh();
        start();
    };

    return {
        subscribe(fn) {
            listeners.add(fn);
            if (listeners.size === 1) {
                if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
                if (!lastRun || Date.now() - lastRun >= intervalMs) refresh();
                start();
            }
            fn(state);
            return () => {
                listeners.delete(fn);
                if (listeners.size === 0) {
                    stop();
                    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
                }
            };
        },
        refresh,
        getState: () => state,
    };
}
