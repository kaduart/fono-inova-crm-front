// src/services/fiscalService.ts
// Service mínimo para integração com o módulo fiscal NFS-e (MVP).

import API from './api';

export interface FiscalInvoiceEmitPayload {
  fiscalProfileId: string;
  origin: { type: 'appointment' | 'package' | 'invoice' | 'manual' | 'batch'; id: string };
  patient: string;
  professional?: string;
  serviceDescription?: string;
  serviceCode?: string;
  valorServico?: number;
  valorLiquido?: number;
  vISSQN?: number;
  dCompet?: string;
}

export interface FiscalProfilePayload {
  cnpj: string;
  razaoSocial: string;
  municipioIBGE: string;
  cnae?: string;
  codigoServicoLC116?: string;
  inscricaoMunicipal?: string;
  regimeTributario?: 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
  ambiente?: 'producao' | 'producao_restrita';
  certificateRef?: string;
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cep?: string;
  };
}

export interface FiscalProfileResponse {
  success: boolean;
  data: any;
}

export interface FiscalInvoiceResponse {
  success: boolean;
  data: {
    fiscalInvoice: any;
    outcome: 'authorized' | 'rejected' | 'network_error' | 'timeout';
  };
}

export interface CertificateUploadPayload {
  file: File;
  type: string;
  password: string;
  issuer?: string;
  thumbprint?: string;
  status?: string;
}

export const fiscalService = {
  async getProfile(cnpj: string): Promise<FiscalProfileResponse> {
    const { data } = await API.get('/v2/fiscal/profile', { params: { cnpj } });
    return data;
  },

  async upsertProfile(payload: FiscalProfilePayload): Promise<FiscalProfileResponse> {
    const { data } = await API.post('/v2/fiscal/profile', payload);
    return data;
  },

  async createCertificate(payload: CertificateUploadPayload): Promise<any> {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('type', payload.type);
    formData.append('password', payload.password);
    if (payload.issuer) formData.append('issuer', payload.issuer);
    if (payload.thumbprint) formData.append('thumbprint', payload.thumbprint);
    if (payload.status) formData.append('status', payload.status);
    // Não define Content-Type manualmente — o interceptor global de api.ts já detecta FormData
    // e deixa o navegador definir o multipart/form-data com o boundary correto (ver o "FIX" lá).
    const { data } = await API.post('/v2/fiscal/certificates', formData);
    return data;
  },

  async listCertificates(status?: string): Promise<any> {
    const { data } = await API.get('/v2/fiscal/certificates', { params: { status } });
    return data;
  },

  async emitInvoice(payload: FiscalInvoiceEmitPayload): Promise<FiscalInvoiceResponse> {
    const { data } = await API.post('/v2/fiscal/nfse/emit', payload);
    return data;
  },

  async emitFromPayment(paymentId: string, payload?: Partial<FiscalInvoiceEmitPayload>): Promise<FiscalInvoiceResponse> {
    const { data } = await API.post('/v2/fiscal/nfse/emit-from-payment', { paymentId, ...payload });
    return data;
  },

  async listInvoices(params?: { status?: string; patient?: string; limit?: number; page?: number }): Promise<any> {
    const { data } = await API.get('/v2/fiscal/nfse', { params });
    return data;
  },

  async getInvoice(id: string): Promise<any> {
    const { data } = await API.get(`/v2/fiscal/nfse/${id}`);
    return data;
  },

  async retryInvoice(id: string): Promise<any> {
    const { data } = await API.post(`/v2/fiscal/nfse/${id}/retry`);
    return data;
  },

  async cancelInvoice(id: string): Promise<any> {
    const { data } = await API.post(`/v2/fiscal/nfse/${id}/cancel`);
    return data;
  },

  downloadXmlUrl(id: string): string {
    return `${API.defaults.baseURL}/v2/fiscal/nfse/${id}/xml`;
  },

  downloadPdfUrl(id: string): string {
    return `${API.defaults.baseURL}/v2/fiscal/nfse/${id}/pdf`;
  }
};
