/**
 * 🧬 Evolution Service — Camada de abstração para API de evoluções
 *
 * Princípio:
 * - Todas as operações via V2 (unwrap automático de DTO)
 * - Writes síncronos (garantia imediata de persistência)
 * - Side-effects (analytics, notificações) via eventos — não nossa responsabilidade
 */

import API from './api';
import { handleV2Response } from '../utils/dtoHelper';
import { safeAction } from '../utils/safeAction';
import type {
  Evolution,
  EvolutionChartData,
  EvolutionProgressData,
  CreateEvolutionPayload,
  UpdateEvolutionPayload,
} from '../utils/types/evolution';

const BASE_V2 = '/v2/evolutions';

// ─── READS (V2 com DTO) ───────────────────────────────────────────────

export async function fetchEvolutionsByPatient(patientId: string): Promise<Evolution[]> {
  return handleV2Response<Evolution[]>(
    API.get(`${BASE_V2}/patient/${patientId}`)
  );
}

export async function fetchEvolutionChart(patientId: string): Promise<EvolutionChartData | null> {
  return handleV2Response<EvolutionChartData | null>(
    API.get(`${BASE_V2}/chart/${patientId}`)
  );
}

export async function fetchEvolutionProgress(patientId: string): Promise<EvolutionProgressData | null> {
  return handleV2Response<EvolutionProgressData | null>(
    API.get(`${BASE_V2}/patient/${patientId}/progress`)
  );
}

export async function fetchLastEvolution(patientId: string): Promise<Evolution | null> {
  try {
    return await handleV2Response<Evolution>(
      API.get(`${BASE_V2}/patient/${patientId}/last`)
    );
  } catch (err: any) {
    // 404 é esperado quando não há evolução ainda
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

export interface PendingEvolution {
  _id: string;
  fullName: string;
  lastCompletedDate: string;
  lastEvolutionDate: string | null;
}

/** Pacientes atendidos (últimos 90 dias) sem evolução registrada após o último atendimento. */
export async function fetchPendingEvolutions(doctorId?: string): Promise<PendingEvolution[]> {
  return handleV2Response<PendingEvolution[]>(
    API.get(`${BASE_V2}/pending`, { params: doctorId ? { doctorId } : {} })
  );
}

// ─── WRITES (V2 síncrono — feedback imediato ao profissional) ─────────

export async function createEvolution(payload: CreateEvolutionPayload): Promise<Evolution> {
  return handleV2Response<Evolution>(API.post(BASE_V2, payload));
}

export async function updateEvolution(id: string, payload: UpdateEvolutionPayload): Promise<Evolution> {
  return handleV2Response<Evolution>(API.put(`${BASE_V2}/${id}`, payload));
}

export async function deleteEvolution(id: string): Promise<void> {
  await handleV2Response(API.delete(`${BASE_V2}/${id}`));
}

// ─── SAFE ACTIONS (wrapper com toast + tratamento de erro) ────────────

export const evolutionSafeActions = {
  create: (payload: CreateEvolutionPayload) =>
    safeAction(() => createEvolution(payload), {
      successMessage: 'Evolução registrada com sucesso!',
      errorMessage: 'Erro ao registrar evolução',
      showToast: true,
      notifyChat: true,
    }),

  update: (id: string, payload: UpdateEvolutionPayload) =>
    safeAction(() => updateEvolution(id, payload), {
      successMessage: 'Evolução atualizada com sucesso!',
      errorMessage: 'Erro ao atualizar evolução',
      showToast: true,
      notifyChat: true,
    }),

  delete: (id: string) =>
    safeAction(() => deleteEvolution(id), {
      successMessage: 'Evolução excluída com sucesso!',
      errorMessage: 'Erro ao excluir evolução',
      showToast: true,
      notifyChat: true,
    }),
};
