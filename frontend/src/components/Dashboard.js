import React, { useState } from 'react';
import { useSnackbar } from 'notistack';
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
  Close as CloseIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../contexts/TaskContext';
import { useTheme } from '../contexts/ThemeContext';
import TaskCard from './TaskCard';
import {
  TaskStatus,
  TaskPriority,
  DateOption,
  ValidationLimits,
  DayLabels,
  DefaultValues,
  SuccessMessages,
  ErrorMessages,
  ValidationMessages
} from '../constants/enums';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { tasks, dates, archivedTasks, loading, createTask, updateTask, deleteTask, toggleTaskStatus, archiveTask, restoreTask, fetchArchivedTasks } = useTasks();
  const { darkMode, toggleTheme } = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: DefaultValues.DATE,
    status: DefaultValues.STATUS,
    priority: DefaultValues.PRIORITY,
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({
    title: ''
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [activeTask, setActiveTask] = useState(null);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleOpenDialog = (task = null) => {
    if (task) {
      // Prevent editing archived tasks
      if (task.archived) {
        enqueueSnackbar(ErrorMessages.CANNOT_EDIT_ARCHIVED, { variant: 'warning' });
        return;
      }
      // Prevent editing completed tasks
      if (task.status === TaskStatus.COMPLETED) {
        enqueueSnackbar(ErrorMessages.CANNOT_EDIT_COMPLETED, { variant: 'warning' });
        return;
      }
      
      setEditingTask(task);
      // Convert task date to our dropdown format
      const taskDate = dayjs(task.date);
      const today = dayjs();
      const tomorrow = dayjs().add(1, 'day');
      const dayAfterTomorrow = dayjs().add(2, 'day');
      
      let dateOption = DateOption.TODAY;
      if (taskDate.isSame(tomorrow, 'day')) {
        dateOption = DateOption.TOMORROW;
      } else if (taskDate.isSame(dayAfterTomorrow, 'day')) {
        dateOption = DateOption.DAY_AFTER_TOMORROW;
      }
      
      setFormData({
        title: task.title,
        description: task.description,
        date: dateOption,
        status: task.status,
        priority: task.priority || DefaultValues.PRIORITY,
        tags: task.tags || []
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        date: DefaultValues.DATE,
        status: DefaultValues.STATUS,
        priority: DefaultValues.PRIORITY,
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
      date: DefaultValues.DATE,
      status: DefaultValues.STATUS,
      priority: DefaultValues.PRIORITY,
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
    const titleTooLong = formData.title.trim().length > ValidationLimits.TITLE_MAX_LENGTH;
    const descriptionTooLong = formData.description.trim().length > ValidationLimits.DESCRIPTION_MAX_LENGTH;

    if (isTitleEmpty) {
      nextErrors.title = ValidationMessages.TITLE_REQUIRED;
    } else if (titleTooLong) {
      nextErrors.title = ValidationMessages.TITLE_MAX_LENGTH;
    }

    setErrors(nextErrors);
    if (nextErrors.title || descriptionTooLong) {
      enqueueSnackbar(ErrorMessages.VALIDATION_ERRORS, { variant: 'error' });
      return;
    }
    
    // Convert dropdown selection to actual date
    let actualDate;
    switch (formData.date) {
      case DateOption.TODAY:
        actualDate = dayjs().format('YYYY-MM-DD');
        break;
      case DateOption.TOMORROW:
        actualDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
        break;
      case DateOption.DAY_AFTER_TOMORROW:
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
        enqueueSnackbar(SuccessMessages.TASK_UPDATED, { variant: 'info' });
      } else {
        enqueueSnackbar(result.message || ErrorMessages.TASK_UPDATE_FAILED, { variant: 'error' });
      }
    } else {
      // Create new task
      const result = await createTask(taskData);
      if (result.success) {
        handleCloseDialog();
        enqueueSnackbar(SuccessMessages.TASK_CREATED, { variant: 'success' });
      } else {
        enqueueSnackbar(result.message || ErrorMessages.TASK_CREATE_FAILED, { variant: 'error' });
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
      enqueueSnackbar(SuccessMessages.TASK_DELETED, { variant: 'error' });
    } else {
      enqueueSnackbar(result?.message || ErrorMessages.TASK_DELETE_FAILED, { variant: 'error' });
    }
    handleCloseDeleteDialog();
  };

  const handleToggleStatus = async (taskId, currentStatus) => {
    await toggleTaskStatus(taskId, currentStatus);
  };

  const handleArchive = async (task) => {
    const result = await archiveTask(task._id);
    if (result.success) {
      enqueueSnackbar(SuccessMessages.TASK_ARCHIVED, { variant: 'success' });
      // Refresh archived tasks to update the count
      await fetchArchivedTasks();
    } else {
      enqueueSnackbar(result.message || ErrorMessages.TASK_ARCHIVE_FAILED, { variant: 'error' });
    }
  };

  const handleRestore = async (task) => {
    const result = await restoreTask(task._id);
    if (result.success) {
      enqueueSnackbar(SuccessMessages.TASK_RESTORED, { variant: 'success' });
      // If we're on the archive tab, refresh archived tasks
      if (currentTab === 1) {
        await fetchArchivedTasks();
      }
    } else {
      enqueueSnackbar(result.message || ErrorMessages.TASK_RESTORE_FAILED, { variant: 'error' });
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    if (newValue === 1) {
      // Fetch archived tasks when switching to archive tab
      fetchArchivedTasks();
    }
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const taskId = active.id;
    // Find the task from all task lists
    const allTasks = [...tasks.today, ...tasks.tomorrow, ...tasks.dayAfterTomorrow];
    const task = allTasks.find(t => t._id === taskId);
    setActiveTask(task);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id;
    const sourceDate = active.data.current?.date;
    
    // Determine target date - could be from task data or column data
    let targetDate = over.data.current?.date;
    if (!targetDate) {
      // Check if over.id is a date (column drop)
      const validDates = [dates.today, dates.tomorrow, dates.dayAfterTomorrow];
      if (validDates.includes(over.id)) {
        targetDate = over.id;
      } else {
        // It's a task, get its date
        const allTasks = [...tasks.today, ...tasks.tomorrow, ...tasks.dayAfterTomorrow];
        const targetTask = allTasks.find(t => t._id === over.id);
        if (targetTask) {
          targetDate = targetTask.date;
        }
      }
    }

    // Find the task
    const allTasks = [...tasks.today, ...tasks.tomorrow, ...tasks.dayAfterTomorrow];
    const task = allTasks.find(t => t._id === taskId);
    
    if (!task) return;

    // Prevent dragging completed or archived tasks
    if (task.status === TaskStatus.COMPLETED || task.archived) {
      return;
    }

    if (!targetDate) return;

    // If dropped in the same column, handle reordering
    if (sourceDate === targetDate) {
      const dateKey = sourceDate === dates.today ? 'today' : 
                     sourceDate === dates.tomorrow ? 'tomorrow' : 'dayAfterTomorrow';
      const taskList = tasks[dateKey];
      const oldIndex = taskList.findIndex(t => t._id === taskId);
      
      // Check if dropped on another task or empty space
      const targetTask = taskList.find(t => t._id === over.id);
      let newIndex;
      
      if (targetTask) {
        // Dropped on another task
        newIndex = taskList.findIndex(t => t._id === over.id);
      } else {
        // Dropped on empty space in column, append to end
        newIndex = taskList.length;
      }

      if (oldIndex !== newIndex && newIndex !== -1) {
        const newTaskList = arrayMove(taskList, oldIndex, newIndex);
        // Update order for all tasks in the list
        const updatePromises = newTaskList.map((t, index) => {
          return updateTask(t._id, { order: index });
        });
        await Promise.all(updatePromises);
      }
      return;
    }

    // If dropped in a different column, update the date
    if (sourceDate !== targetDate) {
      // Validate that targetDate is one of our three dates
      const validDates = [dates.today, dates.tomorrow, dates.dayAfterTomorrow];
      if (validDates.includes(targetDate)) {
        const result = await updateTask(taskId, { date: targetDate });
        if (result.success) {
          enqueueSnackbar(SuccessMessages.TASK_UPDATED, { variant: 'info' });
        } else {
          enqueueSnackbar(result.message || ErrorMessages.TASK_UPDATE_FAILED, { variant: 'error' });
        }
      }
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
  };

  // Droppable CardContent component
  const DroppableCardContent = ({ date, children, sx }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: date,
      data: {
        type: 'column',
        date
      }
    });

    return (
      <CardContent
        ref={setNodeRef}
        sx={{
          ...sx,
          backgroundColor: isOver ? 'action.hover' : 'transparent',
          transition: 'background-color 0.2s'
        }}
        data-date={date}
      >
        {children}
      </CardContent>
    );
  };


  const formatDate = (dateString) => {
    return dayjs(dateString).format('MMM DD, YYYY');
  };

  const getDayLabel = (dateString) => {
    const today = dayjs().format('YYYY-MM-DD');
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
    
    if (dateString === today) return DayLabels.TODAY;
    if (dateString === tomorrow) return DayLabels.TOMORROW;
    return DayLabels.DAY_AFTER_TOMORROW;
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
            <IconButton color="inherit" onClick={toggleTheme} sx={{ mr: 1 }}>
              {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <Grid container spacing={3}>
              {/* Today */}
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardHeader
                    title={getDayLabel(dates.today)}
                    subheader={formatDate(dates.today)}
                    sx={{ 
                      backgroundColor: darkMode ? 'rgba(25, 118, 210, 0.2)' : '#e3f2fd'
                    }}
                  />
                  <SortableContext
                    items={tasks.today.map(task => task._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableCardContent
                      date={dates.today}
                      sx={{
                        flexGrow: 1,
                        overflow: 'auto',
                        minHeight: 200
                      }}
                    >
                      {tasks.today.map((task) => (
                        <TaskCard
                          key={task._id}
                          id={task._id}
                          task={task}
                          date={dates.today}
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
                    </DroppableCardContent>
                  </SortableContext>
                </Card>
              </Grid>

              {/* Tomorrow */}
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardHeader
                    title={getDayLabel(dates.tomorrow)}
                    subheader={formatDate(dates.tomorrow)}
                    sx={{ 
                      backgroundColor: darkMode ? 'rgba(156, 39, 176, 0.2)' : '#f3e5f5'
                    }}
                  />
                  <SortableContext
                    items={tasks.tomorrow.map(task => task._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableCardContent
                      date={dates.tomorrow}
                      sx={{
                        flexGrow: 1,
                        overflow: 'auto',
                        minHeight: 200
                      }}
                    >
                      {tasks.tomorrow.map((task) => (
                        <TaskCard
                          key={task._id}
                          id={task._id}
                          task={task}
                          date={dates.tomorrow}
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
                    </DroppableCardContent>
                  </SortableContext>
                </Card>
              </Grid>

              {/* Day After Tomorrow */}
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardHeader
                    title={getDayLabel(dates.dayAfterTomorrow)}
                    subheader={formatDate(dates.dayAfterTomorrow)}
                    sx={{ 
                      backgroundColor: darkMode ? 'rgba(76, 175, 80, 0.2)' : '#e8f5e8'
                    }}
                  />
                  <SortableContext
                    items={tasks.dayAfterTomorrow.map(task => task._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableCardContent
                      date={dates.dayAfterTomorrow}
                      sx={{
                        flexGrow: 1,
                        overflow: 'auto',
                        minHeight: 200
                      }}
                    >
                      {tasks.dayAfterTomorrow.map((task) => (
                        <TaskCard
                          key={task._id}
                          id={task._id}
                          task={task}
                          date={dates.dayAfterTomorrow}
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
                    </DroppableCardContent>
                  </SortableContext>
                </Card>
              </Grid>
            </Grid>
            <DragOverlay>
              {activeTask ? (
                <Card
                  sx={{
                    opacity: 0.8,
                    transform: 'rotate(5deg)',
                    maxWidth: 300,
                    boxShadow: 6
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" component="h3">
                      {activeTask.title}
                    </Typography>
                    {activeTask.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {activeTask.description}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
          )}

          {currentTab === 1 && (
            <Card>
              <CardHeader
                title="Archived Tasks"
                subheader={`${archivedTasks.length} archived task${archivedTasks.length !== 1 ? 's' : ''}`}
                sx={{ 
                  backgroundColor: darkMode ? 'rgba(255, 152, 0, 0.2)' : '#fff3e0'
                }}
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
                  const capped = next.length > ValidationLimits.TITLE_MAX_LENGTH ? next.slice(0, ValidationLimits.TITLE_MAX_LENGTH) : next;
                  setFormData({ ...formData, title: capped });
                  if (errors.title && capped.trim().length > 0 && capped.trim().length <= ValidationLimits.TITLE_MAX_LENGTH) {
                    setErrors({ ...errors, title: '' });
                  }
                }}
                error={Boolean(errors.title) || (formData.title.length >= ValidationLimits.TITLE_MAX_LENGTH && formData.title.length > 0)}
                helperText={errors.title || (formData.title.length >= ValidationLimits.TITLE_MAX_LENGTH && formData.title.length > 0 ? ValidationMessages.TITLE_MAX_REACHED : '')}
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
                  const capped = next.length > ValidationLimits.DESCRIPTION_MAX_LENGTH ? next.slice(0, ValidationLimits.DESCRIPTION_MAX_LENGTH) : next;
                  setFormData({ ...formData, description: capped });
                }}
                error={formData.description.length >= ValidationLimits.DESCRIPTION_MAX_LENGTH && formData.description.length > 0}
                helperText={formData.description.length >= ValidationLimits.DESCRIPTION_MAX_LENGTH && formData.description.length > 0 ? ValidationMessages.DESCRIPTION_MAX_REACHED : ''}
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
                  <MenuItem value={DateOption.TODAY}>{DayLabels.TODAY}</MenuItem>
                  <MenuItem value={DateOption.TOMORROW}>{DayLabels.TOMORROW}</MenuItem>
                  <MenuItem value={DateOption.DAY_AFTER_TOMORROW}>{DayLabels.DAY_AFTER_TOMORROW}</MenuItem>
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
                  <MenuItem value={TaskPriority.LOW}>{TaskPriority.LOW}</MenuItem>
                  <MenuItem value={TaskPriority.MEDIUM}>{TaskPriority.MEDIUM}</MenuItem>
                  <MenuItem value={TaskPriority.HIGH}>{TaskPriority.HIGH}</MenuItem>
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
                  formData.title.length >= ValidationLimits.TITLE_MAX_LENGTH ||
                  formData.description.length >= ValidationLimits.DESCRIPTION_MAX_LENGTH
                }
              >
                {editingTask ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

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
            {taskToDelete?.status === TaskStatus.PENDING && (
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
