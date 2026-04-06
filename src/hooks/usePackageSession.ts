import { useState } from 'react';
import { toast } from 'react-hot-toast';
import API from '../services/api';
import { invalidateCache } from '../utils/cacheManager';
import { extractErrorMessage } from '../utils/errorUtils';

const useTherapyPackage = () => {
  const [loading, setLoading] = useState(false);

  const withTransaction = async (operation: () => Promise<any>, successMessage: string, invalidateCaches: string[] = []) => {
    setLoading(true);
    try {
      const result = await operation();
      toast.success(successMessage);
      
      // 🚀 Invalida caches especificados
      invalidateCaches.forEach(cacheKey => {
        invalidateCache(cacheKey as any);
      });
      
      return result;
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error, 'Erro na operação');
      toast.error(`Erro: ${errorMessage}`);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createPackage: (data: any) => 
      withTransaction(
        () => API.post('/therapy-packages', data), 
        'Pacote criado',
        ['dashboard', 'patients']
      ),
    addPayment: (packageId: string, payment: any) =>
      withTransaction(
        () => API.post(`/therapy-packages/${packageId}/payments`, payment), 
        'Pagamento registrado',
        ['dashboard', 'patients']
      ),
    generateReport: () =>
      withTransaction(
        () => API.get('/therapy-packages/reports/financial'), 
        'Relatório gerado'
      ),
    // 🚀 Nova função para atualizar package
    updatePackage: (packageId: string, data: any) =>
      withTransaction(
        () => API.patch(`/therapy-packages/${packageId}`, data),
        'Pacote atualizado',
        ['dashboard', 'patients']
      ),
    // 🚀 Nova função para deletar package
    deletePackage: (packageId: string) =>
      withTransaction(
        () => API.delete(`/therapy-packages/${packageId}`),
        'Pacote removido',
        ['dashboard', 'patients']
      )
  };
};

export default useTherapyPackage;
