import { describe, expect, it } from 'vitest';
import {
  extractErrorMessage,
  extractScheduleConflictMessage,
  extractErrorCode,
  isConflictError,
  isValidationError,
  isNotFoundError,
  isCriticalError,
  isNetworkError,
} from '../errorUtils';

describe('errorUtils', () => {
  describe('extractErrorMessage', () => {
    it('returns string error directly', () => {
      expect(extractErrorMessage('simple error')).toBe('simple error');
    });

    it('extracts response.data.error string', () => {
      const error = { response: { data: { error: 'Backend error' } } };
      expect(extractErrorMessage(error)).toBe('Backend error');
    });

    it('extracts response.data.message when error is absent', () => {
      const error = { response: { data: { message: 'Detailed message' } } };
      expect(extractErrorMessage(error)).toBe('Detailed message');
    });

    it('joins array of validation errors', () => {
      const error = {
        response: {
          data: {
            errors: [{ message: 'Field A required' }, { message: 'Field B invalid' }],
          },
        },
      };
      expect(extractErrorMessage(error)).toBe('Field A required, Field B invalid');
    });

    it('falls back to default message for unknown shapes', () => {
      expect(extractErrorMessage(null, 'Fallback')).toBe('Fallback');
      expect(extractErrorMessage({}, 'Fallback')).toBe('Fallback');
    });
  });

  describe('extractScheduleConflictMessage', () => {
    // Reproduz: mensagem detalhada de conflito de agenda não aparece no modal de edição
    it('returns detailed message for backend schedule conflict with conflict object', () => {
      const error = {
        response: {
          status: 409,
          data: {
            error: 'Conflito de agenda médica',
            message: 'O médico já possui um compromisso neste horário',
            conflict: {
              appointmentId: '6a314978a16c83a1feae4d48',
              patientName: 'Ercy Jacinto da Silva',
              existingAppointment: {
                _id: '6a314978a16c83a1feae4d48',
                date: '2026-07-02T18:00:00.000Z',
                time: '15:00',
                patient: {
                  _id: '69df8fb7184611c8dae768a2',
                  fullName: 'Ercy Jacinto da Silva',
                },
              },
            },
            suggestion: 'Por favor, escolha outro horário ou médico',
          },
        },
      };

      const msg = extractScheduleConflictMessage(error);
      expect(msg).toContain('O médico já possui um compromisso neste horário');
      expect(msg).toContain('Ercy Jacinto da Silva');
      expect(msg).toContain('02/07/2026');
      expect(msg).toContain('15:00');
      expect(msg).toContain('Por favor, escolha outro horário ou médico');
    });

    it('handles SCHEDULE_CONFLICT errorCode format', () => {
      const error = {
        response: {
          data: {
            errorCode: 'SCHEDULE_CONFLICT',
            data: {
              date: '02/07/2026',
              time: '15:00',
              patientName: 'Ercy Jacinto da Silva',
              patientPhone: '(62) 99999-9999',
              doctorName: 'Dr. Ricardo Maia',
            },
          },
        },
      };

      const msg = extractScheduleConflictMessage(error);
      expect(msg).toContain('02/07/2026');
      expect(msg).toContain('15:00');
      expect(msg).toContain('Ercy Jacinto da Silva');
      expect(msg).toContain('Dr. Ricardo Maia');
    });

    it('handles APPOINTMENT_SLOT_CONFLICT code format', () => {
      const error = {
        response: {
          data: {
            code: 'APPOINTMENT_SLOT_CONFLICT',
            message: 'Slot already taken',
          },
        },
      };

      expect(extractScheduleConflictMessage(error)).toBe('Slot already taken');
    });

    it('returns null for non-conflict errors', () => {
      expect(extractScheduleConflictMessage(null)).toBeNull();
      expect(extractScheduleConflictMessage({ message: 'Generic error' })).toBeNull();
      expect(
        extractScheduleConflictMessage({ response: { data: { code: 'CANNOT_EDIT_COMPLETED_APPOINTMENT' } } })
      ).toBeNull();
    });
  });

  describe('extractErrorCode', () => {
    it('extracts code from response data', () => {
      expect(extractErrorCode({ response: { data: { code: 'FOO' } } })).toBe('FOO');
    });

    it('falls back to error.code', () => {
      expect(extractErrorCode({ code: 'BAR' })).toBe('BAR');
    });

    it('returns null when no code exists', () => {
      expect(extractErrorCode({})).toBeNull();
    });
  });

  describe('isConflictError', () => {
    it('detects CONFLICT_STATE', () => {
      expect(isConflictError({ response: { data: { code: 'CONFLICT_STATE' } } })).toBe(true);
    });

    it('detects ALREADY_EXISTS', () => {
      expect(isConflictError({ response: { data: { code: 'ALREADY_EXISTS' } } })).toBe(true);
    });

    it('returns false for other codes', () => {
      expect(isConflictError({ response: { data: { code: 'NOT_FOUND' } } })).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('detects VALIDATION_ERROR', () => {
      expect(isValidationError({ response: { data: { code: 'VALIDATION_ERROR' } } })).toBe(true);
    });

    it('returns false for non-validation codes', () => {
      expect(isValidationError({ response: { data: { code: 'INTERNAL_ERROR' } } })).toBe(false);
    });
  });

  describe('isNotFoundError', () => {
    it('detects NOT_FOUND', () => {
      expect(isNotFoundError({ response: { data: { code: 'NOT_FOUND' } } })).toBe(true);
    });

    it('returns false for other codes', () => {
      expect(isNotFoundError({ response: { data: { code: 'VALIDATION_ERROR' } } })).toBe(false);
    });
  });

  describe('isCriticalError', () => {
    it('detects critical codes', () => {
      expect(isCriticalError({ response: { data: { code: 'INTERNAL_ERROR' } } })).toBe(true);
    });

    it('detects critical message patterns', () => {
      expect(isCriticalError({ response: { data: { message: 'A sessão já foi completada' } } })).toBe(true);
    });

    it('returns false for harmless messages', () => {
      expect(isCriticalError({ response: { data: { message: 'Campo obrigatório' } } })).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('detects ECONNABORTED', () => {
      expect(isNetworkError({ code: 'ECONNABORTED' })).toBe(true);
    });

    it('detects request without response', () => {
      expect(isNetworkError({ request: {}, response: undefined })).toBe(true);
    });

    it('returns false for normal API errors', () => {
      expect(isNetworkError({ response: { data: { message: 'Bad request' } } })).toBe(false);
    });
  });
});
