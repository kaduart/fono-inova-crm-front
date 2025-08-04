
export const BASE_URL = import.meta.env.DEV
  ? 'http://localhost:5000/api'  // Para desenvolvimento
  : 'https://fono-inova-crm-back.onrender.com/api';  // Para produção