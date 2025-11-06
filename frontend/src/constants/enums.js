// Task Status Enum
export const TaskStatus = {
  PENDING: 'Pending',
  COMPLETED: 'Completed'
};

// Task Priority Enum
export const TaskPriority = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High'
};

// Date Option Enum
export const DateOption = {
  TODAY: 'today',
  TOMORROW: 'tomorrow',
  DAY_AFTER_TOMORROW: 'dayAfterTomorrow'
};

// Snackbar Severity Enum
export const SnackbarSeverity = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Validation Limits
export const ValidationLimits = {
  TITLE_MAX_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 200
};

// Day Labels
export const DayLabels = {
  TODAY: 'Today',
  TOMORROW: 'Tomorrow',
  DAY_AFTER_TOMORROW: 'Day After Tomorrow'
};

// Default Values
export const DefaultValues = {
  STATUS: TaskStatus.PENDING,
  PRIORITY: TaskPriority.MEDIUM,
  DATE: DateOption.TODAY
};

// Success Messages
export const SuccessMessages = {
  TASK_CREATED: 'Task created successfully',
  TASK_UPDATED: 'Task updated successfully',
  TASK_DELETED: 'Task deleted successfully',
  TASK_ARCHIVED: 'Task archived successfully',
  TASK_RESTORED: 'Task restored successfully'
};

// Error Messages
export const ErrorMessages = {
  TASK_CREATE_FAILED: 'Failed to create task',
  TASK_UPDATE_FAILED: 'Failed to update task',
  TASK_DELETE_FAILED: 'Failed to delete task',
  TASK_ARCHIVE_FAILED: 'Failed to archive task',
  TASK_RESTORE_FAILED: 'Failed to restore task',
  CANNOT_EDIT_ARCHIVED: 'Cannot edit archived tasks. Restore it first to make changes.',
  CANNOT_EDIT_COMPLETED: 'Cannot edit completed tasks. Uncomplete it first to make changes.',
  VALIDATION_ERRORS: 'Please fix validation errors before submitting'
};

// Validation Error Messages
export const ValidationMessages = {
  TITLE_REQUIRED: 'Title is required',
  TITLE_MAX_LENGTH: 'Max 50 characters',
  TITLE_MAX_REACHED: 'Max 50 characters reached',
  DESCRIPTION_MAX_REACHED: 'Max 200 characters reached'
};

