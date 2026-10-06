import { describe, it, expect, vi, beforeEach } from 'vitest';

const base = vi.hoisted(() => {
  const fn: any = vi.fn((..._a: any[]) => 'id-default');
  fn.success = vi.fn(() => 'id-success');
  fn.error = vi.fn(() => 'id-error');
  fn.info = vi.fn(() => 'id-info');
  fn.warning = vi.fn(() => 'id-warning');
  fn.loading = vi.fn(() => 'id-loading');
  fn.dismiss = vi.fn();
  fn.update = vi.fn();
  fn.isActive = vi.fn(() => false);
  return fn;
});
vi.mock('react-toastify', () => ({ toast: base }));

import { toast } from '../toast';

describe('toast (wrapper react-toastify)', () => {
  beforeEach(() => { vi.clearAllMocks(); base.isActive.mockReturnValue(false); });

  it('traduz id → toastId e duration → autoClose', () => {
    toast.success('ok', { id: 'a', duration: 7000 });
    expect(base.success).toHaveBeenCalledWith('ok', expect.objectContaining({ toastId: 'a', autoClose: 7000 }));
  });

  it('duration Infinity mantém o aviso aberto', () => {
    toast.error('x', { duration: Infinity });
    expect(base.error).toHaveBeenCalledWith('x', expect.objectContaining({ autoClose: false }));
  });

  it('toast() neutro e toast.info/warn existem', () => {
    toast('oi', { icon: 'ℹ️' });
    expect(base).toHaveBeenCalledWith('oi', expect.objectContaining({ icon: 'ℹ️' }));
    toast.info('i');
    toast.warn('w');
    expect(base.info).toHaveBeenCalled();
    expect(base.warning).toHaveBeenCalled();
  });

  it('mesmo id ativo ATUALIZA em vez de empilhar', () => {
    base.isActive.mockReturnValue(true);
    const id = toast.error('de novo', { id: 'dup' });
    expect(id).toBe('dup');
    expect(base.update).toHaveBeenCalledWith('dup', expect.objectContaining({ render: 'de novo', type: 'error' }));
    expect(base.error).not.toHaveBeenCalled();
  });

  it('render por função recebe id/dismiss e não fecha ao clicar', () => {
    const render = vi.fn(() => 'conteudo');
    toast(render as any);
    const [content, opts] = base.mock.calls[0];
    expect(opts.closeOnClick).toBe(false);
    const closeToast = vi.fn();
    content({ toastProps: { toastId: 't1' }, closeToast });
    const handle = render.mock.calls[0][0] as any;
    expect(handle.id).toBe('t1');
    handle.dismiss();
    expect(closeToast).toHaveBeenCalled();
  });

  it('dismiss repassa o id', () => {
    toast.dismiss('t9');
    expect(base.dismiss).toHaveBeenCalledWith('t9');
  });
});
