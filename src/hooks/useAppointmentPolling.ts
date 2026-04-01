import { useCallback, useRef, useState } from 'react';

export interface PollingState {
  id: string | null;
  status: 'idle' | 'polling' | 'completed' | 'failed';
  attempt: number;
  result?: unknown;
  error?: string;
}

export const useAppointmentPolling = () => {
  const [pollingState, setPollingState] = useState<PollingState>({
    id: null,
    status: 'idle',
    attempt: 0,
  });
  const [isPolling, setIsPolling] = useState(false);
  const abortRef = useRef(false);

  const cancelPolling = useCallback(() => {
    abortRef.current = true;
    setIsPolling(false);
    setPollingState(prev => ({ ...prev, status: 'idle' }));
  }, []);

  const pollAppointment = useCallback(async (
    id: string,
    checkFn: () => Promise<boolean>,
    options?: { interval?: number; maxAttempts?: number }
  ): Promise<boolean> => {
    abortRef.current = false;
    setIsPolling(true);
    setPollingState({ id, status: 'polling', attempt: 0 });

    const interval = options?.interval ?? 1000;
    const maxAttempts = options?.maxAttempts ?? 10;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (abortRef.current) {
        setIsPolling(false);
        return false;
      }
      setPollingState(prev => ({ ...prev, attempt }));
      try {
        const done = await checkFn();
        if (done) {
          setPollingState({ id, status: 'completed', attempt });
          setIsPolling(false);
          return true;
        }
      } catch (e) {
        // ignore and retry
      }
      await new Promise(r => setTimeout(r, interval));
    }

    setPollingState({ id, status: 'failed', attempt: maxAttempts, error: 'Max attempts reached' });
    setIsPolling(false);
    return false;
  }, []);

  return {
    pollingState,
    isPolling,
    cancelPolling,
    pollAppointment,
  };
};
