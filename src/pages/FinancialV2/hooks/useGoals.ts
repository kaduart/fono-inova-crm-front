import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../../services/api';

export interface Goal {
    id?: string;
    month: number;
    year: number;
    exists: boolean;
    targets: {
        expectedRevenue: number;
        totalSessions: number;
        workHours: number;
    };
    actual: {
        actualRevenue: number;
        completedSessions: number;
    };
    progress: {
        revenuePercentage: number;
        gapRevenue: number;
        overallStatus: string;
    };
}

const fetchGoal = async (month: number, year: number): Promise<Goal> => {
    const response = await API.get('/v2/goals', { params: { month, year } });
    return response.data.data;
};

const saveGoal = async (data: { 
    month: number; 
    year: number; 
    type?: 'daily' | 'weekly' | 'monthly';
    startDate?: string;
    endDate?: string;
    expectedRevenue: number; 
    totalSessions?: number; 
    workHours?: number 
}): Promise<Goal> => {
    const response = await API.post('/v2/goals', data);
    return response.data.data;
};

export const useGoals = (month: number, year: number) => {
    const queryClient = useQueryClient();
    
    const query = useQuery({
        queryKey: ['goals', month, year],
        queryFn: () => fetchGoal(month, year)
    });
    
    const mutation = useMutation({
        mutationFn: saveGoal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['goals', month, year] });
            queryClient.invalidateQueries({ queryKey: ['projections', month, year] });
        }
    });
    
    return {
        ...query,
        saveGoal: mutation.mutate,
        isSaving: mutation.isPending
    };
};
