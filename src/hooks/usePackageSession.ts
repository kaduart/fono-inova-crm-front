import { useState } from 'react';
import { toast } from 'react-hot-toast';
import API from '../services/api';
import { packageService } from '../services/packageService';
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
    // 🚀 V2: Usa packageService em vez de chamar API direto
    createPackage: (data: any) => 
      withTransaction(
        () => packageService.createPackage(data), 
        'Pacote criado',
        ['dashboard', 'patients']
      ),
    // 🚀 V2: Usa packageService
    addPayment: (packageId: string, payment: any) =>
      withTransaction(
        () => packageService.createPayment(packageId, payment), 
        'Pagamento registrado',
        ['dashboard', 'patients']
      ),
    generateReport: () =>
      withTransaction(
        () => API.get('/v2/packages/reports/financial'), 
        'Relatório gerado'
      ),
    // 🚀 V2: Usa packageService
    updatePackage: (packageId: string, data: any) =>
      withTransaction(
        () => packageService.updatePackage(packageId, data),
        'Pacote atualizado',
        ['dashboard', 'patients']
      ),
    // 🚀 V2: Usa packageService
    deletePackage: (packageId: string) =>
      withTransaction(
        () => packageService.deletePackage(packageId),
        'Pacote removido',
        ['dashboard', 'patients']
      )
  };
};

export default useTherapyPackage;
