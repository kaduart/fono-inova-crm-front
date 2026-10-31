// components/whatsapp/Sidebar.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiPlus, FiSearch } from "react-icons/fi";
import type { Contact as ApiContact } from "../../../services/whatsappService";
import { formatPhoneBR, isPatientContact } from "./chatHelpers";

type View = 'todas' | 'esperando' | 'naoLidas' | 'leads' | 'pacientes';

const isPatient = (c: ApiContact) => isPatientContact(c);
// A última mensagem veio da família e ninguém respondeu
const isWaiting = (c: ApiContact) => c.lastDirection === 'inbound';

const initials = (name: string) => {
    const parts = name.replace(/[^\p{L}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
    return parts.length ? (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() : '?';
};

/** Hoje: "14:05"; ontem: "ontem"; antes: "28/10" */
const listTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86_400_000);
    if (diff <= 0) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (diff === 1) return 'ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const waitLabel = (min: number) => {
    if (min < 60) return `há ${min} min`;
    if (min < 1440) { const h = Math.floor(min / 60); const m = min % 60; return `há ${h}h${m ? String(m).padStart(2, '0') : ''}`; }
    const d = Math.floor(min / 1440);
    return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
};

type SidebarContact = ApiContact & {
    lastMessage?: string;
    lastMessagePreview?: string;
    lastMessageTime?: string;
    lastMessageAt?: string;
    unreadCount?: number;
    hasNewMessage?: boolean;
    createdAt?: string;
    updatedAt?: string;
    tags?: string[];
    onSearch?: (term: string) => void;
};

interface SidebarProps {
    contacts: SidebarContact[];
    activeContactId?: string | null;
    onSelect: (contact: SidebarContact) => void;
    isServerFiltered?: boolean;
    onAdd?: (data: Omit<SidebarContact, "_id">) => void;
    onEdit?: (id: string, data: Partial<Omit<SidebarContact, "_id">>) => void;
    onDelete?: (id: string) => void;

    // ✅ NOVO: paginação/infinite scroll
    onLoadMore?: () => void;
    hasMore?: boolean;
    isLoadingMore?: boolean;

    className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
    contacts,
    activeContactId,
    onSelect,
    onAdd,
    className,
    onLoadMore,
    hasMore = false,
    isLoadingMore = false,
    onSearch,
    isServerFiltered = false
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [view, setView] = useState<View>('todas');

    const filteredContacts = useMemo(() => {
        // Se veio filtrado do servidor, não filtra de novo
        if (isServerFiltered) return contacts;

        const q = searchTerm.trim().toLowerCase();
        if (!q) return contacts;

        return contacts.filter((c) => {
            const name = (c.name || "").toLowerCase();
            const phone = String(c.phone || "");
            const preview = (c.lastMessagePreview || c.lastMessage || "").toLowerCase();
            const tags = (c.tags || []).join(" ").toLowerCase();

            return name.includes(q) || phone.includes(q) || preview.includes(q) || tags.includes(q);
        });
    }, [contacts, searchTerm, isServerFiltered]);

    const getDisplayTime = (contact: SidebarContact) => {
        return (
            contact.lastMessageTime ||
            contact.lastMessageAt ||
            contact.updatedAt ||
            contact.createdAt
        );
    };

    const getPreview = (contact: SidebarContact) => {
        return contact.lastMessagePreview || contact.lastMessage || contact.phone || "";
    };

    const getUnread = (contact: SidebarContact) => {
        const n = Number(contact.unreadCount || 0);
        if (n > 0) return n;
        return contact.hasNewMessage ? 1 : 0;
    };

    // ✅ refs pro infinite scroll
    const listRef = useRef<HTMLDivElement | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // 🛡️ Não dispara loadMore quando há busca ativa —
        // a lista filtrada é pequena, o sentinel fica sempre visível
        // e causa loop infinito de requisições ao backend.
        if (!onLoadMore || !hasMore || searchTerm.trim()) return;

        const rootEl = listRef.current;
        const targetEl = bottomRef.current;
        if (!rootEl || !targetEl) return;

        const io = new IntersectionObserver(
            (entries) => {
                const first = entries[0];
                if (first?.isIntersecting && hasMore && !isLoadingMore && !searchTerm.trim()) {
                    onLoadMore();
                }
            },
            {
                root: rootEl,
                rootMargin: "100px",
                threshold: 0,
            }
        );

        io.observe(targetEl);
        return () => io.disconnect();
    }, [onLoadMore, hasMore, isLoadingMore, searchTerm]);

    const now = Date.now();
    const counts = useMemo(() => ({
        todas: filteredContacts.length,
        esperando: filteredContacts.filter(isWaiting).length,
        naoLidas: filteredContacts.filter(c => getUnread(c) > 0).length,
        leads: filteredContacts.filter(c => !isPatient(c)).length,
        pacientes: filteredContacts.filter(isPatient).length,
    }), [filteredContacts]);
    const visible = useMemo(() => {
        const list = filteredContacts.filter(c =>
            view === 'esperando' ? isWaiting(c)
                : view === 'naoLidas' ? getUnread(c) > 0
                    : view === 'leads' ? !isPatient(c)
                        : view === 'pacientes' ? isPatient(c)
                            : true);
        // "Esperando": quem espera há mais tempo primeiro
        return view === 'esperando'
            ? [...list].sort((a, b) => new Date(getDisplayTime(a) || 0).getTime() - new Date(getDisplayTime(b) || 0).getTime())
            : list;
    }, [filteredContacts, view]);

    const chips: Array<[View, string, number, boolean?]> = [
        ['todas', 'Todas', counts.todas],
        ['esperando', 'Esperando resposta', counts.esperando, true],
        ['naoLidas', 'Não lidas', counts.naoLidas],
        ['leads', 'Leads', counts.leads],
        ['pacientes', 'Pacientes', counts.pacientes],
    ];

    return (
        <div className={`${className ?? ''} flex h-full flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900`}>
            <div className="grid gap-2.5 border-b border-gray-200 p-3.5 dark:border-gray-800">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-50">Conversas</h2>
                    {onAdd && (
                        <button type="button" onClick={() => onAdd({ name: "", phone: "" } as any)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[13px] font-semibold text-white hover:bg-emerald-700">
                            <FiPlus className="h-4 w-4" aria-hidden /> Nova
                        </button>
                    )}
                </div>
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                    <input type="text" placeholder="Buscar por nome, telefone ou mensagem" aria-label="Buscar conversas" value={searchTerm}
                        onChange={(e) => { const val = e.target.value; setSearchTerm(val); onSearch?.(val); }}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
                </div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar conversas">
                    {chips.map(([key, label, n, hot]) => (
                        <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)}
                            className={`rounded-full border px-2.5 py-0.5 text-[12.5px] transition-colors ${view === key
                                ? 'border-emerald-600 bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'}`}>
                            {label} <span className={hot && n > 0 ? 'font-bold text-red-600 dark:text-red-400' : 'opacity-70'}>{n}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto">
                {visible.map((contact) => {
                    const isActive = activeContactId === contact._id;
                    const displayTime = getDisplayTime(contact);
                    const unread = getUnread(contact);
                    const patient = isPatient(contact);
                    const waiting = isWaiting(contact);
                    const waitMin = waiting && displayTime ? Math.max(0, Math.round((now - new Date(displayTime).getTime()) / 60000)) : 0;
                    const late = waitMin >= 120;
                    const label = contact.name && !/^\+?\d[\d\s()-]+$/.test(contact.name) ? contact.name : formatPhoneBR(contact.phone) || 'Sem nome';
                    return (
                        <button type="button" key={contact._id} onClick={() => onSelect(contact)} aria-current={isActive ? 'true' : undefined}
                            className={`grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-0.5 border-b border-gray-100 px-3.5 py-2.5 text-left transition-colors dark:border-gray-800 ${isActive
                                ? 'bg-emerald-50 shadow-[inset_3px_0_0_#059669] dark:bg-emerald-500/10'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'}`}>
                            {contact.avatar ? (
                                <img src={contact.avatar} alt="" className="row-span-2 h-9 w-9 rounded-full object-cover" />
                            ) : (
                                <span aria-hidden className="row-span-2 grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-[13px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">{initials(label)}</span>
                            )}
                            <span className="flex min-w-0 items-center gap-1.5" title={label}>
                                <span className="truncate font-semibold text-gray-900 dark:text-gray-50">{label}</span>
                                <span className={`shrink-0 rounded-full px-1.5 text-[11px] font-semibold ${patient
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                    : 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'}`}>{patient ? 'Paciente' : 'Lead'}</span>
                            </span>
                            <span className={`text-right text-xs tabular-nums ${late ? 'font-semibold text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                {waiting ? waitLabel(waitMin) : displayTime ? listTime(displayTime) : ''}
                            </span>
                            <span className={`min-w-0 truncate text-[13px] ${unread > 0 ? 'font-medium text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`} title={getPreview(contact)}>
                                {getPreview(contact)}
                            </span>
                            <span className="justify-self-end">
                                {unread > 0 && !isActive ? (
                                    <span className="inline-block min-w-[18px] rounded-full bg-emerald-600 px-1.5 text-center text-[11px] font-bold text-white" aria-label={`${unread} não lidas`}>{unread > 99 ? '99+' : unread}</span>
                                ) : waiting ? (
                                    <span className={`text-[11.5px] font-bold ${late ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>sem resposta</span>
                                ) : null}
                            </span>
                        </button>
                    );
                })}

                {/* sentinela do infinite scroll */}
                <div ref={bottomRef} />

                {(isLoadingMore || hasMore) && (
                    <div className="p-4 text-center text-sm text-gray-500">
                        {isLoadingMore ? "Carregando mais..." : "Role para carregar mais"}
                    </div>
                )}

                {visible.length === 0 && (
                    <div className="flex h-48 flex-col items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                        <FiSearch className="mb-2 h-8 w-8" aria-hidden />
                        <p>{searchTerm ? 'Nenhuma conversa encontrada' : view === 'esperando' ? 'Ninguém esperando resposta' : 'Nenhuma conversa aqui'}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
