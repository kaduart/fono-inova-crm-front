import { useEffect, useRef } from 'react';
import { openWhatsApp } from '../../../components/commercial/commercialCopy';

/**
 * Painel lateral do Caixa & Fluxo (01/11/2026, mock v2 aprovado).
 * Antes, clicar num card/chip rolava a página até as sub-abas lá embaixo
 * ("clico no card ele desce"). Agora a lista abre aqui, a página fica parada
 * e a sub-aba completa continua a um clique ("Abrir na aba …").
 */
export interface DrawerItem {
    key: string;
    name: string;
    line?: string;
    value?: number;
    badge?: string;
    phone?: string | null;
    /** Mensagem pronta do WhatsApp. Nada é enviado sozinho: só abre a conversa. */
    message?: string;
    actionLabel?: string;
}
export interface DrawerContent {
    title: string;
    subtitle?: string;
    total?: number;
    tone?: 'g' | 'r' | 'n';
    items: DrawerItem[];
    loading?: boolean;
    empty?: string;
    tabLabel?: string;
    onOpenTab?: () => void;
}
const money = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CashflowDrawer({ content, onClose }: { content: DrawerContent | null; onClose: () => void }) {
    const closeRef = useRef<HTMLButtonElement>(null);
    const open = !!content;
    useEffect(() => {
        if (!open) return;
        const prev = document.activeElement as HTMLElement | null;
        closeRef.current?.focus({ preventScroll: true });
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => { window.removeEventListener('keydown', onKey); prev?.focus?.({ preventScroll: true }); };
    }, [open, onClose]);
    if (!content) return null;
    const tone = content.tone === 'r' ? 'text-red-700 dark:text-red-400' : content.tone === 'g' ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-900 dark:text-gray-100';
    return <div className="fixed inset-0 z-50 text-left" role="presentation">
        <button type="button" aria-label="Fechar painel" tabIndex={-1} className="absolute inset-0 h-full w-full cursor-default bg-black/35" onClick={onClose} />
        <aside role="dialog" aria-modal="true" aria-label={content.title} className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-gray-900">
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                <div className="min-w-0">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">{content.title}</h3>
                    {content.total !== undefined && <p className={`text-2xl font-bold tabular-nums ${tone}`}>{money(content.total)}</p>}
                    {content.subtitle && <p className="text-xs text-gray-600 dark:text-gray-300">{content.subtitle}</p>}
                </div>
                <button ref={closeRef} type="button" aria-label="Fechar" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-lg text-gray-600 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">✕</button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-5 py-3">
                {content.loading && <p role="status" className="py-6 text-center text-sm text-gray-600 dark:text-gray-300">Carregando…</p>}
                {!content.loading && content.items.length === 0 && <p className="py-6 text-center text-sm text-gray-600 dark:text-gray-300">{content.empty || 'Nada nesta lista.'}</p>}
                {!content.loading && content.items.map(item => <div key={item.key} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
                    <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 font-semibold text-gray-900 dark:text-gray-100">{item.name}{item.badge && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-2xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">{item.badge}</span>}</p>
                        {item.value !== undefined && <b className="shrink-0 tabular-nums text-gray-900 dark:text-gray-100">{money(item.value)}</b>}
                    </div>
                    {item.line && <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">{item.line}</p>}
                    {item.phone !== undefined && <div className="mt-2">
                        {item.phone
                            ? <button type="button" onClick={() => openWhatsApp(item.phone, item.message)} className="min-h-10 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">{item.actionLabel || 'WhatsApp com mensagem pronta'}</button>
                            : <span className="text-xs text-gray-600 dark:text-gray-300">Telefone não informado</span>}
                    </div>}
                </div>)}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-5 py-3 text-sm dark:border-gray-700">
                {content.onOpenTab ? <button type="button" onClick={() => { onClose(); content.onOpenTab!(); }} className="min-h-10 rounded-md px-2 font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-4 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10">Abrir na aba {content.tabLabel}</button> : <span />}
                <span className="text-xs text-gray-600 dark:text-gray-300">Esc fecha · nada é enviado sozinho</span>
            </div>
        </aside>
    </div>;
}
