// src/hooks/useOperationalCounts.ts
import { useEffect, useState } from 'react';
import API from '../services/api';
import { createSharedPoll, PollState } from '../utils/sharedPoll';

interface OperationalCounts {
  overdue: number;
  today: number;
  total: number;
}

const ZERO: OperationalCounts = { overdue: 0, today: 0, total: 0 };

// Uma única busca a cada 5 min para header + Dashboard, pausada com a aba oculta.
const poll = createSharedPoll<OperationalCounts>(
  async () => (await API.get('/leads/operational-counts')).data,
  5 * 60 * 1000,
);

export const useOperationalCounts = () => {
  const [state, setState] = useState<PollState<OperationalCounts>>(poll.getState());
  useEffect(() => poll.subscribe(setState), []);
  return { ...(state.data || ZERO), error: state.error && !state.data, reload: poll.refresh };
};
