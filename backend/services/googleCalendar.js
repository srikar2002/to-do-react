const { google } = require('googleapis');
const dayjs = require('dayjs');

/**
 * Debug function to check if credentials are loaded
 */
function checkCredentials() {
  const credentials = process.env.GOOGLE_CALENDAR_CREDENTIALS;
  if (!credentials) {
    console.log('⚠️ GOOGLE_CALENDAR_CREDENTIALS not found in environment variables');
    return false;
  }
  
  try {
    const parsed = JSON.parse(credentials);
    if (!parsed.client_email || !parsed.private_key) {
      console.log('⚠️ Credentials missing required fields');
      return false;
    }
    console.log('✅ Credentials found and valid');
    return true;
  } catch (error) {
    console.log('⚠️ Error parsing credentials:', error.message);
    return false;
  }
}

/**
 * Google Calendar Service
 * Handles creating, updating, and deleting events in Google Calendar
 */

// Initialize OAuth2 client
// Note: For production, you should store these credentials securely
// and implement proper OAuth2 flow for each user
let auth = null;

/**
 * Initialize Google Calendar API client
 * This is a simplified version - in production, you'd need to:
 * 1. Implement OAuth2 flow for each user
 * 2. Store refresh tokens securely
 * 3. Handle token refresh automatically
 */
function initializeAuth() {
  // For now, we'll use a service account or API key approach
  // In production, implement OAuth2 with user-specific tokens
  if (!auth) {
    // Check if we have credentials from environment
    const credentials = process.env.GOOGLE_CALENDAR_CREDENTIALS;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    
    if (credentials) {
      // Service account approach
      try {
        // Parse the JSON credentials
        let keyFile;
        if (typeof credentials === 'string') {
          keyFile = JSON.parse(credentials);
        } else {
          keyFile = credentials;
        }
        
        // Validate required fields
        if (!keyFile.client_email || !keyFile.private_key) {
          console.error('Google Calendar credentials missing required fields (client_email or private_key)');
          return null;
        }
        
        auth = new google.auth.GoogleAuth({
          credentials: keyFile,
          scopes: ['https://www.googleapis.com/auth/calendar']
        });
        
        console.log('✅ Google Calendar authentication initialized successfully');
        console.log('Service account email:', keyFile.client_email);
      } catch (error) {
        console.error('❌ Error parsing Google Calendar credentials:');
        console.error('Error message:', error.message);
        console.error('Make sure GOOGLE_CALENDAR_CREDENTIALS is valid JSON');
        return null;
      }
    } else if (clientId && clientSecret) {
      // OAuth2 client approach (requires user authorization)
      auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    } else {
      console.warn('Google Calendar credentials not configured. Calendar sync will be disabled.');
      return null;
    }
  }
  
  return auth;
}

/**
 * Get Google Calendar API client
 */
async function getCalendarClient() {
  const authClient = initializeAuth();
  if (!authClient) {
    return null;
  }
  
  try {
    const auth = await authClient.getClient();
    
    // Test the authentication by getting an access token
    const token = await auth.getAccessToken();
    if (!token) {
      console.error('❌ Failed to get access token from Google Calendar');
      return null;
    }
    
    return google.calendar({ version: 'v3', auth });
  } catch (error) {
    console.error('❌ Error initializing Google Calendar client:');
    console.error('Error message:', error.message);
    if (error.message && error.message.includes('Invalid token')) {
      console.error('This usually means:');
      console.error('1. The service account credentials are invalid or expired');
      console.error('2. The Calendar API is not enabled in Google Cloud Console');
      console.error('3. The service account does not have proper permissions');
    }
    return null;
  }
}

/**
 * Create a calendar event from a task
 * @param {Object} task - Task object
 * @param {String} userEmail - User's email (for calendar access)
 * @returns {Promise<String|null>} - Event ID or null if failed
 */
