/**
 * 🛤️ Journey Tracker - Frontend
 * Rastreamento de jornada do lead com localStorage
 */

// Configurações
const STORAGE_KEY = 'fono_lead_journey';
const JOURNEY_COOKIE_KEY = 'fono_journey_id';

/**
 * 🎯 Inicializa o tracker de jornada
 * Chamado no carregamento da página
 */
export function initJourneyTracker() {
  const journey = getOrCreateJourney();
  
  // Enviar heartbeat a cada interação significativa
  trackPageView();
  
  // Setup event listeners
  setupEventListeners();
  
  return journey;
}

/**
 * 📊 Recupera ou cria jornada
 */
function getOrCreateJourney() {
  let journey = loadFromStorage();
  
  if (!journey) {
    journey = createNewJourney();
    saveToStorage(journey);
  }
  
  // Verificar se sessão expirou (30 minutos)
  const lastActivity = new Date(journey.lastActivityAt);
  const now = new Date();
  const minutesInactive = (now - lastActivity) / (1000 * 60);
  
  if (minutesInactive > 30) {
    journey = startNewSession(journey);
    saveToStorage(journey);
  }
  
  return journey;
}

function createNewJourney() {
  const urlParams = new URLSearchParams(window.location.search);
  
  return {
    journeyId: generateId('jny'),
    sessionId: generateId('sess'),
    sessionCount: 1,
    
    // UTM e origem
    source: urlParams.get('utm_source') || urlParams.get('source') || getReferrerSource(),
    medium: urlParams.get('utm_medium') || urlParams.get('medium') || 'organic',
    campaign: urlParams.get('utm_campaign') || urlParams.get('campaign'),
    content: urlParams.get('utm_content') || urlParams.get('content'),
    
    // Páginas e interações
    pagesVisited: [],
    interactions: [],
    
    // Dados do lead (quando identificado)
    leadData: null,
    
    // Timestamps
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    
    // Flags
    isIdentified: false,
    hasClickedWhatsapp: false,
    hasStartedForm: false,
    hasSubmittedForm: false
  };
}

function startNewSession(journey) {
  return {
    ...journey,
    sessionId: generateId('sess'),
    sessionCount: (journey.sessionCount || 0) + 1,
    lastActivityAt: new Date().toISOString()
  };
}

/**
 * 📄 Track page view
 */
export function trackPageView() {
  const journey = loadFromStorage();
  if (!journey) return;
  
  const pageData = {
    url: window.location.pathname,
    title: document.title,
    referrer: document.referrer,
    timestamp: new Date().toISOString()
  };
  
  // Evitar duplicatas imediatas
  const lastPage = journey.pagesVisited[journey.pagesVisited.length - 1];
  if (lastPage?.url === pageData.url) return;
  
  journey.pagesVisited.push(pageData);
  journey.lastActivityAt = new Date().toISOString();
  
  // Limitar histórico
  if (journey.pagesVisited.length > 50) {
    journey.pagesVisited = journey.pagesVisited.slice(-50);
  }
  
  saveToStorage(journey);
  
  // Enviar para backend
  syncWithBackend('page_view', {
    page: pageData.url,
    title: pageData.title,
    referrer: pageData.referrer
  });
}

/**
 * 🖱️ Track clique em CTA
 */
export function trackCTAClick(ctaType, metadata = {}) {
  const journey = loadFromStorage();
  if (!journey) return;
  
  const interaction = {
    type: 'cta_click',
    ctaType, // 'whatsapp', 'form', 'phone', 'email'
    page: window.location.pathname,
    timestamp: new Date().toISOString(),
    metadata
  };
  
  journey.interactions.push(interaction);
  journey.lastActivityAt = new Date().toISOString();
  
  // Atualizar flags
  if (ctaType === 'whatsapp') journey.hasClickedWhatsapp = true;
  if (ctaType === 'form_start') journey.hasStartedForm = true;
  if (ctaType === 'form_submit') journey.hasSubmittedForm = true;
  
  saveToStorage(journey);
  
  // Enviar para backend
  syncWithBackend('cta_click', {
    ctaType,
    page: window.location.pathname,
    ...metadata
  });
}

/**
 * 📝 Track evento de formulário
 */
export function trackFormEvent(event, formData = {}) {
  const journey = loadFromStorage();
  if (!journey) return;
  
  const interaction = {
    type: event, // 'form_start', 'form_field_focus', 'form_submit', 'form_abandon'
    page: window.location.pathname,
    timestamp: new Date().toISOString(),
    metadata: { formData }
  };
  
  journey.interactions.push(interaction);
  journey.lastActivityAt = new Date().toISOString();
  
  saveToStorage(journey);
  
  syncWithBackend(event, {
    page: window.location.pathname,
    formData
  });
}

/**
 * 👤 Identificar lead (quando preenche formulário)
 */
