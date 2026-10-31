// Central de Novidades: botão "?" do header (bolinha enquanto houver tela com novidade
// não vista), painel com as telas do perfil e o aviso de cada tela.
// Conteúdo e versões em ./novidadesData.ts.
import { HelpCircle, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { HEADER_ICON_BUTTON_CLASS } from '../ui/HeaderNavButton';
import { NovidadesArea, NovidadesScreen } from './novidadesData';
import { useNovidades } from './useNovidades';

const fmtVersion = (v: string) => {
    const [, m, d] = v.split('-');
    return d && m ? `${d}/${m}` : v;
};

function useEscape(active: boolean, onClose: () => void) {
    useEffect(() => {
        if (!active) return undefined;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [active, onClose]);
}

function ScreenModal({ screen, onClose }: { screen: NovidadesScreen; onClose: () => void }) {
    useEscape(true, onClose);
    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="novidades-titulo"
                className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-3 bg-emerald-700 px-5 py-4 text-white">
                    <div className="min-w-0 flex-1">
                        <h2 id="novidades-titulo" className="text-lg font-bold">Novidades · {screen.name}</h2>
                        <p className="text-sm text-white/85">{screen.summary}</p>
                    </div>
                    <span className="mt-1 shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[11px]">{fmtVersion(screen.version)}</span>
                    <button type="button" onClick={onClose} className="h-8 w-8 shrink-0 rounded-lg hover:bg-white/15" aria-label="Fechar">
                        <X className="mx-auto h-4 w-4" />
                    </button>
                </div>
                <ol className="space-y-2.5 overflow-y-auto px-5 py-4">
                    {screen.items.map((it) => (
                        <li key={it.title} className="flex gap-3 rounded-xl border border-gray-200 p-3 dark:border-slate-700">
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                <Sparkles className="h-4 w-4" aria-hidden />
                            </span>
                            <div className="min-w-0">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">{it.title}</h3>
                                <p className="mt-0.5 text-sm text-gray-700 dark:text-slate-300">{it.what}</p>
                                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">{it.how}</p>
                            </div>
                        </li>
                    ))}
                </ol>
                <div className="flex items-center gap-2 border-t border-gray-200 bg-gray-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800">
                    <span className="mr-auto text-xs text-gray-500 dark:text-slate-400">Para rever depois, clique no <b>?</b> no topo.</span>
                    <button type="button" onClick={onClose} className="h-9 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">
                        Entendi
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function NovidadesCenter({ area, activeTab }: { area: NovidadesArea; activeTab: string }) {
    const { user } = useAuth();
    const { screens, pending, isNew, open, show, close } = useNovidades(area, activeTab, user?._id);
    const [panel, setPanel] = useState(false);
    const closePanel = () => setPanel(false);
    useEscape(panel && !open, closePanel);

    return (
        <>
            <button
                type="button"
                onClick={() => setPanel(true)}
                className={HEADER_ICON_BUTTON_CLASS}
                aria-label={pending ? `Novidades: ${pending} telas com novidade` : 'Novidades'}
                title="Novidades"
            >
                <HelpCircle className="h-5 w-5" aria-hidden />
                {pending > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-emerald-700" />}
            </button>

            {panel && createPortal(
                <div className="fixed inset-0 z-[70] flex justify-end bg-black/30" onClick={closePanel}>
                    <aside
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="novidades-central"
                        className="flex h-full w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-slate-900"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3 border-b border-gray-200 px-5 py-4 dark:border-slate-700">
                            <div className="flex-1">
                                <h2 id="novidades-central" className="text-lg font-bold text-gray-900 dark:text-slate-100">Novidades</h2>
                                <p className="text-sm text-gray-500 dark:text-slate-400">Clique na tela para ver o que mudou.</p>
                            </div>
                            <button type="button" onClick={closePanel} className="h-8 w-8 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800" aria-label="Fechar">
                                <X className="mx-auto h-4 w-4" />
                            </button>
                        </div>
                        <div className="overflow-y-auto">
                            {screens.map((s) => {
                                const novo = isNew(s);
                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => show(s)}
                                        className="flex w-full items-center gap-3 border-b border-gray-100 px-5 py-3 text-left hover:bg-emerald-50 dark:border-slate-800 dark:hover:bg-slate-800"
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-semibold text-gray-900 dark:text-slate-100">{s.name}</span>
                                            <span className="block text-xs text-gray-500 dark:text-slate-400">{s.items.length} novidades · {fmtVersion(s.version)}</span>
                                        </span>
                                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${novo
                                            ? 'bg-amber-100 font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                                            : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                            {novo ? 'Novo' : 'Visto'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </aside>
                </div>,
                document.body,
            )}

            {open && createPortal(<ScreenModal screen={open} onClose={close} />, document.body)}
        </>
    );
}
