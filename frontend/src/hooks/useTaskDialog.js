import { useState, useCallback } from 'react';
import { useSnackbar } from 'notistack';
import {
  DefaultValues,
  SuccessMessages,
  ErrorMessages
} from '../constants/enums';
import {
  convertTaskDateToOption,
  validateTaskForm,
  prepareTaskData,
  canEditTask
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

/**
 * Custom hook to manage TaskDialog state and operations
 * @param {object} taskOperations - Object containing createTask, createRecurringTask, updateTask functions
 * @returns {object} - Dialog state and handlers
 */
export const useTaskDialog = ({ createTask, createRecurringTask, updateTask }) => {
  const { enqueueSnackbar } = useSnackbar();
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState(INITIAL_ERRORS);

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

  return {
    // State
    openDialog,
    editingTask,
    formData,
    setFormData,
    tagInput,
    setTagInput,
    errors,
    setErrors,
    // Handlers
    handleOpenDialog,
    handleCloseDialog,
    handleSubmit
  };
};
