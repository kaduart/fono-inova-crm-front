import { useCallback, useEffect, useRef, useState } from 'react';
import convenioWaitlistApi, {
  type WaitlistEntry,
  type WaitlistListParams,
  type WaitlistStatus,
  type WaitlistSummary,
} from '../services/convenioWaitlistService';

const errorMessage = (error: unknown, fallback: string): string => {
  const responseMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
  if (responseMessage) return responseMessage;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export const useConvenioWaitlist = () => {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<WaitlistSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Ignora respostas antigas quando o usuário troca filtro/página rápido (a última requisição vence)
  const listRequestId = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchList = useCallback(async (params: WaitlistListParams) => {
    const requestId = ++listRequestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await convenioWaitlistApi.list(params);
      if (!mounted.current || requestId !== listRequestId.current) return;
      setEntries(result.data);
      setTotal(result.total);
    } catch (err) {
      if (!mounted.current || requestId !== listRequestId.current) return;
      setError(errorMessage(err, 'Não foi possível carregar a lista de espera.'));
    } finally {
      if (mounted.current && requestId === listRequestId.current) setLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const result = await convenioWaitlistApi.summary();
      if (!mounted.current) return;
      setSummary(result);
      setSummaryError(null);
    } catch (err) {
      if (!mounted.current) return;
      setSummaryError(errorMessage(err, 'Não foi possível carregar os totais.'));
    }
  }, []);

  /** Atualiza status/notas no servidor e reflete a linha na tabela; devolve a entrada atualizada. */
  const updateEntry = useCallback(
    async (id: string, body: { status?: WaitlistStatus; notes?: string }): Promise<WaitlistEntry> => {
      const updated = await convenioWaitlistApi.update(id, body);
      if (mounted.current) {
        setEntries((current) => current.map((item) => (item._id === id ? { ...item, ...updated } : item)));
      }
      return updated;
    },
    [],
  );

  return { entries, total, loading, error, summary, summaryError, fetchList, fetchSummary, updateEntry };
};

export default useConvenioWaitlist;
