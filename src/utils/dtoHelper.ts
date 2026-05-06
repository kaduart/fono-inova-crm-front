/**
 * 🚀 Helpers para consumo seguro de DTOs V2
 *
 * Implementa o padrão prescrito em DTO_V2_MIGRATION_GUIDE.md.
 * Compatível com V1 (array/objeto direto) e V2 ({ success, data, meta }).
 */

export interface DtoSuccess<T> {
  success: true;
  data: T;
  meta: {
    version: 'v2';
    correlationId: string;
    timestamp: string;
    message?: string;
  };
}

export interface DtoError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    version: 'v2';
    timestamp: string;
  };
}

export type DtoResponse<T> = DtoSuccess<T> | DtoError;

/**
 * Extrai o payload real de uma resposta de API.
 * Suporta V2 (wrapper) e V1 (direto) sem quebrar.
 */
export function extractData<T>(response: any): T {
  const dto = response?.data;

  // Se não tem wrapper V2, retorna direto (fallback V1)
  if (!dto || typeof dto.success !== 'boolean') {
    return dto as T;
  }

  if (dto.success) {
    return dto.data as T;
  }

  throw new Error(dto.error?.message || 'Erro desconhecido no servidor');
}

/**
 * Extrai informações de erro de uma resposta de API.
 */
export function extractError(response: any): { code: string; message: string; details?: any } {
  const dto = response?.data;

  if (dto?.success === false) {
    return {
      code: dto.error?.code || 'UNKNOWN',
      message: dto.error?.message || 'Erro desconhecido',
      details: dto.error?.details,
    };
  }

  return { code: 'UNKNOWN', message: 'Erro desconhecido' };
}

/**
 * Verifica se a resposta segue o formato DTO V2.
 */
export function isV2Dto(response: any): boolean {
  return response?.data && typeof response.data.success === 'boolean';
}

/**
 * 🎯 Handler completo para promises de API.
 * Recebe uma promise do Axios, detecta V1/V2 automaticamente,
 * extrai dados ou lança erro padronizado.
 *
 * Exemplo:
 *   const evolutions = await handleV2Response<Evolution[]>(
 *     API.get(`/v2/evolutions/patient/${patientId}`)
 *   );
 */
export async function handleV2Response<T>(promise: Promise<any>): Promise<T> {
  const response = await promise;

  if (isV2Dto(response)) {
    if (!response.data.success) {
      const err = extractError(response);
      const error = new Error(err.message);
      (error as any).code = err.code;
      (error as any).details = err.details;
      (error as any).response = response;
      throw error;
    }
    return response.data.data as T;
  }

  // Fallback V1
  return response.data as T;
}
