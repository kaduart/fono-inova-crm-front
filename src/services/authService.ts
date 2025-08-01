// src/services/authService.ts
export const getAuthToken = (): string | null => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

export const clearAuthTokens = (): void => {
  localStorage.removeItem('token');
  sessionStorage.removeItem('token');
};

export const setAuthToken = (token: string, remember: boolean = false): void => {
  if (remember) {
    localStorage.setItem('token', token);
  } else {
    sessionStorage.setItem('token', token);
  }
};