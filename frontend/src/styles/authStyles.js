/**
 * Authentication Component Styles
 * Extracted styles for Login and Register components
 */

export const getAuthStyles = () => ({
  container: {
    marginTop: 8,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative'
  },
  themeToggleButton: {
    position: 'absolute',
    top: 16,
    right: 16
  },
  paper: {
    padding: 4,
    width: '100%'
  },
  form: {
    mt: 1
  },
  submitButton: {
    mt: 3,
    mb: 2
  }
});

