import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Button, FormControl, InputLabel, Select, MenuItem, Card, CardContent, Alert, CircularProgress } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India', offset: 'UTC+5:30' },
  { value: 'America/New_York', label: 'United States (Eastern)', offset: 'UTC-5' },
  { value: 'America/Los_Angeles', label: 'United States (Pacific)', offset: 'UTC-8' },
  { value: 'Europe/London', label: 'United Kingdom', offset: 'UTC+0' }
];

const Profile = () => {
  const { darkMode } = useTheme();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Kolkata');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Update timezone when user data changes
  useEffect(() => {
    if (user?.timezone) {
      setTimezone(user.timezone);
      localStorage.setItem('userTimezone', user.timezone);
    }
  }, [user]);

  const handleTimezoneChange = async (e) => {
    const tz = e.target.value;
    setTimezone(tz);
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await axios.patch('/api/auth/preferences/timezone', { timezone: tz });
      
      // Update user in context and localStorage (preserve token)
      const updatedUser = { ...response.data.user, token: user?.token };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('userTimezone', tz);
      
      setSuccess('Timezone preference saved successfully!');
    } catch (error) {
      console.error('Error updating timezone:', error);
      setError(error.response?.data?.message || 'Failed to save timezone preference');
      // Revert to previous timezone on error
      setTimezone(user?.timezone || 'Asia/Kolkata');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')} sx={{ mb: 3 }}>Back to Dashboard</Button>
      <Card sx={{ boxShadow: darkMode ? '0 4px 24px rgba(0, 0, 0, 0.6)' : '0 4px 24px rgba(0, 0, 0, 0.1)' }}>
        <CardContent sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}
          <FormControl fullWidth disabled={loading}>
            <InputLabel id="timezone-select-label">Select Timezone</InputLabel>
            <Select 
              labelId="timezone-select-label" 
              value={timezone} 
              label="Select Timezone" 
              onChange={handleTimezoneChange}
              endAdornment={loading && <CircularProgress size={20} sx={{ mr: 2 }} />}
            >
              {TIMEZONES.map((tz) => (
                <MenuItem key={tz.value} value={tz.value}>
                  <Box>
                    <Typography variant="body1">{tz.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{tz.offset}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Profile;

