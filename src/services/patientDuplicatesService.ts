// Pacientes duplicados (03/11/2026) — back: routes/patients/duplicates.js
import API from './api';

export interface DuplicateCandidate {
  _id: string;
  fullName: string;
  dateOfBirth: string | null;
  phone: string | null;
  healthPlan: string | null;
  createdAt: string | null;
  level: 'forte' | 'nome';
  reasons: string[];
}

export interface DuplicateGroupPatient {
  id: string;
  nome: string;
  nascimento: string | null;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  convenio: string | null;
  origem: string | null;
  criadoEm: string | null;
  agendamentos: number;
  confirmadoOutraPessoa: boolean;
}

export interface DuplicateGroup {
  criterios: string[];
  quantidade: number;
  confirmedDistinct: boolean;
  sugestaoPrincipal: string;
  pacientes: DuplicateGroupPatient[];
}

export interface DuplicatesReport {
  totalPacientes: number;
  totalGrupos: number;
  totalPendentes: number;
  totalPacientesAfetados: number;
  duplicados: DuplicateGroup[];
}

export interface MergePreview {
  dryRun: boolean;
  principal: { id: string; nome: string };
  duplicado: { id: string; nome: string };
  mover: { collection: string; campo: string; documentos: number }[];
  saldo: string;
  camposCompletados: string[];
  lancamentosContabeisMantidos: number;
}

export const patientDuplicatesService = {
  async check(params: { fullName: string; dateOfBirth?: string | null; phone?: string | null; cpf?: string | null; excludeId?: string | null }, signal?: AbortSignal) {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
    const res = await API.get('/patients/check-duplicate', { params: clean, signal });
    return res.data as { isDuplicate: boolean; hasStrongMatch: boolean; possiveisDuplicados: DuplicateCandidate[] };
  },

  async report(): Promise<DuplicatesReport> {
    const res = await API.get('/patients/duplicates/report', { timeout: 60000 });
    return res.data;
  },

  async confirmDistinct(ids: string[]) {
    const res = await API.post('/patients/duplicates/confirm-distinct', { ids });
    return res.data;
  },

  async mergePreview(primaryId: string, duplicateId: string): Promise<MergePreview> {
    const res = await API.post('/patients/duplicates/merge', { primaryId, duplicateId, dryRun: true });
    return res.data.data;
  },

  async merge(primaryId: string, duplicateId: string): Promise<MergePreview & { movidos: Record<string, number> }> {
    const res = await API.post('/patients/duplicates/merge', { primaryId, duplicateId, dryRun: false, confirm: 'MESCLAR' }, { timeout: 120000 });
    return res.data.data;
  },
};
