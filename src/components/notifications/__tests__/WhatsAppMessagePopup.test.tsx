import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import React from 'react';
import { WhatsAppMessagePopup } from '../WhatsAppMessagePopup';

const mockOnMessageNew = vi.fn();

vi.mock('../../../utils/socketManager', () => ({
  socketManager: {
    onMessageNew: (handler: any) => {
      mockOnMessageNew.mockImplementation(handler);
      return () => {
        mockOnMessageNew.mockClear();
      };
    },
  },
}));

vi.mock('../../../assets/notify1.wav', () => ({ default: 'notify1.wav' }));

describe('WhatsAppMessagePopup', () => {
  let audioPlaySpy: any;

  beforeEach(() => {
    mockOnMessageNew.mockClear();

    audioPlaySpy = vi.fn().mockResolvedValue(undefined);
    global.Audio = vi.fn().mockImplementation(() => ({
      play: audioPlaySpy,
    })) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve mostrar popup quando receber mensagem inbound via socket', async () => {
    const { container } = render(<WhatsAppMessagePopup />);

    act(() => {
      mockOnMessageNew({
        id: 'msg-1',
        direction: 'inbound',
        from: '5511999999999',
        text: 'Oi, tudo bem?',
      });
    });

    await waitFor(() => {
      expect(container.textContent).toContain('Nova mensagem WhatsApp');
      expect(container.textContent).toContain('Oi, tudo bem?');
    });
  });

  it('deve tocar som quando receber mensagem inbound', async () => {
    render(<WhatsAppMessagePopup />);

    act(() => {
      mockOnMessageNew({
        id: 'msg-2',
        direction: 'inbound',
        from: '5511999999999',
        text: 'Oi!',
      });
    });

    await waitFor(() => {
      expect(global.Audio).toHaveBeenCalledWith('notify1.wav');
      expect(audioPlaySpy).toHaveBeenCalled();
    });
  });

  it('NAO deve mostrar popup para mensagens outbound', async () => {
    const { container } = render(<WhatsAppMessagePopup />);

    act(() => {
      mockOnMessageNew({
        id: 'msg-3',
        direction: 'outbound',
        from: '5511888888888',
        text: 'Resposta da clínica',
      });
    });

    await waitFor(() => {
      expect(container.textContent).toBeFalsy();
    }, { timeout: 500 });
  });

  it('deve aceitar direction "received" como inbound', async () => {
    const { container } = render(<WhatsAppMessagePopup />);

    act(() => {
      mockOnMessageNew({
        id: 'msg-4',
        direction: 'received',
        from: '5511999999999',
        text: 'Recebido!',
      });
    });

    await waitFor(() => {
      expect(container.textContent).toContain('Nova mensagem WhatsApp');
    });
  });
});
