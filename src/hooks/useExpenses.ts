// src/hooks/useExpenses.ts
import { useState, useCallback } from 'react';
import { expenseService, Expense, ExpenseFilters } from '../services/expenseService';
import { toast } from 'react-toastify';
import { invalidateCache } from '../utils/cacheManager';
import { extractErrorMessage } from '../utils/errorUtils';

export const useExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingCommissions, setGeneratingCommissions] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [totals, setTotals] = useState({ totalPaid: 0, totalPending: 0, countPaid: 0, countPending: 0 });

  const fetchExpenses = useCallback(async (filters?: ExpenseFilters) => {
    setLoading(true);
    try {
      const response = await expenseService.getAll(filters);
      setExpenses(response.data);
      setPagination(response.pagination);
      setTotals(response.totals);
    } catch (error: any) {
      toast.error(extractErrorMessage(error, 'Erro ao carregar despesas'));
    } finally {
      setLoading(false);
    }
  }, []);

  const createExpense = useCallback(async (data: Partial<Expense>) => {
    try {
      const response = await expenseService.create(data);
      toast.success(response.message);
      
      // 🚀 Invalida dashboard pois despesas afetam o financeiro
      invalidateCache('dashboard');
      
      return response.data;
    } catch (error: any) {
      toast.error(extractErrorMessage(error, 'Erro ao criar despesa'));
      throw error;
    }
  }, []);

  const updateExpense = useCallback(async (id: string, data: Partial<Expense>) => {
    try {
      const response = await expenseService.update(id, data);
      toast.success(response.message);
      
      // 🚀 Invalida dashboard pois despesas afetam o financeiro
      invalidateCache('dashboard');
      
      return response.data;
    } catch (error: any) {
      toast.error(extractErrorMessage(error, 'Erro ao atualizar despesa'));
      throw error;
    }
  }, []);

  const cancelExpense = useCallback(async (id: string) => {
    try {
      const response = await expenseService.cancel(id);
      toast.success(response.message);

      // 🚀 Invalida dashboard pois despesas afetam o financeiro
      invalidateCache('dashboard');
    } catch (error: any) {
      toast.error(extractErrorMessage(error, 'Erro ao cancelar despesa'));
      throw error;
    }
  }, []);

  const generateCommissions = useCallback(async (month?: number, year?: number, onComplete?: () => void) => {
    setGeneratingCommissions(true);
    try {
      const response = await expenseService.generateCommissions(month, year);

      // Resposta assíncrona: inicia polling do eventId
      if (response.status === 'processing' && response.eventId) {
        const pollResult = await expenseService.pollCommissionGenerationStatus(response.eventId, 30, 2000);

        if (pollResult.timeout) {
          toast.info(pollResult.error || 'A geração ainda está em andamento.');
          return response;
        }

        if (pollResult.success) {
          const generated = pollResult.status?.payload?.generated ?? pollResult.status?.result?.generated;
          toast.success(generated
            ? `${generated} comissões geradas com sucesso!`
            : 'Comissões geradas com sucesso!'
          );
          invalidateCache('dashboard');
          onComplete?.();
          return pollResult.status;
        } else {
          toast.error(pollResult.error || 'Erro ao gerar comissões');
          throw new Error(pollResult.error);
        }
      }

      // Fallback para resposta síncrona legada
      toast.success(`${response.data?.generated ?? 0} comissões geradas com sucesso!`);
      invalidateCache('dashboard');
      onComplete?.();
      return response.data;
    } catch (error: any) {
      toast.error(extractErrorMessage(error, 'Erro ao gerar comissões'));
      throw error;
    } finally {
      setGeneratingCommissions(false);
    }
  }, []);

  return {
    expenses,
    loading,
    generatingCommissions,
    pagination,
    totals,
    fetchExpenses,
    createExpense,
    updateExpense,
    cancelExpense,
    generateCommissions
  };
};

export default useExpenses;
