const https = require('https');
const querystring = require('querystring');
const url = require('url');

/**
 * Google Calendar Service using native Node.js modules (no npm packages)
 * Handles OAuth2 authentication and calendar event creation
 */

// Google OAuth2 endpoints (configurable via environment variables)
const GOOGLE_AUTH_URL = process.env.GOOGLE_AUTH_URL || 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = process.env.GOOGLE_CALENDAR_API || 'https://www.googleapis.com/calendar/v3';

/**
 * Generate Google OAuth2 authorization URL
 * @param {string} clientId - Google OAuth2 Client ID
 * @param {string} redirectUri - OAuth2 redirect URI
 * @param {string} state - State parameter for security
 * @returns {string} Authorization URL
 */
const getAuthorizationUrl = (clientId, redirectUri, state) => {
  const params = {
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline',
    prompt: 'consent',
    state: state
  };
  
  return `${GOOGLE_AUTH_URL}?${querystring.stringify(params)}`;
};

/**
 * Make OAuth token request (shared helper for exchange and refresh)
 */
const makeTokenRequest = (params) => {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify(params);
    const parsedUrl = url.parse(GOOGLE_TOKEN_URL);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(response);
          } else {
            reject(new Error(response.error || 'Token request failed'));
          }
        } catch (error) {
          reject(new Error('Invalid JSON response: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
};

/**
 * Exchange authorization code for access token
 */
const exchangeCodeForTokens = (code, clientId, clientSecret, redirectUri) => {
  return makeTokenRequest({
    code, client_id: clientId, client_secret: clientSecret,
    redirect_uri: redirectUri, grant_type: 'authorization_code'
  });
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = (refreshToken, clientId, clientSecret) => {
  return makeTokenRequest({
    refresh_token: refreshToken, client_id: clientId,
    client_secret: clientSecret, grant_type: 'refresh_token'
  });
};

/**
 * Make authenticated request to Google Calendar API
 */
const makeCalendarRequest = (method, endpoint, accessToken, data = null) => {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(GOOGLE_CALENDAR_API + endpoint);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method,
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    };

    const hasBody = data && ['POST', 'PUT', 'PATCH'].includes(method);
    if (hasBody) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const response = responseData ? JSON.parse(responseData) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`API Error (${res.statusCode}): ${response.error?.message || responseData}`));
          }
        } catch (error) {
          reject(new Error('Invalid JSON response: ' + responseData));
        }
      });
    });

    req.on('error', reject);
    if (hasBody) req.write(JSON.stringify(data));
    req.end();
  });
};

/**
 * Create a calendar event in Google Calendar
 */
const createCalendarEvent = async (accessToken, eventData) => {
  const { summary, description, start, end, timeZone = 'UTC' } = eventData;
  return makeCalendarRequest('POST', '/calendars/primary/events', accessToken, {
    summary, description: description || '',
    start: { dateTime: start, timeZone },
    end: { dateTime: end, timeZone }
  });
};

/**
 * Create calendar event from task data
 * Uses the task creation time for the event start time
 */
const createEventFromTask = async (accessToken, task, userTimezone = 'UTC') => {
  const creationTime = task.createdAt ? new Date(task.createdAt) : new Date();
  const formatTime = (d) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  
  const startDateTime = `${task.date}T${formatTime(creationTime)}`;
  const startDate = new Date(startDateTime);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  const endDateTime = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}T${formatTime(endDate)}`;
  
  return createCalendarEvent(accessToken, {
    summary: task.title,
    description: task.description || `Task: ${task.title}`,
    start: startDateTime,
    end: endDateTime,
    timeZone: userTimezone
  });
};

/**
 * Get or refresh access token for user
 */
const getValidAccessToken = async (user, clientId, clientSecret) => {
  if (!user.googleAccessToken) {
    throw new Error('User has not authorized Google Calendar access');
  }
  
  if (user.googleRefreshToken) {
    try {
      const tokenResponse = await refreshAccessToken(user.googleRefreshToken, clientId, clientSecret);
      user.googleAccessToken = tokenResponse.access_token;
      if (tokenResponse.refresh_token) user.googleRefreshToken = tokenResponse.refresh_token;
      return { token: tokenResponse.access_token, refreshed: true };
    } catch (error) {
      console.error('Error refreshing token:', error);
      return { token: user.googleAccessToken, refreshed: false };
    }
  }
  return { token: user.googleAccessToken, refreshed: false };
};

module.exports = {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  createCalendarEvent,
  createEventFromTask,
  getValidAccessToken,
  makeCalendarRequest
};