async function createCalendarEvent(task, userEmail = null) {
  try {
    const calendar = await getCalendarClient();
    if (!calendar) {
      console.warn('Google Calendar client not available');
      return null;
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
        timeZone: 'UTC',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'UTC',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // Email reminder 1 day before
          { method: 'popup', minutes: 30 }, // Popup reminder 30 minutes before
        ],
      },
    };

    // Determine calendar ID
    // For service accounts, we need to use the calendar that was shared with the service account
    // Check if we have a custom calendar ID in env, otherwise try to use userEmail or primary
    let calendarId = process.env.GOOGLE_CALENDAR_ID || userEmail || 'primary';
    
    // If using service account and no specific calendar ID, try to use the service account's own calendar
    const credentials = process.env.GOOGLE_CALENDAR_CREDENTIALS;
    if (credentials && !process.env.GOOGLE_CALENDAR_ID && !userEmail) {
      try {
        const keyFile = JSON.parse(credentials);
        // Use the service account email as calendar ID (it has its own calendar)
        calendarId = keyFile.client_email;
      } catch (e) {
        // Fallback to primary
        calendarId = 'primary';
      }
    }

    console.log('Creating calendar event in calendar:', calendarId);
    console.log('Event details:', { title: task.title, date: task.date });

    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
    });

    console.log('✅ Google Calendar event created successfully!');
    console.log('Event ID:', response.data.id);
    console.log('Event HTML Link:', response.data.htmlLink);
    return response.data.id;
  } catch (error) {
    console.error('❌ Error creating Google Calendar event:');
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

/**
 * Update a calendar event
 * @param {String} eventId - Google Calendar event ID
 * @param {Object} task - Updated task object
 * @param {String} userEmail - User's email (for calendar access)
 * @returns {Promise<Boolean>} - Success status
 */
async function updateCalendarEvent(eventId, task, userEmail = null) {
  try {
    const calendar = await getCalendarClient();
    if (!calendar) {
      console.warn('Google Calendar client not available');
      return false;
    }

    // Determine calendar ID (same logic as createCalendarEvent)
    let calendarId = process.env.GOOGLE_CALENDAR_ID || userEmail || 'primary';
    const credentials = process.env.GOOGLE_CALENDAR_CREDENTIALS;
    if (credentials && !process.env.GOOGLE_CALENDAR_ID && !userEmail) {
      try {
        const keyFile = JSON.parse(credentials);
        calendarId = keyFile.client_email;
      } catch (e) {
        calendarId = 'primary';
      }
    }

    // First, get the existing event
    const existingEvent = await calendar.events.get({
      calendarId: calendarId,
      eventId: eventId,
    });

    // Parse task date
    const taskDate = dayjs(task.date);
    const startDateTime = taskDate.startOf('day').toISOString();
    const endDateTime = taskDate.endOf('day').toISOString();

    // Update event
    const updatedEvent = {
      ...existingEvent.data,
      summary: task.title,
      description: task.description || '',
      start: {
        dateTime: startDateTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'UTC',
      },
    };

    await calendar.events.update({
      calendarId: calendarId,
      eventId: eventId,
      resource: updatedEvent,
    });

    console.log('Google Calendar event updated:', eventId);
    return true;
  } catch (error) {
    console.error('Error updating Google Calendar event:', error);
    return false;
  }
}

/**
 * Delete a calendar event
 * @param {String} eventId - Google Calendar event ID
 * @param {String} userEmail - User's email (for calendar access)
 * @returns {Promise<Boolean>} - Success status
 */
async function deleteCalendarEvent(eventId, userEmail = null) {
  try {
    const calendar = await getCalendarClient();
    if (!calendar) {
      console.warn('Google Calendar client not available');
      return false;
    }

    // Determine calendar ID (same logic as createCalendarEvent)
    let calendarId = process.env.GOOGLE_CALENDAR_ID || userEmail || 'primary';
    const credentials = process.env.GOOGLE_CALENDAR_CREDENTIALS;
    if (credentials && !process.env.GOOGLE_CALENDAR_ID && !userEmail) {
      try {
        const keyFile = JSON.parse(credentials);
        calendarId = keyFile.client_email;
      } catch (e) {
        calendarId = 'primary';
      }
    }

    await calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId,
    });

    console.log('Google Calendar event deleted:', eventId);
    return true;
  } catch (error) {
    console.error('Error deleting Google Calendar event:', error);
    return false;
  }
}

module.exports = {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  initializeAuth,
  checkCredentials,
};

