/**
 * Dashboard Component Styles
 * Extracted styles for the Dashboard component
 */

export const getDashboardStyles = (darkMode) => ({
  mainBox: {
    flexGrow: 1
  },
  appBar: {
    background: darkMode 
      ? 'linear-gradient(135deg, #0f172a 0%, #1e40af 50%, #0369a1 100%)'
      : 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #0891b2 100%)',
    boxShadow: darkMode 
      ? '0 4px 24px rgba(15, 23, 42, 0.6)'
      : '0 4px 24px rgba(30, 58, 138, 0.5)',
    backdropFilter: 'blur(10px)',
    borderBottom: darkMode 
      ? '1px solid rgba(255, 255, 255, 0.05)'
      : '1px solid rgba(255, 255, 255, 0.1)'
  },
  title: {
    flexGrow: 1,
    fontWeight: 700,
    letterSpacing: 1,
    background: 'linear-gradient(45deg, #fff 30%, #f0f0f0 90%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  welcomeText: {
    mr: 2,
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.95)'
  },
  addButton: {
    mr: 1,
    color: '#1976d2',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    MozUserSelect: 'none',
    msUserSelect: 'none',
    '&:hover': {
      backgroundColor: '#fff',
      color: '#1565c0',
      transform: 'scale(1.1)'
    },
    transition: 'all 0.2s ease-in-out',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
  },
  iconButton: {
    mr: 1,
    color: 'rgba(255, 255, 255, 0.9)',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      color: '#fff'
    }
  },
  logoutButton: {
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'none',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      color: '#fff'
    }
  },
  container: {
    mt: 4,
    mb: 4
  },
  tabsBox: {
    mb: 3
  },
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  cardHeader: (lightColor) => ({
    backgroundColor: darkMode 
      ? lightColor === '#e3f2fd' ? 'rgba(25, 118, 210, 0.2)' 
        : lightColor === '#f3e5f5' ? 'rgba(156, 39, 176, 0.2)'
        : 'rgba(76, 175, 80, 0.2)'
      : lightColor
  }),
  cardContent: {
    flexGrow: 1,
    overflow: 'auto',
    minHeight: 200
  },
  weeklyViewCard: {
    bgcolor: darkMode ? '#1e1e1e' : '#fff',
    border: darkMode ? '1px solid #444' : '1px solid #e0e0e0',
    borderRadius: '8px',
    p: 2
  },
  weeklyHeaderBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    mb: 2
  },
  weeklyNavButton: {
    color: darkMode ? '#fff' : '#000',
    '&:hover': {
      bgcolor: darkMode ? '#2d2d2d' : '#f5f5f5'
    }
  },
  weeklyTitle: {
    fontWeight: 500,
    color: darkMode ? '#fff' : '#000'
  },
  todayButton: {
    textTransform: 'none',
    minWidth: 'auto',
    px: 1.5,
    borderColor: darkMode ? '#444' : '#e0e0e0',
    color: darkMode ? '#fff' : '#000',
    '&:hover': {
      borderColor: darkMode ? '#555' : '#ccc',
      bgcolor: darkMode ? '#2d2d2d' : '#f5f5f5'
    }
  },
  weekDayBox: (isToday) => ({
    p: 1.5,
    borderRadius: '8px',
    textAlign: 'center',
    bgcolor: isToday 
      ? (darkMode ? 'rgba(25, 118, 210, 0.15)' : 'rgba(33, 150, 243, 0.1)')
      : (darkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'),
    border: isToday
      ? (darkMode ? '1px solid #1976d2' : '1px solid #2196f3')
      : (darkMode ? '1px solid #333' : '1px solid #e0e0e0')
  }),
  weekDayLabel: {
    color: darkMode ? '#aaa' : '#666',
    textTransform: 'uppercase',
    fontSize: '0.7rem',
    fontWeight: 500,
    display: 'block',
    mb: 0.5
  },
  weekDayNumber: (isToday) => ({
    color: isToday 
      ? (darkMode ? '#1976d2' : '#2196f3')
      : (darkMode ? '#fff' : '#000'),
    fontWeight: isToday ? 700 : 500
  }),
  weekDaySummary: {
    color: darkMode ? '#888' : '#999',
    fontSize: '0.7rem'
  },
  archivedCardHeader: {
    backgroundColor: darkMode 
      ? 'rgba(255, 152, 0, 0.2)' 
      : '#fff3e0'
  },
  archivedEmptyText: {
    py: 4
  },
  dragOverlayCard: {
    opacity: 0.8,
    transform: 'rotate(5deg)',
    maxWidth: 300,
    boxShadow: 6
  },
  dragOverlayContent: {
    mt: 1
  },
  loaderBox: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh'
  },
  emptyTaskText: {
    align: 'center'
  },
  droppableCardContent: (baseSx) => ({
    ...baseSx,
    transition: 'background-color 0.2s'
  }),
  weeklyButtonBox: {
    display: 'flex',
    gap: 1
  },
  weeklyGridItem: {
    flex: { md: '1 1 0%' }
  },
  weeklyDayNumberBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    mb: 1
  },
  weeklyStatusDotsBox: {
    display: 'flex',
    gap: 0.5
  },
  weeklyStatusDot: (isPending, darkMode) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    bgcolor: isPending 
      ? (darkMode ? '#1976d2' : '#2196f3')
      : (darkMode ? '#4caf50' : '#66bb6a')
  }),
  dialogFormControlLabel: {
    mb: 2
  },
  dialogTextField: {
    mb: 2
  },
  dialogFormControl: {
    mb: 2
  },
  dialogTagTextField: {
    mb: 1
  },
  dialogTagsBox: {
    mb: 2,
    display: 'flex',
    gap: 1,
    flexWrap: 'wrap'
  },
  deleteDialogPaper: {
    minWidth: 520,
    minHeight: 220
  },
  deleteDialogWarningText: {
    mt: 1
  }
});

