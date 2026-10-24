import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import API from '../../services/api';
import { PatientBalanceModal } from './PatientBalanceModal';
vi.mock('../../services/api',()=>({default:{patch:vi.fn().mockResolvedValue({})}}));
vi.mock('../../services/financialSummaryService',()=>({
 getPatientFinancialSummary:vi.fn().mockResolvedValue({totalPaid:0,paidCount:0,completedSessions:0}),
 getPatientPendingSnapshot:vi.fn().mockResolvedValue({data:[{id:'payment-1',source:'payment',amount:160,status:'pending',canSettle:true,countInDebt:true,description:'Atendimento comprovado',createdAt:'2026-07-06T12:00:00Z',appointment:null}],meta:{totalPending:160,totalPendingNet:160,count:1,collectibleCount:1}}),
 getPatientPaidPayments:vi.fn().mockResolvedValue([]),receivePayment:vi.fn(),
}));
vi.mock('../../utils/cacheManager',()=>({invalidateCache:vi.fn()}));
vi.mock('./balance/PaymentConfirmModal',()=>({PaymentConfirmModal:({isOpen,onConfirm}:any)=>isOpen?<button onClick={onConfirm}>Confirmar teste</button>:null}));
describe('patient balance CRM endpoint compatibility',()=>{
 it('uses the existing PATCH payment endpoint for a selected payable item',async()=>{
  render(<PatientBalanceModal isOpen onClose={vi.fn()} patientId="patient-1" patientName="Paciente de teste"/>);
  fireEvent.click(await screen.findByRole('button',{name:'Pagar'}));
  fireEvent.click(screen.getByRole('button',{name:'Confirmar teste'}));
  await waitFor(()=>expect(API.patch).toHaveBeenCalledWith('/v2/payments/payment-1',{status:'paid',paymentMethod:'dinheiro'}));
 });
});
