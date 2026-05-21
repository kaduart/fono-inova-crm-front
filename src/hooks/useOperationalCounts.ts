// src/hooks/useOperationalCounts.ts
import { useEffect, useState } from 'react';
import { leadService } from '../services/leadService';

interface OperationalCounts {
  overdue: number;
  today: number;
  total: number;
}

export const useOperationalCounts = () => {
  const [counts, setCounts] = useState<OperationalCounts>({ overdue: 0, today: 0, total: 0 });

  useEffect(() => {
    const load = async () => {
      const data = await leadService.getOperationalCounts();
      setCounts(data);
    };

    load();
    const interval = setInterval(load, 5 * 60 * 1000); // atualiza a cada 5 min
    return () => clearInterval(interval);
  }, []);

  return counts;
};
