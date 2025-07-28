import { useState } from 'react';
import { toast } from 'react-hot-toast';

const useTherapyPackage = () => {
  const [loading, setLoading] = useState(false);

  const withTransaction = async (operation: () => Promise<any>, successMessage: string) => {
    setLoading(true);
    try {
      const result = await operation();
      toast.success(successMessage);
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erro na operação';
      toast.error(`Erro: ${errorMessage}`);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createPackage: (data) => withTransaction(() => API.post('/therapy-packages', data), 'Pacote criado'),
    addPayment: (packageId, payment) =>
      withTransaction(() => API.post(`/therapy-packages/${packageId}/payments`, payment), 'Pagamento registrado'),
    generateReport: () =>
      withTransaction(() => API.get('/therapy-packages/reports/financial'), 'Relatório gerado')
  };
};