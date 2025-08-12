import API from './api';

class MetricService {
  static async getAllMetrics() {
    try {
      const response = await API.get('/evolutions/metrics');
          console.log('Resposta completa do endpoint /metrics:', response);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      return [];
    }
  }
}

export default MetricService;