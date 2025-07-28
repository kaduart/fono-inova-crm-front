import { Navigate } from "react-router-dom";

export const PrivateRoute = ({ children, allowedRoles }) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');

    if (!token || !allowedRoles.includes(role)) {
        return <Navigate to="/login" />;
    }

    return children;
};
