import { useCallback, useEffect, useState } from 'react';
import liminarContractService, {
  GenerateSessionsResult,
  LiminarContract,
  TherapeuticPlan,
} from '../services/liminarContractService';

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function useLiminarContract(patientId: string | undefined) {
  const [contract, setContract] = useState<LiminarContract | null>(null);
  const [plan, setPlan] = useState<TherapeuticPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const contracts = await liminarContractService.list(patientId);
      const active = contracts.find((c) => c.status === 'active') ?? contracts[0] ?? null;
      setContract(active);

      if (active) {
        const activePlan = await liminarContractService.getActivePlan(active._id);
        setPlan(activePlan);
      } else {
        setPlan(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao carregar dados da liminar');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function generateSessions(weeks: 4 | 8): Promise<GenerateSessionsResult> {
    if (!contract || !plan) throw new Error('Contrato ou plano não carregado');
    return liminarContractService.generateSessions(contract._id, plan._id, {
      startDate: addDays(0),
      endDate: addDays(weeks * 7),
    });
  }

  async function recharge(amount: number, reason?: string): Promise<void> {
    if (!contract) throw new Error('Contrato não carregado');
    const updated = await liminarContractService.recharge(contract._id, amount, reason);
    setContract(updated);
  }

  return { contract, plan, loading, error, fetchData, generateSessions, recharge };
}
