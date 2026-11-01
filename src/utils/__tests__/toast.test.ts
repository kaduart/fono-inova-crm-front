import { describe, it, expect, vi, beforeEach } from 'vitest';

const base = vi.hoisted(() => {
  const fn: any = vi.fn();
  fn.success = vi.fn(); fn.error = vi.fn(); fn.info = vi.fn(); fn.warning = vi.fn(); fn.loading = vi.fn();
  fn.custom = vi.fn(); fn.dismiss = vi.fn();
  return fn;
});
vi.mock('sonner', () => ({ toast: base }));

import { toast } from '../toast';

describe('toast (wrapper Sonner)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('repassa id e duration', () => {
    toast.success('ok', { id: 'a', duration: 7000 });
    expect(base.success).toHaveBeenCalledWith('ok', expect.objectContaining({ id: 'a', duration: 7000 }));
  });

  it('aceita os aliases do react-toastify (toastId/autoClose)', () => {
    toast.error('x', { toastId: 'b', autoClose: false });
    expect(base.error).toHaveBeenCalledWith('x', expect.objectContaining({ id: 'b', duration: Infinity }));
  });

  it('toast() neutro, info e warn existem', () => {
    toast('oi', { icon: 'ℹ️' });
    expect(base).toHaveBeenCalledWith('oi', expect.objectContaining({ icon: 'ℹ️' }));
    toast.info('i'); toast.warn('w');
    expect(base.info).toHaveBeenCalled();
    expect(base.warning).toHaveBeenCalled();
  });

  it('mesmo id reaproveitado: Sonner atualiza o aviso existente', () => {
    toast.error('1', { id: 'dup' }); toast.error('2', { id: 'dup' });
    expect(base.error).toHaveBeenLastCalledWith('2', expect.objectContaining({ id: 'dup' }));
    expect(toast.isActive('dup')).toBe(true);
  });

  it('render por função recebe id/dismiss', () => {
    const render = vi.fn(() => 'conteudo');
    toast(render as any);
    const [fn] = base.custom.mock.calls[0];
    fn('t1');
    const handle = render.mock.calls[0][0] as any;
    expect(handle.id).toBe('t1');
    handle.dismiss();
    expect(base.dismiss).toHaveBeenCalledWith('t1');
  });

  it('dismiss repassa o id', () => {
    toast.dismiss('t9');
    expect(base.dismiss).toHaveBeenCalledWith('t9');
  });
});
