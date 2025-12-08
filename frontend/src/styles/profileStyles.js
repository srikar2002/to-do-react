/**
 * Profile Component Styles
 * Extracted styles for the Profile component
 */

export const getProfileStyles = (darkMode) => ({
  container: {
    mt: 4,
    mb: 4
  },
  backButton: {
    mb: 3
  },
  card: {
    boxShadow: darkMode 
      ? '0 4px 24px rgba(0, 0, 0, 0.6)' 
      : '0 4px 24px rgba(0, 0, 0, 0.1)',
    mb: 3
  },
  cardContent: {
    p: 4
  },
  title: {
    mb: 3,
    fontWeight: 600
  },
  preferencesTitle: {
    mb: 3,
    fontWeight: 400
  },
  userInfoBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    mb: 3
  },
  avatar: {
    width: 64,
    height: 64,
    bgcolor: 'primary.main'
  },
  userDetailBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    mb: 1
  },
  emailBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 1
  },
  alert: {
    mb: 2
  },
  formControl: {
    mb: 3
  },
  circularProgress: {
    mr: 2
  },
  notificationBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    mb: 3
  },
  calendarSection: {
    borderTop: 1,
    borderColor: 'divider',
    pt: 3,
    mt: 3
  },
  calendarHeaderBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    mb: 2
  },
  calendarDescription: {
    mb: 2
  },
  calendarStatusBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 1
  },
  calendarConnectedBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    mb: 2
  }
});

