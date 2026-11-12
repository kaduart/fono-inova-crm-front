import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGmbAlert } from '../../hooks/useGmbAlert';
import api from '../../services/api';
import { socketManager } from '../../utils/socketManager';
import { toast } from '../../utils/toast';

/**
 * 🔔 Sininho do header admin.
 *
 * Duas abas de pré-agendamentos:
 * - "Pelo site": a família marcou sozinha no /agendar (metadata.origin.channel =
 *   'link_agendamento'). SÓ esses acendem o número vermelho e geram aviso na hora,
 *   porque o comercial precisa confirmar no WhatsApp. Kadu, 12/11/2026.
 * - "Comercial": o que a própria equipe pré-agendou (agenda externa/secretaria).
 *   Fica para consulta, sem badge.
 * Mais o alerta do Google Meu Negócio (só últimos 7 dias).
 */

interface PreItem {
  _id: string;
  operationalStatus?: string;
  status?: string;
  date?: string;
  time?: string;
  preferredDate?: string;
  preferredTime?: string;
  specialty?: string;
  channel?: string | null;
  createdAt?: string;
  mainComplaint?: string;
  patientInfo?: { fullName?: string; phone?: string } | null;
  patient?: { fullName?: string } | null;
  doctor?: { fullName?: string; specialty?: string } | null;
}

interface PreNewSocket {
  patientName?: string;
  source?: string;
}

type Aba = 'site' | 'comercial';
const ONLINE = 'link_agendamento';
const STORAGE_KEY = 'notificationBell_seenIds_v3';
const GMB_SEEN_KEY = 'notificationBell_gmbSeenRecent_v2';

const loadSeen = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
};

const nomeDe = (p: PreItem) => p.patientInfo?.fullName || p.patient?.fullName || 'Paciente sem nome';

const especialidade = (p: PreItem) => {
  const sp = p.specialty || p.doctor?.specialty || '';
  return sp ? sp.charAt(0).toUpperCase() + sp.slice(1) : '';
};

// A API devolve `date` (UTC) e `time` ("HH:mm"); `preferredDate` era do modelo
// antigo e vinha vazio → "Invalid Date". Formata no fuso de SP.
const quando = (p: PreItem) => {
  const raw = p.date || p.preferredDate;
  const d = raw ? new Date(raw) : null;
  const dia = d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit' })
    : 'sem data';
  const hora = p.time || p.preferredTime;
  return hora ? `${dia} às ${hora}` : dia;
};

const haQuanto = (iso?: string) => {
  if (!iso) return '';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(min)) return '';
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  const dias = Math.round(h / 24);
  return `há ${dias} dia${dias > 1 ? 's' : ''}`;
};

