/**
 * useCalendarV2 Hook
 * 
 * Hook otimizado para gerenciamento de dados do calendário
 * Features:
 * - Cache inteligente de feriados
 * - Loading states
 * - Error handling
 */

import { useCallback, useEffect, useState } from 'react';
import { 
  calendarServiceV2, 
  Holiday 
} from '../services/calendarServiceV2';

interface UseCalendarV2Return {
  holidays: Holiday[];
  holidaysMap: Record<string, Holiday>;
  loading: boolean;
  error: string | null;
  refreshHolidays: (year?: number) => Promise<void>;
  isHoliday: (dateStr: string) => boolean;
  isTimeBlocked: (dateStr: string, time: string) => boolean;
}

export const useCalendarV2 = (year?: number): UseCalendarV2Return => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holidaysMap, setHolidaysMap] = useState<Record<string, Holiday>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetYear = year || new Date().getFullYear();

  const refreshHolidays = useCallback(async (specificYear?: number) => {
    const yearToFetch = specificYear || targetYear;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await calendarServiceV2.getHolidays(yearToFetch);
      setHolidays(data);
      setHolidaysMap(calendarServiceV2.holidaysToMap(data));
    } catch (err) {
      setError('Erro ao carregar feriados');
      console.error('[useCalendarV2] Erro:', err);
    } finally {
      setLoading(false);
    }
  }, [targetYear]);

  // Carrega feriados automaticamente no mount
  useEffect(() => {
    refreshHolidays();
  }, [refreshHolidays]);

  const isHoliday = useCallback((dateStr: string): boolean => {
    return calendarServiceV2.isHoliday(dateStr, holidaysMap);
  }, [holidaysMap]);

  const isTimeBlocked = useCallback((dateStr: string, time: string): boolean => {
    return calendarServiceV2.isTimeBlockedByHoliday(dateStr, time, holidaysMap);
  }, [holidaysMap]);

  return {
    holidays,
    holidaysMap,
    loading,
    error,
    refreshHolidays,
    isHoliday,
    isTimeBlocked
  };
};

export default useCalendarV2;
