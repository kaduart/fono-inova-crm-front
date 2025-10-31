import toast from "react-hot-toast";

export const useErrorHandler = () => {
    const handleError = (error: any) => {
        if (error.response?.data?.errors) {
            error.response.data.errors.forEach((err: any) => {
                toast.error(`${err.field}: ${err.message}`);
            });
        } else if (error.response?.data?.error) {
            toast.error(error.response.data.error);
        } else {
            toast.error('Erro inesperado. Tente novamente.');
        }
    };

    return { handleError };
};