export function identifyLead(leadData) {
  const journey = loadFromStorage();
  if (!journey) return;
  
  journey.leadData = {
    ...leadData,
    identifiedAt: new Date().toISOString()
  };
  journey.isIdentified = true;
  journey.lastActivityAt = new Date().toISOString();
  
  saveToStorage(journey);
  
  // Enviar identificação para backend
  syncWithBackend('lead_identified', {
    journeyId: journey.journeyId,
    ...leadData
  });
}

/**
 * 🔄 Sincroniza com backend
 */
async function syncWithBackend(type, data) {
  try {
    const journey = loadFromStorage();
    if (!journey) return;
    
    const response = await fetch('/api/journey/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        journeyId: journey.journeyId,
        sessionId: journey.sessionId,
        type,
        ...data
      })
    });
    
    if (!response.ok) {
      console.warn('Falha ao sincronizar jornada:', await response.text());
    }
  } catch (error) {
    // Silenciar erros de tracking
    console.debug('Erro ao sincronizar jornada:', error);
  }
}

/**
 * 🍪 Sync cookie com backend
 */
export function syncJourneyCookie() {
  const journey = loadFromStorage();
  if (!journey) return;
  
  // Setar cookie para o backend ler
  document.cookie = `${JOURNEY_COOKIE_KEY}=${journey.journeyId}; path=/; max-age=${90 * 24 * 60 * 60}`;
}

/**
 * 📊 Obtém dados da jornada atual
 */
export function getJourneyData() {
  return loadFromStorage();
}

/**
 * 🔗 Obtém URL do WhatsApp com parâmetros de jornada
 */
export function getWhatsAppUrl(baseUrl, message = '') {
  const journey = loadFromStorage();
  
  if (!journey) return baseUrl;
  
  const params = new URLSearchParams();
  
  // Mensagem personalizada
  if (message) {
    params.set('text', message);
  }
  
  // Parâmetros de rastreamento
  params.set('source', 'website');
  params.set('page', window.location.pathname);
  
  if (journey.journeyId) {
    params.set('journey', journey.journeyId);
  }
  
  if (journey.campaign) {
    params.set('campaign', journey.campaign);
  }
  
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${params.toString()}`;
}

// ============ HELPERS ============

function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn('Erro ao carregar jornada:', error);
    return null;
  }
}

function saveToStorage(journey) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(journey));
  } catch (error) {
    console.warn('Erro ao salvar jornada:', error);
  }
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getReferrerSource() {
  const referrer = document.referrer;
  if (!referrer) return 'direct';
  
  if (referrer.includes('google')) return 'google';
  if (referrer.includes('facebook')) return 'facebook';
  if (referrer.includes('instagram')) return 'instagram';
  if (referrer.includes('whatsapp')) return 'whatsapp';
  
  return 'referral';
}

function setupEventListeners() {
  // Track scroll depth
  let maxScroll = 0;
  let scrollTracked = false;
  
  window.addEventListener('scroll', () => {
    const scrollPercent = Math.round(
      (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
    );
    
    if (scrollPercent > maxScroll) {
      maxScroll = scrollPercent;
    }
    
    // Track 50% e 90% scroll
    if (!scrollTracked && maxScroll >= 50) {
      trackScrollDepth(maxScroll);
      scrollTracked = true;
    }
  }, { passive: true });
  
  // Track before unload (possível abandono)
  window.addEventListener('beforeunload', () => {
    const journey = loadFromStorage();
    if (journey && !journey.hasSubmittedForm && journey.interactions.length > 0) {
      syncWithBackend('page_exit', {
        page: window.location.pathname,
        scrollDepth: maxScroll
      });
    }
  });
}

function trackScrollDepth(depth) {
  syncWithBackend('scroll_depth', {
    page: window.location.pathname,
    depth
  });
}

// ============ HOOKS REACT ============

import { useEffect, useCallback } from 'react';

/**
 * Hook React para tracking de jornada
 */
export function useJourneyTracker() {
  useEffect(() => {
    initJourneyTracker();
  }, []);
  
  const trackCTA = useCallback((type, metadata) => {
    trackCTAClick(type, metadata);
  }, []);
  
  const trackForm = useCallback((event, data) => {
    trackFormEvent(event, data);
  }, []);
  
  const identify = useCallback((data) => {
    identifyLead(data);
  }, []);
  
  const getWhatsAppLink = useCallback((baseUrl, message) => {
    return getWhatsAppUrl(baseUrl, message);
  }, []);
  
  return {
    trackCTA,
    trackForm,
    identify,
    getWhatsAppLink,
    getJourneyData
  };
}

export default {
  initJourneyTracker,
  trackPageView,
  trackCTAClick,
  trackFormEvent,
  identifyLead,
  getJourneyData,
  getWhatsAppUrl,
  syncJourneyCookie,
  useJourneyTracker
};
