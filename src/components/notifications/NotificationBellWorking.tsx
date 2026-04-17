import React, { useState, useEffect } from 'react';
import { Bell, User, Calendar, Clock } from 'lucide-react';

/**
 * 🔔 NotificationBell - Versão Persistente
 * Salva no localStorage quais notificações já foram vistas
 */
export const NotificationBellWorking: React.FC = () => {
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [preAgendamentos, setPreAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // IDs das notificações que o usuário já viu (persistido no localStorage)
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  const API_TOKEN = 'agenda_export_token_fono_inova_2025_secure_abc123';
  const STORAGE_KEY = 'notificationBell_seenIds';

  // Carregar IDs vistos do localStorage ao montar
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSeenIds(new Set(parsed));
      } catch (e) {
        console.log('Erro ao carregar seenIds:', e);
      }
    }
  }, []);

  // Salvar IDs vistos no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seenIds)));
  }, [seenIds]);

  // Buscar pré-agendamentos
  const fetchPreAgendamentos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v2/pre-appointments?limit=50', {
        headers: { 'Authorization': `Bearer ${API_TOKEN}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const items = data.data || [];
        
        // Filtra só os pendentes (V2 usa operationalStatus, com fallback para status)
        const getStatus = (p: any) => p.operationalStatus || p.status;
        const pendentes = items.filter((p: any) => 
          getStatus(p) === 'novo' || getStatus(p) === 'em_analise' || getStatus(p) === 'contatado'
        );
        
        setPreAgendamentos(pendentes);
        setCount(pendentes.length);
      }
    } catch (e) {
      console.log('Erro:', e);
    }
    setLoading(false);
  };

  // Carregar ao montar
  useEffect(() => {
    fetchPreAgendamentos();
    const interval = setInterval(fetchPreAgendamentos, 60000); // 🔥 60s em vez de 30s
    return () => clearInterval(interval);
  }, []);

  // Ouvir novos pré-agendamentos via socket
  useEffect(() => {
    if (window.socketManager) {
      const unsubscribe = window.socketManager.on('preagendamento:new', (data: any) => {
        console.log('📅 Novo pré-agendamento:', data);
        fetchPreAgendamentos();
        
        // Toast
        if (typeof toast !== 'undefined') {
          toast.info(`📅 Novo: ${data.patientName}`);
        }
      });
      
      return unsubscribe;
    }
  }, []);

  const handleClick = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    if (newIsOpen) {
      // Abriu: carrega lista
      fetchPreAgendamentos();
      
      // Marca TODOS os IDs atuais como "vistos"
      const currentIds = new Set(preAgendamentos.map(p => p._id));
      setSeenIds(prev => {
        const updated = new Set([...prev, ...currentIds]);
        return updated;
      });
    }
  };

  // Calcula quantos são NOVOS (não vistos)
  const newCount = preAgendamentos.filter(p => !seenIds.has(p._id)).length;
  const hasNewItems = newCount > 0;

  // Quando chega notificação nova via socket, ela não está em seenIds
  // Então newCount aumenta automaticamente

  const getStatusBadge = (item: any) => {
    const status = item.operationalStatus || item.status;
    const colors: Record<string, string> = {
      novo: '#ef4444',
      em_analise: '#f59e0b', 
      contatado: '#3b82f6',
      confirmado: '#10b981'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (item: any) => {
    const status = item.operationalStatus || item.status;
    const labels: Record<string, string> = {
      novo: 'NOVO',
      em_analise: 'EM ANÁLISE',
      contatado: 'CONTATADO',
      confirmado: 'CONFIRMADO'
    };
    return labels[status] || status;
  };

  // Destacar visualmente os novos (não vistos)
  const isNew = (id: string) => !seenIds.has(id);

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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={`${count} pré-agendamento(s) - ${newCount} novo(s)`}
      >
        <Bell size={22} />
        
        {/* Badge - mostra NOVOS (não vistos) */}
        {count > 0 && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            background: hasNewItems ? '#ef4444' : '#6b7280',
            color: 'white',
            borderRadius: '50%',
            padding: '2px 6px',
            fontSize: '11px',
            fontWeight: 'bold',
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            animation: hasNewItems ? 'pulse 2s infinite' : 'none',
          }}>
            {hasNewItems ? (newCount > 99 ? '99+' : newCount) : (count > 99 ? '99+' : count)}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '45px',
          width: '400px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          zIndex: 9999,
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #059669, #047857)',
            padding: '14px 16px',
            color: 'white',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>📅 Pré-Agendamentos</span>
                <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                  {count} total · <strong>{newCount} novo{newCount !== 1 ? 's' : ''}</strong>
                </div>
              </div>
              {hasNewItems && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Marca todos como vistos
                    const allIds = new Set(preAgendamentos.map(p => p._id));
                    setSeenIds(allIds);
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Marcar todas como lidas
                </button>
              )}
              <button
                onClick={() => { setIsOpen(false); }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  marginLeft: '8px',
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Lista */}
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  border: '3px solid #e5e7eb',
                  borderTopColor: '#059669',
                  borderRadius: '50%',
                  margin: '0 auto 10px',
                  animation: 'spin 1s linear infinite',
                }} />
                Carregando...
              </div>
            ) : preAgendamentos.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#6b7280' }}>
                <Bell size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p style={{ fontSize: '14px' }}>Nenhum pré-agendamento pendente</p>
              </div>
            ) : (
              preAgendamentos.map((p: any) => {
                const novo = isNew(p._id);
                return (
                  <div
                    key={p._id}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      background: novo ? '#fef2f2' : 'white', // Fundo vermelho claro se for novo
                      borderLeft: novo ? '3px solid #ef4444' : '3px solid transparent',
                    }}
                    onClick={() => {
                      // Marca este como visto
                      setSeenIds(prev => new Set([...prev, p._id]));
                    }}
                    onMouseEnter={(e) => {
                      if (!novo) e.currentTarget.style.background = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      if (!novo) e.currentTarget.style.background = 'white';
                    }}
                  >
                    {/* Header do item */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: '#111827', fontSize: '14px' }}>
                          {p.patientInfo?.fullName || 'Paciente'}
                        </strong>
                        {novo && (
                          <span style={{
                            fontSize: '10px',
                            background: '#ef4444',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                          }}>
                            NOVO
                          </span>
                        )}
                      </div>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: getStatusBadge(p) + '20',
                        color: getStatusBadge(p),
                        textTransform: 'uppercase',
                      }}>
                        {getStatusLabel(p)}
                      </span>
                    </div>
                    
                    {/* Info */}
                    <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#4b5563', marginBottom: '4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} />
                        {p.specialty}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        {new Date(p.preferredDate).toLocaleDateString('pt-BR')}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {p.preferredTime || '--:--'}
                      </span>
                    </div>
                    
                    {/* Origem */}
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                      {p.source === 'amandaAI' ? '🤖 Amanda AI' : 
                       p.source === 'whatsapp' ? '💬 WhatsApp' : 
                       p.source === 'site' ? '🌐 Site' : '📋 ' + p.source}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Footer */}
          <div style={{
            padding: '10px 16px',
            background: '#f9fafb',
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center',
          }}>
            <a 
              href="#/pre-agendamentos" 
              style={{
                color: '#059669',
                fontSize: '13px',
                textDecoration: 'none',
                fontWeight: 500,
              }}
              onClick={() => setIsOpen(false)}
            >
              Ver todos os pré-agendamentos →
            </a>
          </div>
        </div>
      )}

      {/* CSS */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

export default NotificationBellWorking;
