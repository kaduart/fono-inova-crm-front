// src/components/common/ThemeToggle.tsx
// Botão sol/lua dos cabeçalhos (terapeuta e admin/secretária).
import { Moon, Sun } from 'lucide-react';
import { useThemeMode } from '../../contexts/ThemeModeContext';

export default function ThemeToggle({ className = '' }: { className?: string }) {
    const { mode, toggle } = useThemeMode();
    const dark = mode === 'dark';
    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}
            aria-pressed={dark}
            title={dark ? 'Tema claro' : 'Tema escuro'}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${className}`}
        >
            {dark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
        </button>
    );
}
