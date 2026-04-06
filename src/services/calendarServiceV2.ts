/**
 * Calendar Service V2 - CQRS + Event-Driven
 * 
 * Substitui o calendarService legado
 * Features:
 * - Cache inteligente de feriados
 * - Fallback para V1 se necessário
 * - Tipagem completa
 */

import API from './api';

// ============================================
// CONFIG
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const USE_V2_CALENDAR = (import.meta as any).env?.VITE_USE_V2_CALENDAR === 'true' || true;

// Cache em memória para feriados (não mudam durante a sessão)
const holidaysCache: Map<number, Holiday[]> = new Map();

// ============================================
// TYPES
// ============================================

export interface Holiday {
  date: string;      // YYYY-MM-DD
  name: string;      // Nome do feriado
  type: 'full' | 'morning' | 'afternoon';  // Tipo de feriado
}

export interface HolidaysResponse {
  success: boolean;
  year: number;
  holidays: Holiday[];
}

export interface HolidaysResponseV2 {
  success: boolean;
  data: {
    year: number;
    holidays: Holiday[];
    count: number;
  };
  meta?: {
    duration: string;
    source: string;
    cached: boolean;
  };
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Busca feriados nacionais para um ano específico (V2)
 * @param year - Ano para buscar feriados (padrão: ano atual)
 * @returns Lista de feriados com nome e tipo
 */
export const getHolidaysV2 = async (year?: number): Promise<Holiday[]> => {
  const targetYear = year || new Date().getFullYear();
  
  // Verifica cache primeiro
  if (holidaysCache.has(targetYear)) {
    console.log(`[CalendarServiceV2] Retornando feriados do cache para ${targetYear}`);
    return holidaysCache.get(targetYear)!;
  }
  
  try {
    console.log(`[CalendarServiceV2] Buscando feriados para ${targetYear}`);
    
    // Tenta endpoint V2 primeiro
    if (USE_V2_CALENDAR) {
      try {
        const response = await API.get<HolidaysResponseV2>(`/v2/calendar/holidays?year=${targetYear}`);
        
        if (response.data?.success) {
          const holidays = response.data.data.holidays;
          // Salva no cache
          holidaysCache.set(targetYear, holidays);
          console.log(`[CalendarServiceV2] ${holidays.length} feriados carregados para ${targetYear}`);
          return holidays;
        }
      } catch (v2Error) {
        console.warn('[CalendarServiceV2] Endpoint V2 falhou, usando V1:', v2Error);
      }
    }
    
    // Fallback para V1
    const response = await API.get<HolidaysResponse>(`/calendar/holidays?year=${targetYear}`);
    
    if (response.data?.success) {
      const holidays = response.data.holidays;
      // Salva no cache
      holidaysCache.set(targetYear, holidays);
      return holidays;
    }
    
    return [];
  } catch (error) {
    console.error('[CalendarServiceV2] Erro ao buscar feriados:', error);
    return [];
  }
};

/**
 * Busca feriados para múltiplos anos (útil para calendário que cruza anos)
 * @param years - Array de anos para buscar
 * @returns Record<ano, feriados>
 */
export const getHolidaysForYears = async (years: number[]): Promise<Record<number, Holiday[]>> => {
  const results: Record<number, Holiday[]> = {};
  
  await Promise.all(
    years.map(async (year) => {
      results[year] = await getHolidaysV2(year);
    })
  );
  
  return results;
};

// ============================================
// CACHE MANAGEMENT
// ============================================

/**
 * Limpa o cache de feriados
 * @param year - Ano específico ou undefined para limpar tudo
 */
export const clearHolidaysCache = (year?: number): void => {
  if (year) {
    holidaysCache.delete(year);
    console.log(`[CalendarServiceV2] Cache limpo para ${year}`);
  } else {
    holidaysCache.clear();
    console.log('[CalendarServiceV2] Cache limpo completamente');
  }
};

/**
 * Verifica se tem cache para um ano
 */
export const hasHolidaysCache = (year: number): boolean => {
  return holidaysCache.has(year);
};

// ============================================
// UTILITY FUNCTIONS (mesmas do V1)
// ============================================

/**
 * Converte array de feriados para objeto indexado por data (mais eficiente para lookup)
 * @param holidays - Array de feriados
 * @returns Record<data, Holiday>
 */
export const holidaysToMap = (holidays: Holiday[]): Record<string, Holiday> => {
  return holidays.reduce((map, holiday) => {
    map[holiday.date] = holiday;
    return map;
  }, {} as Record<string, Holiday>);
};

/**
 * Verifica se uma data é feriado
 * @param dateStr - Data no formato YYYY-MM-DD
 * @param holidaysMap - Mapa de feriados (de holidaysToMap)
 * @returns true se for feriado
 */
export const isHoliday = (dateStr: string, holidaysMap: Record<string, Holiday>): boolean => {
  return !!holidaysMap[dateStr];
};

/**
 * Verifica se um horário específico está bloqueado por feriado
 * @param dateStr - Data no formato YYYY-MM-DD
 * @param time - Horário no formato HH:mm
 * @param holidaysMap - Mapa de feriados
 * @returns true se o horário estiver bloqueado
 */
export const isTimeBlockedByHoliday = (
  dateStr: string, 
  time: string, 
  holidaysMap: Record<string, Holiday>
): boolean => {
  const holiday = holidaysMap[dateStr];
  if (!holiday) return false;
  
  // Feriado integral - todos os horários bloqueados
  if (holiday.type === 'full') {
    return true;
  }
  
  // Feriado parcial - verifica período
  const hour = parseInt(time.split(':')[0], 10);
  
  if (holiday.type === 'morning') {
    // Manhã livre (até 12h), tarde bloqueada
    return hour >= 12;
  }
  
  if (holiday.type === 'afternoon') {
    // Tarde livre (a partir de 12h), manhã bloqueada
    return hour < 12;
  }
  
  return false;
};

/**
 * Hook helper para filtrar slots disponíveis considerando feriados
 * @param slots - Array de slots (strings ou objetos SlotAvailability)
 * @param dateStr - Data no formato YYYY-MM-DD
 * @param holidaysMap - Mapa de feriados
 * @returns Slots filtrados com disponibilidade atualizada
 */
export interface SlotAvailability {
  time: string;
  available: boolean;
  reason?: 'holiday' | 'appointment' | 'blocked';
  label?: string;
}

export const filterSlotsByHoliday = <T extends { time: string; available?: boolean } | string>(
  slots: T[],
  dateStr: string,
  holidaysMap: Record<string, Holiday>
): T[] => {
  const holiday = holidaysMap[dateStr];
  if (!holiday) return slots;
  
  return slots.map((slot) => {
    const time = typeof slot === 'string' ? slot : slot.time;
    const isBlocked = isTimeBlockedByHoliday(dateStr, time, holidaysMap);
    
    if (typeof slot === 'string') {
      // Converte string para objeto se necessário
      return {
        time,
        available: !isBlocked,
        reason: isBlocked ? 'holiday' : undefined,
        label: isBlocked ? holiday.name : undefined
      } as unknown as T;
    }
    
    // Atualiza objeto existente
    return {
      ...(slot as Record<string, any>),
      available: isBlocked ? false : ((slot as any).available !== false),
      reason: isBlocked ? 'holiday' : (slot as any).reason,
      label: isBlocked ? holiday.name : (slot as any).label
    } as T;
  });
};

// ============================================
// SERVICE EXPORT
// ============================================

export const calendarServiceV2 = {
  getHolidays: getHolidaysV2,
  getHolidaysForYears,
  clearCache: clearHolidaysCache,
  hasCache: hasHolidaysCache,
  holidaysToMap,
  isHoliday,
  isTimeBlockedByHoliday,
  filterSlotsByHoliday
};

// Export default mantém compatibilidade
export default calendarServiceV2;
