const express = require('express');
const User = require('../models/User');
const { generateToken, verifyToken } = require('../middleware/auth');
const { getAuthorizationUrl, exchangeCodeForTokens } = require('../utils/googleCalendarService');

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const getRedirectUrl = (req) => process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/google-calendar/callback`;

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    // Create new user
    const user = new User({
      name,
      email,
      passwordHash: password
    });
    
    await user.save();
    
    // Generate token
    const token = generateToken(user._id);
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
        emailNotificationsEnabled: user.emailNotificationsEnabled
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
        emailNotificationsEnabled: user.emailNotificationsEnabled
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Update user timezone preference
router.patch('/preferences/timezone', verifyToken, async (req, res) => {
  try {
    const { timezone } = req.body;
    
    // Validation
    if (!timezone) {
      return res.status(400).json({ message: 'Timezone is required' });
    }
    
    // Validate timezone format (basic validation - should be a valid IANA timezone)
    const validTimezones = [
      'Asia/Kolkata',
      'America/New_York',
      'America/Los_Angeles',
      'Europe/London'
    ];
    
    if (!validTimezones.includes(timezone)) {
      return res.status(400).json({ message: 'Invalid timezone' });
    }
    
    // Find and update user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.timezone = timezone;
    await user.save();
    
    res.json({
      message: 'Timezone preference updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
        emailNotificationsEnabled: user.emailNotificationsEnabled
      }
    });
  } catch (error) {
    console.error('Update timezone error:', error);
    res.status(500).json({ message: 'Server error while updating timezone' });
  }
});

// Update user email notification preference
router.patch('/preferences/notifications', verifyToken, async (req, res) => {
  try {
    const { emailNotificationsEnabled } = req.body;
    
    // Validation
    if (typeof emailNotificationsEnabled !== 'boolean') {
      return res.status(400).json({ message: 'emailNotificationsEnabled must be a boolean' });
    }
    
    // Find and update user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.emailNotificationsEnabled = emailNotificationsEnabled;
    await user.save();
    
    res.json({
      message: 'Email notification preference updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        timezone: user.timezone,
        emailNotificationsEnabled: user.emailNotificationsEnabled
      }
    });
  } catch (error) {
    console.error('Update notification preference error:', error);
    res.status(500).json({ message: 'Server error while updating notification preference' });
  }
});

// Google Calendar OAuth - Initiate authorization
router.get('/google-calendar/authorize', verifyToken, async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(500).json({ message: 'Google Calendar integration not configured' });
    
    res.json({ authorizationUrl: getAuthorizationUrl(clientId, getRedirectUrl(req), req.userId.toString()) });
  } catch (error) {
    console.error('Google Calendar authorization error:', error);
    res.status(500).json({ message: 'Server error while initiating Google Calendar authorization' });
  }
});

// Google Calendar OAuth - Handle callback
router.get('/google-calendar/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    const redirect = (error) => res.redirect(`${FRONTEND_URL}/profile?calendar_error=${encodeURIComponent(error)}`);
    
    if (error) return redirect(error);
    if (!code || !state) return redirect('missing_parameters');

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return redirect('not_configured');

    const tokenResponse = await exchangeCodeForTokens(code, clientId, clientSecret, getRedirectUrl(req));
    const user = await User.findById(state);
    if (!user) return redirect('user_not_found');

    user.googleAccessToken = tokenResponse.access_token;
    user.googleRefreshToken = tokenResponse.refresh_token;
    user.googleCalendarEnabled = true;
    await user.save();

    res.redirect(`${FRONTEND_URL}/profile?calendar_success=true`);
  } catch (error) {
    console.error('Google Calendar callback error:', error);
    res.redirect(`${FRONTEND_URL}/profile?calendar_error=${encodeURIComponent(error.message)}`);
  }
});

// Check Google Calendar connection status
router.get('/google-calendar/status', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ connected: user.googleCalendarEnabled && !!user.googleAccessToken, enabled: user.googleCalendarEnabled });
  } catch (error) {
    console.error('Google Calendar status error:', error);
    res.status(500).json({ message: 'Server error while checking Google Calendar status' });
  }
});

// Disconnect Google Calendar
router.delete('/google-calendar/disconnect', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    user.googleAccessToken = null;
    user.googleRefreshToken = null;
    user.googleCalendarEnabled = false;
    await user.save();

    res.json({ message: 'Google Calendar disconnected successfully', connected: false });
  } catch (error) {
    console.error('Google Calendar disconnect error:', error);
    res.status(500).json({ message: 'Server error while disconnecting Google Calendar' });
  }
});

module.exports = router;
