import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGmbAlert } from '../../hooks/useGmbAlert';
import api from '../../services/api';

interface PreItem {
  _id: string;
  operationalStatus?: string;
  status?: string;
  date?: string;
  time?: string;
  preferredDate?: string;
  preferredTime?: string;
  specialty?: string;
  doctor?: { fullName?: string; specialty?: string } | null;
}

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

  // 📍 Saúde dos posts GMB (falhou / sem confirmação / sem imagem)
  const gmbAlert = useGmbAlert();
  // O sininho só olha os últimos 7 dias; o acumulado (centenas de posts antigos)
  // fica no painel Social Media → GMB. Back antigo sem `recent` → não mostra.
  const gmbRecent = gmbAlert.recent;
  const gmbRecentTotal = gmbRecent?.total ?? 0;
  const navigate = useNavigate();

  const STORAGE_KEY = 'notificationBell_seenIds_v3';

  // Carregar do localStorage IMEDIATAMENTE (antes de qualquer render)
  const loadedFromStorage = useRef(false);
  const hasFetchedOnMount = useRef(false);
  
  useEffect(() => {
    if (loadedFromStorage.current) return;
    loadedFromStorage.current = true;
    
    const stored = localStorage.getItem(STORAGE_KEY);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSeenIds(new Set(parsed));
      } catch (e) {
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
  }, [seenIds]);

  // Buscar pré-agendamentos
  // 🔧 Antes chamava fetch() direto com um token de serviço fixo
  // (agenda_export_token_...) que nunca teve escopo pra essa rota — sempre
  // devolvia 403 (AGENDA_SERVICE_SCOPE_DENIED, ver back/middleware/amandaAuth.js).
  // O client `api` compartilhado já anexa a sessão real do usuário logado, que
  // essa rota aceita sem exigir role específica (ver back/routes/preAgendamentoTriage.routes.js).
  const fetchPreAgendamentos = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v2/pre-appointments?limit=50');
      const items = response.data?.data || [];
      // A rota lê Appointments com operationalStatus 'pre_agendado' (a collection antiga
      // de pré-agendamento, com status novo/em_analise/contatado, não é mais usada —
      // por isso o sino ficava em 0). Auditoria do Dashboard admin, 31/10/2026.
      const pendentes = items.filter((p: any) => (p.operationalStatus || 'pre_agendado') === 'pre_agendado');

      setPreAgendamentos(pendentes);
      // Total real vem da paginação (a lista traz no máximo 50).
      setCount(Number(response.data?.pagination?.total ?? pendentes.length));
      setIsReady(true); // Marca como pronto
    } catch (e) {
      console.log('Erro:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!hasFetchedOnMount.current) {
      hasFetchedOnMount.current = true;
      fetchPreAgendamentos();
    }
    const interval = setInterval(fetchPreAgendamentos, 60000);
    return () => clearInterval(interval);
  }, []);

  // Ouvir sockets
  // 🐛 FIX (2026-09-18): sem debounce, cada evento `preagendamento:new` disparava seu
  // próprio fetchPreAgendamentos() imediato — este componente fica sempre montado
  // (AdminHeader, toda página admin), então é uma das duas fontes que juntas causaram
  // 12+ chamadas idênticas a GET /pre-appointments em produção (a outra era
  // usePreAgendamentos.ts, mesmo fix aplicado lá). Debounce de 800ms agrupa rajadas de
  // eventos próximos numa única busca, sem perder a atualização em tempo real.
  useEffect(() => {
    if (window.socketManager) {
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      const unsubscribe = window.socketManager.on('preagendamento:new', (data: any) => {
        console.log('📅 Novo pré-agendamento:', data);
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          debounceTimer = null;
          fetchPreAgendamentos();
        }, 800);
        if (typeof toast !== 'undefined') {
          toast.info(`📅 Novo: ${data.patientName}`);
        }
      });
      return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        unsubscribe();
      };
    }
  }, []);

  const GMB_SEEN_KEY = 'notificationBell_gmbSeenRecent_v2';
  const [gmbSeenTotal, setGmbSeenTotal] = useState<number>(() => {
    const v = localStorage.getItem(GMB_SEEN_KEY);
    return v !== null ? parseInt(v, 10) : -1;
  });

  const handleClick = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);

    if (newIsOpen && seenIds !== null) {
      fetchPreAgendamentos();
      // Marca pré-agendamentos como vistos
      const allIds = new Set(preAgendamentos.map(p => p._id));
      setSeenIds(prev => new Set([...(prev || new Set()), ...allIds]));
      // Marca alertas GMB como vistos
      localStorage.setItem(GMB_SEEN_KEY, String(gmbRecentTotal));
      setGmbSeenTotal(gmbRecentTotal);
    }
  };

  // Só calcula newCount quando seenIds estiver carregado
  const newCount = seenIds !== null
    ? preAgendamentos.filter(p => !seenIds.has(p._id)).length
    : 0;

  const hasNewItems = newCount > 0;
  // GMB só conta no badge se o total for diferente do que foi visto (novo problema surgiu)
  const gmbBadgeCount = gmbRecentTotal > 0 && gmbRecentTotal !== gmbSeenTotal ? gmbRecentTotal : 0;
  const displayCount = (seenIds !== null && !hasNewItems ? 0 : newCount) + gmbBadgeCount;

  // Limpar vistos (para teste)
  const clearSeen = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSeenIds(new Set());
  };

  const STATUS_META: Record<string, { label: string; color: string }> = {
    pre_agendado: { label: 'Pré-agendado', color: '#d97706' },
    novo: { label: 'Novo', color: '#ef4444' },
    em_analise: { label: 'Em análise', color: '#f59e0b' },
    contatado: { label: 'Contatado', color: '#3b82f6' },
    confirmado: { label: 'Confirmado', color: '#10b981' },
  };
  const statusOf = (item: PreItem) => STATUS_META[item.operationalStatus || item.status] || { label: item.operationalStatus || item.status || '—', color: 'var(--fx-gray-500)' };
  const getStatusBadge = (item: PreItem) => statusOf(item).color;
  const getStatusLabel = (item: PreItem) => statusOf(item).label;

  // A API devolve `date` (Date em UTC) e `time` ("HH:mm"); `preferredDate` era do
  // modelo antigo e vinha undefined → "Invalid Date". Formata no fuso de SP.
  const formatWhen = (item: PreItem) => {
    const raw = item.date || item.preferredDate;
    const d = raw ? new Date(raw) : null;
    const dia = d && !Number.isNaN(d.getTime())
      ? d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit' })
      : 'sem data';
    const hora = item.time || item.preferredTime;
    return hora ? `${dia} às ${hora}` : dia;
  };
  const especialidade = (item: PreItem) => {
    const sp = item.specialty || item.doctor?.specialty || '';
    return sp ? sp.charAt(0).toUpperCase() + sp.slice(1) : '';
  };
  const openPre = () => { setIsOpen(false); navigate('/admin?tab=Pré-Agendamentos'); };

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
        type="button"
        onClick={handleClick}
        aria-label="Notificações"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-[11px] border border-white/15 bg-white/[0.08] text-white transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <Bell size={18} />
        
        {/* Badge - só mostra se tem NOVOS */}
        {displayCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-8px',
            background: '#f43f5e',
            boxShadow: '0 0 0 2px #0d8a6c',
            color: 'white',
            borderRadius: '999px',
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
          background: 'var(--fx-white)',
          borderRadius: '12px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          zIndex: 9999,
          overflow: 'hidden',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #059669, var(--fx-emerald-700))',
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
            {gmbRecent && gmbRecentTotal > 0 && (
              <GmbAlertSection
                alert={gmbAlert}
                onOpenPanel={() => { setIsOpen(false); navigate('/admin?tab=SocialMedia&socialTab=gmb'); }}
              />
            )}
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
                  role="button"
                  tabIndex={0}
                  onClick={openPre}
                  onKeyDown={(e) => { if (e.key === 'Enter') openPre(); }}
                  title="Abrir Pré-Agendamentos"
                  style={{
                    cursor: 'pointer',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--fx-gray-100)',
                    background: isNew(p._id) ? 'var(--fx-red-50)' : 'var(--fx-white)',
                    borderLeft: isNew(p._id) ? '3px solid #ef4444' : '3px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ color: '#111' }}>
                      {p.patientInfo?.fullName || p.patient?.fullName || 'Paciente sem nome'}
                      {isNew(p._id) && <span style={{ color: '#ef4444', marginLeft: '8px', fontSize: '11px' }}>● NOVO</span>}
                    </strong>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: `color-mix(in srgb, ${getStatusBadge(p)} 13%, transparent)`,
                      color: getStatusBadge(p),
                    }}>
                      {getStatusLabel(p)}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {[especialidade(p), formatWhen(p), p.doctor?.fullName].filter(Boolean).join(' · ')}
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

