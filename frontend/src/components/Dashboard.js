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
import { getDashboardStyles } from '../styles/dashboardStyles';
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
import {
  convertDateOptionToDate,
  convertTaskDateToOption,
  formatDate,
  getDayLabel,
  validateTaskForm,
  prepareTaskData,
  initializeWeekStartDate,
  getWeekDates,
  navigateToPreviousWeek,
  navigateToNextWeek,
  navigateToCurrentWeek,
  getTasksForDate,
  getTaskSummary,
  formatWeekRange,
  canEditTask,
  canDragTask,
  getDateKey,
  isValidTargetDate
} from '../services/dashboardService';

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
  const [weekStartDate, setWeekStartDate] = useState(() => initializeWeekStartDate());

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
      const editCheck = canEditTask(task);
      if (!editCheck.canEdit) {
        enqueueSnackbar(editCheck.reason, { variant: 'warning' });
        return;
      }
      
      setEditingTask(task);
      const dateOption = convertTaskDateToOption(task.date);
      
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

    // Validate form data
    const validation = validateTaskForm(formData);
    setErrors(validation.errors);
    
    if (!validation.isValid) {
      enqueueSnackbar(ErrorMessages.VALIDATION_ERRORS, { variant: 'error' });
      return;
    }

    if (editingTask) {
      // Update existing task (can't be recurring when editing)
      const taskData = prepareTaskData(formData, false);
      
      const result = await updateTask(editingTask._id, taskData);
      if (result.success) {
        handleCloseDialog();
        enqueueSnackbar(SuccessMessages.TASK_UPDATED, { variant: 'info' });
      } else {
        enqueueSnackbar(result.message || ErrorMessages.TASK_UPDATE_FAILED, { variant: 'error' });
      }
    } else if (formData.isRecurring) {
      // Create recurring task
      const recurringTaskData = prepareTaskData(formData, true);

      const result = await createRecurringTask(recurringTaskData);
      if (result.success) {
        handleCloseDialog();
        enqueueSnackbar(`Recurring task created successfully. Generated ${result.count || 0} task instances.`, { variant: 'success' });
      } else {
        enqueueSnackbar(result.message || 'Failed to create recurring task', { variant: 'error' });
      }
    } else {
      // Create regular task
      const taskData = prepareTaskData(formData, false);

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
    if (!canDragTask(task)) {
      return;
    }

    if (!targetDate) return;

    // If dropped in the same column, handle reordering
    if (sourceDate === targetDate) {
      const dateKey = getDateKey(sourceDate, dates);
      if (!dateKey) return;
      
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
      if (isValidTargetDate(targetDate, dates)) {
        // Get the target column's task list to determine the new order
        const dateKey = getDateKey(targetDate, dates);
        if (!dateKey) return;
        
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
          ...styles.droppableCardContent(sx),
          backgroundColor: isOver ? 'action.hover' : 'transparent',
          transition: 'background-color 0.2s'
        }}
        data-date={date}
      >
        {children}
      </CardContent>
    );
  };


  // Weekly view helpers
  const allTasks = [...tasks.today, ...tasks.tomorrow, ...tasks.dayAfterTomorrow];
  const weekDates = getWeekDates(weekStartDate);
  const today = dayjs().format('YYYY-MM-DD');
  
  const handlePreviousWeek = () => setWeekStartDate(prev => navigateToPreviousWeek(prev));
  const handleNextWeek = () => setWeekStartDate(prev => navigateToNextWeek(prev));
  const handleTodayWeek = () => setWeekStartDate(navigateToCurrentWeek());

  const styles = getDashboardStyles(darkMode);

  // Only show full-page loader on initial load (when dates are not set yet)
  if (loading && !dates.today) {
    return (
      <Box sx={styles.loaderBox}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={styles.mainBox}>
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
                onClick={() => handleOpenDialog()} 
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

        <Container maxWidth="lg" sx={styles.container}>
          <Box sx={styles.tabsBox}>
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
                <Card sx={styles.card}>
                  <CardHeader
                    title={getDayLabel(dates.today)}
                    subheader={formatDate(dates.today)}
                    sx={styles.cardHeader('#e3f2fd')}
                  />
                  <SortableContext
                    items={tasks.today.map(task => task._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableCardContent
                      date={dates.today}
                      sx={styles.cardContent}
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
                        <Typography variant="body2" color="text.secondary" sx={styles.emptyTaskText}>
                          No tasks for today
                        </Typography>
                      )}
                    </DroppableCardContent>
                  </SortableContext>
                </Card>
              </Grid>

              {/* Tomorrow */}
              <Grid item xs={12} md={4}>
                <Card sx={styles.card}>
                  <CardHeader
                    title={getDayLabel(dates.tomorrow)}
                    subheader={formatDate(dates.tomorrow)}
                    sx={styles.cardHeader('#f3e5f5')}
                  />
                  <SortableContext
                    items={tasks.tomorrow.map(task => task._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableCardContent
                      date={dates.tomorrow}
                      sx={styles.cardContent}
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
                        <Typography variant="body2" color="text.secondary" sx={styles.emptyTaskText}>
                          No tasks for tomorrow
                        </Typography>
                      )}
                    </DroppableCardContent>
                  </SortableContext>
                </Card>
              </Grid>

              {/* Day After Tomorrow */}
              <Grid item xs={12} md={4}>
                <Card sx={styles.card}>
                  <CardHeader
                    title={getDayLabel(dates.dayAfterTomorrow)}
                    subheader={formatDate(dates.dayAfterTomorrow)}
                    sx={styles.cardHeader('#e8f5e8')}
                  />
                  <SortableContext
                    items={tasks.dayAfterTomorrow.map(task => task._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableCardContent
                      date={dates.dayAfterTomorrow}
                      sx={styles.cardContent}
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
                        <Typography variant="body2" color="text.secondary" sx={styles.emptyTaskText}>
                          No tasks for day after tomorrow
                        </Typography>
                      )}
                    </DroppableCardContent>
                  </SortableContext>
                </Card>
              </Grid>

              {/* Weekly Task View */}
              <Grid item xs={12}>
                <Card sx={styles.weeklyViewCard}>
                  <Box sx={styles.weeklyHeaderBox}>
                    <IconButton onClick={handlePreviousWeek} size="small" sx={styles.weeklyNavButton}>
                      <ChevronLeftIcon />
                    </IconButton>
                    <Typography variant="h6" sx={styles.weeklyTitle}>
                      {formatWeekRange(weekStartDate)}
                    </Typography>
                    <Box sx={styles.weeklyButtonBox}>
                      <Button onClick={handleTodayWeek} size="small" variant="outlined" sx={styles.todayButton}>
                        Today
                      </Button>
                      <IconButton onClick={handleNextWeek} size="small" sx={styles.weeklyNavButton}>
                        <ChevronRightIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Grid container spacing={1}>
                    {weekDates.map(dateStr => {
                      const dateTasks = getTasksForDate(allTasks, dateStr);
                      const pending = dateTasks.filter(t => t.status === TaskStatus.PENDING);
                      const completed = dateTasks.filter(t => t.status === TaskStatus.COMPLETED);
                      const isToday = dateStr === today;
                      const d = dayjs(dateStr);
                      const taskSummary = getTaskSummary(dateTasks);
                      return (
                        <Grid item xs={12} sm={6} md={true} key={dateStr} sx={styles.weeklyGridItem}>
                          <Box sx={styles.weekDayBox(isToday)}>
                            <Typography variant="caption" sx={styles.weekDayLabel}>
                              {d.format('ddd')}
                            </Typography>
                            <Box sx={styles.weeklyDayNumberBox}>
                              <Typography variant="h6" sx={styles.weekDayNumber(isToday)}>
                                {d.format('D')}
                              </Typography>
                              <Box sx={styles.weeklyStatusDotsBox}>
                                {pending.length > 0 && <Box sx={styles.weeklyStatusDot(true, darkMode)} />}
                                {completed.length > 0 && <Box sx={styles.weeklyStatusDot(false, darkMode)} />}
                              </Box>
                            </Box>
                            <Typography variant="caption" sx={styles.weekDaySummary}>
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
                <Card sx={styles.dragOverlayCard}>
                  <CardContent>
                    <Typography variant="h6" component="h3">
                      {activeTask.title}
                    </Typography>
                    {activeTask.description && (
                      <Typography variant="body2" color="text.secondary" sx={styles.dragOverlayContent}>
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
                sx={styles.archivedCardHeader}
              />
              <CardContent>
                {archivedTasks.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={styles.archivedEmptyText}>
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
                  sx={styles.dialogFormControlLabel}
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
                sx={styles.dialogTextField}
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
                sx={styles.dialogTextField}
              />
              <FormControl fullWidth sx={styles.dialogFormControl}>
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
                  <FormControl fullWidth sx={styles.dialogFormControl}>
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
                      sx={styles.dialogTextField}
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
                    sx={styles.dialogTextField}
                  />
                </>
              )}
              <FormControl fullWidth sx={styles.dialogFormControl}>
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
                sx={styles.dialogTagTextField}
              />
              {formData.tags.length > 0 && (
                <Box sx={styles.dialogTagsBox}>
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
          PaperProps={{ sx: styles.deleteDialogPaper }}
        >
          <DialogTitle>Delete Task</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              Are you sure you want to delete "{taskToDelete?.title}"?
            </Typography>
            {taskToDelete?.status === TaskStatus.PENDING && (
              <Typography variant="body2" color="error" sx={styles.deleteDialogWarningText}>
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
