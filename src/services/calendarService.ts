import API from './api';

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

/**
 * Busca feriados nacionais para um ano específico
 * @param year - Ano para buscar feriados (padrão: ano atual)
 * @returns Lista de feriados com nome e tipo
 * 
 * Tipos de feriado:
 * - 'full': Feriado integral (ex: Natal, Ano Novo)
 * - 'morning': Manhã livre, tarde bloqueada (ex: Quarta-feira de Cinzas)
 * - 'afternoon': Tarde livre, manhã bloqueada
 */
export const getHolidays = async (year?: number): Promise<Holiday[]> => {
  try {
    const targetYear = year || new Date().getFullYear();
    const response = await API.get<HolidaysResponse>(`/calendar/holidays?year=${targetYear}`);
    
    if (response.data?.success) {
      return response.data.holidays;
    }
    
    return [];
  } catch (error) {
    console.error('[calendarService] Erro ao buscar feriados:', error);
    return [];
  }
};

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
      ...slot,
      available: isBlocked ? false : (slot.available !== false),
      reason: isBlocked ? 'holiday' : slot.reason,
      label: isBlocked ? holiday.name : slot.label
    } as T;
  });
};

export default {
  getHolidays,
  holidaysToMap,
  isHoliday,
  isTimeBlockedByHoliday,
  filterSlotsByHoliday
};