// ─── Painel de detalhes GMB ──────────────────────────────────────────────────
import type { GmbHealth, GmbPostSample } from '../../hooks/useGmbAlert';

function fmtDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function PostList({ posts, label }: { posts: GmbPostSample[]; label: string }) {
  if (!posts.length) return null;
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--fx-amber-800)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
        {label}
      </div>
      {posts.map(p => (
        <div key={p._id} style={{
          background: 'rgba(0,0,0,0.06)',
          borderRadius: '6px',
          padding: '6px 8px',
          marginBottom: '4px',
          fontSize: '11px',
          color: 'var(--fx-amber-900)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.title || p.theme || '(sem título)'}
          </div>
          <div style={{ display: 'flex', gap: '8px', opacity: 0.8 }}>
            <span>📅 {fmtDate(p.lastErrorAt || p.createdAt)}</span>
            {p.retryCount != null && p.retryCount > 0 && <span>🔁 {p.retryCount}x</span>}
          </div>
          {p.error && (
            <div style={{ marginTop: '2px', color: 'var(--fx-amber-700)', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {p.error.slice(0, 80)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function GmbAlertSection({ alert, onOpenPanel }: { alert: GmbHealth; onOpenPanel: () => void }) {
  const [open, setOpen] = React.useState(false);
  const r = alert.recent!;
  const hasDetails =
    alert.details.noImageSample.length > 0 ||
    alert.details.retryingSample.length > 0 ||
    alert.details.failedSample.length > 0 ||
    alert.details.unconfirmedSample.length > 0;

  return (
    <div style={{
      borderBottom: '1px solid var(--fx-gray-100)',
      background: 'var(--fx-orange-50)',
      borderLeft: '3px solid #f97316',
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ padding: '12px 16px', cursor: hasDetails ? 'pointer' : 'default', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <div>
          <strong style={{ color: 'var(--fx-orange-800)', fontSize: '13px' }}>📍 Google Meu Negócio · últimos 7 dias</strong>
          <div style={{ fontSize: '12px', color: 'var(--fx-orange-800)', marginTop: '4px' }}>
            {r.failed > 0         && <div>❌ {r.failed} post(s) com falha</div>}
            {r.retrying > 0       && <div>🔄 {r.retrying} falhando repetidamente no Google</div>}
            {r.unconfirmed > 0    && <div>❓ {r.unconfirmed} sem confirmação do Make (pode já ter publicado)</div>}
            {r.stuckPublished > 0 && <div>⏳ {r.stuckPublished} marcados como publicados sem ID do Google</div>}
            {r.noImage > 0        && <div>🖼️ {r.noImage} agendados sem imagem (não vão sair)</div>}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenPanel(); }}
            style={{ marginTop: '6px', background: 'none', border: 'none', padding: 0, color: 'var(--fx-orange-800)', fontSize: '12px', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
          >
            Abrir painel do GMB
          </button>
        </div>
        {hasDetails && (
          <span style={{ fontSize: '11px', color: 'var(--fx-amber-700)', marginLeft: '8px', marginTop: '2px', flexShrink: 0 }}>
            {open ? '▲ fechar' : '▼ detalhes'}
          </span>
        )}
      </div>

      {open && hasDetails && (
        <div style={{ padding: '0 16px 12px', maxHeight: '240px', overflowY: 'auto' }}>
          <PostList posts={alert.details.failedSample}      label="Com falha (mais recentes)" />
          <PostList posts={alert.details.unconfirmedSample} label="Sem confirmação do Make (verificar no Google)" />
          <PostList posts={alert.details.retryingSample}    label="Falhando repetidamente" />
          <PostList posts={alert.details.noImageSample}     label="Sem imagem (amostras)" />
        </div>
      )}
    </div>
  );
}

export default NotificationBellFixed;
