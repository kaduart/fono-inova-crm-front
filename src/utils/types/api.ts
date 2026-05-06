/**
 * Tipagens genéricas para contrato de API V2
 *
 * Usadas em conjunto com dtoHelper.ts e safeAction.ts
 */

export interface ApiMeta {
  version: 'v2';
  correlationId: string;
  timestamp: string;
  message?: string;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: ApiErrorDetail;
  meta: ApiMeta;
}

export interface ApiSuccess<T> extends ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiFailure extends ApiResponse<never> {
  success: false;
  error: ApiErrorDetail;
}
