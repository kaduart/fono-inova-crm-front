// Aniversariante do dia sem parabéns, visível no ERP inteiro (Kadu 10–11/11).
// - Busca a contagem pronta do back (meta.todayPending de /patients/aniversariantes) ao abrir,
//   a cada 10 min e quando alguém manda um parabéns (evento BIRTHDAYS_CHANGED).
// - Enquanto houver pendente: favicon rosa com 🎂, título "🎂 (N) …" e, com a pessoa em outra
//   aba, o título pisca "Aniversário hoje!".
import { useEffect, useState } from 'react';
import API from '../services/api';

export const BIRTHDAYS_CHANGED = 'fono:birthdays-changed';
const REFRESH_MS = 10 * 60 * 1000;

export function notifyBirthdaysChanged(): void {
    try { window.dispatchEvent(new Event(BIRTHDAYS_CHANGED)); } catch { /* sem window */ }
}

export function useBirthdayAlert(): number {
    const [pending, setPending] = useState(0);

    useEffect(() => {
        let alive = true;
        const load = async () => {
            try {
                const res = await API.get('/patients/aniversariantes');
                const n = Number(res.data?.meta?.todayPending) || 0;
                if (alive) setPending(n);
            } catch { /* mantém o último valor */ }
        };
        const first = window.setTimeout(load, 1200);
        const timer = window.setInterval(load, REFRESH_MS);
        window.addEventListener(BIRTHDAYS_CHANGED, load);
        return () => {
            alive = false;
            window.clearTimeout(first);
            window.clearInterval(timer);
            window.removeEventListener(BIRTHDAYS_CHANGED, load);
        };
    }, []);

    useEffect(() => {
        if (!pending) return;
        const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
        const prevHref = link?.getAttribute('href') ?? null;
        const baseTitle = document.title.replace(/^🎂 \(\d+\) /, '');
        const alertTitle = `🎂 (${pending}) ${baseTitle}`;
        const blinkTitle = pending === 1 ? '🎂 Aniversário hoje!' : `🎂 ${pending} aniversários hoje!`;
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#db2777"/><text x="32" y="45" font-size="38" text-anchor="middle">🎂</text></svg>';
        if (link) link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
        document.title = alertTitle;
        let on = false;
        const timer = window.setInterval(() => {
            if (!document.hidden) { if (document.title !== alertTitle) document.title = alertTitle; return; }
            on = !on;
            document.title = on ? blinkTitle : alertTitle;
        }, 1500);
        return () => {
            window.clearInterval(timer);
            document.title = baseTitle;
            if (link && prevHref !== null) link.setAttribute('href', prevHref);
        };
    }, [pending]);

    return pending;
}
