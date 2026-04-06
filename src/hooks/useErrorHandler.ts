import toast from "react-hot-toast";
import { extractErrorMessage } from "../utils/errorUtils";

export const useErrorHandler = () => {
    const handleError = (error: any) => {
        // Verifica se há múltiplos erros de validação
        if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
            error.response.data.errors.forEach((err: any) => {
                toast.error(`${err.field}: ${err.message}`);
            });
        } else {
            // Usa extractErrorMessage para extrair mensagem de erro padronizada
            toast.error(extractErrorMessage(error, 'Erro inesperado. Tente novamente.'));
        }
    };

    return { handleError };
};