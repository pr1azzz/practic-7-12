import React from 'react';
import { Navigate } from 'react-router-dom';
import { AuthService } from '../services/auth';

const RoleRoute = ({ children, allowedRoles }) => {
  const isAuthenticated = AuthService.isAuthenticated();
  const user = AuthService.getUser();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/products" replace />;
  }

  return children;
};

export default RoleRoute;