import API from './api';

class MetricService {
  static async getAllMetrics() {
    try {
      const response = await API.get('/v2/evolutions/metrics');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      return [];
    }
  }
}

export default MetricService;