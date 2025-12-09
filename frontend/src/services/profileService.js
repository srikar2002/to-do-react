import axios from 'axios';

/**
 * Profile Service
 * Handles all profile-related API calls including preferences and Google Calendar integration
 */

/**
 * Check Google Calendar connection status
 * @param {string} token - User authentication token
 * @returns {Promise<{success: boolean, connected?: boolean, message?: string}>}
 */
export const checkCalendarStatus = async (token) => {
  if (!token) {
    return { success: false, connected: false, message: 'No authentication token provided' };
  }

  try {
    const response = await axios.get('/api/auth/google-calendar/status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return { success: true, connected: response.data.connected };
  } catch (error) {
    console.error('Error checking calendar status:', error);
    return { 
      success: false, 
      connected: false, 
      message: error.response?.data?.message || 'Failed to check calendar status' 
    };

  }
};

/**
 * Initiate Google Calendar OAuth connection
 * @param {string} token - User authentication token
 * @returns {Promise<{success: boolean, authorizationUrl?: string, message?: string}>}
 */
export const connectCalendar = async (token) => {
  if (!token) {
    return { success: false, message: 'No authentication token provided' };
  }

  try {
    const response = await axios.get('/api/auth/google-calendar/authorize', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return { success: true, authorizationUrl: response.data.authorizationUrl };
  } catch (error) {
    console.error('Error connecting calendar:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to connect Google Calendar' 
    };
  }
};

/**
 * Disconnect Google Calendar integration
 * @param {string} token - User authentication token
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export const disconnectCalendar = async (token) => {
  if (!token) {
    return { success: false, message: 'No authentication token provided' };
  }

  try {
    await axios.delete('/api/auth/google-calendar/disconnect', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return { success: true };
  } catch (error) {
    console.error('Error disconnecting calendar:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to disconnect Google Calendar' 
    };
  }
};

/**
 * Update user timezone preference
 * @param {string} timezone - Timezone value (e.g., 'Asia/Kolkata')
 * @param {string} token - User authentication token
 * @returns {Promise<{success: boolean, user?: object, message?: string}>}
 */
export const updateTimezone = async (timezone, token) => {
  if (!token) {
    return { success: false, message: 'No authentication token provided' };
  }

  try {
    const response = await axios.patch('/api/auth/preferences/timezone', 
      { timezone }, 
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return { success: true, user: response.data.user };
  } catch (error) {
    console.error('Error updating timezone:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to save timezone preference' 
    };
  }
};

/**
 * Update email notification preference
 * @param {boolean} emailNotificationsEnabled - Whether email notifications are enabled
 * @param {string} token - User authentication token
 * @returns {Promise<{success: boolean, user?: object, message?: string}>}
 */
export const updateNotificationPreference = async (emailNotificationsEnabled, token) => {
  if (!token) {
    return { success: false, message: 'No authentication token provided' };
  }

  try {
    const response = await axios.patch('/api/auth/preferences/notifications', 
      { emailNotificationsEnabled }, 
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return { success: true, user: response.data.user };
  } catch (error) {
    console.error('Error updating notification preference:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to update notification preference' 
    };
  }
};

