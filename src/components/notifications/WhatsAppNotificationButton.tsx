import React, { useEffect, useMemo, useState, useContext } from 'react';
import { MessageCircle } from 'lucide-react';
import { ContactsContext } from '../../contexts/ContactsContext';
import { socketManager } from '../../utils/socketManager';

interface WhatsAppNotificationButtonProps {
  onClick?: () => void;
  className?: string;
}

export const WhatsAppNotificationButton: React.FC<WhatsAppNotificationButtonProps> = ({
  onClick,
  className = ""
}) => {
  // Usa useContext diretamente para ter controle sobre o erro
  const contactsContext = useContext(ContactsContext);
  const [socketNotifications, setSocketNotifications] = useState(0);
  
  // Se contexto não estiver disponível, renderiza botão sem funcionalidade
  if (!contactsContext) {
    return (
      <button
        onClick={onClick}
        className={`relative p-2 rounded-lg transition-all duration-200 hover:bg-emerald-600 text-white ${className}`}
        title="WhatsApp"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    );
  }
  
  const { contacts, refreshContacts } = contactsContext;

  // Calcula total de mensagens não lidas do contexto
  const contextUnreadCount = useMemo(() => {
    return contacts.reduce((sum, contact) => sum + (contact.unreadCount || 0), 0);
  }, [contacts]);

  // Total = contatos + notificações de socket pendentes
  const totalUnread = contextUnreadCount + socketNotifications;

  // Incrementa contador quando chega mensagem via socket
  useEffect(() => {
    const unsubscribe = socketManager.onMessageNew((payload) => {
      // Só incrementa se for mensagem inbound
      const dir = String(payload.direction || "").toLowerCase();
      if (dir === "inbound" || dir === "received") {
        setSocketNotifications(prev => prev + 1);
      }
      refreshContacts();
    });
    return () => unsubscribe();
  }, [refreshContacts]);

  // Reseta notificações de socket quando contatos atualizam (já foram processados)
  useEffect(() => {
    if (contextUnreadCount > 0 && socketNotifications > 0) {
      // Se o contexto já tem as notificações, limpa as do socket
      setSocketNotifications(0);
    }
  }, [contextUnreadCount, socketNotifications]);

  const handleClick = () => {
    // Limpa notificações de socket ao clicar
    setSocketNotifications(0);
    if (onClick) onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`
        relative p-2 rounded-lg transition-all duration-200
        hover:bg-emerald-600 text-white
        ${className}
      `}
      title={totalUnread > 0 ? `${totalUnread} mensagem(ns) não lida(s)` : "WhatsApp"}
    >
      <MessageCircle className="h-5 w-5" />
      
      {/* Badge de notificação */}
      {totalUnread > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-md animate-bounce">
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      )}
    </button>
  );
};

export default WhatsAppNotificationButton;