export const NotificationBellFixed: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [aba, setAba] = useState<Aba>('site');
  const [site, setSite] = useState<PreItem[]>([]);
  const [comercial, setComercial] = useState<PreItem[]>([]);
  const [totais, setTotais] = useState({ site: 0, comercial: 0 });
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(loadSeen);

  // 📍 GMB: só últimos 7 dias; o acumulado fica no painel Social Media → GMB.
  const gmbAlert = useGmbAlert();
  const gmbRecent = gmbAlert.recent;
  const gmbRecentTotal = gmbRecent?.total ?? 0;
  const [gmbSeenTotal, setGmbSeenTotal] = useState<number>(() => {
    const v = localStorage.getItem(GMB_SEEN_KEY);
    return v !== null ? parseInt(v, 10) : -1;
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seenIds).slice(-500))); } catch { /* sem storage */ }
  }, [seenIds]);

  const fetchPreAgendamentos = useCallback(async () => {
    setLoading(true);
    try {
      const [rSite, rCom] = await Promise.all([
        api.get(`/v2/pre-appointments?limit=30&channel=${ONLINE}`),
        api.get('/v2/pre-appointments?limit=50&channel=comercial'),
      ]);
      const pend = (arr: PreItem[] | undefined) => (arr || []).filter(p => (p.operationalStatus || 'pre_agendado') === 'pre_agendado');
      // Filtra também no front: back antigo ignora ?channel e devolveria tudo.
      const s = pend(rSite.data?.data).filter(p => p.channel === ONLINE);
      const c = pend(rCom.data?.data).filter(p => p.channel !== ONLINE);
      setSite(s);
      setComercial(c);
      setTotais({
        site: s.length && rSite.data?.data?.length === s.length ? Number(rSite.data?.pagination?.total ?? s.length) : s.length,
        comercial: Number(rCom.data?.pagination?.total ?? c.length),
      });
      setIsReady(true);
    } catch (e) {
      console.warn('[sininho] erro ao buscar pré-agendamentos', e);
    }
    setLoading(false);
  }, []);

  const hasFetchedOnMount = useRef(false);
  useEffect(() => {
    if (!hasFetchedOnMount.current) {
      hasFetchedOnMount.current = true;
      fetchPreAgendamentos();
    }
    const interval = setInterval(fetchPreAgendamentos, 60000);
    return () => clearInterval(interval);
  }, [fetchPreAgendamentos]);

  // Tempo real. Antes usava window.socketManager, que só existe depois que o
  // socket conecta — no mount ainda não existia e o listener nunca era registrado.
  // Debounce de 800ms agrupa rajadas (fix de 18/09: 12+ GETs iguais em prod).
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = socketManager.on('preagendamento:new', (data: PreNewSocket) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { debounceTimer = null; fetchPreAgendamentos(); }, 800);
      if (data?.source === ONLINE) {
        toast.info(`🌐 ${data.patientName || 'Uma família'} agendou pelo site. Confirmar no WhatsApp.`, { duration: 15000 });
      }
    });
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [fetchPreAgendamentos]);

  const isNew = (id: string) => !seenIds.has(id);
  const novosSite = site.filter(p => isNew(p._id)).length;
  const gmbBadgeCount = gmbRecentTotal > 0 && gmbRecentTotal !== gmbSeenTotal ? gmbRecentTotal : 0;
  const displayCount = novosSite + gmbBadgeCount;

  const handleClick = () => {
    const abrindo = !isOpen;
    setIsOpen(abrindo);
    if (!abrindo) return;
    fetchPreAgendamentos();
    if (novosSite > 0) setAba('site');
    // Marca os do site como vistos ao abrir (o destaque "NOVO" some na próxima abertura).
    setSeenIds(prev => new Set([...prev, ...site.map(p => p._id)]));
    localStorage.setItem(GMB_SEEN_KEY, String(gmbRecentTotal));
    setGmbSeenTotal(gmbRecentTotal);
  };

  const abrirTriagem = () => { setIsOpen(false); navigate('/admin?tab=Pré-Agendamentos'); };

  if (!isReady) {
    return (
      <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>
        <Bell size={22} />
      </div>
    );
  }

  const lista = aba === 'site' ? site : comercial;

  const AbaBtn = ({ id, label, n }: { id: Aba; label: string; n: number }) => (
    <button
      type="button"
      onClick={() => setAba(id)}
      style={{
        flex: 1, padding: '8px 6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
        background: aba === id ? 'var(--fx-white)' : 'transparent',
        color: aba === id ? 'var(--fx-emerald-700)' : 'var(--fx-gray-500)',
        borderBottom: aba === id ? '2px solid var(--fx-emerald-700)' : '2px solid transparent',
      }}
    >
      {label} ({n})
    </button>
  );

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Notificações"
        title={novosSite > 0 ? `${novosSite} agendamento(s) novo(s) pelo site` : 'Notificações'}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-[11px] border border-white/15 bg-white/[0.08] text-white transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <Bell size={18} />
        {displayCount > 0 && (
          <span style={{
            position: 'absolute', top: '-6px', right: '-8px', background: '#f43f5e', boxShadow: '0 0 0 2px #0d8a6c',
            color: 'white', borderRadius: '999px', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold',
            minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulse 2s infinite',
          }}>
            {displayCount > 99 ? '99+' : displayCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', right: '8px', top: '60px', width: 'min(380px, calc(100vw - 16px))',
          background: 'var(--fx-white)', borderRadius: '12px', boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
          zIndex: 9999, overflow: 'hidden',
        }}>
          <div style={{ background: 'linear-gradient(135deg, #059669, var(--fx-emerald-700))', padding: '14px 16px', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 'bold' }}>📅 Pré-agendamentos</span>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                  <strong>{novosSite} novo{novosSite !== 1 ? 's' : ''} pelo site</strong> · {totais.site + totais.comercial} aguardando confirmação
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} aria-label="Fechar" style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '28px', height: '28px',
                borderRadius: '6px', cursor: 'pointer', fontSize: '16px',
              }}>×</button>
            </div>
          </div>

          <div style={{ display: 'flex', background: 'var(--fx-gray-50)', borderBottom: '1px solid var(--fx-gray-100)' }}>
            <AbaBtn id="site" label="🌐 Pelo site" n={totais.site} />
            <AbaBtn id="comercial" label="Comercial" n={totais.comercial} />
          </div>

          <div style={{ maxHeight: '380px', overflow: 'auto' }}>
            {gmbRecent && gmbRecentTotal > 0 && (
              <GmbAlertSection
                alert={gmbAlert}
                onOpenPanel={() => { setIsOpen(false); navigate('/admin?tab=SocialMedia&socialTab=gmb'); }}
              />
            )}
            {loading && lista.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--fx-gray-600)' }}>Carregando...</div>
            ) : lista.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--fx-gray-600)' }}>
                {aba === 'site' ? <Globe size={36} style={{ opacity: 0.3, marginBottom: '10px' }} /> : <Bell size={36} style={{ opacity: 0.3, marginBottom: '10px' }} />}
                <p>{aba === 'site' ? 'Ninguém agendou pelo site ainda' : 'Nenhum pré-agendamento do comercial'}</p>
              </div>
            ) : (
              lista.map(p => {
                const novo = aba === 'site' && isNew(p._id);
                return (
                  <div
                    key={p._id}
                    role="button"
                    tabIndex={0}
                    onClick={abrirTriagem}
                    onKeyDown={(e) => { if (e.key === 'Enter') abrirTriagem(); }}
                    title="Abrir Pré-Agendamentos para confirmar"
                    style={{
                      cursor: 'pointer', padding: '12px 16px', borderBottom: '1px solid var(--fx-gray-100)',
                      background: novo ? 'var(--fx-red-50)' : 'var(--fx-white)',
                      borderLeft: novo ? '3px solid #ef4444' : '3px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                      <strong style={{ color: 'var(--fx-gray-900)' }}>
                        {nomeDe(p)}
                        {novo && <span style={{ color: '#ef4444', marginLeft: '8px', fontSize: '11px' }}>● NOVO</span>}
                      </strong>
                      {aba === 'site' && p.createdAt && (
                        <span style={{ fontSize: '11px', color: 'var(--fx-gray-500)', whiteSpace: 'nowrap' }}>marcou {haQuanto(p.createdAt)}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--fx-gray-600)' }}>
                      {[especialidade(p), quando(p), p.doctor?.fullName].filter(Boolean).join(' · ')}
                    </div>
                    {aba === 'site' && p.mainComplaint && (
                      <div style={{ fontSize: '12px', color: 'var(--fx-gray-600)', marginTop: '3px', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Queixa: {p.mainComplaint}
                      </div>
                    )}
                  </div>
                );
              })
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
