import React, { useState, useEffect } from 'react';
import { Bell, User, Calendar, Clock } from 'lucide-react';

/**
 * 🔔 NotificationBell - Versão Debug
 * Com logs para verificar persistência
 */
export const NotificationBellDebug: React.FC = () => {
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [preAgendamentos, setPreAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [debug, setDebug] = useState<string>('');

  const API_TOKEN = 'agenda_export_token_fono_inova_2025_secure_abc123';
  const STORAGE_KEY = 'notificationBell_seenIds_v2';

  // Carregar do localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    console.log('[DEBUG] localStorage:', stored);
    setDebug(`Storage: ${stored ? 'OK' : 'VAZIO'}`);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const ids = new Set(parsed);
        console.log('[DEBUG] Carregados', ids.size, 'IDs vistos');
        setSeenIds(ids);
        setDebug(prev => `${prev} | Vistos: ${ids.size}`);
      } catch (e) {
        console.log('[DEBUG] Erro ao parse:', e);
      }
    }
  }, []);

  // Salvar no localStorage
  useEffect(() => {
    const arr = Array.from(seenIds);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    console.log('[DEBUG] Salvos', arr.length, 'IDs');
    setDebug(prev => `${prev} | Salvos: ${arr.length}`);
  }, [seenIds]);

  const fetchPreAgendamentos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pre-agendamento?limit=50', {
        headers: { 'Authorization': `Bearer ${API_TOKEN}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const items = data.data || [];
        const pendentes = items.filter((p: any) => 
          p.status === 'novo' || p.status === 'em_analise' || p.status === 'contatado'
        );
        
        setPreAgendamentos(pendentes);
        setCount(pendentes.length);
        
        // Calcular novos
        const currentIds = new Set(pendentes.map((p: any) => p._id));
        const novos = pendentes.filter((p: any) => !seenIds.has(p._id));
        
        console.log('[DEBUG] Total:', pendentes.length, '| Novos:', novos.length);
        console.log('[DEBUG] IDs atuais:', Array.from(currentIds).slice(0, 3));
        console.log('[DEBUG] IDs vistos:', Array.from(seenIds).slice(0, 3));
        setDebug(prev => `${prev} | Total: ${pendentes.length} | Novos: ${novos.length}`);
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

  // Recalcular quando seenIds mudar
  useEffect(() => {
    const novos = preAgendamentos.filter(p => !seenIds.has(p._id));
    console.log('[DEBUG] Recalculado - Novos:', novos.length);
  }, [seenIds, preAgendamentos]);

  const handleClick = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    if (newIsOpen) {
      fetchPreAgendamentos();
      // Marca todos como vistos
      const allIds = new Set(preAgendamentos.map(p => p._id));
      setSeenIds(prev => {
        const updated = new Set([...prev, ...allIds]);
        console.log('[DEBUG] Marcando', allIds.size, 'como vistos');
        return updated;
      });
    }
  };

  const newCount = preAgendamentos.filter(p => !seenIds.has(p._id)).length;
  const hasNewItems = newCount > 0;

  // Limpar vistos (para teste)
  const clearSeen = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSeenIds(new Set());
    console.log('[DEBUG] Limpado!');
    setDebug('LIMPADO');
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Debug info */}
      <div style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: '#0f0',
        padding: '10px',
        borderRadius: '4px',
        fontSize: '11px',
        fontFamily: 'monospace',
        zIndex: 10000,
        maxWidth: '300px',
      }}>
        <div>DEBUG: {debug}</div>
        <div>newCount: {newCount} | hasNew: {hasNewItems ? 'SIM' : 'NÃO'}</div>
        <button onClick={clearSeen} style={{ marginTop: '5px', fontSize: '10px' }}>
          Limpar vistos
        </button>
      </div>

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
          }}>
            {hasNewItems ? newCount : count}
          </span>
        )}
      </button>

      {/* Dropdown simples */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '45px',
          width: '350px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          zIndex: 9999,
          padding: '16px',
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>📅 Pré-Agendamentos</h3>
          <p>Total: {count} | Novos: {newCount}</p>
          
          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {preAgendamentos.slice(0, 5).map((p: any) => (
              <div key={p._id} style={{
                padding: '8px',
                marginBottom: '4px',
                background: seenIds.has(p._id) ? '#f3f4f6' : '#fef2f2',
                borderLeft: seenIds.has(p._id) ? '3px solid #9ca3af' : '3px solid #ef4444',
              }}>
                <strong>{p.patientInfo?.fullName}</strong>
                <span style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>
                  {seenIds.has(p._id) ? '(visto)' : '(NOVO)'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBellDebug;
