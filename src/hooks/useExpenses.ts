// src/hooks/useExpenses.ts
import { useState, useCallback } from 'react';
import { expenseService, Expense, ExpenseFilters } from '../services/expenseService';
import { toast } from 'react-toastify';
import { invalidateCache } from '../utils/cacheManager';
import { extractErrorMessage } from '../utils/errorUtils';

export const useExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
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

  const generateCommissions = useCallback(async (month?: number, year?: number) => {
    try {
      const response = await expenseService.generateCommissions(month, year);
      toast.success(`${response.data.generated} comissões geradas com sucesso!`);
      invalidateCache('dashboard');
      return response.data;
    } catch (error: any) {
      toast.error(extractErrorMessage(error, 'Erro ao gerar comissões'));
      throw error;
    }
  }, []);

  return {
    expenses,
    loading,
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
