import { beforeEach, describe, expect, it, vi } from 'vitest';
import API from '../api';
import packageService from '../packageService';
vi.mock('../api', () => ({ default: { patch: vi.fn() } }));
const patch = vi.mocked(API.patch);
beforeEach(() => patch.mockReset().mockResolvedValue({ data: { success: true } }));
describe('cancelamento de sessões selecionadas', () => {
 it('envia motivo, solicitante e WhatsApp para cada atendimento selecionado', async () => {
  const result = await packageService.bulkCancelSessions('pack', ['a1','a2'], {cancelRequester:'professional',reason:'Indisponibilidade',notifyPatient:true}, false);
  expect(patch).toHaveBeenCalledTimes(2);
  expect(patch).toHaveBeenNthCalledWith(1, '/v2/appointments/a1/cancel', expect.objectContaining({reason:'Indisponibilidade',cancelRequester:'professional',notifyPatient:true,confirmedAbsence:false}));
  expect(result.canceledIds).toEqual(['a1','a2']);
 });
 it('respeita WhatsApp desmarcado', async () => {
  await packageService.bulkCancelSessions('pack', ['a1'], {cancelRequester:'patient',reason:'Imprevisto',notifyPatient:false}, false);
  expect(patch).toHaveBeenCalledWith('/v2/appointments/a1/cancel', expect.objectContaining({notifyPatient:false}));
 });
 it('retorna falhas parciais sem repetir nem cancelar fora da seleção', async () => {
  patch.mockRejectedValueOnce(new Error('Conflito')).mockResolvedValueOnce({data:{success:true}});
  const result = await packageService.bulkCancelSessions('pack',['a1','a2'],{cancelRequester:'clinic',reason:'Sala indisponível'},false);
  expect(result.canceledIds).toEqual(['a2']);
  expect(result.failedIds).toEqual([{appointmentId:'a1',error:'Conflito'}]);
  expect(result.success).toBe(false);
  expect(patch).toHaveBeenCalledTimes(2);
 });
});
