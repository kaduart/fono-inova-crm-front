import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';

/**
 * 🔔 NotificationBell Simples
 * Versão simplificada sem dependências complexas
 */
export const NotificationBellSimple: React.FC = () => {
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Buscar notificações ao montar
  useEffect(() => {
    fetchNotifications();
    
    // Atualizar a cada 30s
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Ouvir sockets
  useEffect(() => {
    if (window.socketManager) {
      const unsubscribe = window.socketManager.on('preagendamento:new', (data: any) => {
        console.log('📅 Nova notificação via socket:', data);
        setCount(prev => prev + 1);
        fetchNotifications();
        
        // Toast
        if (typeof toast !== 'undefined') {
          toast.info(`📅 Novo: ${data.patientName || 'Pré-agendamento'}`);
        }
      });
      
      return unsubscribe;
    }
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notifications/count', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCount(data.count || 0);
      }
    } catch (e) {
      console.log('Erro ao buscar notificações:', e);
    }
  };

  const fetchNotificationList = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/notifications?limit=10', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data || []);
      }
    } catch (e) {
      console.log('Erro ao buscar lista:', e);
    }
  };

  const handleClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotificationList();
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setCount(prev => Math.max(0, prev - 1));
      fetchNotificationList();
    } catch (e) {
      console.log('Erro ao marcar como lida:', e);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Botão do Sino */}
      <button
        onClick={handleClick}
        style={{
          position: 'relative',
          padding: '8px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          borderRadius: '8px',
          color: 'white',
        }}
      >
        <Bell size={24} />
        
        {/* Badge */}
        {count > 0 && (
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            padding: '2px 6px',
            fontSize: '12px',
            fontWeight: 'bold',
            minWidth: '20px',
          }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '40px',
          width: '350px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          zIndex: 1000,
          border: '1px solid #e5e7eb',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #059669, #047857)',
            padding: '12px 16px',
            borderRadius: '12px 12px 0 0',
            color: 'white',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold' }}>📅 Notificações</span>
              {count > 0 && (
                <button
                  onClick={() => { setCount(0); setNotifications([]); }}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Lista */}
          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                <Bell size={32} style={{ marginBottom: '8px', opacity: 0.3 }} />
                <p>Nenhuma notificação pendente</p>
              </div>
            ) : (
              notifications.map((n: any) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    ':hover': { background: '#f9fafb' },
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ color: '#111827' }}>{n.data?.patientName || 'Paciente'}</strong>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{n.timeAgo}</span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#4b5563' }}>
                    {n.data?.specialty} - {n.data?.time}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                    {n.data?.source === 'amandaAI' ? '🤖 Amanda' : '📋 Sistema'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBellSimple;
