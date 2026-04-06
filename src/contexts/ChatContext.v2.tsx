// contexts/ChatContext.v2.tsx
// 🚀 VERSÃO ENTERPRISE - Com persistência e fila global

import React, { createContext, useContext, useRef, useCallback, useEffect, useState } from 'react';

export type SystemMessageType = 'error' | 'warning' | 'info' | 'success';

export interface SystemMessage {
  id: string;
  text: string;
  type: SystemMessageType;
  timestamp: number;
  count?: number; // 🆕 Para agrupamento
}

interface ChatContextType {
  // Ações
  addSystemMessage: (text: string, type?: SystemMessageType) => void;
  removeSystemMessage: (id: string) => void;
  clearSystemMessages: () => void;
  
  // Registro do ChatWindow
  registerChatWindow: (callbacks: { 
    addSystemMessage: (msg: SystemMessage) => void;
    isOpen: () => boolean;
  }) => void;
  unregisterChatWindow: () => void;
  
  // Estado
  isChatOpen: boolean;
  pendingCount: number;
}

const ChatContext = createContext<ChatContextType | null>(null);

const STORAGE_KEY = 'chat_system_queue_v2';
const MAX_QUEUE_SIZE = 50;
const MESSAGE_TIMEOUT = 30000; // 30s para erros, depois auto-remove

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const chatWindowRef = useRef<{
    addSystemMessage: (msg: SystemMessage) => void;
    isOpen: () => boolean;
  } | null>(null);
  
  const [pendingCount, setPendingCount] = useState(0);
  const isChatOpen = chatWindowRef.current?.isOpen() ?? false;

  // 🆕 Carrega fila pendente do localStorage
  const loadPendingQueue = useCallback((): SystemMessage[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Limpa mensagens muito antigas (>5min)
        const now = Date.now();
        const valid = parsed.filter((m: SystemMessage) => now - m.timestamp < 300000);
        return valid;
      }
    } catch (e) {
      console.error('[ChatContext] Erro ao carregar fila:', e);
    }
    return [];
  }, []);

  // 🆕 Salva fila no localStorage
  const savePendingQueue = useCallback((queue: SystemMessage[]) => {
    try {
      if (queue.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_SIZE)));
      }
      setPendingCount(queue.length);
    } catch (e) {
      console.error('[ChatContext] Erro ao salvar fila:', e);
    }
  }, []);

  // 🆕 Processa fila pendente quando ChatWindow registra
  const processPendingQueue = useCallback(() => {
    const pending = loadPendingQueue();
    if (pending.length > 0 && chatWindowRef.current) {
      // Agrupa mensagens iguais
      const grouped = groupMessages(pending);
      
      grouped.forEach(msg => {
        chatWindowRef.current?.addSystemMessage(msg);
      });
      
      // Limpa storage após processar
      localStorage.removeItem(STORAGE_KEY);
      setPendingCount(0);
    }
  }, [loadPendingQueue]);

  // 🆕 Agrupa mensagens iguais
  const groupMessages = (messages: SystemMessage[]): SystemMessage[] => {
    const groups = new Map<string, SystemMessage>();
    
    messages.forEach(msg => {
      const key = `${msg.text}_${msg.type}`;
      const existing = groups.get(key);
      
      if (existing) {
        existing.count = (existing.count || 1) + 1;
        // Atualiza timestamp para o mais recente
        existing.timestamp = Math.max(existing.timestamp, msg.timestamp);
      } else {
        groups.set(key, { ...msg, count: 1 });
      }
    });
    
    // Ordena por timestamp
    return Array.from(groups.values()).sort((a, b) => a.timestamp - b.timestamp);
  };

  const registerChatWindow = useCallback((callbacks: { 
    addSystemMessage: (msg: SystemMessage) => void;
    isOpen: () => boolean;
  }) => {
    chatWindowRef.current = callbacks;
    // Processa fila pendente imediatamente
    setTimeout(processPendingQueue, 100);
  }, [processPendingQueue]);

  const unregisterChatWindow = useCallback(() => {
    chatWindowRef.current = null;
  }, []);

  const addSystemMessage = useCallback((text: string, type: SystemMessageType = 'info') => {
    const newMessage: SystemMessage = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text,
      type,
      timestamp: Date.now()
    };

    // Se ChatWindow estiver aberto, envia direto
    if (chatWindowRef.current?.isOpen()) {
      chatWindowRef.current.addSystemMessage(newMessage);
    } else {
      // 🆕 Senão, adiciona à fila persistente
      const pending = loadPendingQueue();
      pending.push(newMessage);
      savePendingQueue(pending);
    }
  }, [loadPendingQueue, savePendingQueue]);

  const removeSystemMessage = useCallback((id: string) => {
    // Remove da fila pendente também
    const pending = loadPendingQueue();
    const filtered = pending.filter(m => m.id !== id);
    savePendingQueue(filtered);
  }, [loadPendingQueue, savePendingQueue]);

  const clearSystemMessages = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPendingCount(0);
  }, []);

  // 🆕 Limpa mensagens antigas periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      const pending = loadPendingQueue();
      const now = Date.now();
      const valid = pending.filter(m => now - m.timestamp < 300000); // 5min
      if (valid.length !== pending.length) {
        savePendingQueue(valid);
      }
    }, 60000); // A cada 1min

    return () => clearInterval(interval);
  }, [loadPendingQueue, savePendingQueue]);

  return (
    <ChatContext.Provider value={{
      addSystemMessage,
      removeSystemMessage,
      clearSystemMessages,
      registerChatWindow,
      unregisterChatWindow,
      isChatOpen,
      pendingCount
    }}>
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
