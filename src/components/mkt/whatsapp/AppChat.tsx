// src/components/whatsapp/AppChat.tsx
import { RefreshCw, ArrowLeft } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiAlertCircle, FiMessageCircle, FiUserPlus, FiX } from "react-icons/fi";
import { useChatNavigation } from "../../../contexts/ChatNavigationContext";
import { useContacts } from "../../../contexts/ContactsContext";
import { ChatProvider } from "../../../contexts/ChatContext"; // 🆕 Contexto para mensagens de sistema
import { Contact, sendWhatsAppText } from "../../../services/whatsappService";
import API from "../../../services/api";
import { normalizeE164BR } from "../../../utils/phone";
import AddContactModal from "./AddContactModal";
import ChatWindow from "./ChatWindow";
import Sidebar from "./Sidebar";
import ChatSkeleton from "./ChatSkeleton";
import { useDebouncedCallback } from "../../../hooks/useDebounce";
import { searchContactsByMessage } from "../../../services/whatsappService";
import AmandaStatusBadge from "./AmandaStatusBadge";
import ChatContextPanel from "./ChatContextPanel";
import { socketManager } from "../../../utils/socketManager";

const AppChat: React.FC = () => {
    const navigate = useNavigate();
    // Volta para a tela de onde o usuário abriu as Conversas (ex.: Financeiro).
    // Usa o histórico quando existe; senão cai no painel admin.
    const handleBack = () => {
        if (window.history.length > 1) navigate(-1);
        else navigate('/admin');
    };
    const { pendingContactPhone, setPendingContactPhone } = useChatNavigation();

    const {
        contacts,
        refreshContacts,
        loadMoreContacts,
        hasMore,
        loadingMore,
        markAsRead,
        setActiveContactId,
        activeContactId,
        loading: loadingContacts,
    } = useContacts();

    const [error, setError] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchResults, setSearchResults] = useState<Contact[] | null>(null);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);

    const debouncedSearch = useDebouncedCallback(async (term: string) => {

        if (term.length < 2) {
            setSearchResults(null);
            return;
        }

        try {
            const results = await searchContactsByMessage(term);
            setSearchResults(results);
        } catch (err) {
            console.error("🔍 [ERRO]:", err);
        }
    }, 300);

    // ✅ contato ativo sempre derivado do contexto (single source of truth)
    const active = useMemo(
        () => contacts.find((c: any) => c._id === activeContactId) || null,
        [contacts, activeContactId]
    );

    // 🎯 Selecionar contato (single source of truth)
    const handleSelectContact = (contact: Contact) => {
        markAsRead(contact._id);
        setActiveContactId(contact._id);
        setMobileSidebarOpen(false); // no mobile, vai direto para o chat
    };

    // 📍 Selecionar contato via pendingContactPhone
    useEffect(() => {
        if (!pendingContactPhone || contacts.length === 0) return;

        const target = normalizeE164BR(pendingContactPhone);
        const found = contacts.find((c: any) => normalizeE164BR(c.phone) === target);

        if (found) handleSelectContact(found as any);

        setPendingContactPhone(null);
    }, [pendingContactPhone, contacts, setPendingContactPhone]);

    // 🚀 FORÇAR CARREGAMENTO AO MONTAR: Sempre carrega contatos quando entra no chat
    useEffect(() => {
        console.log('[AppChat] 🚀 Componente montado, forçando carregamento de contatos...');
        if (refreshContacts) {
            refreshContacts(true); // true = force refresh
        }
    }, []); // Executa apenas uma vez ao montar

    // 🔔 Socket: ContactsContext já trata message:new e chat:inbox:update otimisticamente.
    // AppChat não precisa de refreshContacts() aqui — evita refetch duplo.

    // 💬 Enviar mensagem
    const sendMessage = async (phone: string, text: string) => {
        try {
            await sendWhatsAppText(phone, text, undefined, active?.leadId);
        } catch (e) {
            console.error("[AppChat] Erro ao enviar:", e);
            throw new Error("Falha ao enviar mensagem");
        }
    };

    // 🎨 Empty State 
    const EmptyState = () => (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center p-8 max-w-md mx-auto">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 dark:bg-emerald-500/10">
                    <FiMessageCircle className="w-9 h-9 text-emerald-600 dark:text-emerald-300" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2 dark:text-gray-100">
                    Escolha uma conversa
                </h2>
                <p className="text-gray-500 mb-8 leading-relaxed">
                    Comece pelo filtro "Esperando resposta": são as famílias que ainda não tiveram retorno.
                </p>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold flex items-center justify-center space-x-2 mx-auto"
                >
                    <FiUserPlus className="w-5 h-5" />
                    <span>Nova conversa</span>
                </button>
            </div>
        </div>
    );

    const LoadingOverlay = () => (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/95 p-8 rounded-2xl shadow-2xl flex flex-col items-center space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-700 font-medium">Processando...</p>
            </div>
        </div>
    );

    const ErrorNotification = () => (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto bg-white border border-red-200 rounded-2xl shadow-2xl z-50 sm:max-w-md">
            <div className="p-4 flex items-start space-x-3">
                <FiAlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-sm">Erro</h3>
                    <p className="text-gray-600 text-sm mt-1">{error}</p>
                </div>
                <button onClick={() => setError("")} className="text-gray-400 hover:text-gray-600">
                    <FiX className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
    // ✅ leadId correto: tenta pegar do contato (se existir). Evita usar _id como leadId.
    const effectiveLeadId = active?.leadId;
    // 🆕 Skeleton loading
    if (loadingContacts) {
        return <ChatSkeleton />;
    }

    return (
        <div className="text-left">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-start gap-2">
                    <button type="button" onClick={handleBack} aria-label="Voltar"
                        className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
                        <ArrowLeft size={16} aria-hidden />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">Conversas</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">WhatsApp da clínica. Quem espera resposta aparece primeiro no filtro "Esperando resposta".</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <AmandaStatusBadge />
                    <button type="button" onClick={() => refreshContacts?.(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800">
                        <RefreshCw size={15} aria-hidden /> Atualizar
                    </button>
                </div>
            </div>

            <div className="flex h-[calc(100vh-170px)] min-h-[520px] overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                {/* Sidebar — full width no mobile, w-80 fixo no desktop */}
                <div className={`${mobileSidebarOpen ? 'flex' : 'hidden'} sm:flex flex-col w-full sm:w-80 shrink-0`}>
                    <Sidebar
                        contacts={searchResults ?? contacts}
                        onSearch={debouncedSearch}
                        isServerFiltered={searchResults !== null}
                        activeContactId={activeContactId}
                        onSelect={handleSelectContact}
                        onAdd={() => setShowAddModal(true)}
                        onLoadMore={loadMoreContacts}
                        hasMore={hasMore}
                        isLoadingMore={loadingMore}
                        className="flex-1 overflow-y-auto"
                    />
                </div>

                {/* Área do chat — escondida no mobile enquanto sidebar está aberta */}
                <div className={`${!mobileSidebarOpen ? 'flex' : 'hidden'} sm:flex flex-1 min-w-0 flex-col overflow-hidden`}>
                    {/* Botão voltar — só no mobile */}
                    <button
                        onClick={() => setMobileSidebarOpen(true)}
                        className="sm:hidden flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-white text-emerald-700 text-sm font-semibold shrink-0 dark:border-gray-800 dark:bg-gray-900 dark:text-emerald-300"
                    >
                        ← Contatos
                    </button>
                    {active ? (
                        <ChatProvider>
                            <ChatWindow
                                contact={active as any}
                                sendMessage={sendMessage}
                                leadId={effectiveLeadId || undefined}
                                className="flex-1 min-h-0 overflow-hidden"
                            />
                        </ChatProvider>
                    ) : (
                        <EmptyState />
                    )}
                </div>

                {active && <ChatContextPanel key={active._id} contact={active as any} />}

                {showAddModal && (
                    <AddContactModal
                        onClose={() => setShowAddModal(false)}
                        onAdd={() => {
                            refreshContacts();
                            setShowAddModal(false);
                        }}
                    />
                )}

                {loadingContacts && <LoadingOverlay />}
                {error && <ErrorNotification />}
            </div>
        </div>
    );
};

export default AppChat;
