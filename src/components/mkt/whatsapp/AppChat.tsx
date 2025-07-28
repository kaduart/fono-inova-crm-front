import React, { useEffect, useState } from 'react';
import AddContactModal from './AddContactModal';
import ChatWindow from './ChatWindow';
import Sidebar from './Sidebar';

import {
    addContact as apiAddContact,
    deleteContact as apiDeleteContact,
    editContact as apiEditContact,
    Contact,
    fetchContacts,
} from '../../../services/whatsappService';

const AppChat: React.FC = () => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [active, setActive] = useState<Contact | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    const loadContacts = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await fetchContacts();
            setContacts(data);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadContacts();
    }, []);

    const addContact = async (data: Omit<Contact, '_id'>) => {
        setLoading(true);
        setError('');
        try {
            const newContact = await apiAddContact(data);
            setContacts(prev => [...prev, newContact]);
            setActive(newContact);
            setShowAddModal(false);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const editContact = async (id: string, data: Partial<Omit<Contact, '_id'>>) => {
        setLoading(true);
        setError('');
        try {
            const updated = await apiEditContact(id, data);
            setContacts(prev => prev.map(c => (c._id === id ? updated : c)));
            if (active?._id === id) setActive(updated);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const deleteContact = async (id: string) => {
        setLoading(true);
        setError('');
        try {
            await apiDeleteContact(id);
            setContacts(prev => prev.filter(c => c._id !== id));
            if (active?._id === id) setActive(null);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (phone: string, text: string) => {
        const res = await fetch(`/wpp/chat/${phone}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        if (!res.ok) {
            throw new Error('Falha ao enviar mensagem');
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            {/* Sidebar - Estilo mais sofisticado */}
            <Sidebar
                contacts={contacts}
                active={active}
                onSelect={setActive}
             //   onAddContact={() => setShowAddModal(true)}
                onAdd={addContact}
                onEdit={editContact}
                onDelete={deleteContact}
                className="w-80 bg-gradient-to-b from-indigo-900 to-indigo-800 text-white shadow-xl"
            />

            {/* Área de Chat - Design mais limpo */}
            <div className="flex-1 flex flex-col">
                <ChatWindow
                    contact={active}
                    sendMessage={sendMessage}
                    className="flex-1 flex flex-col bg-white border-l border-gray-200"
                />

                {/* Quando nenhum contato está selecionado */}
                {!active && (
                    <div className="flex-1 flex items-center justify-center bg-gray-50">
                        <div className="text-center p-8 max-w-md">
                            <h2 className="text-2xl font-light text-gray-600 mb-2">Selecione um contato</h2>
                            <p className="text-gray-400 mb-6">ou adicione um novo para começar a conversar</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-md"
                            >
                                + Adicionar Contato
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Adição - Estilo refinado */}
            {showAddModal && (
                <AddContactModal
                    onClose={() => setShowAddModal(false)}
                    onAdd={addContact}
                />
            )}

            {/* Loader - Design mais discreto */}
            {loading && (
                <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-40 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl shadow-2xl flex items-center space-x-3">
                        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-700 font-medium">Carregando...</span>
                    </div>
                </div>
            )}

            {/* Mensagem de Erro - Estilo mais profissional */}
            {error && (
                <div className="fixed bottom-6 right-6 bg-red-500 text-white px-5 py-3 rounded-lg shadow-lg z-50 flex items-start space-x-4 max-w-md animate-fade-in-up">
                    <div className="flex-1">
                        <h3 className="font-semibold">Ocorreu um erro</h3>
                        <p className="text-sm opacity-90">{error}</p>
                    </div>
                    <button
                        onClick={() => setError('')}
                        className="text-white hover:text-gray-200 transition-colors text-xl leading-none"
                        aria-label="Fechar"
                    >
                        &times;
                    </button>
                </div>
            )}
        </div>
    );
};

export default AppChat;
