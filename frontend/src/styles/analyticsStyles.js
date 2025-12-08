/**
 * AnalyticsDashboard Component Styles
 * Extracted styles for the AnalyticsDashboard component
 */

export const getAnalyticsStyles = (darkMode, theme) => ({
  mainBox: {
    py: 4,
    px: { xs: 2, sm: 3 }
  },
  headerBox: {
    mb: 4
  },
  title: {
    fontWeight: 800,
    mb: 1,
    background: darkMode 
      ? 'linear-gradient(135deg, #fff 0%, #e0e0e0 100%)' 
      : 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  subtitle: {
    color: 'text.secondary'
  },
  cardStyle: {
    bgcolor: darkMode 
      ? 'rgba(255,255,255,0.03)' 
      : 'rgba(255,255,255,0.9)',
    border: darkMode 
      ? '1px solid rgba(255,255,255,0.1)' 
      : '1px solid rgba(0,0,0,0.08)',
    borderRadius: 3,
    boxShadow: darkMode 
      ? '0 4px 20px rgba(0,0,0,0.3)' 
      : '0 4px 20px rgba(0,0,0,0.08)',
    transition: 'all 0.3s ease',
    '&:hover': {
      boxShadow: darkMode 
        ? '0 8px 30px rgba(0,0,0,0.4)' 
        : '0 8px 30px rgba(0,0,0,0.12)'
    }
  },
  chartCard: {
    height: '100%',
    bgcolor: darkMode 
      ? 'rgba(255,255,255,0.03)' 
      : 'rgba(255,255,255,0.9)',
    border: darkMode 
      ? '1px solid rgba(255,255,255,0.1)' 
      : '1px solid rgba(0,0,0,0.08)',
    borderRadius: 3,
    boxShadow: darkMode 
      ? '0 4px 20px rgba(0,0,0,0.3)' 
      : '0 4px 20px rgba(0,0,0,0.08)',
    transition: 'all 0.3s ease',
    '&:hover': {
      boxShadow: darkMode 
        ? '0 8px 30px rgba(0,0,0,0.4)' 
        : '0 8px 30px rgba(0,0,0,0.12)'
    }
  },
  chartCardContent: {
    p: 3
  },
  chartTitle: {
    mb: 3,
    fontWeight: 700
  },
  chartBox: {
    height: 320
  },
  chartOptions: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          color: theme.palette.text.primary,
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: darkMode ? '#1e1e1e' : '#fff',
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: theme.palette.text.secondary,
          font: { size: 12 }
        },
        border: { color: theme.palette.divider }
      },
      y: {
        grid: {
          color: darkMode 
            ? 'rgba(255,255,255,0.08)' 
            : 'rgba(0,0,0,0.08)',
          drawBorder: false
        },
        ticks: {
          color: theme.palette.text.secondary,
          font: { size: 12 }
        },
        border: { color: theme.palette.divider }
      }
    }
  }
});

