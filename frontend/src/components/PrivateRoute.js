import React from 'react';
import { Navigate } from 'react-router-dom';
import { AuthService } from '../services/auth';

const PrivateRoute = ({ children }) => {
  const isAuthenticated = AuthService.isAuthenticated();
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default PrivateRoute;