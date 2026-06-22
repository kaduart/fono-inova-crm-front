import React from "react";
import toast from "react-hot-toast";
import { extractErrorMessage } from "../utils/errorUtils";

export const useErrorHandler = () => {
    const handleError = (error: any) => {
        // Verifica se há múltiplos erros de validação
        if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
            error.response.data.errors.forEach((err: any) => {
                toast.error(`${err.field}: ${err.message}`);
            });
            return;
        }

        // 🎯 Toast customizado para conflito de agenda com destaque
        const errorData = error.response?.data;
        if (errorData?.errorCode === 'SCHEDULE_CONFLICT' && errorData?.data) {
            const { date, time, patientName, patientPhone, doctorName } = errorData.data;
            toast.error((t) => (
                <div className="flex flex-col gap-1">
                    <div className="font-semibold text-sm">
                        ⚠️ Conflito de agenda
                    </div>
                    <div className="text-sm leading-snug">
                        <span className="font-bold">{date}</span> às <span className="font-bold">{time}</span> já está ocupado por{' '}
                        <span className="font-bold">{patientName}</span>{' '}
                        <span className="text-xs opacity-90">({patientPhone})</span>{' '}
                        com <span className="font-bold">{doctorName}</span>
                    </div>
                </div>
            ), {
                duration: 8000,
                style: {
                    maxWidth: '420px',
                    borderLeft: '4px solid #ef4444',
                },
            });
            return;
        }

        // Usa extractErrorMessage para extrair mensagem de erro padronizada
        toast.error(extractErrorMessage(error, 'Erro inesperado. Tente novamente.'));
    };

    return { handleError };
};