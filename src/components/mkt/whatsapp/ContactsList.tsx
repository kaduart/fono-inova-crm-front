import React, { useEffect, useState } from 'react';
import { FiEdit2, FiMessageCircle, FiPhone, FiPlus, FiSearch, FiTrash2, FiUser } from 'react-icons/fi';

export interface Contact {
    _id: string;
    name: string;
    phone: string;
    avatar?: string;
    lastMessage?: string;
    lastMessageTime?: string;
    unreadCount?: number;
    isOnline?: boolean;
    hasNewMessage?: boolean;
    lastMessagePreview?: string;
}

interface ContactFormProps {
    contact?: Partial<Contact>;
    onSave: (data: Omit<Contact, '_id'>, id?: string) => void;
    onCancel: () => void;
}

function ContactForm({ contact = {}, onSave, onCancel }: ContactFormProps) {
    const [name, setName] = useState(contact.name || '');
    const [phone, setPhone] = useState(contact.phone || '');
    const [avatar, setAvatar] = useState(contact.avatar || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim()) {
            alert('Nome e telefone são obrigatórios');
            return;
        }
        onSave({ name: name.trim(), phone: phone.trim(), avatar: avatar.trim() || undefined }, contact._id);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800">
                        {contact._id ? 'Editar Contato' : 'Novo Contato'}
                    </h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="name" className="form-label">
                            Nome completo
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Digite o nome completo"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label htmlFor="phone" className="form-label">
                            Número do WhatsApp
                        </label>
                        <input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="(11) 99999-9999"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="avatar" className="form-label">
                            URL do Avatar (opcional)
                        </label>
                        <input
                            id="avatar"
                            type="text"
                            value={avatar}
                            onChange={e => setAvatar(e.target.value)}
                            placeholder="https://exemplo.com/foto.jpg"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        />
                        {avatar && (
                            <div className="mt-2 flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gray-100 rounded-full overflow-hidden">
                                    <img src={avatar} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                                <span className="text-xs text-gray-500">Preview</span>
                            </div>
                        )}
                    </div>

                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-3 text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-medium shadow-sm"
                        >
                            {contact._id ? 'Atualizar' : 'Criar Contato'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

interface ContactsListProps {
    contacts: Contact[];
    onAdd: (data: Omit<Contact, '_id'>) => void;
    onEdit: (id: string, data: Omit<Contact, '_id'>) => void;
    onDelete: (id: string) => void;
    onSelect: (contact: Contact) => void;
    selectedContactId?: string;
}

export default function ContactsList({
    contacts,
    onAdd,
    onEdit,
    onDelete,
    onSelect,
    selectedContactId
}: ContactsListProps) {
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const handleAddClick = () => {
        setEditingContact(null);
        setShowForm(true);
    };

    const handleSave = (data: Omit<Contact, '_id'>, id?: string) => {
        if (id) {
            onEdit(id, data);
        } else {
            onAdd(data);
        }
        setShowForm(false);
    };

    // ✅ CORRIGIDO: Agora limpa a notificação ao clicar
    const handleContactClick = (contact: Contact) => {
        onSelect(contact);
    };

    // 🔍 Filtrar contatos
    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone.includes(searchTerm)
    );

    // 🕒 Formatar horário da última mensagem
    const formatTime = (timeString?: string) => {
        if (!timeString) return '';

        try {
            const date = new Date(timeString);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (diffDays === 1) {
                return 'Ontem';
            } else if (diffDays < 7) {
                return date.toLocaleDateString([], { weekday: 'short' });
            } else {
                return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
            }
        } catch {
            return timeString;
        }
    };

    const formatMessagePreview = (text: string, maxLength: number = 30): string => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    // 🎨 Componente de linha de contato elegante - ATUALIZADO
    const ContactItem = ({ contact }: { contact: Contact }) => (
        <div
            onClick={() => handleContactClick(contact)}
            className={`group p-4 rounded-2xl cursor-pointer transition-all duration-200 border relative ${selectedContactId === contact._id
                ? "bg-white shadow-lg border-green-200 transform scale-[1.02]"
                : "bg-white/80 border-white/20 hover:bg-white hover:shadow-md"
                } ${contact.hasNewMessage ? "ring-2 ring-red-100 bg-red-50/80" : ""}`}
        >
            {/* Barra lateral para novas mensagens */}
            {contact.hasNewMessage && (
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-12 bg-red-500 rounded-r-lg animate-pulse shadow-lg"></div>
            )}

            <div className="flex items-center space-x-4">
                {/* Avatar com indicador de status */}
                <div className="relative flex-shrink-0">
                    {contact.avatar ? (
                        <img
                            src={contact.avatar}
                            alt={contact.name}
                            className="w-18 h-14 rounded-2xl object-cover border-2 border-white shadow-sm"
                        />
                    ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-sm">
                            <span className="text-white font-bold text-lg">
                                {contact.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}

                    {/* Indicador Online/Offline */}
                    <div
                        className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${contact.isOnline ? "bg-green-500" : "bg-gray-300"
                            }`}
                    ></div>
                </div>

                {/* Informações do contato */}
                <div className="flex-1 min-w-0">
                    {/* ====== TOP ROW: Nome | (Hora + Badge no FINAL) ====== */}
                    <div className="flex items-center mb-2">
                        {/* Nome ocupa o espaço e trunca */}
                        <h4
                            className={`flex-1 min-w-0 font-semibold leading-tight truncate pr-2 ${contact.hasNewMessage ? "text-red-700" : "text-gray-800"
                                }`}
                            title={contact.name}
                        >
                            {contact.name}
                        </h4>

                        {/* Bloco fixo no FINAL da linha */}
                        <div className="ml-auto flex items-center gap-2 shrink-0">
                            {/* Hora da última mensagem */}
                            {contact.lastMessageTime && (
                                <span
                                    className={`text-xs whitespace-nowrap ${contact.hasNewMessage ? "text-red-600 font-medium" : "text-gray-500"
                                        }`}
                                >
                                    {formatTime(contact.lastMessageTime)}
                                </span>
                            )}

                            {/* Contador de não lidas (sempre no finalzinho) */}
                            {contact.unreadCount > 0 && (
                                <span
                                    className="inline-flex items-center justify-center h-5 min-w-[22px] px-1.5 rounded-full
                           bg-red-500 text-white text-3xs font-semibold tracking-wide shadow-sm"
                                    title={`${contact.unreadCount} não lidas`}
                                >
                                    {contact.unreadCount > 99 ? "99+" : contact.unreadCount}
                                </span>
                            )}
                        </div>
                    </div>
                    {/* ====== /TOP ROW ====== */}

                    {/* Número do telefone */}
                    <div className="flex items-center text-gray-600 text-sm mb-2">
                        <FiPhone className="w-3 h-3 mr-2 flex-shrink-0" />
                        <span className="truncate">{contact.phone}</span>
                    </div>

                    {/* Última mensagem */}
                    {(contact.lastMessagePreview || contact.lastMessage) && (
                        <div className="flex items-center">
                            <FiMessageCircle
                                className={`w-3 h-3 mr-2 flex-shrink-0 ${contact.hasNewMessage ? "text-red-500" : "text-gray-400"
                                    }`}
                            />
                            <p
                                className={`text-sm truncate ${contact.hasNewMessage ? "text-red-700 font-medium" : "text-gray-600"
                                    }`}
                            >
                                {formatMessagePreview(
                                    contact.lastMessagePreview || contact.lastMessage || ""
                                )}
                            </p>
                        </div>
                    )}
                </div>

                {/* Ações (aparecem no hover) */}
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditingContact(contact);
                            setShowForm(true);
                        }}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                        title={`Editar ${contact.name}`}
                    >
                        <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Deletar ${contact.name}?`)) {
                                onDelete(contact._id);
                            }
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title={`Deletar ${contact.name}`}
                    >
                        <FiTrash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );


    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-green-50 to-emerald-100">
            {/* Cabeçalho */}
            <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Conversas</h2>
                        <p className="text-gray-600 text-sm mt-1">
                            {contacts.length} contato{contacts.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        onClick={handleAddClick}
                        className="w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-2xl flex items-center justify-center transition-all hover:scale-105 shadow-sm"
                        title="Adicionar contato"
                    >
                        <FiPlus className="w-6 h-6" />
                    </button>
                </div>

                {/* Barra de Pesquisa */}
                <div className="relative">
                    <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar conversas..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 pl-12 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors shadow-sm"
                    />
                </div>
            </div>

            {/* Lista de Contatos */}
            <div className="flex-1 overflow-y-auto px-4 pb-6">
                {filteredContacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                            <FiUser className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-700 mb-2">
                            {searchTerm ? 'Nenhum contato encontrado' : 'Nenhum contato'}
                        </h3>
                        <p className="text-gray-500 mb-6">
                            {searchTerm ? 'Tente buscar com outros termos' : 'Adicione seu primeiro contato para começar'}
                        </p>
                        {!searchTerm && (
                            <button
                                onClick={handleAddClick}
                                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-2xl transition-all flex items-center space-x-2 shadow-sm hover:shadow-md"
                            >
                                <FiPlus className="w-5 h-5" />
                                <span>Adicionar Contato</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredContacts.map(contact => (
                            <ContactItem key={contact._id} contact={contact} />
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Formulário */}
            {showForm && (
                <ContactForm
                    contact={editingContact || undefined}
                    onSave={handleSave}
                    onCancel={() => setShowForm(false)}
                />
            )}
        </div>
    );
}