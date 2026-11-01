// Atalho "Ir para…" (Ctrl/⌘ + K): abre de qualquer tela, filtra por nome e leva direto
// à aba ou sub-aba. Só navegação: não busca no banco nem muda dado. Os números (badge)
// vêm dos mesmos hooks do header, então a equipe vê onde tem trabalho antes de clicar.
import { Search, CornerDownLeft } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export interface CommandItem {
    id: string;
    label: string;
    group: string;
    hint?: string;
    icon?: ReactNode;
    badge?: number;
    hot?: boolean;
    keywords?: string;
    run: () => void;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const RECENT_KEY = 'fono-cmdk-recent';

function readRecent(): string[] {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function pushRecent(id: string) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecent().filter((x) => x !== id)].slice(0, 5))); } catch { /* sem storage */ }
}

export function useCommandPaletteHotkey(onOpen: () => void) {
    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); onOpen(); }
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [onOpen]);
}

export default function CommandPalette({ open, onClose, items }: { open: boolean; onClose: () => void; items: CommandItem[] }) {
    const [q, setQ] = useState('');
    const [sel, setSel] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 0); } }, [open]);

    const list = useMemo(() => {
        const t = norm(q.trim());
        if (!t) {
            const recent = readRecent().map((id) => items.find((i) => i.id === id)).filter(Boolean) as CommandItem[];
            const rest = items.filter((i) => !recent.includes(i));
            return [...recent.map((i) => ({ ...i, group: 'Recentes' })), ...rest];
        }
        return items
            .map((i) => {
                const hay = norm(`${i.label} ${i.group} ${i.keywords || ''}`);
                const label = norm(i.label);
                const score = label.startsWith(t) ? 3 : label.includes(t) ? 2 : hay.includes(t) ? 1 : 0;
                return { i, score };
            })
            .filter((x) => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .map((x) => x.i);
    }, [q, items]);

    useEffect(() => { setSel(0); }, [q]);
    useEffect(() => {
        listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [sel]);

    if (!open) return null;

    const go = (it: CommandItem | undefined) => { if (!it) return; pushRecent(it.id); onClose(); it.run(); };
    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(list.length - 1, s + 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
        else if (e.key === 'Enter') { e.preventDefault(); go(list[sel]); }
        else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };

    let lastGroup = '';
    return (
        <div className="fixed inset-0 z-[1400] flex items-start justify-center bg-slate-900/40 px-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={onClose}>
            <div role="dialog" aria-modal="true" aria-label="Ir para"
                className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#161d1b]"
                onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKey}>
                <div className="flex items-center gap-3 border-b border-gray-100 px-4 dark:border-white/10">
                    <Search size={18} className="shrink-0 text-gray-400" />
                    <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
                        placeholder="Ir para… (ex.: convênios, leads, caixa)"
                        aria-label="Buscar tela"
                        className="h-14 w-full bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-50" />
                    <kbd className="hidden shrink-0 rounded-md border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-400 sm:inline dark:border-white/10">Esc</kbd>
                </div>
                <ul ref={listRef} role="listbox" className="max-h-[55vh] overflow-auto p-2">
                    {list.length === 0 && <li className="px-3 py-8 text-center text-sm text-gray-500">Nenhuma tela com esse nome. Tente outra palavra.</li>}
                    {list.map((it, idx) => {
                        const head = it.group !== lastGroup ? it.group : null;
                        lastGroup = it.group;
                        const on = idx === sel;
                        return (
                            <li key={`${it.group}-${it.id}`}>
                                {head && <div className="px-3 pb-1 pt-3 text-xs font-semibold text-gray-400 first:pt-1">{head}</div>}
                                <button type="button" data-idx={idx} role="option" aria-selected={on}
                                    onMouseMove={() => setSel(idx)} onClick={() => go(it)}
                                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${on ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100' : 'text-gray-700 dark:text-gray-200'}`}>
                                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${on ? 'bg-white text-emerald-700 dark:bg-white/10 dark:text-emerald-300' : 'bg-gray-50 text-gray-500 dark:bg-white/5 dark:text-gray-400'}`}>{it.icon}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium">{it.label}</span>
                                        {it.hint && <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{it.hint}</span>}
                                    </span>
                                    {!!it.badge && (
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${it.hot ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'}`}>{it.badge}</span>
                                    )}
                                    {on && <CornerDownLeft size={14} className="shrink-0 text-emerald-600 dark:text-emerald-300" />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
                <div className="flex items-center gap-4 border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400 dark:border-white/10">
                    <span><kbd className="font-sans">↑ ↓</kbd> escolher</span>
                    <span><kbd className="font-sans">Enter</kbd> abrir</span>
                    <span className="ml-auto">Ctrl + K abre de qualquer tela</span>
                </div>
            </div>
        </div>
    );
}
