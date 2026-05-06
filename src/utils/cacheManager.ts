/**
 * @file cacheManager.ts
 * @description Sistema centralizado de gerenciamento de cache e sincronização
 * @version 1.0.0
 * 
 * Este arquivo gerencia a invalidação de cache entre todos os hooks e contextos.
 * Quando um dado é modificado (create/update/delete), todos os hooks relacionados
 * são notificados para recarregar seus dados.
 */

type CacheType = 
  | 'dashboard'
  | 'patients' 
  | 'doctors'
  | 'doctorStats'
  | 'appointments'
  | 'admin'
  | 'payments'
  | 'evolutions'
  | 'all';

type CacheInvalidationListener = (type: CacheType) => void;

interface CacheEntry {
  timestamp: number;
  data: any;
}

// Cache global por tipo
const caches: Map<CacheType, CacheEntry> = new Map();

// Listeners por tipo
const listeners: Map<CacheType, Set<CacheInvalidationListener>> = new Map();

// Configurações de duração por tipo (em ms)
const CACHE_DURATIONS: Record<CacheType, number> = {
  dashboard: 3 * 60 * 1000,    // 3 minutos
  patients: 5 * 60 * 1000,     // 5 minutos
  doctors: 3 * 60 * 1000,      // 3 minutos
  doctorStats: 3 * 60 * 1000,  // 3 minutos
  appointments: 2 * 60 * 1000, // 2 minutos (mais volátil)
  admin: 5 * 60 * 1000,        // 5 minutos
  payments: 2 * 60 * 1000,     // 2 minutos
  evolutions: 2 * 60 * 1000,   // 2 minutos (volátil)
  all: 0                       // N/A
};

/**
 * 🔔 Registra um listener para invalidação de cache
 */
export const subscribeToCacheInvalidation = (
  type: CacheType, 
  listener: CacheInvalidationListener
): () => void => {
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
  }
  listeners.get(type)!.add(listener);

  // Retorna função para unsubscribe
  return () => {
    listeners.get(type)?.delete(listener);
  };
};

/**
 * 🚨 Invalida cache de um tipo específico ou todos
 */
export const invalidateCache = (type: CacheType): void => {
  console.log(`🚨 Invalidando cache: ${type}`);
  
  if (type === 'all') {
    // Limpa todos os caches
    caches.clear();
    // Notifica todos os listeners
    listeners.forEach((typeListeners, cacheType) => {
      typeListeners.forEach(listener => listener(cacheType));
    });
  } else {
    // Limpa cache específico
    caches.delete(type);
    // Notifica listeners desse tipo
    listeners.get(type)?.forEach(listener => listener(type));
    
    // Algumas invalidações devem propagar para tipos relacionados
    propagateInvalidation(type);
  }
};

/**
 * 🔄 Propaga invalidação para tipos relacionados
 */
const propagateInvalidation = (type: CacheType): void => {
  const propagationMap: Record<CacheType, CacheType[]> = {
    patients: ['dashboard'], // Pacientes afetam dashboard
    doctors: ['dashboard', 'doctorStats'], // Médicos afetam dashboard e stats
    appointments: ['dashboard', 'doctorStats'], // Agendamentos afetam ambos
    payments: ['dashboard'], // Pagamentos afetam dashboard
    evolutions: ['dashboard'], // Evoluções afetam dashboard
    admin: [], // Admin não afeta outros
    dashboard: [], // Dashboard é o aggregador
    doctorStats: [], // Stats não afeta outros diretamente
    all: [] // All já foi tratado
  };

  const affectedTypes = propagationMap[type] || [];
  affectedTypes.forEach(affectedType => {
    console.log(`🔄 Propagando invalidação: ${type} → ${affectedType}`);
    caches.delete(affectedType);
    listeners.get(affectedType)?.forEach(listener => listener(affectedType));
  });
};

/**
 * ✅ Verifica se o cache é válido
 */
export const isCacheValid = (type: CacheType): boolean => {
  const entry = caches.get(type);
  if (!entry) return false;
  
  const duration = CACHE_DURATIONS[type];
  const isValid = Date.now() - entry.timestamp < duration;
  
  if (!isValid) {
    caches.delete(type);
  }
  
  return isValid;
};

/**
 * 📦 Obtém dados do cache
 */
export const getCache = <T>(type: CacheType): T | null => {
  if (!isCacheValid(type)) return null;
  return caches.get(type)?.data || null;
};

/**
 * 💾 Salva dados no cache
 */
export const setCache = <T>(type: CacheType, data: T): void => {
  caches.set(type, {
    timestamp: Date.now(),
    data
  });
  console.log(`💾 Cache salvo: ${type}`);
};

/**
 * 🧹 Limpa todo o cache (útil para logout)
 */
export const clearAllCaches = (): void => {
  console.log('🧹 Limpando todos os caches');
  caches.clear();
  invalidateCache('all');
};

/**
 * 📊 Retorna estatísticas do cache (para debug)
 */
export const getCacheStats = (): Record<string, any> => {
  const stats: Record<string, any> = {};
  caches.forEach((entry, type) => {
    const age = Date.now() - entry.timestamp;
    const duration = CACHE_DURATIONS[type];
    stats[type] = {
      age: `${Math.round(age / 1000)}s`,
      valid: age < duration,
      hasData: !!entry.data
    };
  });
  return stats;
};

// Expõe globalmente para debug (apenas em dev)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).cacheManager = {
    invalidate: invalidateCache,
    stats: getCacheStats,
    clear: clearAllCaches
  };
}

/**
 * 🪝 Hook para usar cache com invalidação automática
 */
export const createCachedHook = <T>(
  type: CacheType,
  fetcher: () => Promise<T>
) => {
  let currentPromise: Promise<T> | null = null;

  return async (forceRefresh = false): Promise<T> => {
    // Usa cache se válido e não forçar refresh
    if (!forceRefresh && isCacheValid(type)) {
      console.log(`📦 Cache hit: ${type}`);
      return getCache<T>(type)!;
    }

    // Se já está carregando, retorna a mesma promise
    if (currentPromise) {
      console.log(`⏳ Aguardando carregamento: ${type}`);
      return currentPromise;
    }

    // Inicia novo carregamento
    console.log(`🌐 Fetching: ${type}`);
    currentPromise = fetcher().then(data => {
      setCache(type, data);
      currentPromise = null;
      return data;
    }).catch(error => {
      currentPromise = null;
      throw error;
    });

    return currentPromise;
  };
};
