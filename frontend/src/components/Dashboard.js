import React, { useState, useMemo, useCallback } from 'react';
import { useSnackbar } from 'notistack';
import {
  Container,
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  CircularProgress,
  Tabs,
  Tab,
  Typography
} from '@mui/material';
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
import { useTasks } from '../hooks/useTasks';
import { useTheme } from '../contexts/ThemeContext';
import TaskCard from './TaskCard';
import AnalyticsDashboard from './AnalyticsDashboard';
import WeeklyView from './WeeklyView';
import DeleteTaskDialog from './DeleteTaskDialog';
import TaskDialog from './TaskDialog';
import DashboardHeader from './DashboardHeader';
import { getDashboardStyles } from '../styles/dashboardStyles';
import {
  TaskStatus,
  DefaultValues,
  SuccessMessages,
  ErrorMessages
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
  canEditTask,
  canDragTask,
  getDateKey,
  isValidTargetDate,
  handleTaskDelete,
  handleTaskArchive,
  handleTaskRestore,
  handleTaskToggleStatus
} from '../services/dashboardService';

// Initial form data constant
const INITIAL_FORM_DATA = {
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
};

const INITIAL_ERRORS = { title: '', recurrenceInterval: '' };

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { tasks, dates, archivedTasks, loading, createTask, createRecurringTask, updateTask, deleteTask, toggleTaskStatus, archiveTask, restoreTask, fetchArchivedTasks } = useTasks();
  const { darkMode, toggleTheme } = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState(INITIAL_ERRORS);
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

  const resetForm = useCallback((isRecurring = false) => {
    setFormData({ ...INITIAL_FORM_DATA, isRecurring });
    setTagInput('');
    setErrors(INITIAL_ERRORS);
  }, []);

  const handleOpenDialog = useCallback((task = null, isRecurring = false) => {
    if (task) {
      const editCheck = canEditTask(task);
      if (!editCheck.canEdit) {
        enqueueSnackbar(editCheck.reason, { variant: 'warning' });
        return;
      }
      setEditingTask(task);
      setFormData({
        ...INITIAL_FORM_DATA,
        title: task.title,
        description: task.description,
        date: convertTaskDateToOption(task.date),
        status: task.status,
        priority: task.priority || DefaultValues.PRIORITY,
        tags: task.tags || []
      });
    } else {
      setEditingTask(null);
      resetForm(isRecurring);
    }
    setOpenDialog(true);
  }, [enqueueSnackbar, resetForm]);

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setEditingTask(null);
    resetForm();
  }, [resetForm]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const validation = validateTaskForm(formData);
    setErrors(validation.errors);
    
    if (!validation.isValid) {
      enqueueSnackbar(ErrorMessages.VALIDATION_ERRORS, { variant: 'error' });
      return;
    }

    const isRecurring = formData.isRecurring && !editingTask;
    const taskData = prepareTaskData(formData, isRecurring);
    let result;

    if (editingTask) {
      result = await updateTask(editingTask._id, taskData);
      if (result.success) {
        handleCloseDialog();
        enqueueSnackbar(SuccessMessages.TASK_UPDATED, { variant: 'info' });
      } else {
        enqueueSnackbar(result.message || ErrorMessages.TASK_UPDATE_FAILED, { variant: 'error' });
      }
    } else if (isRecurring) {
      result = await createRecurringTask(taskData);
      if (result.success) {
        handleCloseDialog();
        enqueueSnackbar(`Recurring task created successfully. Generated ${result.count || 0} task instances.`, { variant: 'success' });
      } else {
        enqueueSnackbar(result.message || 'Failed to create recurring task', { variant: 'error' });
      }
    } else {
      result = await createTask(taskData);
      if (result.success) {
        handleCloseDialog();
        enqueueSnackbar(SuccessMessages.TASK_CREATED, { variant: 'success' });
      } else {
        enqueueSnackbar(result.message || ErrorMessages.TASK_CREATE_FAILED, { variant: 'error' });
      }
    }
  }, [formData, editingTask, enqueueSnackbar, updateTask, createRecurringTask, createTask, handleCloseDialog]);

  const handleRequestDelete = useCallback((task) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!taskToDelete) return;
    await handleTaskDelete(taskToDelete._id, deleteTask, enqueueSnackbar);
    handleCloseDeleteDialog();
  }, [taskToDelete, deleteTask, enqueueSnackbar, handleCloseDeleteDialog]);

  const handleToggleStatus = useCallback((taskId, currentStatus) => {
    handleTaskToggleStatus(taskId, currentStatus, toggleTaskStatus);
  }, [toggleTaskStatus]);

  const handleArchive = useCallback((task) => {
    handleTaskArchive(task._id, archiveTask, fetchArchivedTasks, enqueueSnackbar);
  }, [archiveTask, fetchArchivedTasks, enqueueSnackbar]);

  const handleRestore = useCallback((task) => {
    handleTaskRestore(task._id, restoreTask, fetchArchivedTasks, enqueueSnackbar, currentTab);
  }, [restoreTask, fetchArchivedTasks, enqueueSnackbar, currentTab]);

  const allTasks = useMemo(() => [...tasks.today, ...tasks.tomorrow, ...tasks.dayAfterTomorrow], [tasks]);

  const handleTabChange = useCallback((event, newValue) => {
    setCurrentTab(newValue);
    if (newValue === 1) fetchArchivedTasks();
  }, [fetchArchivedTasks]);

  const handleDragStart = useCallback((event) => {
    const task = allTasks.find(t => t._id === event.active.id);
    setActiveTask(task);
  }, [allTasks]);

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId = active.id;
    const sourceDate = active.data.current?.date;
    const task = allTasks.find(t => t._id === taskId);
    
    if (!task || !canDragTask(task)) return;

    // Determine target date
    let targetDate = over.data.current?.date;
    if (!targetDate) {
      const validDates = [dates.today, dates.tomorrow, dates.dayAfterTomorrow];
      targetDate = validDates.includes(over.id) 
        ? over.id 
        : allTasks.find(t => t._id === over.id)?.date;
    }
    if (!targetDate || !isValidTargetDate(targetDate, dates)) return;

    const dateKey = getDateKey(targetDate, dates);
    if (!dateKey) return;

    // Same column: reorder
    if (sourceDate === targetDate) {
      const taskList = tasks[dateKey];
      const oldIndex = taskList.findIndex(t => t._id === taskId);
      const newIndex = taskList.find(t => t._id === over.id) 
        ? taskList.findIndex(t => t._id === over.id) 
        : taskList.length;

      if (oldIndex !== newIndex && newIndex !== -1) {
        const newTaskList = arrayMove(taskList, oldIndex, newIndex);
        await Promise.all(newTaskList.map((t, index) => updateTask(t._id, { order: index })));
      }
      return;
    }

    // Different column: update date
    const result = await updateTask(taskId, { date: targetDate, order: tasks[dateKey].length });
    enqueueSnackbar(
      result.success ? SuccessMessages.TASK_UPDATED : (result.message || ErrorMessages.TASK_UPDATE_FAILED),
      { variant: result.success ? 'info' : 'error' }
    );
  }, [allTasks, dates, tasks, updateTask, enqueueSnackbar]);

  const handleDragCancel = useCallback(() => setActiveTask(null), []);

  // Droppable CardContent component
  const DroppableCardContent = ({ date, children, sx }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: date,
      data: { type: 'column', date }
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

  // Date Column Component
  const DateColumn = ({ dateKey, date, headerColor, emptyText }) => {
    const taskList = tasks[dateKey] || [];
    return (
      <Grid item xs={12} md={4}>
        <Card sx={styles.card}>
          <CardHeader
            title={getDayLabel(date)}
            subheader={formatDate(date)}
            sx={styles.cardHeader(headerColor)}
          />
          <SortableContext items={taskList.map(t => t._id)} strategy={verticalListSortingStrategy}>
            <DroppableCardContent date={date} sx={styles.cardContent}>
              {taskList.map((task) => (
                <TaskCard
                  key={task._id}
                  id={task._id}
                  task={task}
                  date={date}
                  onEdit={() => handleOpenDialog(task)}
                  onDelete={() => handleRequestDelete(task)}
                  onToggleStatus={() => handleToggleStatus(task._id, task.status)}
                  onArchive={() => handleArchive(task)}
                />
              ))}
              {taskList.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={styles.emptyTaskText}>
                  {emptyText}
                </Typography>
              )}
            </DroppableCardContent>
          </SortableContext>
        </Card>
      </Grid>
    );
  };

  // Weekly view helpers
  const weekDates = getWeekDates(weekStartDate);
  const today = dayjs().format('YYYY-MM-DD');
  
  const handlePreviousWeek = useCallback(() => setWeekStartDate(prev => navigateToPreviousWeek(prev)), []);
  const handleNextWeek = useCallback(() => setWeekStartDate(prev => navigateToNextWeek(prev)), []);
  const handleTodayWeek = useCallback(() => setWeekStartDate(navigateToCurrentWeek()), []);

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
        <DashboardHeader
          user={user}
          darkMode={darkMode}
          toggleTheme={toggleTheme}
          logout={logout}
          currentTab={currentTab}
          onAddTask={() => handleOpenDialog()}
        />

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
              <DateColumn
                dateKey="today"
                date={dates.today}
                headerColor="#e3f2fd"
                emptyText="No tasks for today"
              />
              <DateColumn
                dateKey="tomorrow"
                date={dates.tomorrow}
                headerColor="#f3e5f5"
                emptyText="No tasks for tomorrow"
              />
              <DateColumn
                dateKey="dayAfterTomorrow"
                date={dates.dayAfterTomorrow}
                headerColor="#e8f5e8"
                emptyText="No tasks for day after tomorrow"
              />

              {/* Weekly Task View */}
              <WeeklyView
                weekDates={weekDates}
                allTasks={allTasks}
                today={today}
                weekStartDate={weekStartDate}
                onPreviousWeek={handlePreviousWeek}
                onNextWeek={handleNextWeek}
                onTodayWeek={handleTodayWeek}
                darkMode={darkMode}
              />
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
        <TaskDialog
          open={openDialog}
          editingTask={editingTask}
          formData={formData}
          setFormData={setFormData}
          tagInput={tagInput}
          setTagInput={setTagInput}
          errors={errors}
          setErrors={setErrors}
          onClose={handleCloseDialog}
          onSubmit={handleSubmit}
          darkMode={darkMode}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteTaskDialog
          open={deleteDialogOpen}
          task={taskToDelete}
          onClose={handleCloseDeleteDialog}
          onConfirm={handleConfirmDelete}
          darkMode={darkMode}
        />
      </Box>
  );
};

export default Dashboard;
