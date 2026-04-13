/**
 * 🔥 PAYLOAD DEBUGGER V2
 * 
 * Loga TODO payload enviado para /v2/packages
 * Use para identificar onde ainda vaza legado
 */

const isDev = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';

export const debugPayload = (context: string, payload: any) => {
  if (!isDev) return;
  
  console.group(`🔍 [${context}] Payload Debug`);
  console.log('Payload completo:', payload);
  
  // Verifica campos críticos V2
  const checks = {
    type: {
      value: payload.type,
      valid: ['package', 'convenio', 'liminar'].includes(payload.type),
      error: payload.type === 'therapy' ? '❌ LEGADO: type="therapy" deve ser "package"' : null
    },
    model: {
      value: payload.model,
      valid: payload.type === 'package' ? ['per_session', 'prepaid'].includes(payload.model) : true,
      error: !payload.model && payload.type === 'package' ? '❌ FALTANDO: model é obrigatório para type=package' : null
    },
    schedule: {
      value: payload.schedule,
      valid: Array.isArray(payload.schedule),
      error: payload.selectedSlots && !payload.schedule ? '❌ LEGADO: selectedSlots deve ser convertido para schedule' : null
    },
    sessionType: {
      value: payload.sessionType,
      valid: !!payload.sessionType,
      error: !payload.sessionType ? '⚠️  FALTANDO: sessionType é obrigatório' : null
    },
    specialty: {
      value: payload.specialty,
      valid: !!payload.specialty,
      error: !payload.specialty ? '⚠️  FALTANDO: specialty é obrigatório' : null
    }
  };
  
  console.log('\n📋 Validações:');
  Object.entries(checks).forEach(([field, check]) => {
    const status = check.valid ? '✅' : '❌';
    console.log(`  ${status} ${field}: ${check.value || '(undefined)'}`);
    if (check.error) {
      console.error(`     ${check.error}`);
    }
  });
  
  // Verifica campos que NÃO devem existir no V2
  const legacyFields = ['paymentType', 'paymentMethod', 'selectedSlots', 'calculationMode'];
  const foundLegacy = legacyFields.filter(f => payload[f] !== undefined);
  
  if (foundLegacy.length > 0) {
    console.warn('\n⚠️  Campos legado detectados (serão removidos pelo sanitize):', foundLegacy);
  }
  
  console.groupEnd();
};

export const interceptApiCalls = () => {
  if (!isDev) return;
  
  const originalFetch = window.fetch;
  
  window.fetch = async (...args) => {
    const [url, config] = args;
    
    if (typeof url === 'string' && url.includes('/v2/packages')) {
      const method = config?.method || 'GET';
      
      if (method !== 'GET' && config?.body) {
        try {
          const payload = JSON.parse(config.body as string);
          debugPayload(`API ${method} ${url}`, payload);
        } catch (e) {
          // não é JSON, ignora
        }
      }
    }
    
    return originalFetch(...args);
  };
  
  console.log('🔍 Payload Debugger ativo - interceptando /v2/packages');
};
