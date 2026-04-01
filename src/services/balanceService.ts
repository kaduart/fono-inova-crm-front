/**
 * 🚀 Balance Service V2 - Event-Driven
 */

import API from './api';
import { pollPaymentStatus } from './paymentService';

export const getBalanceV2 = async (patientId: string) => {
    const response = await API.get(`/v2/balance/${patientId}`);
    return response.data;
};

export const addBalanceDebitV2 = async (
    patientId: string,
    data: {
        amount: number;
        description: string;
        sessionId?: string;
        appointmentId?: string;
    }
) => {
    const response = await API.post(`/v2/balance/${patientId}/debit`, data);
    const { eventId } = response.data.data;
    const finalStatus = await pollPaymentStatus(eventId);
    return { success: true, eventId, data: finalStatus };
};
