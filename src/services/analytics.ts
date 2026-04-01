import API from './api';

// 🆕 Mapeamento de tradução de eventos
export const EVENT_TRANSLATIONS: Record<string, string> = {
  // Eventos de visualização
  'page_view': 'Visualização de Página',
  'screen_view': 'Visualização de Tela',
  'service_view': 'Visualização de Serviço',
  'service_click': 'Clique em Serviço',
  
  // Eventos de interação
  'click': 'Clique',
  'button_click': 'Clique em Botão',
  'scroll': 'Rolagem',
  'user_engagement': 'Engajamento do Usuário',
  
  // Eventos de sessão
  'session_start': 'Início de Sessão',
  'first_visit': 'Primeira Visita',
  'new_user': 'Novo Usuário',
  
  // Eventos de conversão
  'generate_lead': 'Geração de Lead',
  'form_submission': 'Envio de Formulário',
  'form_start': 'Início de Formulário',
  'whatsapp_click': 'Clique no WhatsApp',
  'phone_click': 'Clique no Telefone',
  'conversion': 'Conversão',
  
  // Eventos de navegação
  'page_location': 'Localização da Página',
  'page_title': 'Título da Página',
  
  // Eventos padrão GA4
  'file_download': 'Download de Arquivo',
  'search': 'Busca',
  'video_start': 'Início de Vídeo',
  'video_complete': 'Fim de Vídeo',
};

// Função para traduzir evento
export const translateEvent = (eventName: string): string => {
  return EVENT_TRANSLATIONS[eventName] || eventName;
};

export interface GAEvent {
  action: string;
  value: number;
  timestamp: string;
  // Campos adicionais para tradução
  actionTranslated?: string;
}

export interface GAMetrics {
  totalUsers: number;
  activeUsers: number;
  sessions: number;
  engagedSessions: number;
  avgSessionDuration: number;
  pageViews?: number;
  bounceRate?: number;
  conversions?: number;
  eventCount?: number;
  // Dados de leads do CRM
  leadsPeriod?: number;
  leadsToday?: number;
  leadsThisWeek?: number;
  leadsThisMonth?: number;
  source?: 'ga4' | 'internal';
}

export interface TrafficSource {
  source: string;
  medium: string;
  campaign: string;
  sessions: number;
  users: number;
  conversions: number;
}

export interface PageData {
  title: string;
  path: string;
  views: number;
  users: number;
  avgEngagementTime: number;
  bounceRate: number;
}

export interface ConversionEvent {
  eventName: string;
  conversions: number;
  value: number;
}

export interface RealtimeData {
  activeUsers: number;
  pageViews: number;
  events: number;
}

export interface AnapolisPageData {
  path: string;
  title: string;
  views: number;
  users: number;
  bounceRate: number;
  avgEngagementTime: number;
  leads: number;
}

export interface DashboardData {
  metrics: GAMetrics;
  events: GAEvent[];
  sources: TrafficSource[];
  pages: PageData[];
  landingPages: PageData[];
  anapolisPages: AnapolisPageData[];
  conversions: ConversionEvent[];
  realtime: RealtimeData;
  lastUpdated: string;
}

export const analyticsService = {
  fetchEvents: (params?: { startDate?: string; endDate?: string }) =>
    API.get<GAEvent[]>('/analytics/events', { params }),

  fetchMetrics: (params?: { startDate?: string; endDate?: string }) =>
    API.get<GAMetrics>('/analytics/metrics', { params }),

  // 🆕 Busca dashboard completo com todos os dados
  // Adiciona timestamp para evitar cache
  fetchDashboard: (params?: { startDate?: string; endDate?: string }) =>
    API.get<DashboardData>('/analytics/dashboard', { 
      params: {
        ...params,
        _t: Date.now() // Evita cache
      }
    }),
};
