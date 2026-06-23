import API from './api';

/**
 * 🧪 Tracking do A/B Engine do Calendário GMB
 * 
 * Registra views, cliques no WhatsApp e leads para cada variante A/B.
 * Usa o postId para identificar o teste no backend.
 */

const trackedViews = new Set<string>();

/**
 * 📤 Envia evento de tracking para o backend
 */
async function trackEvent(postId: string, endpoint: 'view' | 'whatsapp-click' | 'lead') {
  if (!postId) return;
  try {
    await API.post(`/gmb/ab-tests/${postId}/${endpoint}`);
  } catch (error) {
    // Silencia erro para não quebrar a experiência do usuário
    console.warn(`[GMB A/B] Falha ao registrar ${endpoint}:`, error);
  }
}

/**
 * 👁️ Registra visualização de um post (uma única vez por sessão)
 */
export function trackGmbPostView(postId: string) {
  if (trackedViews.has(postId)) return;
  trackedViews.add(postId);
  trackEvent(postId, 'view');
}

/**
 * 💚 Registra clique no WhatsApp
 */
export function trackGmbWhatsAppClick(postId: string) {
  trackEvent(postId, 'whatsapp-click');
}

/**
 * 🎯 Registra lead gerado
 */
export function trackGmbLead(postId: string) {
  trackEvent(postId, 'lead');
}

/**
 * 🔗 Abre WhatsApp e registra clique A/B
 */
export function openGmbWhatsApp(post: { _id: string; metadata?: { abVariant?: string } }, phone: string = '5562992013573', text?: string) {
  trackGmbWhatsAppClick(post._id);

  const defaultText = 'Oi! Vi o post no Google e quero saber mais sobre a avaliação.';
  const message = encodeURIComponent(text || defaultText);
  const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`;

  window.open(url, '_blank', 'noopener,noreferrer');
}
