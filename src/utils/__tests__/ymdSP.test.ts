import { describe, it, expect } from 'vitest';
import { ymdSP } from '../dateFormat';

describe('ymdSP', () => {
  it('23h em São Paulo continua no mesmo dia (UTC já virou)', () => {
    // 31/10 23:30 em SP = 01/11 02:30 UTC
    expect(ymdSP(new Date('2026-11-01T02:30:00Z'))).toBe('2026-10-31');
  });
  it('data salva ao meio-dia UTC mantém o dia', () => {
    expect(ymdSP('2026-10-31T12:00:00Z')).toBe('2026-10-31');
  });
});
