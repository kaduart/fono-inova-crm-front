import { useCallback, useEffect, useMemo, useState } from 'react';
import { NOVIDADES_SCREENS, NovidadesArea, NovidadesScreen } from './novidadesData';

// "Visto" fica no aparelho, por usuário: { [screenId]: version }.
const storageKey = (userId?: string) => `erpNovidadesVistas:${userId || 'anon'}`;
// No máximo 1 abertura automática por sessão do navegador.
const AUTO_KEY = 'erpNovidadesAutoAbriu';

function readSeen(userId?: string): Record<string, string> {
    try { return JSON.parse(localStorage.getItem(storageKey(userId)) || '{}') || {}; } catch { return {}; }
}

export function useNovidades(area: NovidadesArea, activeTab: string, userId?: string) {
    const screens = useMemo(() => NOVIDADES_SCREENS.filter((s) => s.area === area), [area]);
    const [seen, setSeen] = useState<Record<string, string>>(() => readSeen(userId));
    const [open, setOpen] = useState<NovidadesScreen | null>(null);

    useEffect(() => { setSeen(readSeen(userId)); }, [userId]);

    const isNew = useCallback((s: NovidadesScreen) => seen[s.id] !== s.version, [seen]);
    const pending = screens.filter(isNew).length;

    const markSeen = useCallback((s: NovidadesScreen) => {
        setSeen((prev) => {
            const next = { ...prev, [s.id]: s.version };
            try { localStorage.setItem(storageKey(userId), JSON.stringify(next)); } catch { /* sem storage: volta a avisar */ }
            return next;
        });
    }, [userId]);

    // Abre sozinho só a tela atual, se ela tiver versão nova e nada abriu nesta sessão.
    useEffect(() => {
        if (!userId) return;
        const current = screens.find((s) => s.tabs.includes(activeTab));
        if (!current || !isNew(current)) return;
        try {
            if (sessionStorage.getItem(AUTO_KEY)) return;
            sessionStorage.setItem(AUTO_KEY, current.id);
        } catch { return; }
        const t = window.setTimeout(() => setOpen(current), 600);
        return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, userId, screens]);

    const show = useCallback((s: NovidadesScreen) => setOpen(s), []);
    const close = useCallback(() => {
        if (open) markSeen(open);
        setOpen(null);
    }, [open, markSeen]);

    return { screens, pending, isNew, open, show, close };
}
