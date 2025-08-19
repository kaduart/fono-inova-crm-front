import API from './api';

class MetricService {
  static async getAllMetrics() {
    try {
      const response = await API.get('/evolutions/metrics');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      return [];
    }
  }
}

export default MetricService;