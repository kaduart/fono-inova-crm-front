import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const get = vi.fn();
const post = vi.fn();
vi.mock('../../../services/api', () => ({ default: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }));
vi.mock('../../../utils/toast', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), info: vi.fn(), error: vi.fn() }) }));
vi.mock('../../../utils/notifyApiError', () => ({ notifyApiError: vi.fn() }));

import { UncertainDeliveriesPanel, kindLabel, reasonLabel } from '../UncertainDeliveriesPanel';

const item = (key: string, kind: string, status: 'unknown' | 'abandoned' = 'unknown') => ({
    key, kind, channel: 'whatsapp', status, attempts: 1, createdAt: '2026-11-19T12:00:00.000Z', finishedAt: null,
    reason: status === 'abandoned' ? 'lease_expired' : 'provider_result_unknown', lastError: null,
});

beforeEach(() => { get.mockReset(); post.mockReset(); });

describe('Envios incertos', () => {
    it('rótulos em português para tipo e motivo', () => {
        expect(kindLabel('wa:manual:tpl')).toBe('WhatsApp manual (template)');
        expect(kindLabel('amanda-reply')).toBe('Amanda (resposta automática)');
        expect(reasonLabel({ status: 'abandoned', reason: null })).toMatch(/interrompida/);
        expect(reasonLabel({ status: 'unknown', reason: 'provider_result_unknown' })).toMatch(/não respondeu/);
    });

    it('lista, confirma "Não chegou" e tira a linha da tela', async () => {
        get.mockResolvedValue({ data: { total: 2, items: [item('k1', 'wa:manual:tpl'), item('k2', 'alert:admin', 'abandoned')] } });
        post.mockResolvedValue({ data: { success: true } });
        render(<UncertainDeliveriesPanel />);
        expect(await screen.findByText('WhatsApp manual (template)')).toBeTruthy();
        expect(screen.getByText('Alerta ao admin')).toBeTruthy();

        fireEvent.click(screen.getAllByRole('button', { name: 'Não chegou' })[0]);
        fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
        await waitFor(() => expect(post).toHaveBeenCalledWith('/observability/deliveries/resolve', { key: 'k1', as: 'failed', note: undefined }));
        await waitFor(() => expect(screen.queryByText('WhatsApp manual (template)')).toBeNull());
        expect(screen.getByText('Alerta ao admin')).toBeTruthy();
    });

    it('secretária (403) vê aviso, sem botões', async () => {
        get.mockRejectedValue({ response: { status: 403 } });
        render(<UncertainDeliveriesPanel />);
        expect(await screen.findByText(/Só administradores/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Chegou' })).toBeNull();
    });

    it('lista vazia mostra que está tudo certo', async () => {
        get.mockResolvedValue({ data: { total: 0, items: [] } });
        render(<UncertainDeliveriesPanel />);
        expect(await screen.findByText('Nenhum envio incerto.')).toBeTruthy();
    });
});
