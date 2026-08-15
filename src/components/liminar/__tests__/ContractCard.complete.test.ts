import { beforeEach, describe, expect, it, vi } from 'vitest';

const { complete } = vi.hoisted(() => ({ complete: vi.fn() }));

vi.mock('../../../services/appointmentService', () => ({
  appointmentService: { complete },
}));

import { completeLiminarAppointment } from '../ContractCard';

describe('ContractCard - realizar atendimento', () => {
  beforeEach(() => complete.mockReset());

  it('fecha/atualiza somente depois do sucesso do endpoint canônico', async () => {
    let resolveRequest!: () => void;
    complete.mockReturnValue(new Promise<void>(resolve => { resolveRequest = resolve; }));
    const onSuccess = vi.fn();

    const request = completeLiminarAppointment('appointment-1', { billingType: 'liminar' }, onSuccess);
    expect(onSuccess).not.toHaveBeenCalled();
    resolveRequest();
    await request;
    expect(complete).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('mantém o modal aberto quando o complete falha', async () => {
    complete.mockRejectedValueOnce(new Error('sem crédito'));
    const onSuccess = vi.fn();

    await expect(completeLiminarAppointment('appointment-1', undefined, onSuccess))
      .rejects.toThrow('sem crédito');
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
