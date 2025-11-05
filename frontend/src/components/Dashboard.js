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
  Snackbar,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Logout as LogoutIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TaskContext';
import TaskCard from './TaskCard';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { tasks, dates, archivedTasks, loading, createTask, updateTask, deleteTask, toggleTaskStatus, archiveTask, restoreTask, fetchArchivedTasks } = useTasks();
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: 'today',
    status: 'Pending',
    priority: 'Medium',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({
    title: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);

  const handleOpenDialog = (task = null) => {
    if (task) {
      // Prevent editing archived tasks
      if (task.archived) {
        showSnackbar('Cannot edit archived tasks. Restore it first to make changes.', 'warning');
        return;
      }
      // Prevent editing completed tasks
      if (task.status === 'Completed') {
        showSnackbar('Cannot edit completed tasks. Uncomplete it first to make changes.', 'warning');
        return;
      }
      
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
        status: task.status,
        priority: task.priority || 'Medium',
        tags: task.tags || []
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        date: 'today',
        status: 'Pending',
        priority: 'Medium',
        tags: []
      });
      setTagInput('');
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
      status: 'Pending',
      priority: 'Medium',
      tags: []
    });
    setTagInput('');
    setErrors({ title: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Custom validations
    const nextErrors = { title: '' };
    const isTitleEmpty = formData.title.trim().length === 0;
    const titleTooLong = formData.title.trim().length > 50;
    const descriptionTooLong = formData.description.trim().length > 200;

    if (isTitleEmpty) {
      nextErrors.title = 'Title is required';
    } else if (titleTooLong) {
      nextErrors.title = 'Max 50 characters';
    }

    setErrors(nextErrors);
    if (nextErrors.title || descriptionTooLong) {
      showSnackbar('Please fix validation errors before submitting', 'error');
      return;
    }
    
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
      status: formData.status,
      priority: formData.priority,
      tags: formData.tags
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

  const handleRequestDelete = (task) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    const result = await deleteTask(taskToDelete._id);
    if (result?.success) {
      showSnackbar('Task deleted successfully', 'success');
    } else {
      showSnackbar(result?.message || 'Failed to delete task', 'error');
    }
    handleCloseDeleteDialog();
  };

  const handleToggleStatus = async (taskId, currentStatus) => {
    await toggleTaskStatus(taskId, currentStatus);
  };

  const handleArchive = async (task) => {
    const result = await archiveTask(task._id);
    if (result.success) {
      showSnackbar('Task archived successfully', 'success');
      // Refresh archived tasks to update the count
      await fetchArchivedTasks();
    } else {
      showSnackbar(result.message || 'Failed to archive task', 'error');
    }
  };

  const handleRestore = async (task) => {
    const result = await restoreTask(task._id);
    if (result.success) {
      showSnackbar('Task restored successfully', 'success');
      // If we're on the archive tab, refresh archived tasks
      if (currentTab === 1) {
        await fetchArchivedTasks();
      }
    } else {
      showSnackbar(result.message || 'Failed to restore task', 'error');
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    if (newValue === 1) {
      // Fetch archived tasks when switching to archive tab
      fetchArchivedTasks();
    }
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

  // Only show full-page loader on initial load (when dates are not set yet)
  if (loading && !dates.today) {
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
          <Box sx={{ mb: 3 }}>
            <Tabs value={currentTab} onChange={handleTabChange} aria-label="task tabs">
              <Tab label="Tasks" />
              <Tab label={`Archived (${archivedTasks.length})`} />
            </Tabs>
          </Box>

          {currentTab === 0 && (
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
                      onDelete={() => handleRequestDelete(task)}
                      onToggleStatus={() => handleToggleStatus(task._id, task.status)}
                      onArchive={() => handleArchive(task)}
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
                      onDelete={() => handleRequestDelete(task)}
                      onToggleStatus={() => handleToggleStatus(task._id, task.status)}
                      onArchive={() => handleArchive(task)}
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
                      onDelete={() => handleRequestDelete(task)}
                      onToggleStatus={() => handleToggleStatus(task._id, task.status)}
                      onArchive={() => handleArchive(task)}
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
          )}

          {currentTab === 1 && (
            <Card>
              <CardHeader
                title="Archived Tasks"
                subheader={`${archivedTasks.length} archived task${archivedTasks.length !== 1 ? 's' : ''}`}
                sx={{ backgroundColor: '#fff3e0' }}
              />
              <CardContent>
                {archivedTasks.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                    No archived tasks
                  </Typography>
                ) : (
                  <Box>
                    {archivedTasks.map((task) => (
                      <TaskCard
                        key={task._id}
                        task={task}
                        onEdit={() => handleOpenDialog(task)}
                        onDelete={() => handleRequestDelete(task)}
                        onToggleStatus={() => handleToggleStatus(task._id, task.status)}
                        onRestore={() => handleRestore(task)}
                        showArchive={false}
                      />
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Container>

        {/* Floating Action Button - only show on Tasks tab */}
        {currentTab === 0 && (
          <Fab
            color="primary"
            aria-label="add"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={() => handleOpenDialog()}
          >
            <AddIcon />
          </Fab>
        )}

        {/* Task Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingTask ? 'Edit Task' : 'Add New Task'}
          </DialogTitle>
          <form onSubmit={handleSubmit} noValidate>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Task Title"
                fullWidth
                variant="outlined"
                value={formData.title}
                onChange={(e) => {
                  const next = e.target.value || '';
                  const capped = next.length > 50 ? next.slice(0, 50) : next;
                  setFormData({ ...formData, title: capped });
                  if (errors.title && capped.trim().length > 0 && capped.trim().length <= 50) {
                    setErrors({ ...errors, title: '' });
                  }
                }}
                error={Boolean(errors.title) || (formData.title.length >= 50 && formData.title.length > 0)}
                helperText={errors.title || (formData.title.length >= 50 && formData.title.length > 0 ? "Max 50 characters reached" : '')}
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
                onChange={(e) => {
                  const next = e.target.value || '';
                  const capped = next.length > 200 ? next.slice(0, 200) : next;
                  setFormData({ ...formData, description: capped });
                }}
                error={formData.description.length >= 200 && formData.description.length > 0}
                helperText={formData.description.length >= 200 && formData.description.length > 0 ? "Max 200 characters reached" : ''}
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
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="priority-select-label">Priority</InputLabel>
                <Select
                  labelId="priority-select-label"
                  value={formData.priority}
                  label="Priority"
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Medium">Medium</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                </Select>
              </FormControl>
              <TextField
                margin="dense"
                label="Add Tag"
                fullWidth
                variant="outlined"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    e.preventDefault();
                    const trimmedTag = tagInput.trim();
                    if (!formData.tags.includes(trimmedTag)) {
                      setFormData({ ...formData, tags: [...formData.tags, trimmedTag] });
                    }
                    setTagInput('');
                  }
                }}
                InputProps={{
                  endAdornment: tagInput && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => {
                          const trimmedTag = tagInput.trim();
                          if (trimmedTag && !formData.tags.includes(trimmedTag)) {
                            setFormData({ ...formData, tags: [...formData.tags, trimmedTag] });
                          }
                          setTagInput('');
                        }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 1 }}
              />
              {formData.tags.length > 0 && (
                <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {formData.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      size="small"
                      onDelete={() => {
                        setFormData({ ...formData, tags: formData.tags.filter((_, i) => i !== index) });
                      }}
                      deleteIcon={<CloseIcon />}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button
                type="submit"
                variant="contained"
                disabled={
                  formData.title.trim().length === 0 ||
                  formData.title.length >= 50 ||
                  formData.description.length >= 200
                }
              >
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

        {/* Delete Confirmation Dialog */}
        <Dialog 
          open={deleteDialogOpen} 
          onClose={handleCloseDeleteDialog} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{ sx: { minWidth: 520, minHeight: 220 } }}
        >
          <DialogTitle>Delete Task</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              Are you sure you want to delete "{taskToDelete?.title}"?
            </Typography>
            {taskToDelete?.status === 'Pending' && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                This task is still Pending. Do you still want to delete it?
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
            <Button onClick={handleConfirmDelete} color="error" variant="contained">Delete</Button>
          </DialogActions>
        </Dialog>
      </Box>
  );
};

export default Dashboard;
