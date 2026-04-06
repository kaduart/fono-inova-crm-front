import React, { useState, useEffect, useRef } from 'react';
import { Bell, User, Calendar, Clock } from 'lucide-react';

/**
 * 🔔 NotificationBell - Versão Final Corrigida
 * Aguarda carregar do localStorage antes de renderizar badge
 */
export const NotificationBellFixed: React.FC = () => {
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [preAgendamentos, setPreAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false); // Só mostra badge depois de carregar
  
  // seenIds inicia como null para saber quando carregou do storage
  const [seenIds, setSeenIds] = useState<Set<string> | null>(null);

  const API_TOKEN = 'agenda_export_token_fono_inova_2025_secure_abc123';
  const STORAGE_KEY = 'notificationBell_seenIds_v3';

  // Carregar do localStorage IMEDIATAMENTE (antes de qualquer render)
  const loadedFromStorage = useRef(false);
  
  useEffect(() => {
    if (loadedFromStorage.current) return;
    loadedFromStorage.current = true;
    
    const stored = localStorage.getItem(STORAGE_KEY);
    console.log('[Bell] localStorage:', stored ? 'ENCONTRADO' : 'VAZIO');
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSeenIds(new Set(parsed));
        console.log('[Bell] Carregados', parsed.length, 'IDs');
      } catch (e) {
        console.log('[Bell] Erro ao parse:', e);
        setSeenIds(new Set());
      }
    } else {
      setSeenIds(new Set());
    }
  }, []);

  // Salvar no localStorage
  useEffect(() => {
    if (seenIds === null) return; // Ainda não carregou
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seenIds)));
    console.log('[Bell] Salvos', seenIds.size, 'IDs');
  }, [seenIds]);

  // Buscar pré-agendamentos
  const fetchPreAgendamentos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v2/pre-agendamento?limit=50', {
        headers: { 'Authorization': `Bearer ${API_TOKEN}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const items = data.data || [];
        // V2 usa operationalStatus, com fallback para status
        const getStatus = (p: any) => p.operationalStatus || p.status;
        const pendentes = items.filter((p: any) => 
          getStatus(p) === 'novo' || getStatus(p) === 'em_analise' || getStatus(p) === 'contatado'
        );
        
        setPreAgendamentos(pendentes);
        setCount(pendentes.length);
        setIsReady(true); // Marca como pronto
      }
    } catch (e) {
      console.log('Erro:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPreAgendamentos();
    const interval = setInterval(fetchPreAgendamentos, 30000);
    return () => clearInterval(interval);
  }, []);

  // Ouvir sockets
  useEffect(() => {
    if (window.socketManager) {
      const unsubscribe = window.socketManager.on('preagendamento:new', (data: any) => {
        console.log('📅 Novo pré-agendamento:', data);
        fetchPreAgendamentos();
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
    
    if (newIsOpen && seenIds !== null) {
      fetchPreAgendamentos();
      // Marca todos como vistos
      const allIds = new Set(preAgendamentos.map(p => p._id));
      setSeenIds(prev => new Set([...(prev || new Set()), ...allIds]));
    }
  };

  // Só calcula newCount quando seenIds estiver carregado
  const newCount = seenIds !== null 
    ? preAgendamentos.filter(p => !seenIds.has(p._id)).length 
    : 0;
  
  const hasNewItems = newCount > 0;
  const displayCount = seenIds !== null && !hasNewItems ? 0 : newCount;

  // Limpar vistos (para teste)
  const clearSeen = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSeenIds(new Set());
    console.log('[Bell] Limpado!');
  };

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

  const isNew = (id: string) => seenIds !== null && !seenIds.has(id);

  // Não renderiza nada até carregar do storage (evita flash)
  if (!isReady || seenIds === null) {
    return (
      <div style={{ 
        width: '40px', 
        height: '40px', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.5)'
      }}>
        <Bell size={22} />
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Debug - remover depois */}
      {/* <div style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: '#0f0',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontFamily: 'monospace',
        zIndex: 10000,
      }}>
        Vistos: {seenIds.size} | Novos: {newCount} | {hasNewItems ? '🔴' : '⚪'}
        <button onClick={clearSeen} style={{ marginLeft: '8px', fontSize: '10px' }}>
          Limpar
        </button>
      </div> */}

      {/* Botão */}
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
        <Bell size={22} />
        
        {/* Badge - só mostra se tem NOVOS */}
        {displayCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            background: '#ef4444',
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
            animation: 'pulse 2s infinite',
          }}>
            {displayCount > 99 ? '99+' : displayCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          right: '8px',
          top: '60px',
          width: 'min(380px, calc(100vw - 16px))',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          zIndex: 9999,
          overflow: 'hidden',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #059669, #047857)',
            padding: '14px 16px',
            color: 'white',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 'bold' }}>📅 Pré-Agendamentos</span>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                  {count} total · <strong>{newCount} novo{newCount !== 1 ? 's' : ''}</strong>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
              }}>×</button>
            </div>
          </div>

          <div style={{ maxHeight: '350px', overflow: 'auto' }}>
            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center' }}>Carregando...</div>
            ) : preAgendamentos.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>
                <Bell size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p>Nenhum pré-agendamento pendente</p>
              </div>
            ) : (
              preAgendamentos.map((p: any) => (
                <div
                  key={p._id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f3f4f6',
                    background: isNew(p._id) ? '#fef2f2' : 'white',
                    borderLeft: isNew(p._id) ? '3px solid #ef4444' : '3px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ color: '#111' }}>
                      {p.patientInfo?.fullName}
                      {isNew(p._id) && <span style={{ color: '#ef4444', marginLeft: '8px', fontSize: '11px' }}>● NOVO</span>}
                    </strong>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: getStatusBadge(p) + '20',
                      color: getStatusBadge(p),
                    }}>
                      {getStatusLabel(p)}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {p.specialty} · {new Date(p.preferredDate).toLocaleDateString('pt-BR')} · {p.preferredTime}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

export default NotificationBellFixed;
