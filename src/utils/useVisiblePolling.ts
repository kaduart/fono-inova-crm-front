// src/utils/useVisiblePolling.ts
//
// Polling que PAUSA enquanto a aba do navegador está oculta e volta com uma
// busca imediata ao reaparecer (se já passou o intervalo). Economiza requisições
// no Render em telas que ficam abertas em segundo plano. Auditoria 31/10/2026.
//
// Não dispara a busca no mount: a tela faz a sua busca inicial como antes; o
// hook cuida só do intervalo. Passe `enabled=false` para suspender (ex.: aba
// interna inativa).
import { useEffect, useRef } from 'react';

export function useVisiblePolling(callback: () => void, intervalMs: number, enabled = true) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let lastRun = Date.now();
    const hidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

    const run = () => { lastRun = Date.now(); savedCallback.current(); };
    const start = () => {
      if (timer || hidden()) return;
      timer = setInterval(() => { if (!hidden()) run(); }, intervalMs);
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVisibility = () => {
      if (hidden()) { stop(); return; }
      if (Date.now() - lastRun >= intervalMs) run();
      start();
    };

    start();
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs, enabled]);
}
