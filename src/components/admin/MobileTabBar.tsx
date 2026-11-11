// Celular (mock aprovado 11/11: https://claude.ai/artifact/81NmA7XbfTptaeXZTRC8h6):
// barra fixa embaixo com as 4 telas mais usadas + "Mais", avisos na própria barra
// (ponto rosa = aniversário hoje sem parabéns; número vermelho = leads) e o botão + com as
// ações mais comuns da secretária. Só aparece abaixo de lg; no computador nada muda.
import { CalendarDays, CalendarPlus, ChevronDown, Home, Menu, MessageCircle, Plus, UserPlus, Users, Wallet, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export interface MobileQuickActions {
    onSchedule?: () => void;
    onNewPatient?: () => void;
    onPayment?: () => void;
    onLeads?: () => void;
}

interface Props extends MobileQuickActions {
    activeTab: string;
    moreOpen: boolean;
    onTab: (tab: string) => void;
    onToggleMore: () => void;
    birthdayPending: number;
    leadsCount: number;
    /** Abas da barra (padrão: as do admin/secretária). O terapeuta passa as dele. */
    tabs?: MobileTab[];
    /** Aba que mostra o ponto rosa de aniversário. */
    dotTab?: string;
}

export interface MobileTab { key: string; label: string; icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>; match: string[] }

// Abas do AdminDashboard que cada botão representa (o Caixa tem sub-abas, a Agenda também).
const TABS: MobileTab[] = [
    { key: 'Dashboard', label: 'Início', icon: Home, match: ['Dashboard'] },
    { key: 'Calendário', label: 'Agenda', icon: CalendarDays, match: ['Calendário', 'Pré-Agendamentos'] },
    { key: 'Add Paciente', label: 'Pacientes', icon: Users, match: ['Add Paciente'] },
    { key: 'Caixa', label: 'Caixa', icon: Wallet, match: ['Caixa'] },
];

const itemClass = (active: boolean) =>
    `relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 ${active
        ? 'font-bold text-emerald-700 dark:text-emerald-400'
        : 'font-semibold text-gray-600 dark:text-gray-400'}`;

// Item do menu "Mais" no celular (mock aprovado 11/11): fundo claro, ícone numa cor só,
// verde só no item ativo. Altura mínima de 48px para o dedo.
export const MobileNavItem = ({
    active,
    onClick,
    icon,
    children,
    badge,
    hint,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    children: React.ReactNode;
    badge?: React.ReactNode;
    hint?: string;
}) => (
    <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        className={`flex min-h-12 w-full items-center gap-3 border-t border-gray-100 px-4 text-left text-[15px] transition-colors first:border-t-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:border-gray-800 ${active
            ? 'bg-emerald-50 font-bold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300'
            : 'text-gray-900 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800/60'}`}
    >
        <span aria-hidden className={`shrink-0 ${active ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>{icon}</span>
        <span className="min-w-0 flex-1">
            <span className="block truncate">{children}</span>
            {hint && <span className="block truncate text-xs font-normal text-gray-500 dark:text-gray-400">{hint}</span>}
        </span>
        {badge}
    </button>
);

// Grupo do menu "Mais" que abre e fecha; mostra quantos itens tem quando fechado.
export const MobileNavGroup = ({ title, open, onToggle, count, children }: { title: string; open: boolean; onToggle: () => void; count: number; children: React.ReactNode }) => (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/70 dark:bg-gray-900 dark:ring-gray-800">
        <button type="button" onClick={onToggle} aria-expanded={open}
            className="flex min-h-12 w-full items-center gap-2 px-4 text-left text-xs font-bold uppercase tracking-wide text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:text-gray-400">
            <span className="flex-1">{title}</span>
            {!open && <span className="text-xs font-medium normal-case tracking-normal">{count} {count === 1 ? 'item' : 'itens'}</span>}
            <ChevronDown size={18} aria-hidden className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && <div className="border-t border-gray-100 dark:border-gray-800">{children}</div>}
    </section>
);

const MobileTabBar: React.FC<Props> = ({ activeTab, moreOpen, onTab, onToggleMore, birthdayPending, leadsCount, tabs = TABS, dotTab = 'Dashboard', onSchedule, onNewPatient, onPayment, onLeads }) => {
    const [sheetOpen, setSheetOpen] = useState(false);
    useEffect(() => { setSheetOpen(false); }, [activeTab]);
    useEffect(() => {
        if (!sheetOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheetOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [sheetOpen]);

    // O + some ao rolar para baixo (não cobre o conteúdo) e volta ao rolar para cima.
    const [fabHidden, setFabHidden] = useState(false);
    useEffect(() => {
        let last = window.scrollY;
        const onScroll = () => {
            const y = window.scrollY;
            if (Math.abs(y - last) < 8) return;
            setFabHidden(y > last && y > 80);
            last = y;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const run = (fn?: () => void) => () => { setSheetOpen(false); fn?.(); };
    const actions = [
        { key: 'schedule', label: 'Agendar sessão', hint: 'paciente, profissional e horário', icon: CalendarPlus, fn: onSchedule, primary: true },
        { key: 'patient', label: 'Novo paciente', hint: 'cadastro rápido, completa depois', icon: UserPlus, fn: onNewPatient },
        { key: 'payment', label: 'Registrar pagamento', hint: 'PIX, cartão ou dinheiro', icon: Wallet, fn: onPayment },
        { key: 'leads', label: 'Responder lead', hint: leadsCount ? `${leadsCount} esperando` : 'fila de leads e follow-up', icon: MessageCircle, fn: onLeads, badge: leadsCount },
    ].filter(a => a.fn);

    return (
        <div className="lg:hidden">
            {/* Botão + (fica acima da barra; some com o menu Mais aberto) */}
            {!moreOpen && actions.length > 0 && (
                <button
                    type="button"
                    onClick={() => setSheetOpen(v => !v)}
                    aria-label={sheetOpen ? 'Fechar ações rápidas' : 'Ações rápidas'}
                    aria-expanded={sheetOpen}
                    className={`fixed bottom-[calc(76px+env(safe-area-inset-bottom))] right-4 z-[46] flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-lg shadow-emerald-900/30 transition-all duration-200 active:scale-95 ${fabHidden && !sheetOpen ? 'pointer-events-none translate-y-24 opacity-0' : ''} focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:bg-emerald-500 dark:text-gray-950`}
                >
                    {sheetOpen ? <X size={24} aria-hidden /> : <Plus size={26} aria-hidden />}
                </button>
            )}

            {sheetOpen && (
                <div className="fixed inset-0 z-[45]" role="dialog" aria-modal="true" aria-label="Ações rápidas">
                    <button type="button" aria-label="Fechar" onClick={() => setSheetOpen(false)} className="absolute inset-0 h-full w-full bg-gray-900/45" />
                    <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-4 pb-[calc(150px+env(safe-area-inset-bottom))] pt-3 shadow-2xl dark:bg-gray-900">
                        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-700" aria-hidden />
                        <p className="mb-2 px-1 text-base font-bold text-gray-900 dark:text-gray-50">O que você quer fazer?</p>
                        <ul className="space-y-2">
                            {actions.map(a => {
                                const Icon = a.icon;
                                return (
                                    <li key={a.key}>
                                        <button type="button" onClick={run(a.fn)}
                                            className={`flex min-h-[60px] w-full items-center gap-3 rounded-2xl px-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${a.primary ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-gray-50 dark:bg-gray-800/60'}`}>
                                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.primary ? 'bg-emerald-700 text-white dark:bg-emerald-500 dark:text-gray-950' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100'}`}>
                                                <Icon size={20} aria-hidden />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-[15px] font-bold text-gray-900 dark:text-gray-50">{a.label}</span>
                                                <span className="block truncate text-xs text-gray-600 dark:text-gray-400">{a.hint}</span>
                                            </span>
                                            {!!a.badge && <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">{a.badge}</span>}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            )}

            <nav aria-label="Menu principal" className="fixed inset-x-0 bottom-0 z-[47] grid grid-cols-5 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
                {tabs.map(t => {
                    const Icon = t.icon;
                    const active = !moreOpen && t.match.includes(activeTab);
                    return (
                        <button key={t.key} type="button" onClick={() => onTab(t.key)} aria-current={active ? 'page' : undefined} className={itemClass(active)}>
                            <Icon size={22} aria-hidden />
                            {t.label}
                            {t.key === dotTab && birthdayPending > 0 && (
                                <span className="absolute left-1/2 top-2 ml-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-pink-600 dark:border-gray-950" aria-label={`${birthdayPending} aniversário hoje sem parabéns`} />
                            )}
                        </button>
                    );
                })}
                <button type="button" onClick={onToggleMore} aria-expanded={moreOpen} className={itemClass(moreOpen)}>
                    {moreOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
                    Mais
                    {leadsCount > 0 && (
                        <span className="absolute left-1/2 top-1 ml-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-bold text-white dark:border-gray-950" aria-label={`${leadsCount} leads`}>{leadsCount > 99 ? '99+' : leadsCount}</span>
                    )}
                </button>
            </nav>
        </div>
    );
};

export default MobileTabBar;
