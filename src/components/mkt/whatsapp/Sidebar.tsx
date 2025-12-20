// components/whatsapp/Sidebar.tsx
import React, { useMemo, useState } from "react";
import { FiPlus, FiSearch, FiUser } from "react-icons/fi";
import type { Contact as ApiContact } from "../../../services/whatsappService";
import { formatMessageTime } from "../../../utils/dateHelper";

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
};

interface SidebarProps {
    contacts: SidebarContact[];
    activeContactId?: string | null;
    onSelect: (contact: SidebarContact) => void;

    // ✅ opcionais (não quebra AppChat)
    onAdd?: (data: Omit<SidebarContact, "_id">) => void;
    onEdit?: (id: string, data: Partial<Omit<SidebarContact, "_id">>) => void;
    onDelete?: (id: string) => void;

    className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
    contacts,
    activeContactId,
    onSelect,
    onAdd,
    className,
}) => {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredContacts = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        if (!q) return contacts;
        return contacts.filter(
            (c) => c.name.toLowerCase().includes(q) || String(c.phone || "").includes(q)
        );
    }, [contacts, searchTerm]);

    const getDisplayTime = (contact: SidebarContact) => {
        return contact.lastMessageTime || contact.lastMessageAt || contact.updatedAt || contact.createdAt;
    };

    const getPreview = (contact: SidebarContact) => {
        return contact.lastMessagePreview || contact.lastMessage || contact.phone || "";
    };

    const getUnread = (contact: SidebarContact) => {
        const n = Number(contact.unreadCount || 0);
        if (n > 0) return n;
        return contact.hasNewMessage ? 1 : 0;
    };

    return (
        <div className={`${className} flex flex-col h-full bg-gradient-to-b from-gray-900 to-gray-800`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Conversas</h2>

                    <button
                        onClick={() => onAdd?.({ name: "", phone: "" } as any)}
                        className="p-2 bg-emerald-500 hover:bg-emerald-600 rounded-full transition-colors"
                        title="Adicionar contato"
                    >
                        <FiPlus className="w-5 h-5 text-white" />
                    </button>
                </div>

                <div className="text-sm text-gray-400 mb-3">
                    {contacts.length} {contacts.length === 1 ? "contato" : "contatos"}
                </div>

                {/* Search */}
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar conversas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Contacts List */}
            <div className="flex-1 overflow-y-auto">
                {filteredContacts.map((contact) => {
                    const isActive = activeContactId === contact._id;
                    const displayTime = getDisplayTime(contact);
                    const unread = getUnread(contact);

                    return (
                        <div
                            key={contact._id}
                            onClick={() => onSelect(contact)}
                            className={`
                relative p-4 cursor-pointer transition-all duration-200
                ${isActive ? "bg-emerald-600/20 border-l-4 border-emerald-500" : "hover:bg-gray-800/50 border-l-4 border-transparent"}
              `}
                        >
                            <div className="flex items-center space-x-3">
                                {/* Avatar */}
                                <div className="relative flex-shrink-0">
                                    {contact.avatar ? (
                                        <img
                                            src={contact.avatar}
                                            alt={contact.name}
                                            className={`w-12 h-12 rounded-full object-cover ${isActive ? "ring-2 ring-emerald-500" : ""}`}
                                        />
                                    ) : (
                                        <div
                                            className={`
                        w-12 h-12 rounded-full flex items-center justify-center
                        ${isActive ? "bg-emerald-500 ring-2 ring-emerald-400" : "bg-gray-700"}
                      `}
                                        >
                                            <FiUser className={`w-6 h-6 ${isActive ? "text-white" : "text-gray-400"}`} />
                                        </div>
                                    )}

                                    {/* Unread badge */}
                                    {unread > 0 && !isActive && (
                                        <div className="absolute-top-1-right-1 min-w-[20px] h-5 px-1 bg-red-500 border-2 border-gray-900 rounded-full flex items-center justify-center">
                                            <span className="text-[10px] text-white font-bold">
                                                {unread > 99 ? "99+" : unread}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-1">
                                        <h3
                                            className={`font-semibold truncate mr-2 ${isActive ? "text-emerald-400" : "text-white"}`}
                                            title={contact.name}
                                        >
                                            {contact.name || "Sem nome"}
                                        </h3>

                                        <span className={`text-xs whitespace-nowrap ${isActive ? "text-emerald-300" : "text-gray-500"}`}>
                                            {displayTime ? formatMessageTime(displayTime) : ""}
                                        </span>
                                    </div>

                                    <p
                                        className={`text-sm truncate ${isActive ? "text-emerald-200" : unread > 0 ? "text-white font-medium" : "text-gray-400"
                                            }`}
                                        title={getPreview(contact)}
                                    >
                                        {getPreview(contact)}
                                    </p>

                                    {contact.tags?.length ? (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {contact.tags.slice(0, 2).map((tag, idx) => (
                                                <span key={idx} className="inline-block px-1.5 py-0.5 text-xs bg-gray-700 text-gray-300 rounded">
                                                    {tag}
                                                </span>
                                            ))}
                                            {contact.tags.length > 2 && (
                                                <span className="inline-block px-1.5 py-0.5 text-xs bg-gray-700 text-gray-300 rounded">
                                                    +{contact.tags.length - 2}
                                                </span>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {isActive && <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                        </div>
                    );
                })}

                {filteredContacts.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <FiSearch className="w-12 h-12 mb-3" />
                        <p>Nenhum contato encontrado</p>
                        {searchTerm && <p className="text-sm mt-1">Tente buscar com outros termos</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
