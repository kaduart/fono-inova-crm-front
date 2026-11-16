import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNotificationMotion } from './useNotificationMotion';

describe('Dados da notificação durante a saída', () => {
  it('preserva a mensagem que saiu do contexto até o fim da animação', () => {
    const message = { id: 'first', text: 'Pagamento confirmado' };
    const { result, rerender } = renderHook(({ incoming }) => useNotificationMotion(incoming), {
      initialProps: { incoming: message as typeof message | null },
    });
    rerender({ incoming: null });
    expect(result.current.visible).toBe(false);
    expect(result.current.notification).toEqual(message);
  });

  it('ao chegar outro evento mostra os dados novos, sem reutilizar o paciente anterior', () => {
    const first = { id: 'first', text: 'Paciente A' };
    const second = { id: 'second', text: 'Paciente B' };
    const { result, rerender } = renderHook(({ incoming }) => useNotificationMotion(incoming), {
      initialProps: { incoming: first as typeof first | null },
    });
    rerender({ incoming: null });
    rerender({ incoming: second });
    expect(result.current.visible).toBe(true);
    expect(result.current.notification).toEqual(second);
  });
});
