import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Tab,
  FormControlLabel,
  Switch,
  Divider
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
  Brightness7 as Brightness7Icon,
  Person as PersonIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon
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
import AnalyticsDashboard from './AnalyticsDashboard';
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
  const { tasks, dates, archivedTasks, loading, createTask, createRecurringTask, updateTask, deleteTask, toggleTaskStatus, archiveTask, restoreTask, fetchArchivedTasks } = useTasks();
  const { darkMode, toggleTheme } = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: DefaultValues.DATE,
    status: DefaultValues.STATUS,
    priority: DefaultValues.PRIORITY,
    tags: [],
    isRecurring: false,
    recurrencePattern: 'daily',
    recurrenceInterval: 1,
    recurrenceEndDate: ''
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({
    title: '',
    recurrenceInterval: ''
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [activeTask, setActiveTask] = useState(null);
  const [weekStartDate, setWeekStartDate] = useState(() => {
    // Start week from Monday
    const today = dayjs();
    const dayOfWeek = today.day();
    const monday = dayOfWeek === 0 ? today.subtract(6, 'day') : today.subtract(dayOfWeek - 1, 'day');
    return monday;
  });

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

  const handleOpenDialog = (task = null, isRecurring = false) => {
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
        tags: task.tags || [],
        isRecurring: false, // Can't edit recurring tasks as recurring
        recurrencePattern: 'daily',
        recurrenceInterval: 1,
        recurrenceEndDate: ''
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        date: DefaultValues.DATE,
        status: DefaultValues.STATUS,
        priority: DefaultValues.PRIORITY,
        tags: [],
        isRecurring: isRecurring,
        recurrencePattern: 'daily',
        recurrenceInterval: 1,
        recurrenceEndDate: ''
      });
      setTagInput('');
    }
    setErrors({ title: '', recurrenceInterval: '' });
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
      tags: [],
      isRecurring: false,
      recurrencePattern: 'daily',
      recurrenceInterval: 1,
      recurrenceEndDate: ''
    });
    setTagInput('');
    setErrors({ title: '', recurrenceInterval: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Custom validations
    const nextErrors = { title: '', recurrenceInterval: '' };
    const isTitleEmpty = formData.title.trim().length === 0;
    const titleTooLong = formData.title.trim().length > ValidationLimits.TITLE_MAX_LENGTH;
    const descriptionTooLong = formData.description.trim().length > ValidationLimits.DESCRIPTION_MAX_LENGTH;
    const invalidInterval = formData.isRecurring && formData.recurrencePattern === 'custom' && 
      (!formData.recurrenceInterval || formData.recurrenceInterval < 1);

    if (isTitleEmpty) {
      nextErrors.title = ValidationMessages.TITLE_REQUIRED;
    } else if (titleTooLong) {
      nextErrors.title = ValidationMessages.TITLE_MAX_LENGTH;
    }

    if (invalidInterval) {
      nextErrors.recurrenceInterval = 'Interval must be at least 1 day';
    }

    setErrors(nextErrors);
    if (nextErrors.title || nextErrors.recurrenceInterval || descriptionTooLong) {
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

    if (editingTask) {
      // Update existing task (can't be recurring when editing)
      const taskData = {
        title: formData.title,
        description: formData.description,
        date: actualDate,
        status: formData.status,
        priority: formData.priority,
        tags: formData.tags
      };
      
      const result = await updateTask(editingTask._id, taskData);
      if (result.success) {
        handleCloseDialog();
        enqueueSnackbar(SuccessMessages.TASK_UPDATED, { variant: 'info' });
      } else {
        enqueueSnackbar(result.message || ErrorMessages.TASK_UPDATE_FAILED, { variant: 'error' });
      }
    } else if (formData.isRecurring) {
      // Create recurring task
      const recurringTaskData = {
        title: formData.title,
        description: formData.description,
        startDate: actualDate,
        status: formData.status,
        priority: formData.priority,
        tags: formData.tags,
        recurrencePattern: formData.recurrencePattern,
        recurrenceInterval: formData.recurrenceInterval,
        recurrenceEndDate: formData.recurrenceEndDate || null
      };

      const result = await createRecurringTask(recurringTaskData);
      if (result.success) {
        handleCloseDialog();
        enqueueSnackbar(`Recurring task created successfully. Generated ${result.count || 0} task instances.`, { variant: 'success' });
      } else {
        enqueueSnackbar(result.message || 'Failed to create recurring task', { variant: 'error' });
      }
    } else {
      // Create regular task
      const taskData = {
        title: formData.title,
        description: formData.description,
        date: actualDate,
        status: formData.status,
        priority: formData.priority,
        tags: formData.tags,
      };

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
      enqueueSnackbar(SuccessMessages.TASK_ARCHIVED, { variant: 'warning' });
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

    // If dropped in a different column, update the date and order
    if (sourceDate !== targetDate) {
      // Validate that targetDate is one of our three dates
      const validDates = [dates.today, dates.tomorrow, dates.dayAfterTomorrow];
      if (validDates.includes(targetDate)) {
        // Get the target column's task list to determine the new order
        const dateKey = targetDate === dates.today ? 'today' : 
                       targetDate === dates.tomorrow ? 'tomorrow' : 'dayAfterTomorrow';
        const targetTaskList = tasks[dateKey];
        // Set order to append at the end of the target column
        const newOrder = targetTaskList.length;
        const result = await updateTask(taskId, { date: targetDate, order: newOrder });
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

  // Weekly view helpers
  const allTasks = [...tasks.today, ...tasks.tomorrow, ...tasks.dayAfterTomorrow];
  const weekDates = Array.from({ length: 7 }, (_, i) => weekStartDate.clone().add(i, 'day').format('YYYY-MM-DD'));
  const today = dayjs().format('YYYY-MM-DD');
  const getTasksForDate = (dateStr) => allTasks.filter(t => t.date === dateStr && !t.archived);
  
  const handlePreviousWeek = () => setWeekStartDate(prev => prev.clone().subtract(7, 'day'));
  const handleNextWeek = () => setWeekStartDate(prev => prev.clone().add(7, 'day'));
  const handleTodayWeek = () => {
    const d = dayjs();
    setWeekStartDate(d.day() === 0 ? d.subtract(6, 'day') : d.subtract(d.day() - 1, 'day'));
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
        <AppBar 
          position="static"
          sx={{
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
          }}
        >
          <Toolbar>
            <Typography 
              variant="h5" 
              component="div" 
              sx={{ 
                flexGrow: 1,
                fontWeight: 700,
                letterSpacing: 1,
                background: 'linear-gradient(45deg, #fff 30%, #f0f0f0 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Taskly
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                mr: 2,
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.95)'
              }}
            >
              Welcome, <strong>{user?.name}</strong>!
            </Typography>
            {currentTab === 0 && (
              <IconButton 
                onClick={() => handleOpenDialog()} 
                sx={{ 
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
                }}
              >
                <AddIcon />
              </IconButton>
            )}
            <IconButton 
              color="inherit" 
              onClick={() => navigate('/profile')}
              sx={{ 
                mr: 1,
                color: 'rgba(255, 255, 255, 0.9)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#fff'
                }
              }}
              title="Profile"
            >
              <PersonIcon />
            </IconButton>
            <IconButton 
              color="inherit" 
              onClick={toggleTheme} 
              sx={{ 
                mr: 1,
                color: 'rgba(255, 255, 255, 0.9)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#fff'
                }
              }}
            >
              {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
            <Button 
              color="inherit" 
              onClick={logout} 
              startIcon={<LogoutIcon />}
              sx={{
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.9)',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#fff'
                }
              }}
            >
              Logout
            </Button>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ mb: 3 }}>
            <Tabs value={currentTab} onChange={handleTabChange} aria-label="task tabs">
              <Tab label="Tasks" />
              <Tab label={`Archived (${archivedTasks.length})`} />
              <Tab label="Analytics" />
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

              {/* Weekly Task View */}
              <Grid item xs={12}>
                <Card sx={{ bgcolor: darkMode ? '#1e1e1e' : '#fff', border: darkMode ? '1px solid #444' : '1px solid #e0e0e0', borderRadius: '8px', p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <IconButton onClick={handlePreviousWeek} size="small" sx={{ color: darkMode ? '#fff' : '#000', '&:hover': { bgcolor: darkMode ? '#2d2d2d' : '#f5f5f5' } }}>
                      <ChevronLeftIcon />
                    </IconButton>
                    <Typography variant="h6" sx={{ fontWeight: 500, color: darkMode ? '#fff' : '#000' }}>
                      {weekStartDate.format('MMM DD')} - {weekStartDate.clone().add(6, 'day').format('MMM DD, YYYY')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button onClick={handleTodayWeek} size="small" variant="outlined" sx={{ textTransform: 'none', minWidth: 'auto', px: 1.5, borderColor: darkMode ? '#444' : '#e0e0e0', color: darkMode ? '#fff' : '#000', '&:hover': { borderColor: darkMode ? '#555' : '#ccc', bgcolor: darkMode ? '#2d2d2d' : '#f5f5f5' } }}>
                        Today
                      </Button>
                      <IconButton onClick={handleNextWeek} size="small" sx={{ color: darkMode ? '#fff' : '#000', '&:hover': { bgcolor: darkMode ? '#2d2d2d' : '#f5f5f5' } }}>
                        <ChevronRightIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Grid container spacing={1}>
                    {weekDates.map(dateStr => {
                      const dateTasks = getTasksForDate(dateStr);
                      const pending = dateTasks.filter(t => t.status === TaskStatus.PENDING);
                      const completed = dateTasks.filter(t => t.status === TaskStatus.COMPLETED);
                      const isToday = dateStr === today;
                      const d = dayjs(dateStr);
                      const taskSummary = pending.length && completed.length 
                        ? `${pending.length} pending • ${completed.length} done`
                        : pending.length ? `${pending.length} pending`
                        : completed.length ? `${completed.length} done`
                        : 'No tasks';
                      return (
                        <Grid item xs={12} sm={6} md={true} key={dateStr} sx={{ flex: { md: '1 1 0%' } }}>
                          <Box sx={{
                            p: 1.5, borderRadius: '8px', textAlign: 'center',
                            bgcolor: isToday ? (darkMode ? 'rgba(25, 118, 210, 0.15)' : 'rgba(33, 150, 243, 0.1)') : (darkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)'),
                            border: isToday ? (darkMode ? '1px solid #1976d2' : '1px solid #2196f3') : (darkMode ? '1px solid #333' : '1px solid #e0e0e0')
                          }}>
                            <Typography variant="caption" sx={{ color: darkMode ? '#aaa' : '#666', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 500, display: 'block', mb: 0.5 }}>
                              {d.format('ddd')}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                              <Typography variant="h6" sx={{ color: isToday ? (darkMode ? '#1976d2' : '#2196f3') : (darkMode ? '#fff' : '#000'), fontWeight: isToday ? 700 : 500 }}>
                                {d.format('D')}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {pending.length > 0 && <Box sx={{ width: '8px', height: '8px', borderRadius: '50%', bgcolor: darkMode ? '#1976d2' : '#2196f3' }} />}
                                {completed.length > 0 && <Box sx={{ width: '8px', height: '8px', borderRadius: '50%', bgcolor: darkMode ? '#4caf50' : '#66bb6a' }} />}
                              </Box>
                            </Box>
                            <Typography variant="caption" sx={{ color: darkMode ? '#888' : '#999', fontSize: '0.7rem' }}>
                              {taskSummary}
                            </Typography>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
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

          {currentTab === 2 && (
            <AnalyticsDashboard />
          )}
        </Container>

        {/* Task Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingTask ? 'Edit Task' : formData.isRecurring ? 'Create Recurring Task' : 'Add New Task'}
          </DialogTitle>
          <form onSubmit={handleSubmit} noValidate>
            <DialogContent>
              {!editingTask && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.isRecurring}
                      onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Make this a recurring task"
                  sx={{ mb: 2 }}
                />
              )}
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
                <InputLabel id="date-select-label">{formData.isRecurring ? 'Start Date' : 'Date'}</InputLabel>
                <Select
                  labelId="date-select-label"
                  value={formData.date}
                  label={formData.isRecurring ? 'Start Date' : 'Date'}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                >
                  <MenuItem value={DateOption.TODAY}>{DayLabels.TODAY}</MenuItem>
                  <MenuItem value={DateOption.TOMORROW}>{DayLabels.TOMORROW}</MenuItem>
                  <MenuItem value={DateOption.DAY_AFTER_TOMORROW}>{DayLabels.DAY_AFTER_TOMORROW}</MenuItem>
                </Select>
              </FormControl>
              {formData.isRecurring && !editingTask && (
                <>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="recurrence-pattern-select-label">Recurrence Pattern</InputLabel>
                    <Select
                      labelId="recurrence-pattern-select-label"
                      value={formData.recurrencePattern}
                      label="Recurrence Pattern"
                      onChange={(e) => setFormData({ ...formData, recurrencePattern: e.target.value })}
                    >
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="custom">Custom Interval</MenuItem>
                    </Select>
                  </FormControl>
                  {formData.recurrencePattern === 'custom' && (
                    <TextField
                      margin="dense"
                      label="Interval (days)"
                      type="number"
                      fullWidth
                      variant="outlined"
                      value={formData.recurrenceInterval}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        setFormData({ ...formData, recurrenceInterval: Math.max(1, value) });
                        if (errors.recurrenceInterval && value >= 1) {
                          setErrors({ ...errors, recurrenceInterval: '' });
                        }
                      }}
                      error={Boolean(errors.recurrenceInterval)}
                      helperText={errors.recurrenceInterval || 'Number of days between occurrences'}
                      sx={{ mb: 2 }}
                      inputProps={{ min: 1 }}
                    />
                  )}
                  <TextField
                    margin="dense"
                    label="End Date (Optional)"
                    type="date"
                    fullWidth
                    variant="outlined"
                    value={formData.recurrenceEndDate}
                    onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    helperText="Leave empty to generate tasks for 90 days"
                    sx={{ mb: 2 }}
                  />
                </>
              )}
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
                  formData.description.length >= ValidationLimits.DESCRIPTION_MAX_LENGTH ||
                  (formData.isRecurring && formData.recurrencePattern === 'custom' && (!formData.recurrenceInterval || formData.recurrenceInterval < 1))
                }
              >
                {editingTask ? 'Update' : formData.isRecurring ? 'Create Recurring Task' : 'Create'}
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
