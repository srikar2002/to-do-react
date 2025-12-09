import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Typography, Box, Button, FormControl, InputLabel, Select, MenuItem, Card, CardContent, Alert, CircularProgress, Avatar, Switch, FormControlLabel } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Person as PersonIcon, Email as EmailIcon, Notifications as NotificationsIcon, CalendarToday as CalendarIcon, CheckCircle as CheckCircleIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getProfileStyles } from '../styles/profileStyles';
import { 
  checkCalendarStatus as checkCalendarStatusService,
  connectCalendar,
  disconnectCalendar,
  updateTimezone,
  updateNotificationPreference
} from '../services/profileService';

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
  const checkCalendarStatus = useCallback(async () => {
    if (!user?.token) {
      setCheckingCalendar(false);
      return;
    }
    
    setCheckingCalendar(true);
    const result = await checkCalendarStatusService(user.token);
    setCalendarConnected(result.connected || false);
    setCheckingCalendar(false);
  }, [user?.token]);

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
  }, [searchParams, navigate, checkCalendarStatus]);

  const handleConnectCalendar = async () => {
    if (!user?.token) {
      setError('Please log in to connect Google Calendar');
      return;
    }
    
    setCalendarLoading(true);
    setError('');
    
    const result = await connectCalendar(user.token);
    
    if (result.success && result.authorizationUrl) {
      // Redirect to Google authorization page
      window.location.href = result.authorizationUrl;
    } else {
      setError(result.message || 'Failed to connect Google Calendar');
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
    
    const result = await disconnectCalendar(user.token);
    
    if (result.success) {
      setCalendarConnected(false);
      setSuccess('Google Calendar disconnected successfully');
    } else {
      setError(result.message || 'Failed to disconnect Google Calendar');
    }
    
    setCalendarLoading(false);
  };

  const handleTimezoneChange = async (e) => {
    const tz = e.target.value;
    setTimezone(tz);
    setError('');
    setSuccess('');
    setLoading(true);

    const result = await updateTimezone(tz, user?.token);
    
    if (result.success && result.user) {
      // Update user in context and localStorage (preserve token)
      const updatedUser = { ...result.user, token: user?.token };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(result.user));
      localStorage.setItem('userTimezone', tz);
      
      setSuccess('Timezone preference saved successfully!');
    } else {
      setError(result.message || 'Failed to save timezone preference');
      // Revert to previous timezone on error
      setTimezone(user?.timezone || 'Asia/Kolkata');
    }
    
    setLoading(false);
  };

  const handleNotificationToggle = async (e) => {
    const enabled = e.target.checked;
    setEmailNotificationsEnabled(enabled);
    setError('');
    setSuccess('');
    setNotificationLoading(true);

    const result = await updateNotificationPreference(enabled, user?.token);
    
    if (result.success && result.user) {
      // Update user in context and localStorage (preserve token)
      const updatedUser = { ...result.user, token: user?.token };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(result.user));
      
      setSuccess(`Email notifications ${enabled ? 'enabled' : 'disabled'} successfully!`);
    } else {
      setError(result.message || 'Failed to update notification preference');
      // Revert to previous state on error
      setEmailNotificationsEnabled(user?.emailNotificationsEnabled || false);
    }
    
    setNotificationLoading(false);
  };

  const styles = getProfileStyles(darkMode);

  return (
    <Container maxWidth="md" sx={styles.container}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')} sx={styles.backButton}>
        Back to Dashboard
      </Button>
      
      {/* User Information Card */}
      <Card sx={styles.card}>
        <CardContent sx={styles.cardContent}>
          <Typography variant="h5" component="h2" gutterBottom sx={styles.title}>
            User Information
          </Typography>
          <Box sx={styles.userInfoBox}>
            <Avatar sx={styles.avatar}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <Box>
              <Box sx={styles.userDetailBox}>
                <PersonIcon color="action" fontSize="small" />
                <Typography variant="h6" component="div">
                  {user?.name || 'N/A'}
                </Typography>
              </Box>
              <Box sx={styles.emailBox}>
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
      <Card sx={styles.card}>
        <CardContent sx={styles.cardContent}>
          <Typography variant="h5" component="h2" gutterBottom sx={styles.preferencesTitle}>
            Preferences
          </Typography>
          {error && (
            <Alert severity="error" sx={styles.alert} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={styles.alert} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}
          <FormControl fullWidth disabled={loading} sx={styles.formControl}>
            <InputLabel id="timezone-select-label">Select Timezone</InputLabel>
            <Select 
              labelId="timezone-select-label" 
              value={timezone} 
              label="Select Timezone" 
              onChange={handleTimezoneChange}
              endAdornment={loading && <CircularProgress size={20} sx={styles.circularProgress} />}
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
          <Box sx={styles.notificationBox}>
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
          <Box sx={styles.calendarSection}>
            <Box sx={styles.calendarHeaderBox}>
              <CalendarIcon color="action" />
              <Typography variant="h6" component="div">
                Google Calendar Integration
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={styles.calendarDescription}>
              Connect your Google Calendar to automatically create calendar events when you create tasks.
            </Typography>
            {checkingCalendar ? (
              <Box sx={styles.calendarStatusBox}>
                <CircularProgress size={20} />
                <Typography variant="body2">Checking connection status...</Typography>
              </Box>
            ) : calendarConnected ? (
              <Box>
                <Box sx={styles.calendarConnectedBox}>
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

