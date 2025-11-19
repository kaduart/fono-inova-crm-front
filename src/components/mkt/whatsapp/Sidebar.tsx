// components/whatsapp/Sidebar.tsx
import React, { useState } from 'react';
import { FiPlus, FiSearch, FiUser } from 'react-icons/fi';
import { formatMessageTime } from '../../../utils/dateHelper';

interface Contact {
    _id: string;
    name: string;
    phone: string;
    avatar?: string;
    lastMessage?: string;
    lastMessageTime?: string;
    unreadCount?: number;
    hasNewMessage?: boolean;
    createdAt: string; // ✅ ADICIONADO: campo que existe na sua API
    updatedAt: string; // ✅ ADICIONADO: campo que existe na sua API
    tags?: string[]; // ✅ ADICIONADO: campo que existe na sua API
}

interface SidebarProps {
    contacts: Contact[];
    active: Contact | null;
    onSelect: (contact: Contact) => void;
    onAdd: (data: Omit<Contact, "_id">) => void;
    onEdit: (id: string, data: Partial<Omit<Contact, "_id">>) => void;
    onDelete: (id: string) => void;
    className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
    contacts,
    active,
    onSelect,
    onAdd,
    onEdit,
    onDelete,
    className
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone.includes(searchTerm)
    );

    // ✅ FUNÇÃO: Obtém o timestamp mais relevante para exibição
    const getDisplayTime = (contact: Contact) => {
        // Prioridade: lastMessageTime -> updatedAt -> createdAt
        return contact.lastMessageTime || contact.updatedAt || contact.createdAt;
    };

    return (
        <div className={`${className} flex flex-col h-full bg-gradient-to-b from-gray-900 to-gray-800`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Conversas</h2>
                    <button
                        onClick={() => {/* abrir modal de adicionar */ }}
                        className="p-2 bg-emerald-500 hover:bg-emerald-600 rounded-full transition-colors"
                    >
                        <FiPlus className="w-5 h-5 text-white" />
                    </button>
                </div>

                <div className="text-sm text-gray-400 mb-3">
                    {contacts.length} {contacts.length === 1 ? 'contato' : 'contatos'}
                </div>

                {/* Search */}
                <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
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
                    const isActive = active?._id === contact._id;
                    const displayTime = getDisplayTime(contact);

                    return (
                        <div
                            key={contact._id}
                            onClick={() => onSelect(contact)}
                            className={`
                                relative p-4 cursor-pointer transition-all duration-200
                                ${isActive
                                    ? 'bg-emerald-600/20 border-l-4 border-emerald-500'
                                    : 'hover:bg-gray-800/50 border-l-4 border-transparent'
                                }
                            `}
                        >
                            <div className="flex items-center space-x-3">
                                {/* Avatar */}
                                <div className="relative flex-shrink-0">
                                    {contact.avatar ? (
                                        <img
                                            src={contact.avatar}
                                            alt={contact.name}
                                            className={`w-12 h-12 rounded-full object-cover ${isActive ? 'ring-2 ring-emerald-500' : ''
                                                }`}
                                        />
                                    ) : (
                                        <div className={`
                                            w-12 h-12 rounded-full flex items-center justify-center
                                            ${isActive
                                                ? 'bg-emerald-500 ring-2 ring-emerald-400'
                                                : 'bg-gray-700'
                                            }
                                        `}>
                                            <FiUser className={`w-6 h-6 ${isActive ? 'text-white' : 'text-gray-400'
                                                }`} />
                                        </div>
                                    )}

                                    {/* Online indicator */}
                                    {isActive && (
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-gray-900 rounded-full"></div>
                                    )}

                                    {/* Unread badge */}
                                    {contact.hasNewMessage && !isActive && (
                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-gray-900 rounded-full flex items-center justify-center">
                                            <span className="text-xs text-white font-bold">
                                                {contact.unreadCount || 1}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Contact Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-1">
                                        <div className="flex-1 min-w-0 mr-2">
                                            <h3 className={`font-semibold truncate ${isActive ? 'text-emerald-400' : 'text-white'
                                                }`}>
                                                {contact.name}
                                            </h3>
                                        </div>
                                        {/* ✅ CORREÇÃO: Usando displayTime com fallback */}
                                        <span className={`text-xs whitespace-nowrap flex-shrink-0 ${isActive ? 'text-emerald-300' : 'text-gray-500'
                                            }`}>
                                            {displayTime ? formatMessageTime(displayTime) : ''}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm truncate ${isActive
                                                    ? 'text-emerald-200'
                                                    : contact.hasNewMessage
                                                        ? 'text-white font-medium'
                                                        : 'text-gray-400'
                                                }`}>
                                                {contact.lastMessage || contact.phone}
                                            </p>
                                            {/* ✅ MELHORIA: Exibir tags se existirem */}
                                            {contact.tags && contact.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {contact.tags.slice(0, 2).map((tag, index) => (
                                                        <span
                                                            key={index}
                                                            className="inline-block px-1.5 py-0.5 text-xs bg-gray-700 text-gray-300 rounded"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))}
                                                    {contact.tags.length > 2 && (
                                                        <span className="inline-block px-1.5 py-0.5 text-xs bg-gray-700 text-gray-300 rounded">
                                                            +{contact.tags.length - 2}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* ✅ MELHORIA: Indicador de nova mensagem mais organizado */}
                                        {contact.hasNewMessage && !isActive && (
                                            <div className="flex flex-col items-end space-y-1 ml-2">
                                                <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 animate-pulse"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Active indicator bar */}
                            {isActive && (
                                <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                            )}
                        </div>
                    );
                })}

                {filteredContacts.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <FiSearch className="w-12 h-12 mb-3" />
                        <p>Nenhum contato encontrado</p>
                        {searchTerm && (
                            <p className="text-sm mt-1">Tente buscar com outros termos</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;