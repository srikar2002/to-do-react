/**
 * Google Calendar Service using Axios (No googleapis package required)
 * This uses only axios and jsonwebtoken which are already in dependencies
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
const dayjs = require('dayjs');

let credentials = null;
let accessToken = null;
let tokenExpiry = null;

/**
 * Parse and validate credentials
 */
function initializeCredentials() {
  if (credentials) return credentials;
  
  const credsString = process.env.GOOGLE_CALENDAR_CREDENTIALS;
  if (!credsString) {
    console.warn('Google Calendar credentials not configured');
    return null;
  }
  
  try {
    credentials = JSON.parse(credsString);
    if (!credentials.client_email || !credentials.private_key) {
      console.error('Credentials missing required fields');
      return null;
    }
    console.log('✅ Google Calendar credentials loaded');
    return credentials;
  } catch (error) {
    console.error('Error parsing credentials:', error.message);
    return null;
  }
}

/**
 * Create JWT for service account authentication
 */
function createJWT() {
  const creds = initializeCredentials();
  if (!creds) return null;
  
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour
  
  const jwtPayload = {
    iss: creds.client_email,
    sub: creds.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    exp: expiry,
    iat: now,
    scope: 'https://www.googleapis.com/auth/calendar'
  };
  
  try {
    const token = jwt.sign(jwtPayload, creds.private_key, {
      algorithm: 'RS256'
    });
    return token;
  } catch (error) {
    console.error('Error creating JWT:', error.message);
    return null;
  }
}

/**
 * Get access token using JWT
 */
async function getAccessToken() {
  // Return cached token if still valid
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }
  
  const jwtToken = createJWT();
  if (!jwtToken) return null;
  
  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwtToken
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    accessToken = response.data.access_token;
    // Set expiry 5 minutes before actual expiry for safety
    tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
    
    console.log('✅ Google Calendar access token obtained');
    return accessToken;
  } catch (error) {
    console.error('❌ Error getting access token:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Make authenticated request to Google Calendar API
 */
async function makeCalendarRequest(method, endpoint, data = null) {
  const token = await getAccessToken();
  if (!token) {
    return { error: 'Failed to get access token' };
  }
  
  try {
    const url = `https://www.googleapis.com/calendar/v3${endpoint}`;
    const config = {
      method,
      url,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { data: response.data };
  } catch (error) {
    console.error(`❌ Error in ${method} ${endpoint}:`);
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    return { error: error.response?.data || error.message };
  }
}

/**
 * Create a calendar event from a task
 */
async function createCalendarEvent(task, userEmail = null) {
  try {
    const creds = initializeCredentials();
    if (!creds) return null;
    
    // Determine calendar ID
    let calendarId = process.env.GOOGLE_CALENDAR_ID || userEmail || 'primary';
    if (!process.env.GOOGLE_CALENDAR_ID && !userEmail) {
      calendarId = creds.client_email;
    }
    
    // Parse task date
    const taskDate = dayjs(task.date);
    const startDateTime = taskDate.startOf('day').toISOString();
    const endDateTime = taskDate.endOf('day').toISOString();
    
    // Create event object
    const event = {
      summary: task.title,
      description: task.description || '',
      start: {
        dateTime: startDateTime,
        timeZone: 'UTC'
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'UTC'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 }
        ]
      }
    };
    
    console.log('Creating calendar event in calendar:', calendarId);
    console.log('Event details:', { title: task.title, date: task.date });
    
    const result = await makeCalendarRequest(
      'POST',
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      event
    );
    
    if (result.error) {
      return null;
    }
    
    console.log('✅ Google Calendar event created successfully!');
    console.log('Event ID:', result.data.id);
    console.log('Event HTML Link:', result.data.htmlLink);
    return result.data.id;
  } catch (error) {
    console.error('❌ Error creating Google Calendar event:', error.message);
    return null;
  }
}

/**
 * Update a calendar event
 */
async function updateCalendarEvent(eventId, task, userEmail = null) {
  try {
    const creds = initializeCredentials();
    if (!creds) return false;
    
    let calendarId = process.env.GOOGLE_CALENDAR_ID || userEmail || 'primary';
    if (!process.env.GOOGLE_CALENDAR_ID && !userEmail) {
      calendarId = creds.client_email;
    }
    
    // Get existing event first
    const getResult = await makeCalendarRequest(
      'GET',
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`
    );
    
    if (getResult.error) {
      return false;
    }
    
    const existingEvent = getResult.data;
    const taskDate = dayjs(task.date);
    
    // Update event
    const updatedEvent = {
      ...existingEvent,
      summary: task.title,
      description: task.description || '',
      start: {
        dateTime: taskDate.startOf('day').toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: taskDate.endOf('day').toISOString(),
        timeZone: 'UTC'
      }
    };
    
    const result = await makeCalendarRequest(
      'PUT',
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      updatedEvent
    );
    
    if (result.error) {
      return false;
    }
    
    console.log('✅ Google Calendar event updated:', eventId);
    return true;
  } catch (error) {
    console.error('❌ Error updating Google Calendar event:', error.message);
    return false;
  }
}

/**
 * Delete a calendar event
 */
async function deleteCalendarEvent(eventId, userEmail = null) {
  try {
    const creds = initializeCredentials();
    if (!creds) return false;
    
    let calendarId = process.env.GOOGLE_CALENDAR_ID || userEmail || 'primary';
    if (!process.env.GOOGLE_CALENDAR_ID && !userEmail) {
      calendarId = creds.client_email;
    }
    
    const result = await makeCalendarRequest(
      'DELETE',
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`
    );
    
    if (result.error) {
      return false;
    }
    
    console.log('✅ Google Calendar event deleted:', eventId);
    return true;
  } catch (error) {
    console.error('❌ Error deleting Google Calendar event:', error.message);
    return false;
  }
}

/**
 * Check if credentials are valid
 */
function checkCredentials() {
  const creds = initializeCredentials();
  if (!creds) {
    console.log('⚠️ GOOGLE_CALENDAR_CREDENTIALS not found or invalid');
    return false;
  }
  console.log('✅ Credentials found and valid');
  return true;
}

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  checkCredentials,
  initializeCredentials
};

