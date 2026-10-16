import { describe, expect, it } from 'vitest';
import { resolveBillingType } from './appointmentBillingType';
describe('precedência financeira compartilhada', () => {
    it.each([
        [{liminarContract:'contract',billingType:'convenio'},'liminar'],
        [{billingType:'liminar',insuranceGuide:'guide'},'liminar'],
        [{billingType:'convenio'},'convenio'],
        [{billingType:'particular',paymentMethod:'convenio'},'convenio'],
        [{billingType:'particular',insuranceGuide:'guide'},'convenio'],
        [{payment:{type:'convenio'}},'convenio'],
        [{billingType:'particular',paymentMethod:'pix'},'particular'],
    ])('preserva a origem de %j', (input, expected) => {
        expect(resolveBillingType(input)).toBe(expected);
    });
});
