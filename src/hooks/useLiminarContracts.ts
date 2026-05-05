import { useCallback, useEffect, useState } from 'react';
import liminarContractService, {
  CommittedBalance,
  LiminarContract,
  TherapeuticPlan,
} from '../services/liminarContractService';

export interface ContractWithPlan {
  contract: LiminarContract;
  plan: TherapeuticPlan | null;
  planError: string | null;
  committed: CommittedBalance | null;
}

export function useLiminarContracts(patientId: string | undefined) {
  const [items, setItems] = useState<ContractWithPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const contracts = await liminarContractService.list(patientId);
      const loaded = await Promise.all(
        contracts.map(async (contract) => {
          const [planResult, committed] = await Promise.all([
            liminarContractService.getActivePlanWithError(contract._id),
            liminarContractService.getCommittedBalance(contract._id),
          ]);
          return { contract, plan: planResult.plan, planError: planResult.error, committed };
        })
      );
      setItems(loaded);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Erro ao carregar liminares');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { items, loading, error, fetchData };
}
