import { ChevronDown } from 'lucide-react';
import React from 'react';

// Item do menu do header verde (admin e terapeuta). Ícone sempre na cor do texto;
// ativo vira pílula branca com texto verde. Ver mock "Header A" aprovado em 30/10.
interface HeaderNavButtonProps {
    children: React.ReactNode;
    active: boolean;
    onClick: () => void;
    icon?: React.ReactNode;
    hasChevron?: boolean;
    open?: boolean;
    badge?: React.ReactNode;
    title?: string;
}

const HeaderNavButton: React.FC<HeaderNavButtonProps> = ({ children, active, onClick, icon, hasChevron = false, open = false, badge, title }) => (
    <button
        type="button"
        onClick={onClick}
        title={title}
        aria-current={active ? 'page' : undefined}
        aria-expanded={hasChevron ? open : undefined}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[10px] px-2 py-2 min-[1800px]:gap-2 min-[1800px]:px-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
            active
                ? 'bg-[#fff] font-semibold text-[#065f46] shadow-[0_4px_12px_-6px_rgba(0,0,0,0.45)]'
                : 'font-medium text-white/90 hover:bg-white/10 hover:text-white'
        }`}
    >
        {icon && <span className="hidden h-4 w-4 min-[1800px]:flex items-center justify-center [&>svg]:h-4 [&>svg]:w-4" aria-hidden>{icon}</span>}
        <span>{children}</span>
        {badge}
        {hasChevron && <ChevronDown className={`h-3.5 w-3.5 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />}
    </button>
);

// Contador ao lado do item. "hot" = pede ação (âmbar); o resto fica discreto.
export const HeaderCount: React.FC<{ value: number; hot?: boolean; active?: boolean; label?: string }> = ({ value, hot = false, active = false, label }) => (
    <span
        aria-label={label}
        className={`inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
            hot ? 'bg-amber-400 text-amber-950' : active ? 'bg-emerald-700 text-white' : 'bg-white/20 text-white'
        }`}
    >
        {value > 99 ? '99+' : value}
    </span>
);

// Marca do header: azulejo branco + nome em serifa. Logo leve (logo-header.png, ~20 KB).
export const HeaderBrand: React.FC<{ subtitle: string }> = ({ subtitle }) => (
    <span className="flex shrink-0 items-center gap-3 whitespace-nowrap">
        <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[13px] bg-[#fff] shadow-[0_0_0_3px_rgba(255,255,255,0.14),0_6px_14px_-6px_rgba(0,0,0,0.45)]">
            <img className="h-11 w-11 object-cover" src="/images/logo-header.png" alt="Logo Fono Inova" width={44} height={44} />
        </span>
        <span className="hidden flex-col min-[1360px]:flex">
            <span className="text-[21px] font-semibold leading-none tracking-tight text-white" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>Fono Inova</span>
            <span className="mt-1 hidden text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/70 sm:block">{subtitle}</span>
        </span>
    </span>
);

// Fundo do header verde: degradê leve, brilho fino em cima e linha de luz embaixo. Escurece no tema escuro.
export const HEADER_SHELL_CLASS =
    'sticky top-0 z-50 text-white bg-[linear-gradient(100deg,#0a7559,#0d8a6c_55%,#0a7559)] dark:bg-[linear-gradient(100deg,#0a3f33,#0c5443_55%,#0a3f33)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_0_rgba(0,0,0,0.12),0_8px_24px_-12px_rgba(6,60,46,0.55)] after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)]';

export const HEADER_ICON_BUTTON_CLASS =
    'relative inline-flex h-10 w-10 items-center justify-center rounded-[11px] border border-white/15 bg-white/[0.08] text-white transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white';

export default HeaderNavButton;
