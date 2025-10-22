// src/components/whatsapp/AppChat.tsx
import React, { useEffect, useState } from "react";
import { FiAlertCircle, FiMessageCircle, FiUserPlus, FiX } from "react-icons/fi";
import { useNotification } from "../../../contexts/NotificationContext";
import {
    addContact as apiAddContact,
    deleteContact as apiDeleteContact,
    editContact as apiEditContact,
    Contact,
    fetchContacts,
    sendWhatsAppText,
} from "../../../services/whatsappService";
import AddContactModal from "./AddContactModal";
import ChatWindow from "./ChatWindow";
import Sidebar from "./Sidebar";

const AppChat: React.FC = () => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [active, setActive] = useState<Contact | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const { chatNotification, mediaNotification } = useNotification();

    // 🟢 Carregar contatos iniciais
    const loadContacts = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await fetchContacts();
            setContacts(data);
        } catch (e) {
            console.error("Erro ao buscar contatos:", e);
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadContacts();
    }, []);

    // 🔔 Efeito para gerenciar notificações na lista de contatos
    useEffect(() => {
        if (!chatNotification && !mediaNotification) return;

        const notification = chatNotification || mediaNotification;
        console.log('🔔 AppChat: Processando notificação para lista:', notification);

        // Função de normalização (igual à do ChatWindow)
        const normalizePhone = (phone: string): string => {
            let cleaned = phone.replace(/\D/g, '');
            if (cleaned.startsWith('55')) cleaned = cleaned.substring(2);
            if (cleaned.length === 10) cleaned = cleaned.substring(0, 2) + '9' + cleaned.substring(2);
            return cleaned;
        };

        const notificationPhone = normalizePhone(notification.from);

        setContacts(prevContacts =>
            prevContacts.map(contact => {
                const contactPhone = normalizePhone(contact.phone);

                if (contactPhone === notificationPhone) {
                    console.log(`✅ AppChat: Atualizando contato ${contact.name} com nova mensagem`);

                    return {
                        ...contact,
                        hasNewMessage: true, // ✅ MARCA como tendo nova mensagem
                        lastMessage: chatNotification?.text || mediaNotification?.caption || 'Nova mídia',
                        lastMessagePreview: chatNotification?.text || mediaNotification?.caption || 'Nova mídia',
                        lastMessageTime: new Date().toISOString(),
                        unreadCount: (contact.unreadCount || 0) + 1
                    };
                }
                return contact;
            })
        );

    }, [chatNotification, mediaNotification]);

    // 🔄 Efeito para limpar a notificação quando o contato é selecionado
    const handleSelectContact = (contact: Contact) => {
        console.log(`🎯 handleSelectContact CHAMADO para: ${contact.name}`, {
            tinhaNotificacao: contact.hasNewMessage,
            mensagensNaoLidas: contact.unreadCount
        });
        // Limpa o indicador de nova mensagem quando o contato é selecionado
        setContacts(prevContacts =>
            prevContacts.map(c =>
                c._id === contact._id
                    ? { ...c, hasNewMessage: false, unreadCount: 0 }
                    : c
            )
        );

        setActive(contact);
    };

    // ➕ Adicionar novo contato
    const addContact = async (data: Omit<Contact, "_id">) => {
        setLoading(true);
        setError("");
        try {
            const newContact = await apiAddContact(data);
            setContacts((prev) => [...prev, newContact]);
            setActive(newContact);
            setShowAddModal(false);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // ✏️ Editar contato
    const editContact = async (id: string, data: Partial<Omit<Contact, "_id">>) => {
        setLoading(true);
        setError("");
        try {
            const updated = await apiEditContact(id, data);
            setContacts((prev) => prev.map((c) => (c._id === id ? updated : c)));
            if (active?._id === id) setActive(updated);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // 🗑️ Deletar contato
    const deleteContact = async (id: string) => {
        setLoading(true);
        setError("");
        try {
            await apiDeleteContact(id);
            setContacts((prev) => prev.filter((c) => c._id !== id));
            if (active?._id === id) setActive(null);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // 💬 Enviar mensagem de texto
    const sendMessage = async (phone: string, text: string) => {
        try {
            await sendWhatsAppText(phone, text);
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
            throw new Error("Falha ao enviar mensagem");
        }
    };

    // 🎨 Empty State Component
    const EmptyState = () => (
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50/30">
            <div className="text-center p-8 max-w-md mx-auto">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <FiMessageCircle className="w-10 h-10 text-indigo-500" />
                </div>
                <h2 className="text-2xl font-light text-gray-700 mb-3">
                    Bem-vindo a Clínica Fono Inova WhatsApp!
                </h2>
                <p className="text-gray-500 mb-8 leading-relaxed">
                    Selecione um contato existente ou adicione um novo para começar a conversar com seus clientes
                </p>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 mx-auto"
                >
                    <FiUserPlus className="w-5 h-5" />
                    <span>Adicionar Primeiro Contato</span>
                </button>

                {/* Stats ou informações úteis */}
                <div className="mt-12 grid grid-cols-3 gap-6 text-center">
                    <div className="text-gray-600">
                        <div className="text-2xl font-semibold text-indigo-600">{contacts.length}</div>
                        <div className="text-sm text-gray-500">Contatos</div>
                    </div>
                    <div className="text-gray-600">
                        <div className="text-2xl font-semibold text-green-600">∞</div>
                        <div className="text-sm text-gray-500">Mensagens</div>
                    </div>
                    <div className="text-gray-600">
                        <div className="text-2xl font-semibold text-blue-600">24/7</div>
                        <div className="text-sm text-gray-500">Disponível</div>
                    </div>
                </div>
            </div>
        </div>
    );

    // 🎨 Loading Overlay Component
    const LoadingOverlay = () => (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
            <div className="bg-white/95 p-8 rounded-2xl shadow-2xl border border-white/20 flex flex-col items-center space-y-4 min-w-[200px]">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-indigo-100 rounded-full"></div>
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                </div>
                <div className="text-center">
                    <p className="text-gray-700 font-medium">Processando...</p>
                    <p className="text-gray-500 text-sm mt-1">Aguarde um momento</p>
                </div>
            </div>
        </div>
    );

    // 🎨 Error Notification Component
    const ErrorNotification = () => (
        <div className="fixed bottom-6 right-6 bg-white border border-red-200 rounded-2xl shadow-2xl z-50 max-w-md animate-fade-in-up">
            <div className="p-4 flex items-start space-x-3">
                <div className="flex-shrink-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center mt-0.5">
                    <FiAlertCircle className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 text-sm">Ocorreu um erro</h3>
                    <p className="text-gray-600 text-sm mt-1 leading-relaxed">{error}</p>
                </div>
                <button
                    onClick={() => setError("")}
                    className="flex-shrink-0 w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 flex items-center justify-center"
                    aria-label="Fechar"
                >
                    <FiX className="w-4 h-4" />
                </button>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-b-2xl overflow-hidden">
                <div className="h-1 bg-red-500 rounded-full animate-progress"></div>
            </div>
        </div>
    );

    return (
        <div className="flex  h-[85vh] bg-gray-50 font-sans overflow-hidden">
            {/* Sidebar */}
            <Sidebar
                contacts={contacts}
                active={active}
                onSelect={handleSelectContact}
                onAdd={addContact}
                onEdit={editContact}
                onDelete={deleteContact}
                cclassName="w-80 shrink-0 bg-gradient-to-b from-indigo-900 to-purple-800 text-white shadow-xl overflow-y-auto"
            />

            {/* Área Principal */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                {active ? (
                    <ChatWindow
                        contact={active}
                        sendMessage={sendMessage}
                        className="flex-1 min-h-0 overflow-hidden bg-white"
                    />
                ) : (
                    <EmptyState />
                )}
            </div>

            {/* Modal de Adição */}
            {showAddModal && (
                <AddContactModal
                    onClose={() => setShowAddModal(false)}
                    onAdd={addContact}
                />
            )}

            {/* Loading Overlay */}
            {loading && <LoadingOverlay />}

            {/* Error Notification */}
            {error && <ErrorNotification />}

            {/* Adicione este estilo para a animação de progresso */}
            <style jsx>{`
    @keyframes progress { from { width: 100%; } to { width: 0%; } }
    .animate-progress { animation: progress 5s linear forwards; }
    @keyframes fade-in-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fade-in-up { animation: fade-in-up 0.3s ease-out; }
  `}</style>
        </div>
    );
};

export default AppChat;