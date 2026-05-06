import API from './api';
import { extractData } from '../utils/dtoHelper';

class MetricService {
  static async getAllMetrics() {
    try {
      const response = await API.get('/v2/evolutions/metrics');
      return extractData(response);
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      return [];
    }
  }
}

export default MetricService;