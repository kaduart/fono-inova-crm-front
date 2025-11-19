import React, { createContext, useContext, useState } from 'react';

interface ChatNavigationContextType {
    pendingContactPhone: string | null;
    setPendingContactPhone: (phone: string | null) => void;
    shouldOpenMessagesTab: boolean;
    setShouldOpenMessagesTab: (value: boolean) => void;
}

const ChatNavigationContext = createContext<ChatNavigationContextType | undefined>(undefined);

export const ChatNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [pendingContactPhone, setPendingContactPhone] = useState<string | null>(null);
    const [shouldOpenMessagesTab, setShouldOpenMessagesTab] = useState(false);

    return (
        <ChatNavigationContext.Provider
            value={{
                pendingContactPhone,
                setPendingContactPhone,
                shouldOpenMessagesTab,
                setShouldOpenMessagesTab
            }}
        >
            {children}
        </ChatNavigationContext.Provider>
    );
};

export const useChatNavigation = () => {
    const context = useContext(ChatNavigationContext);
    if (!context) {
        throw new Error('useChatNavigation must be used within ChatNavigationProvider');
    }
    return context;
};