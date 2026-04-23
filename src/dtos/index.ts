/**
 * DTOs (Data Transfer Objects)
 *
 * Camada de sanitização de payloads entre frontend e API.
 * Garante contrato consistente, remove campos vazios/inválidos
 * e normaliza enums antes do envio.
 */

// Request DTOs (frontend → API)
export * from './appointment.dto';
export * from './payment.dto';

// Response DTOs (API → frontend)
export * from './patient.response.dto';
export * from './appointment.response.dto';
export * from './payment.response.dto';
export * from './session.response.dto';
