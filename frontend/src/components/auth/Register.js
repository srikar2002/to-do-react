import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { Container, Paper, TextField, Button, Typography, Box, Link, IconButton } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getAuthStyles } from '../../styles/authStyles';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const styles = getAuthStyles();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      enqueueSnackbar('Passwords do not match', { variant: 'error' });
      return false;
    }
    if (formData.password.length < 6) {
      enqueueSnackbar('Password must be at least 6 characters', { variant: 'error' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    const result = await register(formData.name, formData.email, formData.password);
    if (result.success) {
      enqueueSnackbar('Registration successful!', { variant: 'success' });
      navigate('/dashboard');
    } else {
      enqueueSnackbar(result.message, { variant: 'error' });
    }
    setLoading(false);
  };

  const fields = [
    { name: 'name', label: 'Full Name', autoComplete: 'name', autoFocus: true },
    { name: 'email', label: 'Email Address', autoComplete: 'email' },
    { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password' },
    { name: 'confirmPassword', label: 'Confirm Password', type: 'password', autoComplete: 'new-password' }
  ];

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={styles.container}>
        <IconButton onClick={toggleTheme} sx={styles.themeToggleButton} color="inherit">
          {darkMode ? <Brightness7 /> : <Brightness4 />}
        </IconButton>
        <Paper elevation={3} sx={styles.paper}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>Register</Typography>
          <Box component="form" onSubmit={handleSubmit} sx={styles.form}>
            {fields.map((field) => (
              <TextField
                key={field.name}
                margin="normal"
                required
                fullWidth
                id={field.name}
                name={field.name}
                label={field.label}
                type={field.type || 'text'}
                autoComplete={field.autoComplete}
                autoFocus={field.autoFocus}
                value={formData[field.name]}
                onChange={handleChange}
              />
            ))}
            <Button type="submit" fullWidth variant="contained" sx={styles.submitButton} disabled={loading}>
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
            <Box textAlign="center">
              <Link component={RouterLink} to="/login" variant="body2">Already have an account? Sign In</Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
