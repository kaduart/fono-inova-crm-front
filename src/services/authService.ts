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