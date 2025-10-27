import React, { useState } from 'react';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
  FormControlLabel,
  Switch,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Logout as LogoutIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TaskContext';
import TaskCard from './TaskCard';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { tasks, dates, loading, createTask, updateTask, deleteTask, toggleTaskStatus } = useTasks();
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: 'today',
    status: 'Pending'
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleOpenDialog = (task = null) => {
    if (task) {
      setEditingTask(task);
      // Convert task date to our dropdown format
      const taskDate = dayjs(task.date);
      const today = dayjs();
      const tomorrow = dayjs().add(1, 'day');
      const dayAfterTomorrow = dayjs().add(2, 'day');
      
      let dateOption = 'today';
      if (taskDate.isSame(tomorrow, 'day')) {
        dateOption = 'tomorrow';
      } else if (taskDate.isSame(dayAfterTomorrow, 'day')) {
        dateOption = 'dayAfterTomorrow';
      }
      
      setFormData({
        title: task.title,
        description: task.description,
        date: dateOption,
        status: task.status
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        date: 'today',
        status: 'Pending'
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      date: 'today',
      status: 'Pending'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Convert dropdown selection to actual date
    let actualDate;
    switch (formData.date) {
      case 'today':
        actualDate = dayjs().format('YYYY-MM-DD');
        break;
      case 'tomorrow':
        actualDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
        break;
      case 'dayAfterTomorrow':
        actualDate = dayjs().add(2, 'day').format('YYYY-MM-DD');
        break;
      default:
        actualDate = dayjs().format('YYYY-MM-DD');
    }
    
    const taskData = {
      title: formData.title,
      description: formData.description,
      date: actualDate,
      status: formData.status
    };

    if (editingTask) {
      // Update existing task
      const result = await updateTask(editingTask._id, taskData);
      if (result.success) {
        handleCloseDialog();
        showSnackbar('Task updated successfully', 'success');
      } else {
        showSnackbar(result.message || 'Failed to update task', 'error');
      }
    } else {
      // Create new task
      const result = await createTask(taskData);
      if (result.success) {
        handleCloseDialog();
        showSnackbar('Task created successfully', 'success');
      } else {
        showSnackbar(result.message || 'Failed to create task', 'error');
      }
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteTask(taskId);
    }
  };

  const handleToggleStatus = async (taskId, currentStatus) => {
    await toggleTaskStatus(taskId, currentStatus);
  };


  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const formatDate = (dateString) => {
    return dayjs(dateString).format('MMM DD, YYYY');
  };

  const getDayLabel = (dateString) => {
    const today = dayjs().format('YYYY-MM-DD');
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
    
    if (dateString === today) return 'Today';
    if (dateString === tomorrow) return 'Tomorrow';
    return 'Day After Tomorrow';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Taskly
            </Typography>
            <Typography variant="body1" sx={{ mr: 2 }}>
              Welcome, {user?.name}!
            </Typography>
            <Button color="inherit" onClick={logout} startIcon={<LogoutIcon />}>
              Logout
            </Button>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Grid container spacing={3}>
            {/* Today */}
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardHeader
                  title={getDayLabel(dates.today)}
                  subheader={formatDate(dates.today)}
                  sx={{ backgroundColor: '#e3f2fd' }}
                />
                <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
                  {tasks.today.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      onEdit={() => handleOpenDialog(task)}
                      onDelete={() => handleDeleteTask(task._id)}
                      onToggleStatus={() => handleToggleStatus(task._id, task.status)}
                    />
                  ))}
                  {tasks.today.length === 0 && (
                    <Typography variant="body2" color="text.secondary" align="center">
                      No tasks for today
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Tomorrow */}
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardHeader
                  title={getDayLabel(dates.tomorrow)}
                  subheader={formatDate(dates.tomorrow)}
                  sx={{ backgroundColor: '#f3e5f5' }}
                />
                <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
                  {tasks.tomorrow.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      onEdit={() => handleOpenDialog(task)}
                      onDelete={() => handleDeleteTask(task._id)}
                      onToggleStatus={() => handleToggleStatus(task._id, task.status)}
                    />
                  ))}
                  {tasks.tomorrow.length === 0 && (
                    <Typography variant="body2" color="text.secondary" align="center">
                      No tasks for tomorrow
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Day After Tomorrow */}
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardHeader
                  title={getDayLabel(dates.dayAfterTomorrow)}
                  subheader={formatDate(dates.dayAfterTomorrow)}
                  sx={{ backgroundColor: '#e8f5e8' }}
                />
                <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
                  {tasks.dayAfterTomorrow.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      onEdit={() => handleOpenDialog(task)}
                      onDelete={() => handleDeleteTask(task._id)}
                      onToggleStatus={() => handleToggleStatus(task._id, task.status)}
                    />
                  ))}
                  {tasks.dayAfterTomorrow.length === 0 && (
                    <Typography variant="body2" color="text.secondary" align="center">
                      No tasks for day after tomorrow
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => handleOpenDialog()}
        >
          <AddIcon />
        </Fab>

        {/* Task Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingTask ? 'Edit Task' : 'Add New Task'}
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Task Title"
                fullWidth
                variant="outlined"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Description"
                fullWidth
                multiline
                rows={3}
                variant="outlined"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="date-select-label">Date</InputLabel>
                <Select
                  labelId="date-select-label"
                  value={formData.date}
                  label="Date"
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                >
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="tomorrow">Tomorrow</MenuItem>
                  <MenuItem value="dayAfterTomorrow">Day After Tomorrow</MenuItem>
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button type="submit" variant="contained">
                {editingTask ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
  );
};

export default Dashboard;
