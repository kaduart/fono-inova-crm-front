import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { getBalanceV2, addBalanceDebitV2 } from '../services/balanceService';

const QUERY_KEY = 'balance';

export function useBalanceV2(patientId: string | null) {
    const queryClient = useQueryClient();

    const { data: balance, isLoading, error, refetch } = useQuery({
        queryKey: [QUERY_KEY, patientId],
        queryFn: async () => {
            if (!patientId) return null;
            const response = await getBalanceV2(patientId);
            return response.data;
        },
        enabled: !!patientId,
        staleTime: 30 * 1000,
    });

    const addDebitMutation = useMutation({
        mutationFn: async (data: { amount: number; description: string; sessionId?: string; appointmentId?: string }) => {
            if (!patientId) throw new Error('Patient ID required');
            return addBalanceDebitV2(patientId, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY, patientId] });
            toast.success('Débito adicionado!');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erro ao adicionar débito');
        }
    });

    const addDebit = useCallback(async (data: { amount: number; description: string; sessionId?: string; appointmentId?: string }) => {
        return addDebitMutation.mutateAsync(data);
    }, [addDebitMutation]);

    return {
        balance,
        isLoading,
        error,
        refetch,
        addDebit,
        isAddingDebit: addDebitMutation.isPending
    };
}

export default useBalanceV2;
