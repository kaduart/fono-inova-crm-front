import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn();
const post = vi.fn();
vi.mock('../api', () => ({ default: { get: (...a: any[]) => get(...a), post: (...a: any[]) => post(...a) } }));

import { fixedExpenseService } from '../expenseService';

describe('fixedExpenseService — ordem year/month (regressão: chegava year=10&month=2026 e o back dava 400)', () => {
  beforeEach(() => {
    get.mockReset().mockResolvedValue({ data: { data: { count: 0, items: [] } } });
    post.mockReset().mockResolvedValue({ data: { success: true, created: [], skipped: [], errors: [] } });
  });

  it('pendingGeneration envia year=2026 e month=10', async () => {
    await fixedExpenseService.pendingGeneration({ year: 2026, month: 10 });
    expect(get).toHaveBeenCalledWith('/v2/fixed-expenses/pending-generation', { params: { year: 2026, month: 10 } });
  });

  it('generate envia year=2026 e month=10 no corpo', async () => {
    await fixedExpenseService.generate({ year: 2026, month: 10 });
    expect(post).toHaveBeenCalledWith('/v2/fixed-expenses/generate', { year: 2026, month: 10 }, expect.anything());
  });
});
