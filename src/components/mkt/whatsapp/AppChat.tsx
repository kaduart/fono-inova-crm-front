// src/components/whatsapp/AppChat.tsx
import { Paper, Typography, useTheme } from "@mui/material";
import { MessageCircle, RefreshCw } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { FiAlertCircle, FiMessageCircle, FiUserPlus, FiX } from "react-icons/fi";
import { useChatNavigation } from "../../../contexts/ChatNavigationContext";
import { useContacts } from "../../../contexts/ContactsContext";
import { ChatProvider } from "../../../contexts/ChatContext"; // 🆕 Contexto para mensagens de sistema
import { Contact, sendWhatsAppText } from "../../../services/whatsappService";
import API from "../../../services/api";
import { normalizeE164BR } from "../../../utils/phone";
import { Button } from "../../ui/Button";
import AddContactModal from "./AddContactModal";
import ChatWindow from "./ChatWindow";
import Sidebar from "./Sidebar";
import ChatSkeleton from "./ChatSkeleton";
import { useDebouncedCallback } from "../../../hooks/useDebounce";
import { searchContactsByMessage } from "../../../services/whatsappService";
import AmandaStatusBadge from "./AmandaStatusBadge";
import { socketManager } from "../../../utils/socketManager";

const AppChat: React.FC = () => {
    const theme = useTheme();
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

    // 🔔 Atualizar lista de contatos quando chegar mensagem nova via socket
    // 🛡️ DEBOUNCE: Evita múltiplas atualizações rápidas
    useEffect(() => {
        if (!refreshContacts) return;
        
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        let lastUpdate = 0;
        const MIN_UPDATE_INTERVAL = 2000; // Máximo 1 atualização a cada 2s (mais responsivo)
        
        const unsubscribe = socketManager.onMessageNew((payload) => {
            const now = Date.now();
            const timeSinceLastUpdate = now - lastUpdate;
            
            // Se já atualizou recentemente, agenda para depois
            if (timeSinceLastUpdate < MIN_UPDATE_INTERVAL) {
                console.log(`[AppChat] Socket message:new ignorado (última atualização há ${Math.round(timeSinceLastUpdate/1000)}s)`);
                return;
            }
            
            if (debounceTimer) clearTimeout(debounceTimer);
            
            debounceTimer = setTimeout(() => {
                console.log('[AppChat] Socket message:new recebido, atualizando contatos...');
                lastUpdate = Date.now();
                refreshContacts();
            }, 500); // Debounce de 500ms
        });
        
        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            unsubscribe();
        };
    }, [refreshContacts]);

    // 💬 Enviar mensagem
    const sendMessage = async (phone: string, text: string) => {
        try {
            await sendWhatsAppText(phone, text);
        } catch (e) {
            console.error("[AppChat] Erro ao enviar:", e);
            throw new Error("Falha ao enviar mensagem");
        }
    };

    // 🎨 Empty State 
    const EmptyState = () => (
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50/30">
            <div className="text-center p-8 max-w-md mx-auto">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <FiMessageCircle className="w-10 h-10 text-indigo-500" />
                </div>
                <h2 className="text-2xl font-light text-gray-700 mb-3">
                    Bem-vindo à Clínica Fono Inova WhatsApp!
                </h2>
                <p className="text-gray-500 mb-8 leading-relaxed">
                    Selecione um contato existente ou adicione um novo para começar a conversar
                </p>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2 mx-auto"
                >
                    <FiUserPlus className="w-5 h-5" />
                    <span>Adicionar Primeiro Contato</span>
                </button>
            </div>
        </div>
    );

    const LoadingOverlay = () => (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/95 p-8 rounded-2xl shadow-2xl flex flex-col items-center space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
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
        <div>
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 2, md: 4 },
                    mb: { xs: 2, md: 6 },
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}08, ${theme.palette.secondary.main}05)`,
                    border: `1px solid ${theme.palette.grey[200]}`,
                }}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <MessageCircle size={28} className="text-emerald-600" />
                        </div>
                        <div>
                            <Typography variant="h4" fontWeight="bold" color="grey.800">
                                Chat de Gestão de Pacientes
                            </Typography>
                            <Typography variant="body2" color="grey.600">
                                Gerencie seus pacientes com clareza e eficiência.
                            </Typography>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <AmandaStatusBadge />

                        <Button
                            onClick={() => {
                                console.log('[AppChat] Botão Atualizar clicado, refreshContacts:', typeof refreshContacts);
                                if (refreshContacts) {
                                    refreshContacts(true);
                                } else {
                                    console.error('[AppChat] refreshContacts não está definido!');
                                }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700..."
                        >
                            <RefreshCw size={18} />
                            Atualizar
                        </Button>
                    </div>
                </div>
            </Paper>

            <div className="flex h-[85vh] bg-gray-50 overflow-hidden">
                {/* Sidebar — full width no mobile, w-80 fixo no desktop */}
                <div className={`${mobileSidebarOpen ? 'flex' : 'hidden'} sm:flex flex-col w-full sm:w-80 shrink-0`}>
                    <Sidebar
                        contacts={searchResults ?? contacts}
                        onSearch={debouncedSearch}
                        isServerFiltered={searchResults !== null}
                        activeContactId={activeContactId}
                        onSelect={handleSelectContact}
                        onLoadMore={loadMoreContacts}
                        hasMore={hasMore}
                        isLoadingMore={loadingMore}
                        className="flex-1 bg-gradient-to-b from-indigo-900 to-purple-800 text-white shadow-xl overflow-y-auto"
                    />
                </div>

                {/* Área do chat — escondida no mobile enquanto sidebar está aberta */}
                <div className={`${!mobileSidebarOpen ? 'flex' : 'hidden'} sm:flex flex-1 min-w-0 flex-col overflow-hidden`}>
                    {/* Botão voltar — só no mobile */}
                    <button
                        onClick={() => setMobileSidebarOpen(true)}
                        className="sm:hidden flex items-center gap-2 px-4 py-2 bg-indigo-900 text-white text-sm font-medium shrink-0"
                    >
                        ← Contatos
                    </button>
                    {active ? (
                        <ChatProvider>
                            <ChatWindow
                                contact={active as any}
                                sendMessage={sendMessage}
                                leadId={effectiveLeadId || undefined}
                                className="flex-1 min-h-0 overflow-hidden bg-white"
                            />
                        </ChatProvider>
                    ) : (
                        <EmptyState />
                    )}
                </div>

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
