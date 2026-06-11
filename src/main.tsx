import React from "react";
import ReactDOM from "react-dom/client";

// Polyfill para iOS Safari que não tem requestIdleCallback
if (typeof window !== 'undefined' && !window.requestIdleCallback) {
  (window as any).requestIdleCallback = (cb: IdleRequestCallback) => {
    const start = Date.now();
    return setTimeout(() => {
      cb({ didTimeout: false, timeRemaining: () => Math.max(0, 50 - (Date.now() - start)) } as IdleDeadline);
    }, 1) as unknown as number;
  };
  (window as any).cancelIdleCallback = (id: number) => clearTimeout(id);
}
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App";
import { interceptApiCalls } from "./utils/payloadDebugger";

// 🔥 ATIVA DEBUGGER DE PAYLOAD V2
interceptApiCalls();

import { AuthProvider } from "./contexts/AuthContext";
import { ContactsProvider } from "./contexts/ContactsContext";
import { NotificationProvider } from "./contexts/NotificationContext";

// 🚀 React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <ContactsProvider>
              <App />
            </ContactsProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
