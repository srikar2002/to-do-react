import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Link,
  IconButton
} from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getAuthStyles } from '../../styles/authStyles';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      enqueueSnackbar('Login successful!', { variant: 'success' });
      navigate('/dashboard');
    } else {
      enqueueSnackbar(result.message, { variant: 'error' });
    }
    
    setLoading(false);
  };

  const styles = getAuthStyles();

  return (
    <Container component="main" maxWidth="sm">
        <Box sx={styles.container}>
          <IconButton
            onClick={toggleTheme}
            sx={styles.themeToggleButton}
            color="inherit"
          >
            {darkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
          <Paper elevation={3} sx={styles.paper}>
            <Typography component="h1" variant="h4" align="center" gutterBottom>
              Login
            </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={styles.form}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
            <Box textAlign="center">
              <Link component={RouterLink} to="/register" variant="body2">
                Don't have an account? Sign Up
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
