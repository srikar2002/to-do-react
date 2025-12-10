import dayjs from 'dayjs';
import {
  DateOption,
  TaskStatus,
  ValidationLimits,
  ValidationMessages,
  DayLabels
} from '../constants/enums';

/**
 * Dashboard Service
 * Handles dashboard-related business logic, date utilities, and form validation
 */

/**
 * Convert date option (dropdown selection) to actual date string
 * @param {string} dateOption - Date option from dropdown (today, tomorrow, dayAfterTomorrow)
 * @returns {string} - Formatted date string (YYYY-MM-DD)
 */
export const convertDateOptionToDate = (dateOption) => {
  switch (dateOption) {
    case DateOption.TODAY:
      return dayjs().format('YYYY-MM-DD');
    case DateOption.TOMORROW:
      return dayjs().add(1, 'day').format('YYYY-MM-DD');
    case DateOption.DAY_AFTER_TOMORROW:
      return dayjs().add(2, 'day').format('YYYY-MM-DD');
    default:
      return dayjs().format('YYYY-MM-DD');
  }
};

/**
 * Convert task date to date option for dropdown
 * @param {string} taskDate - Task date string (YYYY-MM-DD)
 * @returns {string} - Date option (today, tomorrow, dayAfterTomorrow)
 */
export const convertTaskDateToOption = (taskDate) => {
  const taskDateObj = dayjs(taskDate);
  const today = dayjs();
  const tomorrow = dayjs().add(1, 'day');
  const dayAfterTomorrow = dayjs().add(2, 'day');
  
  if (taskDateObj.isSame(tomorrow, 'day')) {
    return DateOption.TOMORROW;
  } else if (taskDateObj.isSame(dayAfterTomorrow, 'day')) {
    return DateOption.DAY_AFTER_TOMORROW;
  }
  return DateOption.TODAY;
};

/**
 * Format date string to readable format
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @returns {string} - Formatted date (MMM DD, YYYY)
 */
export const formatDate = (dateString) => {
  return dayjs(dateString).format('MMM DD, YYYY');
};

/**
 * Get day label for a date string
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @returns {string} - Day label (Today, Tomorrow, Day After Tomorrow)
 */
export const getDayLabel = (dateString) => {
  const today = dayjs().format('YYYY-MM-DD');
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  
  if (dateString === today) return DayLabels.TODAY;
  if (dateString === tomorrow) return DayLabels.TOMORROW;
  return DayLabels.DAY_AFTER_TOMORROW;
};

/**
 * Validate task form data
 * @param {object} formData - Form data object
 * @returns {object} - Object with errors object and isValid boolean
 */
export const validateTaskForm = (formData) => {
  const errors = { title: '', recurrenceInterval: '' };
  let isValid = true;

  const isTitleEmpty = formData.title.trim().length === 0;
  const titleTooLong = formData.title.trim().length > ValidationLimits.TITLE_MAX_LENGTH;
  const descriptionTooLong = formData.description.trim().length > ValidationLimits.DESCRIPTION_MAX_LENGTH;
  const invalidInterval = formData.isRecurring && formData.recurrencePattern === 'custom' && 
    (!formData.recurrenceInterval || formData.recurrenceInterval < 1);

  if (isTitleEmpty) {
    errors.title = ValidationMessages.TITLE_REQUIRED;
    isValid = false;
  } else if (titleTooLong) {
    errors.title = ValidationMessages.TITLE_MAX_LENGTH;
    isValid = false;
  }

  if (invalidInterval) {
    errors.recurrenceInterval = 'Interval must be at least 1 day';
    isValid = false;
  }

  if (descriptionTooLong) {
    isValid = false;
  }

  return { errors, isValid };
};

/**
 * Prepare task data for API submission
 * @param {object} formData - Form data object
 * @param {boolean} isRecurring - Whether this is a recurring task
 * @returns {object} - Prepared task data object
 */
