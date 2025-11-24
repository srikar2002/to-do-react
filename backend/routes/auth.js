const express = require('express');
const User = require('../models/User');
const { generateToken, verifyToken } = require('../middleware/auth');

const router = express.Router();

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

module.exports = router;
