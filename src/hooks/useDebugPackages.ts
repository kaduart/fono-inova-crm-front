/**
 * 🔍 Hook de debug para listar pacotes
 * Loga TUDO no console
 */

import { useQuery } from '@tanstack/react-query';
import API from '@/services/api';

export const useDebugPackages = (patientId: string) => {
  return useQuery({
    queryKey: ['debug-packages', patientId],
    queryFn: async () => {
      console.log('🔍 [DEBUG] Buscando pacotes para:', patientId);
      
      const response = await API.get('/v2/packages', {
        params: { patientId, page: 1, limit: 10 }
      });
      
      console.log('🔍 [DEBUG] Resposta RAW:', response);
      console.log('🔍 [DEBUG] Response.data:', response.data);
      console.log('🔍 [DEBUG] Response.data.data:', response.data?.data);
      console.log('🔍 [DEBUG] Response.data.data.packages:', response.data?.data?.packages);
      console.log('🔍 [DEBUG] Total pacotes:', response.data?.data?.packages?.length);
      
      return response.data;
    },
    enabled: !!patientId,
  });
};

export default useDebugPackages;
