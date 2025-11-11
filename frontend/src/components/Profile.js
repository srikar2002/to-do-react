import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Button, FormControl, InputLabel, Select, MenuItem, Card, CardContent } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';

const TIMEZONES = [
  { value: 'America/New_York', label: 'United States (Eastern)', offset: 'UTC-5' },
  { value: 'America/Los_Angeles', label: 'United States (Pacific)', offset: 'UTC-8' },
  { value: 'Europe/London', label: 'United Kingdom', offset: 'UTC+0' },
  { value: 'Asia/Tokyo', label: 'Japan', offset: 'UTC+9' }
];

const Profile = () => {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const [timezone, setTimezone] = useState(() => localStorage.getItem('userTimezone') || TIMEZONES[0].value);

  const handleTimezoneChange = (e) => {
    const tz = e.target.value;
    setTimezone(tz);
    localStorage.setItem('userTimezone', tz);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard')} sx={{ mb: 3 }}>Back to Dashboard</Button>
      <Card sx={{ boxShadow: darkMode ? '0 4px 24px rgba(0, 0, 0, 0.6)' : '0 4px 24px rgba(0, 0, 0, 0.1)' }}>
        <CardContent sx={{ p: 4 }}>
          <FormControl fullWidth>
            <InputLabel id="timezone-select-label">Select Timezone</InputLabel>
            <Select labelId="timezone-select-label" value={timezone} label="Select Timezone" onChange={handleTimezoneChange}>
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

