import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";

interface PrivateRouteProps {
    children: ReactNode;
    allowedRoles: string[];
}

export const PrivateRoute = ({ children, allowedRoles }: PrivateRouteProps) => {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        // opcional: pode renderizar um loading enquanto verifica
        return <LoadingSpinner />;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