export const prepareTaskData = (formData, isRecurring = false) => {
  const actualDate = convertDateOptionToDate(formData.date);
  
  if (isRecurring) {
    return {
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
  }
  
  return {
    title: formData.title,
    description: formData.description,
    date: actualDate,
    status: formData.status,
    priority: formData.priority,
    tags: formData.tags
  };
};

/**
 * Initialize week start date (Monday of current week)
 * @returns {object} - Dayjs object for Monday of current week
 */
export const initializeWeekStartDate = () => {
  const today = dayjs();
  const dayOfWeek = today.day();
  // If Sunday (0), go back 6 days to get Monday
  // Otherwise, subtract (dayOfWeek - 1) to get Monday
  const monday = dayOfWeek === 0 ? today.subtract(6, 'day') : today.subtract(dayOfWeek - 1, 'day');
  return monday;
};

/**
 * Get week dates array (7 days starting from weekStartDate)
 * @param {object} weekStartDate - Dayjs object for start of week
 * @returns {array} - Array of date strings (YYYY-MM-DD)
 */
export const getWeekDates = (weekStartDate) => {
  return Array.from({ length: 7 }, (_, i) => 
    weekStartDate.clone().add(i, 'day').format('YYYY-MM-DD')
  );
};

/**
 * Navigate to previous week
 * @param {object} weekStartDate - Current week start date (Dayjs object)
 * @returns {object} - New week start date (Dayjs object)
 */
export const navigateToPreviousWeek = (weekStartDate) => {
  return weekStartDate.clone().subtract(7, 'day');
};

/**
 * Navigate to next week
 * @param {object} weekStartDate - Current week start date (Dayjs object)
 * @returns {object} - New week start date (Dayjs object)
 */
export const navigateToNextWeek = (weekStartDate) => {
  return weekStartDate.clone().add(7, 'day');
};

/**
 * Navigate to current week
 * @returns {object} - Current week start date (Dayjs object)
 */
export const navigateToCurrentWeek = () => {
  const today = dayjs();
  const dayOfWeek = today.day();
  return dayOfWeek === 0 ? today.subtract(6, 'day') : today.subtract(dayOfWeek - 1, 'day');
};

/**
 * Get tasks for a specific date
 * @param {array} allTasks - Array of all tasks
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {array} - Filtered tasks for the date
 */
export const getTasksForDate = (allTasks, dateStr) => {
  return allTasks.filter(t => t.date === dateStr && !t.archived);
};

/**
 * Get task summary for a date (pending and completed counts)
 * @param {array} dateTasks - Tasks for a specific date
 * @returns {string} - Summary string
 */
export const getTaskSummary = (dateTasks) => {
  const pending = dateTasks.filter(t => t.status === TaskStatus.PENDING);
  const completed = dateTasks.filter(t => t.status === TaskStatus.COMPLETED);
  
  if (pending.length && completed.length) {
    return `${pending.length} pending • ${completed.length} done`;
  } else if (pending.length) {
    return `${pending.length} pending`;
  } else if (completed.length) {
    return `${completed.length} done`;
  }
  return 'No tasks';
};

/**
 * Format week range for display
 * @param {object} weekStartDate - Week start date (Dayjs object)
 * @returns {string} - Formatted week range string
 */
export const formatWeekRange = (weekStartDate) => {
  return `${weekStartDate.format('MMM DD')} - ${weekStartDate.clone().add(6, 'day').format('MMM DD, YYYY')}`;
};

/**
 * Check if a task can be edited
 * @param {object} task - Task object
 * @returns {object} - Object with canEdit boolean and reason string if cannot edit
 */
export const canEditTask = (task) => {
  if (task.archived) {
    return { canEdit: false, reason: 'Cannot edit archived tasks. Restore it first to make changes.' };
  }
  if (task.status === TaskStatus.COMPLETED) {
    return { canEdit: false, reason: 'Cannot edit completed tasks. Uncomplete it first to make changes.' };
  }
  return { canEdit: true };
};

/**
 * Check if a task can be dragged
 * @param {object} task - Task object
 * @returns {boolean} - Whether task can be dragged
 */
export const canDragTask = (task) => {
  return task.status !== TaskStatus.COMPLETED && !task.archived;
};

/**
 * Get date key from date string
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {object} dates - Dates object with today, tomorrow, dayAfterTomorrow
 * @returns {string|null} - Date key ('today', 'tomorrow', 'dayAfterTomorrow') or null
 */
export const getDateKey = (date, dates) => {
  if (date === dates.today) return 'today';
  if (date === dates.tomorrow) return 'tomorrow';
  if (date === dates.dayAfterTomorrow) return 'dayAfterTomorrow';
  return null;
};

/**
 * Validate target date for drag and drop
 * @param {string} targetDate - Target date string
 * @param {object} dates - Dates object with today, tomorrow, dayAfterTomorrow
 * @returns {boolean} - Whether target date is valid
 */
export const isValidTargetDate = (targetDate, dates) => {
  const validDates = [dates.today, dates.tomorrow, dates.dayAfterTomorrow];
  return validDates.includes(targetDate);
};

