import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Typography, Box, Button, FormControl, InputLabel, Select, MenuItem, Card, CardContent, Alert, CircularProgress, Avatar, Switch, FormControlLabel } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Person as PersonIcon, Email as EmailIcon, Notifications as NotificationsIcon, CalendarToday as CalendarIcon, CheckCircle as CheckCircleIcon, Cancel as CancelIcon } from '@mui/icons-material';
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
  const [searchParams] = useSearchParams();
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Kolkata');
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(user?.emailNotificationsEnabled || false);
  const [loading, setLoading] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [checkingCalendar, setCheckingCalendar] = useState(true);

  // Update timezone and notifications when user data changes
  useEffect(() => {
    if (user?.timezone) {
      setTimezone(user.timezone);
      localStorage.setItem('userTimezone', user.timezone);
    }
    if (user?.emailNotificationsEnabled !== undefined) {
      setEmailNotificationsEnabled(user.emailNotificationsEnabled);
    }
  }, [user]);

  // Check Google Calendar connection status
  useEffect(() => {
    checkCalendarStatus();
    
    // Check for OAuth callback results
    const calendarSuccess = searchParams.get('calendar_success');
    const calendarError = searchParams.get('calendar_error');
    
    if (calendarSuccess === 'true') {
      setSuccess('Google Calendar connected successfully!');
      checkCalendarStatus();
      // Remove query params from URL
      navigate('/profile', { replace: true });
    } else if (calendarError) {
      setError(`Google Calendar connection failed: ${decodeURIComponent(calendarError)}`);
      // Remove query params from URL
      navigate('/profile', { replace: true });
    }
  }, [searchParams, navigate]);

  const checkCalendarStatus = async () => {
    if (!user?.token) return;
    
    setCheckingCalendar(true);
    try {
      const response = await axios.get('/api/auth/google-calendar/status', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      setCalendarConnected(response.data.connected);
    } catch (error) {
      console.error('Error checking calendar status:', error);
      setCalendarConnected(false);
    } finally {
      setCheckingCalendar(false);
    }
  };

  const handleConnectCalendar = async () => {
    if (!user?.token) {
      setError('Please log in to connect Google Calendar');
      return;
    }
    
    setCalendarLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/auth/google-calendar/authorize', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      // Redirect to Google authorization page
      window.location.href = response.data.authorizationUrl;
    } catch (error) {
      console.error('Error connecting calendar:', error);
      setError(error.response?.data?.message || 'Failed to connect Google Calendar');
      setCalendarLoading(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!user?.token) {
      setError('Please log in to disconnect Google Calendar');
      return;
    }
    
    setCalendarLoading(true);
    setError('');
    try {
      await axios.delete('/api/auth/google-calendar/disconnect', {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      setCalendarConnected(false);
      setSuccess('Google Calendar disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      setError(error.response?.data?.message || 'Failed to disconnect Google Calendar');
    } finally {
      setCalendarLoading(false);
    }
  };

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

  const handleNotificationToggle = async (e) => {
    const enabled = e.target.checked;
    setEmailNotificationsEnabled(enabled);
    setError('');
    setSuccess('');
    setNotificationLoading(true);

    try {
      const response = await axios.patch('/api/auth/preferences/notifications', { 
        emailNotificationsEnabled: enabled 
      });
      
      // Update user in context and localStorage (preserve token)
      const updatedUser = { ...response.data.user, token: user?.token };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      setSuccess(`Email notifications ${enabled ? 'enabled' : 'disabled'} successfully!`);
    } catch (error) {
      console.error('Error updating notification preference:', error);
      setError(error.response?.data?.message || 'Failed to update notification preference');
      // Revert to previous state on error
      setEmailNotificationsEnabled(user?.emailNotificationsEnabled || false);
    } finally {
      setNotificationLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')} sx={{ mb: 3 }}>Back to Dashboard</Button>
      
      {/* User Information Card */}
      <Card sx={{ boxShadow: darkMode ? '0 4px 24px rgba(0, 0, 0, 0.6)' : '0 4px 24px rgba(0, 0, 0, 0.1)', mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
            User Information
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'primary.main' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <PersonIcon color="action" fontSize="small" />
                <Typography variant="h6" component="div">
                  {user?.name || 'N/A'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon color="action" fontSize="small" />
                <Typography variant="body1" color="text.secondary">
                  {user?.email || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Timezone Settings Card */}
      <Card sx={{ boxShadow: darkMode ? '0 4px 24px rgba(0, 0, 0, 0.6)' : '0 4px 24px rgba(0, 0, 0, 0.1)' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3, fontWeight: 400 }}>
            Preferences
          </Typography>
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
          <FormControl fullWidth disabled={loading} sx={{ mb: 3 }}>
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

          {/* Email Notifications Toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <NotificationsIcon color="action" />
            <FormControlLabel
              control={
                <Switch
                  checked={emailNotificationsEnabled}
                  onChange={handleNotificationToggle}
                  disabled={notificationLoading}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Email Notifications</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Receive email notifications when tasks are created
                  </Typography>
                </Box>
              }
            />
            {notificationLoading && <CircularProgress size={20} />}
          </Box>

          {/* Google Calendar Integration */}
          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 3, mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CalendarIcon color="action" />
              <Typography variant="h6" component="div">
                Google Calendar Integration
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Connect your Google Calendar to automatically create calendar events when you create tasks.
            </Typography>
            {checkingCalendar ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2">Checking connection status...</Typography>
              </Box>
            ) : calendarConnected ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <CheckCircleIcon color="success" />
                  <Typography variant="body1" color="success.main">
                    Connected to Google Calendar
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDisconnectCalendar}
                  disabled={calendarLoading}
                  startIcon={<CancelIcon />}
                >
                  {calendarLoading ? 'Disconnecting...' : 'Disconnect Calendar'}
                </Button>
              </Box>
            ) : (
              <Button
                variant="contained"
                onClick={handleConnectCalendar}
                disabled={calendarLoading}
                startIcon={<CalendarIcon />}
              >
                {calendarLoading ? 'Connecting...' : 'Connect Google Calendar'}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Profile;

