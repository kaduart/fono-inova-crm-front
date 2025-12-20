import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

import { AuthProvider } from "./contexts/AuthContext";
import { ContactsProvider } from "./contexts/ContactsContext";
import { NotificationProvider } from "./contexts/NotificationContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <ContactsProvider>
            <App />
          </ContactsProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
