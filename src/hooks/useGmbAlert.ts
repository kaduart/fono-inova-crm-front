import { useEffect, useState } from 'react';
import api from '../services/api';

interface GmbHealth {
  stuckPublished: number;
  failed: number;
  noImage: number;
  retrying: number;
  total: number;
}

export const useGmbAlert = () => {
  const [health, setHealth] = useState<GmbHealth>({ stuckPublished: 0, failed: 0, noImage: 0, retrying: 0, total: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/gmb/posts/health');
        if (res.data?.success) setHealth(res.data.data);
      } catch {
        // silencioso — não quebra o header se backend offline
      }
    };

    load();
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return health;
};
