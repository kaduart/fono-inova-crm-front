/**
 * 🎯 Marketing Dashboard - COMPLETO
 * Centraliza GMB, Instagram, Facebook, Vídeos e Spy de Concorrentes
 */

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import API from '../../services/api';
import { useMarketing, type FunnelStage, type AdSpy, type Post, type PublishTarget, type CampaignConfig } from '../../hooks/useMarketing';

import { VideoCard } from './VideoCard';
import { VideoEditModal } from './VideoEditModal';
import { PublishModal } from './PublishModal';
import { RoteiroPreviewModal, type RoteiroPreview } from './RoteiroPreviewModal';
import type { EditOptions, Video as VideoType } from '../../hooks/useMarketing';
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from "@mui/icons-material/Facebook";
import GoogleIcon from "@mui/icons-material/Google";
import { Facebook, Google, Instagram, Search, VideoCall } from '@mui/icons-material';
import { Video, TrendingUp } from 'lucide-react';

// Ícones
const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const PublishIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg className={`w-4 h-4 ${filled ? 'text-yellow-500 fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const ESPECIALIDADES = [
  { id: 'fonoaudiologia', nome: 'Fonoaudiologia', cor: 'purple' },
  { id: 'psicologia', nome: 'Psicologia', cor: 'pink' },
  { id: 'terapia_ocupacional', nome: 'Terapia Ocupacional', cor: 'amber' },
  { id: 'fisioterapia', nome: 'Fisioterapia', cor: 'emerald' },
  { id: 'psicomotricidade', nome: 'Psicomotricidade', cor: 'orange' },
  { id: 'freio_lingual', nome: 'Freio Lingual', cor: 'rose' },
  { id: 'neuropsicologia', nome: 'Avaliação Neuropsicológica', cor: 'violet' },
  { id: 'psicopedagogia', nome: 'Psicopedagogia', cor: 'cyan' },
  { id: 'musicoterapia', nome: 'Musicoterapia', cor: 'fuchsia' },
];

// 🎯 Temas de conteúdo para vídeos — Área → Subtemas em cascata
// Cada subtema tem gancho, tom e emoji sugeridos → auto-preenchidos ao selecionar
type Subtema = { id: string; label: string; gancho: 'dor' | 'alerta' | 'curiosidade' | 'erro_comum' | 'autoridade'; tom: 'emotional' | 'educativo' | 'inspiracional' | 'bastidores'; emoji: string };
const TEMAS_VIDEO: Record<string, { label: string; subtemas: Subtema[] }> = {
  fono_fala: {
    label: '🗣️ Fono / Fala',
    subtemas: [
      { id: 'atraso_fala',           label: 'Atraso de fala',                      gancho: 'dor',        tom: 'emotional',     emoji: '💔' },
      { id: 'apraxia_infantil',      label: 'Apraxia infantil',                    gancho: 'curiosidade', tom: 'educativo',     emoji: '🤔' },
      { id: 'dislalia',              label: 'Dislalia / Troca de sons',             gancho: 'erro_comum', tom: 'educativo',     emoji: '❌' },
      { id: 'disturbios_linguagem',  label: 'Distúrbios de linguagem',              gancho: 'alerta',     tom: 'emotional',     emoji: '🚨' },
      { id: 'estimulacao_fala',      label: 'Estimulação da fala em casa',          gancho: 'curiosidade', tom: 'educativo',    emoji: '💡' },
      { id: 'leitura_comunicacao',   label: 'Leitura e comunicação precoce',        gancho: 'autoridade', tom: 'educativo',     emoji: '📚' },
    ],
  },
  tea: {
    label: '🧩 Autismo / TEA',
    subtemas: [
      { id: 'autismo',               label: 'Autismo / TEA (geral)',                gancho: 'alerta',     tom: 'emotional',     emoji: '💔' },
      { id: 'comportamento',         label: 'Comportamento e birra',                gancho: 'dor',        tom: 'emotional',     emoji: '💔' },
      { id: 'interacao_social',      label: 'Interação social',                    gancho: 'autoridade', tom: 'inspiracional', emoji: '💚' },
      { id: 'comunicacao_nao_verbal',label: 'Comunicação não-verbal',               gancho: 'curiosidade', tom: 'educativo',    emoji: '🤔' },
      { id: 'rotinas_adaptacao',     label: 'Rotinas e adaptação',                  gancho: 'curiosidade', tom: 'educativo',    emoji: '🗓️' },
    ],
  },
  avaliacoes: {
    label: '🧠 Avaliações',
    subtemas: [
      { id: 'avaliacao_neuropsicologica', label: 'Avaliação neuropsicológica',      gancho: 'autoridade', tom: 'educativo',     emoji: '👩‍⚕️' },
      { id: 'teste_linguinha',            label: 'Teste da linguinha',              gancho: 'curiosidade', tom: 'educativo',    emoji: '👅' },
      { id: 'teste_cognitivo',            label: 'Teste de desenvolvimento cognitivo', gancho: 'autoridade', tom: 'educativo',  emoji: '🧠' },
      { id: 'triagem_fala',               label: 'Triagem de fala e linguagem',     gancho: 'alerta',     tom: 'emotional',     emoji: '🚨' },
    ],
  },
  terapias: {
    label: '🤲 Terapias',
    subtemas: [
      { id: 'musicoterapia',         label: 'Musicoterapia',                        gancho: 'curiosidade', tom: 'inspiracional', emoji: '🎵' },
      { id: 'coordenacao_motora',    label: 'Coordenação motora fina e grossa',     gancho: 'curiosidade', tom: 'educativo',    emoji: '🤹' },
      { id: 'terapia_ocupacional',   label: 'Terapia ocupacional infantil',         gancho: 'autoridade', tom: 'educativo',     emoji: '🤲' },
      { id: 'psicomotricidade',      label: 'Psicomotricidade',                     gancho: 'curiosidade', tom: 'educativo',    emoji: '🤸' },
      { id: 'fisioterapia_infantil', label: 'Fisioterapia infantil',                gancho: 'autoridade', tom: 'educativo',     emoji: '💪' },
      { id: 'estimulacao_sensorial', label: 'Estimulação sensorial',                gancho: 'curiosidade', tom: 'educativo',    emoji: '✨' },
    ],
  },
  dicas_pais: {
    label: '👨‍👩‍👧 Dicas para Pais',
    subtemas: [
      { id: 'estimular_fala_casa',    label: 'Como estimular a fala em casa',       gancho: 'curiosidade', tom: 'educativo',    emoji: '💡' },
      { id: 'brincadeiras_linguagem', label: 'Brincadeiras que desenvolvem linguagem', gancho: 'curiosidade', tom: 'educativo', emoji: '🎮' },
      { id: 'alimentacao_fala',       label: 'Alimentação e fala',                  gancho: 'erro_comum', tom: 'educativo',     emoji: '❌' },
      { id: 'lidar_birras',           label: 'Como lidar com birras',               gancho: 'dor',        tom: 'educativo',     emoji: '😤' },
      { id: 'rotina_aprendizado',     label: 'Estratégias para rotina e aprendizado', gancho: 'autoridade', tom: 'educativo',   emoji: '📋' },
    ],
  },
  publico: {
    label: '👶 Público / Situação',
    subtemas: [
      { id: 'primeira_avaliacao',       label: 'Primeira avaliação',               gancho: 'alerta',     tom: 'emotional',     emoji: '🚨' },
      { id: 'pos_diagnostico',          label: 'Pós-diagnóstico',                  gancho: 'autoridade', tom: 'inspiracional', emoji: '💚' },
      { id: 'acompanhamento_progresso', label: 'Acompanhamento de progresso',      gancho: 'autoridade', tom: 'inspiracional', emoji: '✨' },
      { id: 'criancas_2_3',             label: 'Crianças 2-3 anos',               gancho: 'dor',        tom: 'emotional',     emoji: '💔' },
      { id: 'criancas_4_5',             label: 'Crianças 4-5 anos',               gancho: 'curiosidade', tom: 'educativo',    emoji: '🤔' },
    ],
  },
  cta_extras: {
    label: '📣 CTA / Extras',
    subtemas: [
      { id: 'mensagem_educativa',   label: 'Mensagem educativa com emoji',          gancho: 'curiosidade', tom: 'educativo',    emoji: '💡' },
      { id: 'convite_consulta',     label: 'Convite para avaliação ou consulta',    gancho: 'autoridade', tom: 'inspiracional', emoji: '💚' },
      { id: 'conteudo_interativo',  label: 'Conteúdo divertido / interativo',       gancho: 'curiosidade', tom: 'inspiracional', emoji: '🎯' },
    ],
  },
};

// Mapeamento: qual especialidade exibe quais áreas de tema
const ESPECIALIDADE_AREAS: Record<string, string[]> = {
  fonoaudiologia:      ['fono_fala', 'tea', 'avaliacoes', 'dicas_pais', 'publico', 'cta_extras'],
  psicologia:          ['tea', 'dicas_pais', 'publico', 'cta_extras'],              // comportamento, emoções, dicas família
  terapia_ocupacional: ['terapias', 'tea', 'dicas_pais', 'publico', 'cta_extras'],
  fisioterapia:        ['terapias', 'publico', 'cta_extras'],                        // foco em motricidade/reabilitação
  psicomotricidade:    ['terapias', 'dicas_pais', 'publico', 'cta_extras'],
  freio_lingual:       ['fono_fala', 'avaliacoes', 'cta_extras'],                    // foco em avaliação e fala
  neuropsicologia:     ['avaliacoes', 'tea', 'publico', 'cta_extras'],               // foco em avaliação e TEA
  psicopedagogia:      ['dicas_pais', 'publico', 'cta_extras'],                      // foco em aprendizagem e família
  musicoterapia:       ['terapias', 'tea', 'cta_extras'],
};

// 🕐 Horários estratégicos para publicação no GMB
const HORARIOS_ESTRATEGICOS = [
  { value: '08:00', label: '🌅 08:00 - Início do dia' },
  { value: '12:30', label: '🌞 12:30 - Almoço' },
  { value: '15:00', label: '☕ 15:00 - Tarde' },
  { value: '19:00', label: '🌆 19:00 - Final do dia' },
  { value: '21:00', label: '🌙 21:00 - Noite' },
];

// Gerar datas dos próximos 7 dias
const getProximosDias = () => {
  const dias = [];
  const hoje = new Date();
  for (let i = 0; i < 7; i++) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);
    const value = data.toISOString().split('T')[0];
    const label = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
    dias.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return dias;
};

import MetaAdsTab from './MetaAdsTab';
import LandingPagesTab from './LandingPagesTab';
import LandingPageSuggestion from './LandingPageSuggestion';
import { FileText } from 'lucide-react';

const TAB_CONFIG = {
  gmb: {
    label: 'Google Meu Negócio',
    icon: Google,
    color: 'blue',
    shortLabel: 'GMB'
  },
  instagram: {
    label: 'Instagram',
    icon: Instagram,
    color: 'pink',
    shortLabel: 'IG'
  },
  facebook: {
    label: 'Facebook',
    icon: Facebook,
    color: 'indigo',
    shortLabel: 'FB'
  },
  landingpages: {
    label: 'Landing Pages',
    icon: FileText,
    color: 'cyan',
    shortLabel: 'LPs'
  },
  metaads: {
    label: 'Tráfego Pago',
    icon: TrendingUp,
    color: 'emerald',
    shortLabel: 'Ads'
  },
  videos: {
    label: 'Vídeos com IA',
    icon: Video,
    color: 'red',
    shortLabel: 'Vídeos'
  },
  spy: {
    label: 'Spy de Concorrentes',
    icon: Search,
    color: 'purple',
    shortLabel: 'Spy'
  }
};

export default function MarketingDashboard() {
  const [activeTab, setActiveTab] = useState<'gmb' | 'instagram' | 'facebook' | 'landingpages' | 'metaads' | 'videos' | 'spy'>('gmb');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [funnelFilter, setFunnelFilter] = useState<'all' | 'top' | 'middle' | 'bottom'>('all');
  const [selectedEspecialidade, setSelectedEspecialidade] = useState('');
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<FunnelStage>('top');
  const [selectedProvider, setSelectedProvider] = useState<'auto' | 'google' | 'veo' | 'fal' | 'freepik' | 'together' | 'replicate' | 'pollinations'>('auto');
  const [selectedTone, setSelectedTone] = useState<'emotional' | 'educativo' | 'inspiracional' | 'bastidores'>('emotional');
  const [customTheme, setCustomTheme] = useState('');

  // PublishModal (Instagram / Facebook)
  const [publishModal, setPublishModal] = useState<{ post: Post; channel: 'instagram' | 'facebook' } | null>(null);

  // A/B Variações
  const [variationsModal, setVariationsModal] = useState<{ open: boolean; variations: any[] } | null>(null);
  const [loadingVariations, setLoadingVariations] = useState(false);

  // Score de qualidade
  const [scoringPostId, setScoringPostId] = useState<string | null>(null);
  const [scoreModal, setScoreModal] = useState<{ open: boolean; score: any; postContent: string } | null>(null);

  // Planejar semana
  const [weeklyPlanLoading, setWeeklyPlanLoading] = useState(false);
  const [weeklyPlanResult, setWeeklyPlanResult] = useState<any[] | null>(null);

  // 🧠 Cálculo da fila automática (sincronizado entre card e botão)
  const automaticConfig = useMemo(() => {
    const now = new Date();
    const dayIndex = now.getDay();
    const hour = now.getHours();

    // Roda entre as 7 especialidades ao longo do dia/semana
    const espIndex = (dayIndex + Math.floor(hour / 4)) % ESPECIALIDADES.length;
    const esp = ESPECIALIDADES[espIndex];

    // Funil por horário
    let funnel: FunnelStage = 'top';
    if (hour >= 12 && hour < 17) funnel = 'middle';
    else if (hour >= 17) funnel = 'bottom';

    return { especialidade: esp.id, funnel, especialidadeNome: esp.nome };
  }, []); // Calcula uma vez ao montar o componente

  // 🕐 Controle de agendamento GMB
  const [schedulePost, setSchedulePost] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // 🎨 Layout selector (Instagram only)
  const [layoutsDisponiveis, setLayoutsDisponiveis] = useState<any[]>([]);
  const [layoutSelecionado, setLayoutSelecionado] = useState<string | null>(null);
  const [carregandoLayouts, setCarregandoLayouts] = useState(false);

  const [videoEditModal, setVideoEditModal] = useState<{ open: boolean; video: VideoType | null }>({ open: false, video: null });
  const [applyingEdit, setApplyingEdit] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishingPost, setPublishingPost] = useState<string | null>(null);
  const [republishingPost, setRepublishingPost] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{ open: boolean; post: any } | null>(null);
  const [previewModal, setPreviewModal] = useState<{ open: boolean; post: any } | null>(null);
  const [previewContent, setPreviewContent] = useState<{ type: 'caption' | 'hooks' | null; data: any } | null>(null);
  const [selectedMode, setSelectedMode] = useState<'full' | 'caption' | 'hooks'>('full');

  // Default de modo por aba: todos começam como 'full' (post completo com imagem)
  useEffect(() => {
    setSelectedMode('full');
  }, [activeTab]);

  // Carregar layouts profissionais ao entrar na aba Instagram
  useEffect(() => {
    if (activeTab === 'instagram' && (!layoutsDisponiveis || layoutsDisponiveis.length === 0)) {
      setCarregandoLayouts(true);
      API.get('/instagram/layouts')
        .then(res => {
          if (res.data.success && Array.isArray(res.data.layouts)) {
            setLayoutsDisponiveis(res.data.layouts);
          } else {
            setLayoutsDisponiveis([]);
          }
        })
        .catch(err => {
          console.error('Erro ao carregar layouts:', err);
          setLayoutsDisponiveis([]);
        })
        .finally(() => setCarregandoLayouts(false));
    }
  }, [activeTab]);
  const [generatingImagePostId, setGeneratingImagePostId] = useState<string | null>(null);
  // 🆕 Estado para armazenar imagens recém-geradas (mostra imediatamente sem esperar refresh)
  const [pendingImages, setPendingImages] = useState<Record<string, string>>({});
  const [videoDuration, setVideoDuration] = useState<30 | 45 | 60>(30);
  const [videoRoteiro, setVideoRoteiro] = useState('');
  const [videoMode, setVideoMode] = useState<'avatar' | 'ilustrativo' | 'veo' | 'runway' | 'economico' | 'teste'>('teste');
  const [roteiroPreview, setRoteiroPreview] = useState<RoteiroPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  // 🧠 Campos de inteligência de conteúdo
  const [videoPlatform, setVideoPlatform] = useState<'instagram' | 'meta_ads'>('instagram');
  const [videoArea, setVideoArea] = useState('');
  const [videoSubTema, setVideoSubTema] = useState('');
  const [videoHookStyle, setVideoHookStyle] = useState<'dor' | 'alerta' | 'curiosidade' | 'erro_comum' | 'autoridade'>('alerta');
  const [videoObjetivo, setVideoObjetivo] = useState<'salvar' | 'compartilhar' | 'comentar' | 'agendar'>('salvar');
  const [videoBordao, setVideoBordao] = useState('');
  // 🎬 Preset Premium - configurações otimizadas
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  
  // Configurações de cada preset
  const VIDEO_PRESETS = {
    // 🎯 PRESETS PARA META ADS (Tráfego Pago)
    meta_autoridade: {
      nome: '👨‍⚕️ Meta Ads - Autoridade',
      desc: 'Tom profissional, converte em leads WhatsApp',
      hookStyle: 'autoridade' as const,
      tone: 'educativo' as const,
      objetivo: 'agendar' as const,
      intensidade: 'moderado',
      config: { voz: 'alloy', velocidade: 1.0, volumeMusica: 0.04 }  // Profissional, música sutil
    },
    meta_urgencia: {
      nome: '🚨 Meta Ads - Urgência',
      desc: 'Alerta médico, conversão rápida',
      hookStyle: 'alerta' as const,
      tone: 'emotional' as const,
      objetivo: 'agendar' as const,
      intensidade: 'forte',
      config: { voz: 'alloy', velocidade: 1.02, volumeMusica: 0.05 }  // Firme mas empático
    },
    
    // 🎯 PRESETS PARA ORGÂNICO (Instagram/TikTok)
    explosao_viral: {
      nome: '🔥 Explosão Viral',
      desc: 'Máximo engajamento nos primeiros 3s',
      hookStyle: 'curiosidade' as const,
      tone: 'emotional' as const,
      objetivo: 'compartilhar' as const,
      intensidade: 'viral',
      config: { voz: 'shimmer', velocidade: 1.05, volumeMusica: 0.06 }  // ← Abaixado de 0.12
    },
    autoridade_inspiradora: {
      nome: '👑 Autoridade Inspiradora',
      desc: 'Construir credibilidade e confiança',
      hookStyle: 'autoridade' as const,
      tone: 'inspiracional' as const,
      objetivo: 'agendar' as const,
      intensidade: 'viral',
      config: { voz: 'alloy', velocidade: 1.05, volumeMusica: 0.05 }  // ← Abaixado de 0.12
    },
    empatia_emocional: {
      nome: '💝 Empatia Emocional',
      desc: 'Conexão genuína com pais',
      hookStyle: 'dor' as const,
      tone: 'emotional' as const,
      objetivo: 'comentar' as const,
      intensidade: 'forte',
      config: { voz: 'shimmer', velocidade: 1.0, volumeMusica: 0.05 }  // ← Abaixado de 0.10
    },
    alerta_urgencia: {
      nome: '⚡ Alerta & Urgência',
      desc: 'Chamar atenção imediata',
      hookStyle: 'alerta' as const,
      tone: 'inspiracional' as const,
      objetivo: 'agendar' as const,
      intensidade: 'forte',
      config: { voz: 'alloy', velocidade: 1.02, volumeMusica: 0.05 }  // ← Abaixado de 0.10
    },
    erro_correcao: {
      nome: '📚 Erro + Correção',
      desc: 'Educativo que gera salvamentos',
      hookStyle: 'erro_comum' as const,
      tone: 'educativo' as const,
      objetivo: 'salvar' as const,
      intensidade: 'moderado',
      config: { voz: 'nova', velocidade: 1.0, volumeMusica: 0.04 }  // ← Abaixado de 0.08
    }
  };

  // Auto-preenche gancho, tom e bordão ao selecionar subtema
  useEffect(() => {
    if (!videoArea || !videoSubTema) return;
    const sub = TEMAS_VIDEO[videoArea]?.subtemas.find(s => s.id === videoSubTema);
    if (sub) {
      setVideoHookStyle(sub.gancho);
      setSelectedTone(sub.tom);
      // Bordão automático para temas educativos
      setVideoBordao(sub.tom === 'educativo' ? 'Você sabia' : '');
    }
  }, [videoSubTema]);

  // Spy states
  const [spyKeyword, setSpyKeyword] = useState('');
  const [spyEspecialidade, setSpyEspecialidade] = useState('');
  const [spyTab, setSpyTab] = useState<'results' | 'saved'>('results');
  const [analyzingAd, setAnalyzingAd] = useState<string | null>(null);
  const [selectedAdForAnalysis, setSelectedAdForAnalysis] = useState<AdSpy | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [adaptingAd, setAdaptingAd] = useState(false);
  const [adaptedPost, setAdaptedPost] = useState<string | null>(null);
  const [showAdaptModal, setShowAdaptModal] = useState(false);
  const [adaptConfig, setAdaptConfig] = useState({
    especialidade: 'fonoaudiologia',
    funil: 'top' as FunnelStage,
    tipo: 'instagram' as 'instagram' | 'facebook' | 'gmb' | 'video'
  });

  const { gmb, instagram, facebook, videos, spy, refresh, loading } = useMarketing();

  const currentData = activeTab === 'gmb' ? gmb
    : activeTab === 'instagram' ? instagram
      : activeTab === 'facebook' ? facebook
        : activeTab === 'metaads' ? null  // MetaAds usa seu próprio hook
        : activeTab === 'landingpages' ? null  // LandingPages usa seu próprio hook
        : null;

  const posts = currentData?.posts || [];
  const videosList = videos?.videos || [];
  const spyAds = spy?.ads || [];
  const spySaved = spy?.saved || [];
  const stats = currentData?.stats;

  const filteredPosts = posts.filter((post: any) => {
    const statusMatch = statusFilter === 'all' || post.status === statusFilter;
    const funnelMatch = funnelFilter === 'all' || post.funnelStage === funnelFilter;
    return statusMatch && funnelMatch;
  });

  // Carregar anúncios salvos ao abrir aba spy
  useEffect(() => {
    if (activeTab === 'spy' && spyTab === 'saved') {
      spy.listSaved();
    }
  }, [activeTab, spyTab]);

  const handleGenerate = async (mode: 'caption' | 'hooks' | 'full' = 'full') => {
    setGenerating(true);
    try {
      const endpoint = activeTab === 'gmb' ? '/gmb' : activeTab === 'instagram' ? '/instagram' : '/facebook';

      // 🧠 Determina especialidade e funil (manual ou automático)
      const espId = selectedEspecialidade || automaticConfig.especialidade;
      const funnel = selectedEspecialidade ? selectedFunnelStage : automaticConfig.funnel;

      // 🚀 CRIA O POST com o modo selecionado — modo flui até o worker/IA
      if (activeTab === 'gmb') {
        let scheduledAt: string | undefined;
        if (schedulePost && scheduleDate && scheduleTime) {
          scheduledAt = `${scheduleDate}T${scheduleTime}:00`;
        }

        if (mode === 'full') {
          // 🔵 POST COMPLETO: chama API diretamente para capturar postId e fazer polling
          const res = await API.post('/gmb/admin/trigger-generation', {
            especialidadeId: espId,
            customTheme,
            generateImage: true,
            scheduledAt,
            funnelStage: funnel,
            provider: selectedProvider,
            tone: selectedTone
          });
          const postId = res.data.postId;
          toast.info(scheduledAt ? '📅 Post GMB agendado! Aguarde o briefing...' : '✨ Post sendo gerado... o briefing abrirá automaticamente!');

          if (postId) {
            const pollInterval = setInterval(async () => {
              try {
                const postRes = await API.get(`/gmb/posts/${postId}`);
                const post = postRes.data.data;
                if (post.processingStatus === 'completed') {
                  clearInterval(pollInterval);
                  setPreviewModal({ open: true, post });
                  refresh();
                } else if (post.processingStatus === 'failed') {
                  clearInterval(pollInterval);
                  toast.error('Falha ao gerar post');
                  refresh();
                }
              } catch {
                clearInterval(pollInterval);
              }
            }, 3000);
            setTimeout(() => clearInterval(pollInterval), 180000);
          }
        } else {
          gmb.generate(espId, customTheme, scheduledAt, funnel, selectedProvider, false);
          toast.success('📝 Legenda SEO gerada + post salvo (sem imagem)!');
        }

        setSchedulePost(false);
        setScheduleDate('');
        setScheduleTime('');

      } else if (activeTab === 'instagram') {
        let scheduledAt: string | undefined;
        if (schedulePost && scheduleDate && scheduleTime) {
          scheduledAt = `${scheduleDate}T${scheduleTime}:00`;
        }

        if (layoutSelecionado && mode === 'full') {
          // 🎨 Layout profissional selecionado: usa o novo endpoint
          await API.post('/instagram/generate-with-layout', {
            especialidadeId: espId,
            funnelStage: funnel,
            customTheme: customTheme || undefined,
            layoutId: layoutSelecionado,
            tone: selectedTone,
            scheduledAt
          });
          const layoutNome = layoutsDisponiveis.find(l => l.id === layoutSelecionado)?.nome || layoutSelecionado;
          toast.success(`🎨 Post profissional em geração! (${layoutNome})`);
        } else {
          // 📸 Instagram: passa o modo, tom e agendamento
          await API.post('/instagram/generate', {
            especialidadeId: espId,
            customTheme: customTheme || undefined,
            funnelStage: funnel,
            provider: selectedProvider,
            mode,
            tone: selectedTone,
            scheduledAt
          });
          const modeLabel = mode === 'hooks'
            ? '🎣 Gerando post com ganchos virais para Reels!'
            : mode === 'caption'
              ? '📝 Gerando post com legenda SEO otimizada!'
              : scheduledAt ? `📅 Post Instagram agendado!` : `📸 Post Instagram em processamento!`;
          toast.success(modeLabel);
        }

        setSchedulePost(false);
        setScheduleDate('');
        setScheduleTime('');

      } else if (activeTab === 'facebook') {
        let scheduledAt: string | undefined;
        if (schedulePost && scheduleDate && scheduleTime) {
          scheduledAt = `${scheduleDate}T${scheduleTime}:00`;
        }

        // 📘 Facebook: passa modo, tom e agendamento
        await API.post('/facebook/generate', {
          especialidadeId: espId,
          customTheme: customTheme || undefined,
          funnelStage: funnel,
          provider: selectedProvider,
          mode,
          tone: selectedTone,
          scheduledAt
        });
        const modeLabel = mode === 'hooks'
          ? '🎣 Gerando post com ganchos virais!'
          : mode === 'caption'
            ? '📝 Gerando post com legenda SEO otimizada!'
            : scheduledAt ? '📅 Post Facebook agendado!' : `📘 Post Facebook em processamento!`;
        toast.success(modeLabel);

        setSchedulePost(false);
        setScheduleDate('');
        setScheduleTime('');
      }

      setCustomTheme('');
      setTimeout(() => refresh(), 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao gerar');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async (postId: string) => {
    setPublishingPost(postId);
    try {
      if (activeTab === 'gmb') await gmb.publish(postId);
      else if (activeTab === 'instagram') await instagram.publish(postId);
      else if (activeTab === 'facebook') await facebook.publish(postId);
      toast.success('Publicado!');
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao publicar');
    } finally {
      setPublishingPost(null);
    }
  };

  const handleRepublish = async (postId: string) => {
    if (!confirm('Deseja republicar este post?')) return;
    setRepublishingPost(postId);
    try {
      await API.post(`/gmb/posts/${postId}/republish`);
      toast.success('Post reenviado para republicação!');
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao republicar');
    } finally {
      setRepublishingPost(null);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    setDeletingPost(postId);
    try {
      if (activeTab === 'gmb') await gmb.delete(postId);
      else if (activeTab === 'instagram') await instagram.delete(postId);
      else if (activeTab === 'facebook') await facebook.delete(postId);
      toast.warning('Excluído!');
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao excluir');
    } finally {
      setDeletingPost(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editModal?.post) return;
    try {
      const data = {
        content: editModal.post.content,
        mediaUrl: editModal.post.mediaUrl,
        funnelStage: editModal.post.funnelStage
      };
      if (activeTab === 'gmb') await gmb.update(editModal.post._id, data);
      else if (activeTab === 'instagram') await instagram.update(editModal.post._id, data);
      else if (activeTab === 'facebook') await facebook.update(editModal.post._id, data);
      toast.success('Salvo!');
      setEditModal(null);
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handleGenerateNewImage = async (postId?: string) => {
    const targetPostId = postId || editModal?.post?._id;
    if (!targetPostId) return;

    const especialidadeId = editModal?.post?.theme || 'fonoaudiologia';
    setGeneratingImagePostId(targetPostId);

    try {
      // Determina qual endpoint usar baseado na aba ativa
      let endpoint = '/gmb/preview/image';
      if (activeTab === 'instagram') endpoint = `/instagram/posts/${targetPostId}/image`;
      else if (activeTab === 'facebook') endpoint = `/facebook/posts/${targetPostId}/image`;

      const response = await API.post(endpoint, {
        content: editModal?.post?.content || '',
        especialidadeId
      });
      let newImageUrl = response.data.data?.imageUrl;
      if (newImageUrl) {
        // 🆕 ATUALIZA IMEDIATAMENTE: Adiciona timestamp para forçar refresh do navegador
        newImageUrl = newImageUrl + '?t=' + Date.now();

        // Guarda no estado local para mostrar na lista sem esperar refresh
        setPendingImages(prev => ({ ...prev, [targetPostId]: newImageUrl }));

        // Se estiver no modal, atualiza o post do modal
        if (editModal?.post && editModal.post._id === targetPostId) {
          setEditModal({ ...editModal, post: { ...editModal.post, mediaUrl: newImageUrl } });
        }
        toast.success('Imagem gerada com sucesso!');
        refresh(); // Atualiza a lista em background
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao gerar imagem');
    } finally {
      setGeneratingImagePostId(null);
    }
  };

  // Passo 1: gera o roteiro via ZEUS e abre o modal de preview
  const handleGenerateVideo = async () => {
    if (!selectedEspecialidade) {
      toast.error('Selecione uma especialidade');
      return;
    }
    setLoadingPreview(true);
    try {
      const roteiro = await videos.previewRoteiro({
        especialidadeId: selectedEspecialidade,
        tema: videoRoteiro || undefined,
        duration: videoDuration,
        tone: selectedTone,
        platform: videoPlatform,
        subTema: videoSubTema || undefined,
        hookStyle: videoHookStyle,
        objetivo: videoObjetivo,
        intensidade: 'viral',
        bordao: videoBordao || undefined
      });
      setRoteiroPreview(roteiro);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao gerar roteiro');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Passo 2: usuário confirmou (com ou sem edição) → dispara o pipeline de vídeo
  const handleConfirmRoteiro = async (roteiroEditado: RoteiroPreview) => {
    if ((videoMode === 'veo' || videoMode === 'runway') && !window.confirm('⚠️ Gerar este vídeo custa ~R$56–70 (Veo 2).\n\nConfirmar geração?')) {
      return;
    }
    setRoteiroPreview(null);
    setGeneratingVideo(true);
    try {
      await videos.generate({
        especialidadeId: selectedEspecialidade,
        roteiro: videoRoteiro,
        duration: videoDuration,
        modo: videoMode,
        tone: selectedTone,
        platform: videoPlatform,
        subTema: videoSubTema || undefined,
        hookStyle: videoHookStyle,
        objetivo: videoObjetivo,
        intensidade: selectedPreset ? VIDEO_PRESETS[selectedPreset as keyof typeof VIDEO_PRESETS]?.intensidade || 'viral' : 'viral',
        preset: selectedPreset || undefined,  // 🎬 Envia o preset para o backend
        roteiroEditado
      });
      const modoLabel = videoMode === 'runway' ? 'Runway Gen-3 (2-4 min)' : videoMode === 'veo' ? 'Veo 2.0 (3-5 min)' : videoMode === 'economico' ? 'Economico (1-2 min)' : videoMode === 'avatar' ? 'com avatar' : 'ilustrativo';
      const toneEmoji = selectedTone === 'educativo' ? '📚' : selectedTone === 'emotional' ? '💔' : selectedTone === 'inspiracional' ? '✨' : '🏥';
      toast.info(`${toneEmoji} Video ${modoLabel} em processamento!`);
      setVideoRoteiro('');
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao gerar video');
    } finally {
      setGeneratingVideo(false);
    }
  };

  // Spy handlers
  const handleSpySearch = async () => {
    await spy.search(spyKeyword, spyEspecialidade || undefined);
  };

  const handleSaveAd = async (ad: AdSpy) => {
    try {
      await spy.save(ad);
      toast.success('Anúncio salvo como referência!');
    } catch (err) {
      toast.error('Erro ao salvar anúncio');
    }
  };

  const handleAnalyzeAd = async (ad: AdSpy) => {
    setAnalyzingAd(ad.adId);
    setSelectedAdForAnalysis(ad);
    try {
      const result = await spy.analyze(ad.adText, ad.pageName);
      setAnalysisResult(result);
    } catch (err) {
      toast.error('Erro ao analisar anúncio');
    } finally {
      setAnalyzingAd(null);
    }
  };

  const handleAdaptAd = async () => {
    if (!selectedAdForAnalysis) return;
    setAdaptingAd(true);
    try {
      const adapted = await spy.adapt(
        selectedAdForAnalysis.adText,
        adaptConfig.especialidade,
        adaptConfig.funil,
        analysisResult
      );
      setAdaptedPost(adapted);
      setShowAdaptModal(true);
    } catch (err) {
      toast.error('Erro ao adaptar anúncio');
    } finally {
      setAdaptingAd(false);
    }
  };

  const handleSaveAdapted = async () => {
    // Aqui você pode salvar o post adaptado no banco
    toast.info('Post adaptado salvo!');
    setShowAdaptModal(false);
    setAdaptedPost(null);
    setAnalysisResult(null);
    setSelectedAdForAnalysis(null);
  };

  const handleGenerateVariations = async () => {
    const espId = selectedEspecialidade || automaticConfig.especialidade;
    const funnel = selectedEspecialidade ? selectedFunnelStage : automaticConfig.funnel;
    const endpoint = activeTab === 'gmb' ? '/gmb' : activeTab === 'instagram' ? '/instagram' : '/facebook';
    setLoadingVariations(true);
    try {
      const res = await API.post(`${endpoint}/generate-variations`, {
        especialidadeId: espId,
        funnelStage: funnel,
        tone: selectedTone,
        customTheme: customTheme || undefined
      });
      if (res.data.success) {
        setVariationsModal({ open: true, variations: res.data.variations || [] });
      }
    } catch (err: any) {
      toast.error('Erro ao gerar variações');
    } finally {
      setLoadingVariations(false);
    }
  };

  const handleScorePost = async (post: any) => {
    setScoringPostId(post._id);
    try {
      const endpoint = activeTab === 'gmb' ? '/gmb' : activeTab === 'instagram' ? '/instagram' : '/facebook';
      const res = await API.post(`${endpoint}/score`, {
        content: post.content,
        funnelStage: post.funnelStage || 'top'
      });
      if (res.data.success) {
        setScoreModal({ open: true, score: res.data.score, postContent: post.content });
      }
    } catch (err: any) {
      toast.error('Erro ao avaliar post');
    } finally {
      setScoringPostId(null);
    }
  };

  const handleWeeklyPlan = async () => {
    if (!confirm('Gerar posts para toda a semana? Isso criará posts automáticos para todas as especialidades.')) return;
    setWeeklyPlanLoading(true);
    setWeeklyPlanResult(null);
    try {
      const res = await API.post('/gmb/admin/trigger-weekly');
      if (res.data.success) {
        setWeeklyPlanResult(res.data.data || res.data.results || []);
        toast.success(`Semana planejada! ${res.data.results?.filter((r: any) => r.success).length} posts criados.`);
        setTimeout(() => refresh(), 2000);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao planejar semana');
    } finally {
      setWeeklyPlanLoading(false);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, { color: string; bg: string; label: string; animate?: boolean }> = {
      draft: { color: 'gray', bg: 'bg-gray-100', label: 'Rascunho' },
      approved: { color: 'emerald', bg: 'bg-emerald-100', label: 'Aprovado' },
      scheduled: { color: 'blue', bg: 'bg-blue-100', label: 'Agendado' },
      published: { color: 'green', bg: 'bg-green-100', label: 'Publicado' },
      failed: { color: 'red', bg: 'bg-red-100', label: 'Falhou' },
      processing: { color: 'yellow', bg: 'bg-yellow-100', label: 'Processando...', animate: true }
    };
    const cfg = config[status] || config.draft;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} text-${cfg.color}-800 flex items-center gap-1`}>
        {cfg.animate && (
          <span className="inline-block w-1.5 h-1.5 bg-yellow-600 rounded-full animate-pulse" />
        )}
        {cfg.label}
      </span>
    );
  };

  const FunnelBadge = ({ stage }: { stage: string }) => {
    const config: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
      top: { emoji: '🔴', label: 'Topo', color: 'red', bg: 'bg-red-50' },
      middle: { emoji: '🟡', label: 'Meio', color: 'yellow', bg: 'bg-yellow-50' },
      bottom: { emoji: '🟢', label: 'Fundo', color: 'green', bg: 'bg-green-50' }
    };
    const cfg = config[stage] || config.top;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${cfg.bg} text-${cfg.color}-700 border-${cfg.color}-200`}>
        {cfg.emoji} {cfg.label}
      </span>
    );
  };

  const AutoBadge = ({ post }: { post: any }) => {
    const isAuto = post.publishedBy === 'cron' || post.tags?.includes('auto');
    if (!isAuto) return null;
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
        <span>🤖</span>
        <span>Auto</span>
      </span>
    );
  };

  // Cards de estatísticas
  const StatsCards = () => {
    if (!stats) return null;

    const cards = [
      { label: 'Total Posts', value: stats.total, color: 'gray', icon: '📝' },
      { label: 'Publicados', value: stats.byStatus?.published || 0, color: 'green', icon: '✅' },
      { label: 'Rascunhos', value: stats.byStatus?.draft || 0, color: 'yellow', icon: '📝' },
      { label: 'Este Mês', value: stats.publishedThisMonth || 0, color: 'blue', icon: '📅' },
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
              <span className="text-2xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const copiarImagem = async (url: string) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('load'));
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('blob'))), 'image/png')
      );
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast.info('Imagem copiada!');
    } catch {
      toast.error('Erro ao copiar imagem');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* PublishModal — Instagram / Facebook */}
      {publishModal && (
        <PublishModal
          post={publishModal.post}
          channel={publishModal.channel}
          onApprove={async () => {
            if (publishModal.channel === 'instagram') await instagram.approve(publishModal.post._id);
            else await facebook.approve(publishModal.post._id);
            setPublishModal(prev => prev ? { ...prev, post: { ...prev.post, status: 'approved' } } : null);
          }}
          onPublish={async (target: PublishTarget, campaign?: CampaignConfig) => {
            if (publishModal.channel === 'instagram') await instagram.publish(publishModal.post._id, target, campaign);
            else await facebook.publish(publishModal.post._id, target, campaign);
            setPublishModal(null);
            refresh();
          }}
          onUploadMedia={async (file: File) => {
            if (publishModal.channel === 'instagram') return await instagram.uploadMedia(publishModal.post._id, file);
            return await facebook.uploadMedia(publishModal.post._id, file);
          }}
          onClose={() => setPublishModal(null)}
        />
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Social Media Dashboard</h1>
                <p className="text-xs text-gray-500">GMB • Instagram • Facebook • Vídeos • Spy de Concorrentes</p>
              </div>
            </div>
            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <RefreshIcon />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 overflow-x-auto">
            {Object.entries(TAB_CONFIG).map(([key, config]) => {
              const Icon = config.icon;

              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-all whitespace-nowrap ${activeTab === key
                    ? `border-${config.color}-600 text-${config.color}-600`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon size={18} />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Stats Cards - apenas para abas de posts */}
        {activeTab !== 'videos' && activeTab !== 'spy' && activeTab !== 'landingpages' && <StatsCards />}

        {/* Área de Geração - Posts */}
        {activeTab !== 'videos' && activeTab !== 'spy' && activeTab !== 'landingpages' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 shadow-sm">
            {/* Cabeçalho com ícone e título */}
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-1.5 rounded-md ${activeTab === 'gmb' ? 'bg-blue-100 text-blue-600' :
                activeTab === 'instagram' ? 'bg-pink-100 text-pink-600' :
                  'bg-indigo-100 text-indigo-600'
                }`}>
                {activeTab === 'gmb' && <span className="text-base">📍</span>}
                {activeTab === 'instagram' && <span className="text-base">📸</span>}
                {activeTab === 'facebook' && <span className="text-base">📘</span>}
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">
                  {activeTab === 'gmb' && 'Gerar Post para Google Meu Negócio'}
                  {activeTab === 'instagram' && 'Gerar Post para Instagram'}
                  {activeTab === 'facebook' && 'Gerar Post para Facebook'}
                </h2>
                <p className="text-xs text-gray-500">
                  Conteúdo + imagem gerados automaticamente
                </p>
              </div>
            </div>

            {/* Header com botão Gerar - sempre no topo direito */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 mb-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 uppercase tracking-wider font-medium mb-1">
                    {!selectedEspecialidade ? '🔄 Próximo da fila automática' : '🎯 Modo Manual'}
                  </p>
                  <div className="flex items-center gap-3">
                    {(() => {
                      const esp = ESPECIALIDADES.find(e => e.id === (selectedEspecialidade || automaticConfig.especialidade))!;
                      const funnel = selectedEspecialidade ? selectedFunnelStage : automaticConfig.funnel;
                      const funnelLabels = {
                        top: { emoji: '🔴', label: 'Topo (Descoberta)', color: 'red' },
                        middle: { emoji: '🟡', label: 'Meio (Consideração)', color: 'yellow' },
                        bottom: { emoji: '🟢', label: 'Fundo (Conversão)', color: 'green' }
                      };
                      const fl = funnelLabels[funnel];
                      return (
                        <>
                          <span className="text-sm font-semibold text-gray-900">{esp.nome}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${fl.color}-100 text-${fl.color}-700 border border-${fl.color}-200`}>
                            {fl.emoji} {fl.label}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Checkbox Agendar (GMB, Instagram e Facebook) */}
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={schedulePost}
                      onChange={(e) => {
                        setSchedulePost(e.target.checked);
                        if (e.target.checked) {
                          setScheduleDate(new Date().toISOString().split('T')[0]);
                          setScheduleTime('08:00');
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>📅 Agendar</span>
                  </label>
                  {/* Botão Gerar - sempre no topo direito */}
                  <button
                    onClick={() => handleGenerate('full')}
                    disabled={generating}
                    className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 transition-all text-sm font-medium flex items-center gap-2 ${activeTab === 'gmb' ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' :
                        activeTab === 'instagram' ? 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700' :
                          'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800'
                      }`}
                  >
                    {generating ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Criando...</span>
                      </>
                    ) : (
                      <>
                        <span>✨</span>
                        <span>Gerar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Campos de agendamento (aparecem abaixo quando checkbox marcado) */}
              {schedulePost && (
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-blue-200">
                  <select
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  >
                    {getProximosDias().map(dia => (
                      <option key={dia.value} value={dia.value}>{dia.label}</option>
                    ))}
                  </select>
                  <select
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-blue-50"
                  >
                    {HORARIOS_ESTRATEGICOS.map(horario => (
                      <option key={horario.value} value={horario.value}>{horario.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Linha 1: 3 selects - tamanho reduzido */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
              <select
                value={selectedEspecialidade}
                onChange={(e) => setSelectedEspecialidade(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-white"
              >
                <option value="">🔄 Fila Automática</option>
                {ESPECIALIDADES.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>

              <select
                value={selectedFunnelStage}
                onChange={(e) => setSelectedFunnelStage(e.target.value as FunnelStage)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-white"
              >
                <option value="top">🔴 Topo (Descoberta)</option>
                <option value="middle">🟡 Meio (Consideração)</option>
                <option value="bottom">🟢 Fundo (Conversão)</option>
              </select>

              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-white"
                title="IA para gerar imagem"
              >
                <option value="auto">🤖 Auto (melhor)</option>
                <option value="google">🎬 Google Imagen 3 (Veo) 🥇</option>
                <option value="veo">🎥 Veo 2 (Google)</option>
                <option value="freepik">🎨 Freepik AI</option>
                <option value="fal">⚡ fal.ai FLUX</option>
                <option value="together">🔗 Together.ai</option>
                <option value="replicate">💾 Replicate</option>
                <option value="pollinations">🍁 Pollinations</option>
              </select>
            </div>

            {/* Tema personalizado */}
            <input
              type="text"
              value={customTheme}
              onChange={(e) => setCustomTheme(e.target.value)}
              placeholder="Tema personalizado (opcional) — ex: volta às aulas, ansiedade infantil..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors mb-3"
            />

            {/* Layouts Instagram (apenas modo full) */}
            {activeTab === 'instagram' && selectedMode === 'full' && (
              <div className="mb-3 border border-pink-200 rounded-lg overflow-hidden">
                <div className="bg-pink-50 px-3 py-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700">
                    🎨 Layout Profissional
                    {layoutSelecionado && (
                      <span className="ml-2 text-xs text-pink-600 font-normal">
                        ✓ {(layoutsDisponiveis || []).find(l => l.id === layoutSelecionado)?.nome}
                      </span>
                    )}
                    {!layoutSelecionado && <span className="ml-2 text-xs text-gray-400 font-normal">(opcional)</span>}
                  </p>
                  {layoutSelecionado && (
                    <button
                      onClick={() => setLayoutSelecionado(null)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                {carregandoLayouts ? (
                  <div className="py-4 text-center text-xs text-gray-500 bg-white">
                    <svg className="animate-spin h-4 w-4 inline mr-1" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Carregando layouts...
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 p-2 bg-white">
                    {(layoutsDisponiveis || []).map((layout) => (
                      <button
                        key={layout.id}
                        onClick={() => setLayoutSelecionado(layoutSelecionado === layout.id ? null : layout.id)}
                        className={`rounded border p-1.5 text-left transition-all ${layoutSelecionado === layout.id
                          ? 'border-pink-500 bg-pink-50 shadow-sm'
                          : 'border-gray-200 hover:border-pink-300'
                          }`}
                      >
                        <div
                          className="w-full h-12 rounded mb-1"
                          style={{
                            background: `linear-gradient(135deg, ${layout.cores?.primaria || '#e91e8c'} 0%, ${layout.cores?.secundaria || layout.cores?.destaque || '#764ba2'} 100%)`
                          }}
                        />
                        <p className="text-xs font-medium text-gray-800 truncate">{layout.nome}</p>
                        <div className="flex gap-0.5 mt-0.5">
                          {Object.values(layout.cores || {}).slice(0, 3).map((cor: any, idx) => (
                            <div key={idx} className="w-2 h-2 rounded-full border border-white" style={{ backgroundColor: cor }} />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Seleção de modo de geração */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Modo de geração</p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setSelectedMode('full')}
                  className={`px-2 py-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-0.5 transition-all ${selectedMode === 'full' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                >
                  <span className="text-base">✨</span>
                  <span>Completo</span>
                  <span className="text-[10px] opacity-70">Imagem + Copy</span>
                </button>
                <button
                  onClick={() => setSelectedMode('caption')}
                  className={`px-2 py-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-0.5 transition-all ${selectedMode === 'caption' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                >
                  <span className="text-base">📝</span>
                  <span>Só Legenda</span>
                  <span className="text-[10px] opacity-70">Texto SEO</span>
                </button>
                <button
                  onClick={() => setSelectedMode('hooks')}
                  className={`px-2 py-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-0.5 transition-all ${selectedMode === 'hooks' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                >
                  <span className="text-base">🎣</span>
                  <span>10 Ganchos</span>
                  <span className="text-[10px] opacity-70">Virais Reels</span>
                </button>
              </div>
            </div>

            {/* Tom de Voz */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Tom de voz</p>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { key: 'emotional', emoji: '💔', label: 'Emocional', desc: 'Dor/urgência' },
                  { key: 'educativo', emoji: '📚', label: 'Educativo', desc: 'Dicas/fatos' },
                  { key: 'inspiracional', emoji: '✨', label: 'Inspiração', desc: 'Transformação' },
                  { key: 'bastidores', emoji: '🏥', label: 'Bastidores', desc: 'Da clínica' },
                ].map(({ key, emoji, label, desc }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTone(key as any)}
                    className={`px-1.5 py-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-0.5 transition-all ${selectedTone === key ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                  >
                    <span className="text-base">{emoji}</span>
                    <span className="text-[11px] font-semibold">{label}</span>
                    <span className="text-[9px] opacity-60">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Botões de ação extras: Variações A/B e Planejar Semana */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
              <button
                onClick={handleGenerateVariations}
                disabled={loadingVariations}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-700 border border-violet-200 bg-violet-50 hover:bg-violet-100 rounded-lg transition-all disabled:opacity-50"
              >
                {loadingVariations ? (
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : <span>🎯</span>}
                Variações A/B
              </button>
              {activeTab === 'gmb' && (
                <button
                  onClick={handleWeeklyPlan}
                  disabled={weeklyPlanLoading}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all disabled:opacity-50"
                >
                  {weeklyPlanLoading ? (
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : <span>📅</span>}
                  Planejar Semana
                </button>
              )}
            </div>

            {/* 🔗 Sugestão de Landing Page - Apenas GMB */}
            {activeTab === 'gmb' && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <LandingPageSuggestion 
                  especialidadeId={selectedEspecialidade || automaticConfig.especialidade}
                />
              </div>
            )}
          </div>
        )}

        {/* 💰 META ADS - Tráfego Pago */}
        {activeTab === 'metaads' && <MetaAdsTab />}

        {/* 🎯 LANDING PAGES */}
        {activeTab === 'landingpages' && <LandingPagesTab />}

        {/* Área de Geração - Vídeos */}
       {activeTab === 'videos' && (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    {/* Cabeçalho com título e descrição */}
    <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
      <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
        <span className="text-lg">🎬</span> Gerar Vídeo com IA
      </h2>
      <p className="text-xs text-gray-500 mt-0.5">Crie vídeos otimizados para redes sociais com um clique</p>
    </div>

    <div className="p-5 space-y-5">
      {/* Preset Premium (opcional) */}
      <div className="bg-gradient-to-r from-violet-50 to-pink-50 rounded-lg border border-violet-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🚀</span>
          <label className="text-sm font-semibold text-violet-800">Preset Premium (opcional)</label>
          <span className="text-[10px] font-medium text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">NOVO</span>
        </div>
        <select
          value={selectedPreset}
          onChange={(e) => {
            const presetKey = e.target.value;
            setSelectedPreset(presetKey);
            if (presetKey && VIDEO_PRESETS[presetKey as keyof typeof VIDEO_PRESETS]) {
              const preset = VIDEO_PRESETS[presetKey as keyof typeof VIDEO_PRESETS];
              setVideoHookStyle(preset.hookStyle);
              setSelectedTone(preset.tone);
              setVideoObjetivo(preset.objetivo);
              toast.success(`✅ Preset "${preset.nome}" aplicado!`);
            }
          }}
          className="w-full px-3 py-2 border border-violet-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white"
        >
          <option value="">🎯 Configurar manualmente (sem preset)</option>
          
          <optgroup label="💰 META ADS (Tráfego Pago)">
            <option value="meta_autoridade">👨‍⚕️ Autoridade — Tom profissional, converte leads</option>
            <option value="meta_urgencia">🚨 Urgência — Alerta médico, conversão rápida</option>
          </optgroup>
          
          <optgroup label="📱 INSTAGRAM ORGÂNICO (Reels/Stories)">
            <option value="explosao_viral">🔥 Explosão Viral — Máximo engajamento</option>
            <option value="autoridade_inspiradora">👑 Autoridade Inspiradora — Credibilidade</option>
            <option value="empatia_emocional">💝 Empatia Emocional — Conexão genuína</option>
            <option value="alerta_urgencia">⚡ Alerta & Urgência — Chamar atenção</option>
            <option value="erro_correcao">📚 Erro + Correção — Educativo viral</option>
          </optgroup>
        </select>

        {selectedPreset && VIDEO_PRESETS[selectedPreset as keyof typeof VIDEO_PRESETS] && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(() => {
              const preset = VIDEO_PRESETS[selectedPreset as keyof typeof VIDEO_PRESETS];
              return (
                <>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded-full border border-violet-200 text-xs text-violet-700">
                    <span>🎙️</span> {preset.config.voz}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded-full border border-violet-200 text-xs text-violet-700">
                    <span>⚡</span> {preset.config.velocidade}x
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded-full border border-violet-200 text-xs text-violet-700">
                    <span>🔊</span> {preset.config.volumeMusica}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded-full border border-violet-200 text-xs text-violet-700">
                    <span>🎨</span> {preset.hookStyle}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded-full border border-violet-200 text-xs text-violet-700">
                    <span>💭</span> {preset.tone}
                  </span>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Linha 1: Especialidade + Duração + Modo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          value={selectedEspecialidade}
          onChange={(e) => { setSelectedEspecialidade(e.target.value); setVideoArea(''); setVideoSubTema(''); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
        >
          <option value="">Selecione uma especialidade...</option>
          {ESPECIALIDADES.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <select
          value={videoDuration}
          onChange={(e) => setVideoDuration(Number(e.target.value) as 30 | 45 | 60)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
        >
          <option value={30}>⏱️ 30 segundos</option>
          <option value={45}>⏱️ 45 segundos</option>
          <option value={60}>⏱️ 60 segundos</option>
        </select>
        <select
          value={videoMode}
          onChange={(e) => setVideoMode(e.target.value as 'avatar' | 'ilustrativo' | 'veo' | 'runway' | 'economico' | 'teste')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
        >
          <option value="teste">🧪 MODO TESTE (Grátis - Testar flow sem custo)</option>
          <option value="economico">💰 Econômico (Imagens + TTS) ~R$0,20</option>
          <option value="veo">🎬 Cinematográfico (Google Veo 3.1) ~R$64 ⚠️ CARO</option>
          <option value="runway">🎬 Cinematográfico (Runway Gen-3) 💰</option>
          <option value="ilustrativo">🖼️ Ilustrativo (Imagens básico)</option>
          <option value="avatar">🎭 Avatar (HeyGen)</option>
        </select>
        
        {/* 🧪 Alerta Modo Teste */}
        {videoMode === 'teste' && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700 flex items-center gap-1">
              <span>✅</span>
              <strong>Modo Teste ativo:</strong> Custo GRATUITO. Use para testar narração, música e presets sem gastar R$64 do VEO.
            </p>
          </div>
        )}
        
        {/* ⚠️ Alerta VEO Caro */}
        {videoMode === 'veo' && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700 flex items-center gap-1">
              <span>💸</span>
              <strong>Custo alto:</strong> ~R$64 por vídeo. Use modo Teste primeiro para validar!
            </p>
          </div>
        )}
      </div>

      {/* 🎨 DESTINO - Fundo Rosa */}
      <div className="p-4 bg-pink-50/50 rounded-xl border border-pink-100">
        <p className="text-xs text-pink-700 mb-3 font-semibold uppercase tracking-wider flex items-center gap-1">
          <span>📍</span> Destino
        </p>
        <div className="flex gap-2">
          {([
            { key: 'instagram', emoji: '📱', label: 'Instagram Orgânico', desc: 'Viral · 20-35s' },
            { key: 'meta_ads', emoji: '💰', label: 'Meta Ads', desc: 'Conversão · CTA WhatsApp' },
          ]).map(({ key, emoji, label, desc }) => (
            <button
              key={key}
              onClick={() => setVideoPlatform(key)}
              className={`flex-1 py-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-0.5 transition-all ${
                videoPlatform === key
                  ? 'border-pink-400 bg-pink-100 text-pink-800 shadow-sm'
                  : 'border-pink-200 bg-white text-gray-600 hover:bg-pink-50'
              }`}
            >
              <span className="text-base">{emoji}</span>
              <span className="text-[11px] font-semibold">{label}</span>
              <span className="text-[9px] text-gray-400">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 🎨 TEMA DO CONTEÚDO - Fundo Azul */}
      <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
        <p className="text-xs text-blue-700 mb-3 font-semibold uppercase tracking-wider flex items-center gap-1">
          <span>📚</span> Tema do Conteúdo
        </p>
        <div className="space-y-2">
          <select
            value={videoArea}
            onChange={(e) => { setVideoArea(e.target.value); setVideoSubTema(''); }}
            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">Área (automático)</option>
            {Object.entries(TEMAS_VIDEO)
              .filter(([key]) =>
                !selectedEspecialidade ||
                !ESPECIALIDADE_AREAS[selectedEspecialidade] ||
                ESPECIALIDADE_AREAS[selectedEspecialidade].includes(key)
              )
              .map(([key, area]) => (
                <option key={key} value={key}>{area.label}</option>
              ))}
          </select>
          {videoArea && (
            <select
              value={videoSubTema}
              onChange={(e) => setVideoSubTema(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-blue-50 text-blue-900"
            >
              <option value="">Subtema (qualquer)</option>
              {TEMAS_VIDEO[videoArea].subtemas.map(s => (
                <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 🎨 Linha 3: Estilo do Gancho + Objetivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 🎨 ESTILO DO GANCHO - Fundo Laranja */}
        <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100">
        <p className="text-xs text-orange-700 mb-3 font-semibold uppercase tracking-wider flex items-center gap-1">
          <span>🎣</span> Estilo do Gancho
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { key: 'alerta', emoji: '🚨', label: 'Alerta' },
            { key: 'dor', emoji: '💔', label: 'Dor' },
            { key: 'curiosidade', emoji: '🤔', label: 'Curiosidade' },
            { key: 'erro_comum', emoji: '❌', label: 'Erro' },
            { key: 'autoridade', emoji: '🎓', label: 'Autoridade' },
          ].map(({ key, emoji, label }) => (
            <button
              key={key}
              onClick={() => setVideoHookStyle(key)}
              className={`py-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-0.5 transition-all ${
                videoHookStyle === key
                  ? 'border-orange-400 bg-orange-100 text-orange-800 shadow-sm'
                  : 'border-orange-200 bg-white text-gray-600 hover:bg-orange-50'
              }`}
              >
                <span className="text-base">{emoji}</span>
                <span className="text-[9px] font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* 🎨 OBJETIVO DO VÍDEO - Fundo Verde */}
        <div className="p-4 bg-green-50/50 rounded-xl border border-green-100">
          <p className="text-xs text-green-700 mb-3 font-semibold uppercase tracking-wider flex items-center gap-1">
            <span>🎯</span> Objetivo do Vídeo
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { key: 'salvar', emoji: '🔖', label: 'Salvar' },
              { key: 'compartilhar', emoji: '📤', label: 'Compartilhar' },
              { key: 'comentar', emoji: '💬', label: 'Comentar' },
              { key: 'agendar', emoji: '📅', label: 'Agendar' },
            ].map(({ key, emoji, label }) => (
              <button
                key={key}
                onClick={() => setVideoObjetivo(key)}
                className={`py-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-0.5 transition-all ${
                  videoObjetivo === key
                    ? 'border-green-400 bg-green-100 text-green-800 shadow-sm'
                    : 'border-green-200 bg-white text-gray-600 hover:bg-green-50'
                }`}
              >
                <span className="text-base">{emoji}</span>
                <span className="text-[9px] font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🎨 TOM DO ROTEIRO - Fundo Violeta */}
      <div className="p-4 bg-violet-50/50 rounded-xl border border-violet-100">
        <p className="text-xs text-violet-700 mb-3 font-semibold uppercase tracking-wider flex items-center gap-1">
          <span>🎭</span> Tom do Roteiro
        </p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { key: 'emotional', emoji: '💔', label: 'Emocional', desc: 'Dor/urgência' },
            { key: 'educativo', emoji: '📚', label: 'Educativo', desc: 'Dicas/fatos' },
            { key: 'inspiracional', emoji: '✨', label: 'Inspiração', desc: 'Transformação' },
            { key: 'bastidores', emoji: '🏥', label: 'Bastidores', desc: 'Da clínica' },
          ].map(({ key, emoji, label, desc }) => (
            <button
              key={key}
              onClick={() => setSelectedTone(key as any)}
              className={`py-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-0.5 transition-all ${
                selectedTone === key
                  ? 'border-violet-400 bg-violet-100 text-violet-800 shadow-sm'
                  : 'border-violet-200 bg-white text-gray-600 hover:bg-violet-50'
              }`}
            >
              <span className="text-base">{emoji}</span>
              <span className="text-[11px] font-semibold">{label}</span>
              <span className="text-[9px] text-gray-400">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Avisos e campos extras */}
      {(videoMode === 'runway' || videoMode === 'veo') && (
        <div className={`p-3 rounded-lg text-xs border ${
          videoMode === 'runway' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <strong>
            {videoMode === 'runway' ? '🎬 Runway Gen-3 Turbo' : '🎬 Google Veo 3.1'}
          </strong> — {videoMode === 'runway'
            ? 'Vídeo cinematográfico 10s/clip, 9:16 para Reels. Custo menor que Veo.'
            : 'Gera vídeo cinematográfico real (8s, 9:16 para Reels).'}
          Deixe o campo abaixo vazio para usar o prompt da especialidade, ou descreva uma cena específica.
          <span className="ml-2 text-blue-500">Tempo estimado: {videoMode === 'runway' ? '2-4 min' : '3-5 min'}</span>
        </div>
      )}

      <textarea
        value={videoRoteiro}
        onChange={(e) => setVideoRoteiro(e.target.value)}
        placeholder={
          videoMode === 'veo'
            ? 'Cena personalizada (opcional) — ex: "terapeuta e criança sorrindo juntos durante atividade"'
            : 'Tema personalizado (opcional) — ou deixe em branco para gerar automaticamente pelo subTema...'
        }
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
        rows={2}
      />

      {videoMode === 'veo' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <span>⚠️</span>
          <span><strong>Custo estimado: ~R$56–70 por vídeo</strong> (Veo 2 cobra R$2/s de vídeo gerado). Use só para publicar — não para testar.</span>
        </div>
      )}

      <button
        onClick={handleGenerateVideo}
        disabled={generatingVideo || loadingPreview || !selectedEspecialidade}
        className={`w-full py-2.5 text-white rounded-lg disabled:opacity-50 transition-all text-sm font-medium ${
          videoPlatform === 'meta_ads'
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
            : videoMode === 'runway'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
              : videoMode === 'veo'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                : videoMode === 'economico'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                  : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
        }`}
      >
        {loadingPreview
          ? 'Gerando roteiro...'
          : generatingVideo
            ? 'Gerando vídeo...'
            : videoPlatform === 'meta_ads'
              ? 'Gerar Vídeo para Tráfego Pago'
              : videoMode === 'runway'
                ? 'Gerar Reel (Runway Gen-3)'
                : videoMode === 'veo'
                  ? 'Gerar Reel Viral (Veo 3.1)'
                  : videoMode === 'economico'
                    ? 'Gerar Reel Econômico'
                    : videoMode === 'avatar'
                      ? 'Gerar Reel com Avatar'
                      : 'Gerar Reel Ilustrativo'
        }
      </button>
    </div>
  </div>
)}

        {/* Filtros */}
        {activeTab !== 'videos' && activeTab !== 'spy' && activeTab !== 'landingpages' && (
          <div className="flex flex-wrap gap-3 mb-6">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            >
              <option value="all">Todos Status</option>
              <option value="draft">📝 Rascunho</option>
              <option value="published">✅ Publicado</option>
            </select>
            <select
              value={funnelFilter}
              onChange={(e) => setFunnelFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
            >
              <option value="all">Todos Funis</option>
              <option value="top">🔴 Topo (Descoberta)</option>
              <option value="middle">🟡 Meio (Consideração)</option>
              <option value="bottom">🟢 Fundo (Conversão)</option>
            </select>
          </div>
        )}

        {/* Lista de Vídeos */}
        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.loading ? (
              <div className="col-span-full flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : videosList.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-500">Nenhum vídeo encontrado</p>
                <p className="text-sm text-gray-400 mt-1">Gere seu primeiro vídeo acima</p>
              </div>
            ) : (
              videosList.map((video) => (
                <VideoCard
                  key={video._id}
                  video={video}
                  onPublish={(id, channels) => videos.publish(id, channels)}
                  onPublishMeta={videos.publishMeta}
                  onDelete={(id) => videos.delete(id)}
                  onEditar={(v) => setVideoEditModal({ open: true, video: v })}
                  onRefresh={refresh}
                />
              ))
            )}
          </div>
        )}

        {/* Lista de Posts */}
        {activeTab !== 'videos' && activeTab !== 'spy' && activeTab !== 'landingpages' && (
          <div className="space-y-4">
            {currentData?.loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-500">Nenhum post encontrado</p>
                <p className="text-sm text-gray-400 mt-1">Gere seu primeiro post acima</p>
              </div>
            ) : (
              filteredPosts.map((post: any) => (
                <div key={post._id} className={`rounded-xl border p-4 transition-all ${post.status === 'published' ? 'bg-gray-100 border-gray-200 opacity-50 hover:opacity-80 grayscale-[30%]' : 'bg-white border-gray-200 hover:shadow-md'}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 relative">
                      {post.mediaUrl ? (
                        <img
                          src={post.mediaUrl}
                          alt=""
                          className={`w-16 h-16 object-cover rounded-lg border border-gray-200 transition-opacity ${(generatingImagePostId === post._id || post.status === 'processing') ? 'opacity-50' : ''}`}
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded-lg border border-dashed flex flex-col items-center justify-center transition-colors ${(generatingImagePostId === post._id || post.status === 'processing') ? 'bg-purple-50 border-purple-300' : 'bg-gray-50 border-gray-300'}`}>
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}

                      {/* Loading overlay na thumbnail */}
                      {(generatingImagePostId === post._id || post.status === 'processing') && (
                        <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                          <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        </div>
                      )}

                      {/* Botão de gerar imagem na lista */}
                      {!post.mediaUrl && !generatingImagePostId && post.status !== 'processing' && (
                        <button
                          onClick={() => handleGenerateNewImage(post._id)}
                          className="absolute -bottom-2 -right-2 p-1.5 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors"
                          title="Gerar imagem"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 mb-2 line-clamp-2 leading-relaxed">
                        {post.content}
                      </p>

                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={post.status} />
                          {post.funnelStage && <FunnelBadge stage={post.funnelStage} />}
                          <AutoBadge post={post} />
                          {post.theme && (
                            <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                              {ESPECIALIDADES.find(e => e.id === post.theme)?.nome || post.theme}
                            </span>
                          )}
                          {/* 📅 Data de publicação/agendamento */}
                          {post.status === 'scheduled' && post.scheduledAt && (
                            <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Agendado: {new Date(post.scheduledAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {post.status === 'published' && post.publishedAt && (
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Publicado: {new Date(post.publishedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {post.status === 'draft' && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Criado: {new Date(post.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* GMB: fluxo antigo */}
                          {activeTab === 'gmb' && (post.status === 'draft' || post.status === 'scheduled') && (
                            <>
                              <button
                                onClick={() => setEditModal({ open: true, post })}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                              >
                                <EditIcon />
                                <span>Editar</span>
                              </button>
                              <button
                                onClick={() => handlePublish(post._id)}
                                disabled={publishingPost === post._id}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200 disabled:opacity-50"
                              >
                                <PublishIcon />
                                <span>{publishingPost === post._id ? '...' : 'Publicar'}</span>
                              </button>
                            </>
                          )}
                          {/* Instagram / Facebook: novo fluxo com aprovação */}
                          {(activeTab === 'instagram' || activeTab === 'facebook') && (
                            <>
                              {(post.status === 'draft' || post.status === 'failed') && (
                                <button
                                  onClick={() => setPublishModal({ post, channel: activeTab as 'instagram' | 'facebook' })}
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>Revisar</span>
                                </button>
                              )}
                              {post.status === 'approved' && (
                                <button
                                  onClick={() => setPublishModal({ post, channel: activeTab as 'instagram' | 'facebook' })}
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                  </svg>
                                  <span>Publicar</span>
                                </button>
                              )}
                            </>
                          )}
                          {/* Republicar - para posts já publicados ou falhos (apenas GMB) */}
                          {activeTab === 'gmb' && (post.status === 'published' || post.status === 'failed') && (
                            <button
                              onClick={() => handleRepublish(post._id)}
                              disabled={republishingPost === post._id}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs text-orange-600 hover:bg-orange-50 rounded-lg transition-colors border border-orange-200 disabled:opacity-50"
                            >
                              <RefreshIcon />
                              <span>{republishingPost === post._id ? '...' : 'Republicar'}</span>
                            </button>
                          )}
                          {/* Copiar texto - todos os posts */}
                          {/* <button
                            onClick={() => {
                              navigator.clipboard.writeText(post.content || '');
                              toast.success('Texto copiado!');
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                            title="Copiar texto"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copiar</span>
                          </button> */}
                          {/* Score de qualidade */}
                          {post.status !== 'processing' && post.content && (
                            <button
                              onClick={() => handleScorePost(post)}
                              disabled={scoringPostId === post._id}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-amber-200 disabled:opacity-50"
                              title="Avaliar qualidade"
                            >
                              {scoringPostId === post._id ? (
                                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : <span>📊</span>}
                              <span>Score</span>
                            </button>
                          )}
                          {/* Ver - todos os posts */}
                          <button
                            onClick={() => setPreviewModal({ open: true, post })}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-purple-200"
                            title="Ver post completo"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>Ver</span>
                          </button>
                          <button
                            onClick={() => handleDelete(post._id)}
                            disabled={deletingPost === post._id}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200 disabled:opacity-50"
                          >
                            <TrashIcon />
                            <span>{deletingPost === post._id ? '...' : 'Excluir'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Paginação - Botão Carregar Mais */}
            {activeTab !== 'videos' && activeTab !== 'spy' && currentData?.pagination?.hasMore && (
              <div className="flex justify-center py-6">
                <button
                  onClick={() => {
                    if (activeTab === 'gmb') gmb.loadMore();
                    else if (activeTab === 'instagram') instagram.loadMore();
                    else if (activeTab === 'facebook') facebook.loadMore();
                  }}
                  disabled={currentData?.loading}
                  className="px-6 py-3 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
                >
                  {currentData?.loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <span>+</span>
                      Carregar mais posts
                      <span className="text-gray-500">
                        ({currentData?.posts?.length} de {currentData?.pagination?.total})
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
            
            {activeTab !== 'videos' && activeTab !== 'spy' && !currentData?.pagination?.hasMore && currentData?.posts?.length > 0 && (
              <div className="text-center py-4 text-sm text-gray-500">
                Mostrando {currentData?.posts?.length} posts
              </div>
            )}
          </div>
        )}

        {/* 🔍 SPY DE CONCORRENTES */}
        {activeTab === 'spy' && (
          <div className="space-y-6">
            {/* Tabs do Spy */}
            <div className="flex gap-2 border-b border-gray-200">
              <button
                onClick={() => setSpyTab('results')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-all ${spyTab === 'results'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                🔍 Buscar Anúncios
              </button>
              <button
                onClick={() => setSpyTab('saved')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-all ${spyTab === 'saved'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                ⭐ Salvos ({spySaved.length})
              </button>
            </div>

            {/* Busca */}
            {spyTab === 'results' && (
              <>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      value={spyKeyword}
                      onChange={(e) => setSpyKeyword(e.target.value)}
                      placeholder="Buscar anúncios... (ex: fonoaudiologia)"
                      className="px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                      onKeyDown={(e) => e.key === 'Enter' && handleSpySearch()}
                    />
                    <select
                      value={spyEspecialidade}
                      onChange={(e) => setSpyEspecialidade(e.target.value)}
                      className="px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors bg-white"
                    >
                      <option value="">Todas Especialidades</option>
                      <option value="fonoaudiologia">Fonoaudiologia</option>
                      <option value="psicologia">Psicologia</option>
                      <option value="terapia_ocupacional">Terapia Ocupacional</option>
                      <option value="fisioterapia">Fisioterapia</option>
                      <option value="musicoterapia">Musicoterapia</option>
                    </select>
                    <button
                      onClick={handleSpySearch}
                      disabled={spy.loading}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 transition-all shadow-sm text-sm font-medium flex items-center justify-center gap-2"
                    >
                      {spy.loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Buscando...
                        </>
                      ) : (
                        <>
                          <SearchIcon />
                          Buscar Anúncios
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    💡 Dica: Anúncios com mais tempo rodando geralmente estão convertendo melhor
                  </p>
                </div>

                {/* Lista de Anúncios */}
                <div className="grid gap-4">
                  {spy.loading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                  ) : spyAds.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                      <p className="text-gray-500">Nenhum anúncio encontrado</p>
                      <p className="text-sm text-gray-400 mt-1">Faça uma busca para encontrar anúncios de concorrentes</p>
                    </div>
                  ) : (
                    spyAds.map((ad: AdSpy) => (
                      <div key={ad.adId} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all">
                        <div className="flex items-start gap-4">
                          {/* Ícone/Lado esquerdo */}
                          <div className="flex-shrink-0">
                            <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                          </div>

                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                              <div>
                                <h3 className="font-semibold text-gray-900">{ad.pageName}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  {ad.daysActive > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                                      🔥 Rodando há {ad.daysActive} dias
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    Buscado por: "{ad.keyword}"
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Texto do anúncio */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                                {ad.adText?.length > 300
                                  ? ad.adText.substring(0, 300) + '...'
                                  : ad.adText
                                }
                              </p>
                              {ad.adText?.length > 300 && (
                                <button
                                  className="text-purple-600 text-xs font-medium mt-2 hover:underline"
                                  onClick={() => {
                                    // Expandir texto em modal
                                    setSelectedAdForAnalysis(ad);
                                    setAnalysisResult(null);
                                  }}
                                >
                                  Ver mais
                                </button>
                              )}
                            </div>

                            {/* Ações */}
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleSaveAd(ad)}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors border border-yellow-200"
                              >
                                <StarIcon />
                                <span>Salvar</span>
                              </button>
                              <button
                                onClick={() => handleAnalyzeAd(ad)}
                                disabled={analyzingAd === ad.adId}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200 disabled:opacity-50"
                              >
                                {analyzingAd === ad.adId ? (
                                  <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Analisando...
                                  </>
                                ) : (
                                  <>
                                    <SearchIcon />
                                    Analisar com IA
                                  </>
                                )}
                              </button>
                              <a
                                href={ad.snapshotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Ver Original
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Análise Expandida */}
                        {selectedAdForAnalysis?.adId === ad.adId && analysisResult && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-5">
                              <div className="flex items-center gap-2 mb-4">
                                <SparklesIcon />
                                <h4 className="font-semibold text-purple-900">📊 Análise do Anúncio</h4>
                              </div>

                              <div className="grid md:grid-cols-2 gap-4 mb-4">
                                <div className="bg-white/70 rounded-lg p-3">
                                  <p className="text-xs font-medium text-purple-700 mb-1">🎯 Gancho</p>
                                  <p className="text-sm text-gray-700">{analysisResult.gancho}</p>
                                </div>
                                <div className="bg-white/70 rounded-lg p-3">
                                  <p className="text-xs font-medium text-purple-700 mb-1">🏗️ Estrutura</p>
                                  <p className="text-sm text-gray-700">{analysisResult.estrutura}</p>
                                </div>
                                <div className="bg-white/70 rounded-lg p-3">
                                  <p className="text-xs font-medium text-purple-700 mb-1">📢 CTA</p>
                                  <p className="text-sm text-gray-700">{analysisResult.cta}</p>
                                </div>
                                <div className="bg-white/70 rounded-lg p-3">
                                  <p className="text-xs font-medium text-purple-700 mb-1">💡 Por que converte</p>
                                  <p className="text-sm text-gray-700">{analysisResult.porqueConverte}</p>
                                </div>
                              </div>

                              {analysisResult.pontosFracos && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                                  <p className="text-xs font-medium text-yellow-700 mb-1">⚠️ Pontos fracos</p>
                                  <p className="text-sm text-gray-700">{analysisResult.pontosFracos}</p>
                                </div>
                              )}

                              <button
                                onClick={() => {
                                  setAdaptConfig({
                                    ...adaptConfig,
                                    especialidade: ad.especialidade || 'fonoaudiologia'
                                  });
                                  handleAdaptAd();
                                }}
                                disabled={adaptingAd}
                                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all font-medium flex items-center justify-center gap-2"
                              >
                                {adaptingAd ? (
                                  <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Adaptando...
                                  </>
                                ) : (
                                  <>
                                    <SparklesIcon />
                                    ✏️ Adaptar para Fono Inova
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Anúncios Salvos */}
            {spyTab === 'saved' && (
              <div className="grid gap-4">
                {spySaved.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <p className="text-gray-500">Nenhum anúncio salvo</p>
                    <p className="text-sm text-gray-400 mt-1">Busque anúncios e salve os que gostar como referência</p>
                  </div>
                ) : (
                  spySaved.map((ad: AdSpy) => (
                    <div key={ad._id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="p-3 bg-yellow-100 rounded-xl">
                            <StarIcon filled />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900">{ad.pageName}</h3>
                            <span className="text-xs text-gray-400">
                              Salvo em: {new Date(ad.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium mt-1 mb-3">
                            {ad.especialidade}
                          </span>
                          <p className="text-sm text-gray-600 line-clamp-3">{ad.adText}</p>
                          {ad.analysis && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs font-medium text-gray-500">💡 Análise:</p>
                              <p className="text-sm text-gray-600">{ad.analysis.gancho}</p>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => spy.delete(ad._id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Preview do Post (Briefing) */}
      {previewModal?.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setPreviewModal(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 bg-blue-50/30">
              <div>
                <h3 className="text-base font-semibold text-gray-900">✅ Briefing do Post Gerado</h3>
                {previewModal.post.theme && (
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">{previewModal.post.theme.replace(/_/g, ' ')}</p>
                )}
              </div>
              <button onClick={() => setPreviewModal(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {previewModal.post.mediaUrl && (
                <img src={previewModal.post.mediaUrl} alt="" className="w-full rounded-xl object-cover border border-gray-100" style={{ maxHeight: 280 }} />
              )}
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{previewModal.post.content}</p>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(previewModal.post.content || '');
                    toast.info('Texto copiado!');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar texto
                </button>
                {previewModal.post.mediaUrl && (
                  <button
                    onClick={() => copiarImagem(previewModal.post.mediaUrl)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Copiar imagem
                  </button>
                )}
              </div>

              <button onClick={() => setPreviewModal(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢🟡 Modal de Preview para Legenda SEO e Ganchos */}
      {previewContent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setPreviewContent(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between px-6 py-4 border-b ${previewContent.type === 'caption' ? 'border-emerald-100 bg-emerald-50/30' : 'border-amber-100 bg-amber-50/30'}`}>
              <h3 className="text-base font-semibold text-gray-900">
                {previewContent.type === 'caption' ? '📝 Legenda SEO Gerada' : '🎣 10 Ganchos Virais'}
              </h3>
              <button onClick={() => setPreviewContent(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {previewContent.type === 'caption' ? (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm text-emerald-700 mb-2">
                      <span>📊 SEO Score:</span>
                      <span className="font-medium">Keyword: {previewContent.data.meta?.keyword}</span>
                      <span className="text-emerald-600">|</span>
                      <span>Densidade: {previewContent.data.meta?.density}</span>
                      <span className="text-emerald-600">|</span>
                      <span>{previewContent.data.meta?.wordCount} palavras</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{previewContent.data.content}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      💡 <strong>Dica:</strong> Teste esses ganchos nos primeiros 3-5 segundos do seu vídeo.
                      Use frases corridas (sem cortes) para retenção máxima.
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">{previewContent.data.content}</pre>
                  </div>
                </div>
              )}
            </div>

            <div className={`px-6 py-4 border-t ${previewContent.type === 'caption' ? 'border-emerald-100 bg-emerald-50/20' : 'border-amber-100 bg-amber-50/20'} flex items-center justify-between`}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(previewContent.data.content || '');
                  toast.info('Conteúdo copiado! Cole no seu post.');
                }}
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors ${previewContent.type === 'caption'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copiar tudo
              </button>
              <button onClick={() => setPreviewContent(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Post */}
      {editModal?.open && (
        <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-[60] p-2 sm:p-4 backdrop-blur-sm overflow-y-auto" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl my-2 sm:my-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Editar Post</h3>
              <button
                onClick={() => setEditModal(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[60vh] sm:max-h-[65vh]">
              <textarea
                value={editModal.post.content}
                onChange={(e) => setEditModal({ ...editModal, post: { ...editModal.post, content: e.target.value } })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                rows={4}
                placeholder="Escreva o conteúdo do post..."
              />

              {/* Preview do Feed Instagram */}
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-[2px]">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xs font-bold">FI</div>
                  </div>
                  <span className="text-sm font-semibold">fonoinova</span>
                  <span className="text-gray-400 ml-auto">⋯</span>
                </div>

                {/* Imagem do post (proporção Instagram 1:1) */}
                <div className="relative aspect-square bg-gray-100">
                  {editModal.post.mediaUrl ? (
                    <img
                      key={editModal.post.mediaUrl}
                      src={editModal.post.mediaUrl}
                      alt="Preview"
                      className={`w-full h-full object-cover transition-opacity ${generatingImagePostId === editModal.post._id ? 'opacity-50' : 'opacity-100'}`}
                    />
                  ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center transition-all ${generatingImagePostId === editModal.post._id ? 'bg-purple-50' : 'bg-gray-50'}`}>
                      <svg className="w-16 h-16 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-gray-400 text-sm">Sem imagem</span>
                    </div>
                  )}

                  {/* Overlay de loading */}
                  {generatingImagePostId === editModal.post._id && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm">
                      <svg className="animate-spin h-10 w-10 text-white mb-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-white font-medium text-sm">Gerando...</span>
                    </div>
                  )}
                </div>

                {/* Ações do Instagram */}
                <div className="flex items-center gap-4 px-3 py-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  <svg className="w-6 h-6 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                </div>

                {/* Preview do texto */}
                <div className="px-3 pb-3">
                  <p className="text-sm text-gray-800 line-clamp-3">
                    <span className="font-semibold mr-1">fonoinova</span>
                    {editModal.post.headline || editModal.post.content?.substring(0, 60)}
                  </p>
                </div>
              </div>

              {/* Botões de ação da imagem */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleGenerateNewImage(editModal.post._id)}
                  disabled={generatingImagePostId === editModal.post._id}
                  className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {generatingImagePostId === editModal.post._id ? 'Gerando...' : editModal.post.mediaUrl ? '🔄 Nova imagem' : '🎨 Gerar imagem'}
                </button>

                {editModal.post.mediaUrl && (
                  <button
                    onClick={() => setEditModal({ ...editModal, post: { ...editModal.post, mediaUrl: null } })}
                    disabled={generatingImagePostId === editModal.post._id}
                    className="px-4 py-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-sm font-medium"
                  >
                    🗑️ Remover
                  </button>
                )}
              </div>

              <p className="text-xs text-gray-500 text-center">
                💡 Esta é a prévia exata de como ficará no Instagram
              </p>
            </div>

            <div className="px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col gap-3">
              {/* Botões de cópia */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(editModal.post.content || '');
                    toast.info('Texto copiado!');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar texto
                </button>
                {editModal.post.mediaUrl && (
                  <button
                    onClick={() => copiarImagem(editModal.post.mediaUrl)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Copiar imagem
                  </button>
                )}
              </div>
              {/* Ações principais */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  onClick={() => setEditModal(null)}
                  className="w-full sm:w-auto px-5 py-2.5 sm:py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="w-full sm:w-auto px-5 py-2.5 sm:py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-sm transition-all"
                >
                  💾 Salvar alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )
      }

      {/* Modal de Variações A/B */}
      {variationsModal?.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setVariationsModal(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-violet-100 bg-violet-50/30">
              <div>
                <h3 className="text-base font-semibold text-gray-900">🎯 Variações A/B</h3>
                <p className="text-xs text-gray-500 mt-0.5">Escolha o ângulo que mais converte — use o tema no campo "Tema personalizado" ao gerar</p>
              </div>
              <button onClick={() => setVariationsModal(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-3 overflow-y-auto max-h-[65vh]">
              {variationsModal.variations.map((v: any, i: number) => (
                <div key={i} className="rounded-xl border border-gray-200 p-4 hover:border-violet-300 hover:bg-violet-50/20 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-xs font-semibold text-violet-700 px-2 py-0.5 bg-violet-100 rounded-full">{v.gatilho}</span>
                    <span className="text-xs text-gray-500">{v.angulo}</span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{v.hook}</p>
                  <button
                    onClick={() => {
                      setCustomTheme(v.hook);
                      setVariationsModal(null);
                      toast.info('Variação aplicada ao tema! Clique em Gerar para criar o post.');
                    }}
                    className="mt-3 text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    Usar essa variação
                  </button>
                </div>
              ))}
              {variationsModal.variations.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">Nenhuma variação gerada</p>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setVariationsModal(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Score de Qualidade */}
      {scoreModal?.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setScoreModal(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-amber-50/30">
              <h3 className="text-base font-semibold text-gray-900">📊 Score de Qualidade</h3>
              <button onClick={() => setScoreModal(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Score geral */}
              <div className="flex items-center justify-center">
                <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 ${(scoreModal.score?.score_geral || 0) >= 8 ? 'border-green-400 bg-green-50 text-green-700' : (scoreModal.score?.score_geral || 0) >= 6 ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-red-400 bg-red-50 text-red-700'}`}>
                  <span className="text-2xl font-bold">{scoreModal.score?.score_geral ?? '–'}</span>
                  <span className="text-[10px] font-medium">/ 10</span>
                </div>
              </div>
              {/* Dimensões */}
              <div className="space-y-2">
                {[
                  { key: 'clareza', label: 'Clareza', desc: 'Entendimento em 3 segundos' },
                  { key: 'impacto_emocional', label: 'Impacto Emocional', desc: 'Identificação do público' },
                  { key: 'cta', label: 'Call-to-Action', desc: 'Força do CTA' },
                ].map(({ key, label, desc }) => {
                  const val = scoreModal.score?.[key] ?? 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{label}</span>
                        <span className="text-gray-500">{val}/10 — {desc}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${val >= 8 ? 'bg-green-400' : val >= 6 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${val * 10}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Feedback */}
              {scoreModal.score?.ponto_forte && (
                <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                  <p className="text-xs text-green-700"><span className="font-semibold">Ponto forte:</span> {scoreModal.score.ponto_forte}</p>
                </div>
              )}
              {scoreModal.score?.sugestao && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs text-blue-700"><span className="font-semibold">Melhoria:</span> {scoreModal.score.sugestao}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button onClick={() => setScoreModal(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Resultado do Planejar Semana */}
      {weeklyPlanResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setWeeklyPlanResult(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 bg-blue-50/30">
              <div>
                <h3 className="text-base font-semibold text-gray-900">📅 Semana Planejada!</h3>
                <p className="text-xs text-gray-500 mt-0.5">{weeklyPlanResult.filter(r => r.success).length} posts criados / {weeklyPlanResult.length} especialidades</p>
              </div>
              <button onClick={() => setWeeklyPlanResult(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
              {weeklyPlanResult.map((r: any, i: number) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${r.success ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'}`}>
                  <span className="text-lg">{r.success ? '✅' : '❌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.especialidade || r.error}</p>
                    {r.success && <p className="text-xs text-gray-500">{r.horario || (r.scheduledAt ? new Date(r.scheduledAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Agendado')} {r.funil ? `— ${r.funil}` : ''}</p>}
                    {!r.success && <p className="text-xs text-red-500">{r.error}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => { setWeeklyPlanResult(null); refresh(); }}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Ver posts criados
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adaptação */}
      {
        showAdaptModal && adaptedPost && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowAdaptModal(false)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-lg">✏️</span> Post Adaptado
                </h3>
                <button
                  onClick={() => setShowAdaptModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-5 border border-purple-100">
                  <textarea
                    value={adaptedPost}
                    onChange={(e) => setAdaptedPost(e.target.value)}
                    className="w-full px-4 py-3 border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-white/80 resize-none"
                    rows={8}
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Salvar como:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'instagram', label: 'Instagram', icon: Instagram },
                      { key: 'facebook', label: 'Facebook', icon: Facebook },
                      { key: 'gmb', label: 'GMB', icon: Google },
                      { key: 'video', label: 'Roteiro', icon: Video }
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => setAdaptConfig({ ...adaptConfig, tipo: key as any })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-all ${adaptConfig.tipo === key
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                          }`}
                      >
                        <Icon size={16} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                <button
                  onClick={() => setShowAdaptModal(false)}
                  className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveAdapted}
                  className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl hover:from-purple-700 hover:to-purple-800 shadow-sm transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Salvar no painel
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Preview/Edição do Roteiro (antes de gerar) */}
      {roteiroPreview && (
        <RoteiroPreviewModal
          roteiro={roteiroPreview}
          onConfirm={handleConfirmRoteiro}
          onCancel={() => setRoteiroPreview(null)}
        />
      )}

      {/* Modal de Edição de Vídeo (Pós-produção) */}
      {videoEditModal.open && videoEditModal.video && (
        <VideoEditModal
          video={videoEditModal.video}
          onClose={() => setVideoEditModal({ open: false, video: null })}
          applying={applyingEdit}
          onApply={async (videoId, options: EditOptions) => {
            setApplyingEdit(true);
            try {
              await videos.editar(videoId, options);
              setVideoEditModal({ open: false, video: null });
              toast.success('Edições enviadas! O vídeo será processado em alguns minutos.');
            } catch (err: any) {
              toast.error(err?.response?.data?.error || 'Erro ao aplicar edições');
            } finally {
              setApplyingEdit(false);
            }
          }}
        />
      )}
    </div>
  );
}
