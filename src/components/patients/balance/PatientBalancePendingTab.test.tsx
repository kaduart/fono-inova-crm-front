import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PatientBalancePendingTab } from './PatientBalancePendingTab';
import type { PaymentItem } from '../PatientBalanceModal';
const item = (id:string, changes:Partial<PaymentItem>={}):PaymentItem => ({id,source:'payment',amount:160,status:'pending',description:null,appointment:null,createdAt:'2026-07-06T12:00:00Z',...changes});
describe('patient pending debt list',()=>{
 it('shows all origins and review reasons without offering settlement for conflicts',()=>{
  const onPay=vi.fn(), onReceive=vi.fn(), onSelect=vi.fn();
  const payable=item('pay');
  const payments=[payable,item('review',{source:'balance',amount:200,requiresReview:true,countInDebt:false,canSettle:false,reviewReason:'Pagamento já localizado'}),item('session',{source:'session',canSettle:false})];
  render(<PatientBalancePendingTab payments={payments} selectablePending={[payable]} selectedPayments={new Set()} selectedTotal={0} isSubmitting={false} onToggleSelection={onSelect} onSelectAll={vi.fn()} onOpenQuickPayment={onPay} onOpenBulkPayment={vi.fn()} onOpenReceive={onReceive}/>);
  expect(screen.getByRole('status').textContent).toContain('Em conferência: 1');
  expect(screen.getByText('Pagamento já localizado')).toBeTruthy();
  expect(screen.getByText('Conta corrente')).toBeTruthy();
  expect(screen.getByText('Sessão sem lançamento')).toBeTruthy();
  expect(screen.getAllByRole('button',{name:'Pagar'})).toHaveLength(1);
  expect(screen.getAllByRole('button',{name:'Lançamento disponível apenas para consulta'}).every(button=>(button as HTMLButtonElement).disabled)).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Pagar'}));expect(onPay).toHaveBeenCalledWith('pay');
  fireEvent.click(screen.getByRole('button',{name:'Receber valor diferente'}));expect(onReceive).toHaveBeenCalledWith(160);
 });
 it('blocks a conflicting payment even when canSettle is stale',()=>{
  const p=item('conflict',{requiresReview:true,countInDebt:false,canSettle:true});
  render(<PatientBalancePendingTab payments={[p]} selectablePending={[]} selectedPayments={new Set()} selectedTotal={0} isSubmitting={false} onToggleSelection={vi.fn()} onSelectAll={vi.fn()} onOpenQuickPayment={vi.fn()} onOpenBulkPayment={vi.fn()}/>);
  expect(screen.queryByRole('button',{name:'Pagar'})).toBeNull();
 });
});

