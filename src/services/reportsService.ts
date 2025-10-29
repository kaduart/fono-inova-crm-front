import API from './api';
interface Report {
    _id: string;
    type: 'medical' | 'anamnesis' | 'school' | 'progress' | 'evolution' | 'assessment';
    title: string;
    summary?: string;
    patientId: string;
    patientName: string;
    patientAge?: number;
    date: string;
    content: {
        diagnosis?: string;
        observations?: string;
        progress?: string;
        goals?: string;
        recommendations?: string;
        nextSteps?: string;
        // Para anamnese
        medicalHistory?: any;
        familyHistory?: any;
        development?: any;
        // Para relatório escolar
        academicPerformance?: any;
        behavior?: any;
        // Campos dinâmicos
        [key: string]: any;
    };
    createdBy: string;
    createdByName: string;
    status: 'draft' | 'completed' | 'archived' | 'sent_to_school' | 'reviewed';
    createdAt: string;
    updatedAt: string;
}

class ReportsService {
  // Relatórios Médicos
  async getMedicalReports(patientId, params = {}) {
    const response = await API.get(`/reports/medical/patient/${patientId}`, { params });
    return response.data;
  }

  async getMedicalReportById(id) {
    const response = await API.get(`/reports/medical/${id}`);
    return response.data;
  }

  async createMedicalReport(data) {
    const response = await API.post('/reports/medical', data);
    return response.data;
  }

  async updateMedicalReport(id, data) {
    const response = await API.put(`/reports/medical/${id}`, data);
    return response.data;
  }

  async deleteMedicalReport(id) {
    const response = await API.delete(`/reports/medical/${id}`);
    return response.data;
  }

  // Anamneses
  async getAnamnesisReports(patientId, params = {}) {
    const response = await API.get(`/reports/anamnesis/patient/${patientId}`, { params });
    return response.data;
  }

  async getAnamnesisReportById(id) {
    const response = await API.get(`/reports/anamnesis/${id}`);
    return response.data;
  }

  async createAnamnesisReport(data) {
    const response = await API.post('/reports/anamnesis', data);
    return response.data;
  }

  async updateAnamnesisReport(id, data) {
    const response = await API.put(`/reports/anamnesis/${id}`, data);
    return response.data;
  }

  // Relatórios Escolares
  async getSchoolReports(patientId, params = {}) {
    const response = await API.get(`/reports/school/patient/${patientId}`, { params });
    return response.data;
  }

  async getSchoolReportById(id) {
    const response = await API.get(`/reports/school/${id}`);
    return response.data;
  }

  async createSchoolReport(data) {
    const response = await API.post('/reports/school', data);
    return response.data;
  }

  async updateSchoolReport(id, data) {
    const response = await API.put(`/reports/school/${id}`, data);
    return response.data;
  }

  async deleteSchoolReport(id) {
    const response = await API.delete(`/reports/school/${id}`);
    return response.data;
  }

  // Estatísticas
  async getPatientStats(patientId) {
    const response = await API.get(`/reports/medical/stats/patient/${patientId}`);
    return response.data;
  }

  // Busca geral com filtros
  async searchReports(filters = {}) {
    const response = await API.get('/reports/medical', { params: filters });
    return response.data;
  }
}

export default new ReportsService();