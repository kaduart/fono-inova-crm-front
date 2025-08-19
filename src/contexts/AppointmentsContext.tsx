// contexts/AppointmentsContext.tsx
import { createContext, useContext } from "react";
import { useAppointments } from "../hooks/useAppointments";

const AppointmentsContext = createContext<ReturnType<typeof useAppointments> | null>(null);

export const AppointmentsProvider = ({ children }: { children: React.ReactNode }) => {
    const appointmentsHook = useAppointments();
    return (
        <AppointmentsContext.Provider value={appointmentsHook}>
            {children}
        </AppointmentsContext.Provider>
    );
};

export const useAppointmentsContext = () => {
    const ctx = useContext(AppointmentsContext);
    if (!ctx) throw new Error("useAppointmentsContext deve estar dentro de AppointmentsProvider");
    return ctx;
};
