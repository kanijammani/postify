import React from 'react';
// Navigate wrapper protects routes
import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const ProtectedRoute = () => {
    const { user } = useAuth();
    return user ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
