import React, { useState } from 'react';

export interface Contact {
    _id: string;
    name: string;
    phone: string;
    avatar?: string;
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
        <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-md mb-6">
            <div className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Digite o nome"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="Digite o telefone"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 mb-1">Avatar URL (opcional)</label>
                    <input
                        id="avatar"
                        type="text"
                        value={avatar}
                        onChange={e => setAvatar(e.target.value)}
                        placeholder="Cole a URL da imagem"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    Salvar Contato
                </button>
            </div>
        </form>
    );
}

interface ContactsListProps {
    contacts: Contact[];
    onAdd: (data: Omit<Contact, '_id'>) => void;
    onEdit: (id: string, data: Omit<Contact, '_id'>) => void;
    onDelete: (id: string) => void;
    onSelect: (contact: Contact) => void; // Nova prop para seleção
    selectedContactId?: string; // ID do contato selecionado
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

    const handleContactClick = (contact: Contact) => {
        onSelect(contact);
    };

    return (
        <div className="p-6 flex flex-col h-full bg-gray-50">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Contatos</h2>

                {!showForm && (
                    <button
                        onClick={handleAddClick}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Adicionar Contato
                    </button>
                )}
            </div>

            {showForm && (
                <ContactForm
                    contact={editingContact || undefined}
                    onSave={handleSave}
                    onCancel={() => setShowForm(false)}
                />
            )}

            <ul className="space-y-3">
                {contacts.map(contact => (
                    <li
                        key={contact._id}
                        onClick={() => handleContactClick(contact)}
                        className={`bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer ${selectedContactId === contact._id ? 'ring-2 ring-indigo-500' : ''
                            }`}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                                {contact.avatar ? (
                                    <img
                                        src={contact.avatar}
                                        alt={contact.name}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                        <span className="text-indigo-600 font-medium">
                                            {contact.name.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                <div>
                                    <p className="font-medium text-gray-900">{contact.name}</p>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        {contact.phone}
                                    </div>
                                    {contact.lastMessage && (
                                        <p className="text-xs text-gray-500 truncate max-w-xs mt-1">
                                            {contact.lastMessage}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                {contact.unreadCount && contact.unreadCount > 0 && (
                                    <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                                        {contact.unreadCount}
                                    </span>
                                )}
                                <div className="flex space-x-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingContact(contact);
                                            setShowForm(true);
                                        }}
                                        className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-full transition-colors"
                                        aria-label={`Editar ${contact.name}`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(contact._id);
                                        }}
                                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                                        aria-label={`Deletar ${contact.name}`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>

            {contacts.length === 0 && !showForm && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-500">
                    <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h3 className="text-lg font-medium mb-2">Nenhum contato encontrado</h3>
                    <p className="mb-4">Adicione seu primeiro contato para começar</p>
                    <button
                        onClick={handleAddClick}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                    >
                        + Adicionar Contato
                    </button>
                </div>
            )}
        </div>
    );
}