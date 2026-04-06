// contexts/ChatContext.tsx
// 🆕 Contexto para comunicação com o ChatWindow (mensagens de sistema)

import React, { createContext, useContext, useRef, useCallback } from 'react';

interface ChatContextType {
    addSystemMessage: (text: string, type?: 'error' | 'warning' | 'info' | 'success') => void;
    registerChatWindow: (callbacks: { addSystemMessage: (text: string, type?: 'error' | 'warning' | 'info' | 'success') => void }) => void;
    unregisterChatWindow: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const chatWindowRef = useRef<{ addSystemMessage: (text: string, type?: 'error' | 'warning' | 'info' | 'success') => void } | null>(null);

    const registerChatWindow = useCallback((callbacks: { addSystemMessage: (text: string, type?: 'error' | 'warning' | 'info' | 'success') => void }) => {
        chatWindowRef.current = callbacks;
    }, []);

    const unregisterChatWindow = useCallback(() => {
        chatWindowRef.current = null;
    }, []);

    const addSystemMessage = useCallback((text: string, type: 'error' | 'warning' | 'info' | 'success' = 'info') => {
        if (chatWindowRef.current) {
            chatWindowRef.current.addSystemMessage(text, type);
        } else {
            console.warn('[ChatContext] ChatWindow não registrado, mensagem de sistema perdida:', text);
        }
    }, []);

    return (
        <ChatContext.Provider value={{ addSystemMessage, registerChatWindow, unregisterChatWindow }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat deve ser usado dentro de ChatProvider');
    }
    return context;
}

export function useChatOptional() {
    return useContext(ChatContext);
}
