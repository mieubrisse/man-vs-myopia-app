import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { ROUTES } from '../lib/routes';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { currentUser, loading } = useAuth();
    const location = useLocation();

    // Show loading indicator while checking auth state
    if (loading) {
        return <div>Loading...</div>;
    }

    // Redirect to login if not authenticated
    if (!currentUser) {
        return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;