import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  Logout as LogoutIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getDashboardStyles } from '../styles/dashboardStyles';

const DashboardHeader = ({
  user,
  darkMode,
  toggleTheme,
  logout,
  currentTab,
  onAddTask
}) => {
  const navigate = useNavigate();
  const styles = getDashboardStyles(darkMode);

  return (
    <AppBar 
      position="static"
      sx={styles.appBar}
    >
      <Toolbar>
        <Typography 
          variant="h5" 
          component="div" 
          sx={styles.title}
        >
          Taskly
        </Typography>
        <Typography 
          variant="body1" 
          sx={styles.welcomeText}
        >
          Welcome, <strong>{user?.name}</strong>!
        </Typography>
        {currentTab === 0 && (
          <IconButton 
            onClick={onAddTask} 
            sx={styles.addButton}
          >
            <AddIcon />
          </IconButton>
        )}
        <IconButton 
          color="inherit" 
          onClick={() => navigate('/profile')}
          sx={styles.iconButton}
          title="Profile"
        >
          <PersonIcon />
        </IconButton>
        <IconButton 
          color="inherit" 
          onClick={toggleTheme} 
          sx={styles.iconButton}
        >
          {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>
        <Button 
          color="inherit" 
          onClick={logout} 
          startIcon={<LogoutIcon />}
          sx={styles.logoutButton}
        >
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default DashboardHeader;
