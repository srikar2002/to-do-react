import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';
import { getProtectedRouteStyles } from '../styles/protectedRouteStyles';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const styles = getProtectedRouteStyles();

  if (loading) {
    return (
      <Box sx={styles.loaderBox}>
        <CircularProgress />
      </Box>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
