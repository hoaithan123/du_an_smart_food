import React from 'react';
import { Navigate } from 'react-router-dom';
import { checkRole } from './auth';

const PrivateRoute = ({ roles, children }) => {
  if (!checkRole(roles)) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default PrivateRoute;