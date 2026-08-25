import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loading } from '../ui/StateIndicator';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles = [] 
}) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loading message="Synchronizing secure session..." fullPage />;
  }

  // Redirect to login if user is not authenticated
  if (!user || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verify role entitlements if restrictions are configured
  if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
    console.warn(`Access denied. Role ${profile.role} is not authorized for this route.`);
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
