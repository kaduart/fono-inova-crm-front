// src/services/authService.ts

/**
 * Decodifica um token JWT e retorna o payload
 */
const decodeJWT = (token: string): { exp?: number; [key: string]: any } | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Erro ao decodificar token:', error);
    return null;
  }
};

/**
 * Verifica se o token JWT está expirado
 * Retorna true se expirou, false se ainda é válido ou não existe
 */
export const isTokenExpired = (token?: string | null): boolean => {
  if (!token) return true;
  
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;
  
  // exp é em segundos, Date.now() é em milissegundos
  const currentTime = Math.floor(Date.now() / 1000);
  const isExpired = decoded.exp < currentTime;
  
  if (isExpired) {
    console.log(`[Auth] Token expirado em ${new Date(decoded.exp * 1000).toLocaleString()}`);
  }
  
  return isExpired;
};

/**
 * Retorna o tempo restante do token em segundos
 */
export const getTokenTimeRemaining = (token?: string | null): number => {
  if (!token) return 0;
  
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return 0;
  
  const currentTime = Math.floor(Date.now() / 1000);
  return Math.max(0, decoded.exp - currentTime);
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

export const clearAuthTokens = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userRole');
  localStorage.removeItem('lastActivity');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
};

export const setAuthToken = (token: string, remember: boolean = false): void => {
  if (remember) {
    localStorage.setItem('token', token);
  } else {
    sessionStorage.setItem('token', token);
  }
};

export const requestPasswordReset = async (email) => {
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
};

export const resetPassword = async (token, newPassword) => {
  const response = await fetch(`/api/auth/reset-password/${token}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: newPassword })
  });
  return response.json();
};