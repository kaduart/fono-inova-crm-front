// src/contexts/ThemeModeContext.tsx
// Tema claro/escuro do ERP (terapeuta, secretária e admin). A escolha fica salva neste aparelho;
// sem escolha, segue o tema do sistema. A classe `dark` no <html> liga o Tailwind (darkMode: 'class')
// e a camada src/styles/dark.css; o MUI troca a paleta pelo mesmo modo.
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { theme as baseTheme } from '../theme';

type Mode = 'light' | 'dark';
const STORAGE_KEY = 'fono-theme';

const ThemeModeContext = createContext<{ mode: Mode; toggle: () => void }>({ mode: 'light', toggle: () => {} });

function readStored(): Mode | null {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        return v === 'dark' || v === 'light' ? v : null;
    } catch {
        return null;
    }
}

const systemMode = (): Mode =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<Mode>(() => readStored() ?? systemMode());

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle('dark', mode === 'dark');
        root.style.colorScheme = mode;
    }, [mode]);

    // Sem escolha salva, acompanha a troca de tema do sistema
    useEffect(() => {
        const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
        if (!mq) return;
        const onChange = () => { if (!readStored()) setMode(mq.matches ? 'dark' : 'light'); };
        mq.addEventListener?.('change', onChange);
        return () => mq.removeEventListener?.('change', onChange);
    }, []);

    const toggle = useCallback(() => {
        setMode(prev => {
            const next = prev === 'dark' ? 'light' : 'dark';
            try { localStorage.setItem(STORAGE_KEY, next); } catch { /* sem storage: vale só nesta aba */ }
            return next;
        });
    }, []);

    const muiTheme = useMemo(() => (mode === 'dark'
        ? createTheme(baseTheme, {
            palette: {
                mode: 'dark',
                background: { default: '#0f1513', paper: '#161d1b' },
                text: { primary: '#eef3f1', secondary: '#a9b5b0' },
                divider: '#26312d',
            },
        })
        : baseTheme), [mode]);

    const value = useMemo(() => ({ mode, toggle }), [mode, toggle]);
    return (
        <ThemeModeContext.Provider value={value}>
            <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>
        </ThemeModeContext.Provider>
    );
}

export const useThemeMode = () => useContext(ThemeModeContext);
