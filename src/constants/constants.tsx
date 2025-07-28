// PRD
/*
export const BASE_URL = process.env.NODE_ENV === "development"
  ? "http://167.234.249.6:5000/api"
  : "/api"; */


//local 
export const BASE_URL = process.env.NODE_ENV === "development"
  ? "http://localhost:5000/api"  // Local (se ainda usa)
  : "https://fono-inova-crm-back.onrender.com/api"; 