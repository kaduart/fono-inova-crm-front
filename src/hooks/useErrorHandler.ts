import toast from "react-hot-toast";
import { extractErrorMessage } from "../utils/errorUtils";
import { showScheduleConflictToast } from "../utils/scheduleConflictToast";

export const useErrorHandler = () => {
    const handleError = (error: any) => {
        // Verifica se há múltiplos erros de validação
        if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
            error.response.data.errors.forEach((err: any) => {
                toast.error(`${err.field}: ${err.message}`);
            });
            return;
        }

        // Conflito de agenda: helper compartilhado, com id fixo para não empilhar
        // toast quando mais de uma camada tratar o mesmo 409.
        if (showScheduleConflictToast(error)) {
            return;
        }

        // Usa extractErrorMessage para extrair mensagem de erro padronizada
        toast.error(extractErrorMessage(error, 'Erro inesperado. Tente novamente.'));
    };

    return { handleError };
};