/**
 * Estáticos do Marketing Dashboard: ícones, listas de especialidades e temas,
 * horários, mapa de abas e grupos. Extraídos de MarketingDashboard.tsx em
 * 31/10/2026 para deixar o arquivo principal menor (sem mudança visível).
 */
import { ymdSP } from '../../../utils/dateFormat';
import { Facebook, Google, Instagram, Search } from '@mui/icons-material';
import { Video, TrendingUp } from 'lucide-react';

// Ícones
export const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

export const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

export const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

export const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export const PublishIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg className={`w-4 h-4 ${filled ? 'text-yellow-500 fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

export const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export const SparklesIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

export const ESPECIALIDADES = [
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
export type Subtema = { id: string; label: string; gancho: 'dor' | 'alerta' | 'curiosidade' | 'erro_comum' | 'autoridade'; tom: 'emotional' | 'educativo' | 'inspiracional' | 'bastidores'; emoji: string };
export const TEMAS_VIDEO: Record<string, { label: string; subtemas: Subtema[] }> = {
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
export const ESPECIALIDADE_AREAS: Record<string, string[]> = {
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
export const HORARIOS_ESTRATEGICOS = [
  { value: '08:00', label: '🌅 08:00 - Início do dia' },
  { value: '12:30', label: '🌞 12:30 - Almoço' },
  { value: '15:00', label: '☕ 15:00 - Tarde' },
  { value: '19:00', label: '🌆 19:00 - Final do dia' },
  { value: '21:00', label: '🌙 21:00 - Noite' },
];

// Gerar datas dos próximos 7 dias
export const getProximosDias = () => {
  const dias = [];
  const hoje = new Date();
  for (let i = 0; i < 7; i++) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);
    const value = ymdSP(data);
    const label = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
    dias.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return dias;
};


// 🐛 FIX (2026-09-17): const de nível de módulo referenciando componentes de
// ícone no carregamento do módulo — mesmo bug real de TDZ entre chunks
// confirmado via sourcemap em appointmentDetailModal.tsx (build de produção
// do Rollup). Corrigido: construção preguiçosa, só no primeiro uso em função.
export let _tabConfigCache: Record<string, { label: string; icon: any; activeClass: string; shortLabel: string }> | null = null;
export function getTabConfigMap() {
  if (!_tabConfigCache) {
    _tabConfigCache = {
      gmb: {
        label: 'Google Meu Negócio',
        icon: Google,
        activeClass: 'border-blue-600 text-blue-600',
        shortLabel: 'GMB'
      },
      instagram: {
        label: 'Instagram',
        icon: Instagram,
        activeClass: 'border-pink-600 text-pink-600',
        shortLabel: 'IG'
      },
      facebook: {
        label: 'Facebook',
        icon: Facebook,
        activeClass: 'border-indigo-600 text-indigo-600',
        shortLabel: 'FB'
      },
      metaads: {
        label: 'Tráfego Pago',
        icon: TrendingUp,
        activeClass: 'border-emerald-600 text-emerald-600',
        shortLabel: 'Ads'
      },
      videos: {
        label: 'Vídeos com IA',
        icon: Video,
        activeClass: 'border-red-600 text-red-600',
        shortLabel: 'Vídeos'
      },
      spy: {
        label: 'Spy de Concorrentes',
        icon: Search,
        activeClass: 'border-purple-600 text-purple-600',
        shortLabel: 'Spy'
      }
    };
  }
  return _tabConfigCache;
}

export const SOCIAL_GROUPS: { key: string; label: string; tabs: string[] }[] = [
  { key: 'calendario', label: 'Calendário de posts', tabs: ['instagram', 'gmb', 'facebook'] },
  { key: 'ia', label: 'Criar com IA', tabs: ['videos'] },
  { key: 'anuncios', label: 'Anúncios', tabs: ['metaads', 'spy'] },
];

