import API from "./api";

type NavigateFunction = (path: string) => void;
let globalNavigate: NavigateFunction | null = null;

export const setupInterceptor = (navigate: NavigateFunction) => {
  globalNavigate = navigate;

  API.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Limpar dados de autenticação
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        
        // Redirecionar usando a função navigate guardada
        if (globalNavigate) {
         // globalNavigate('/login');
        }
      }
      return Promise.reject(error);
    }
  );
};