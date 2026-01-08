import axios from 'axios';
import { TaskStatus } from '../constants/enums';

/**
 * Task Service
 * Handles all task-related API calls
 * Uses axios default headers set in AuthContext for authentication
 */

/**
 * Fetch tasks for the current user
 * @returns {Promise<{success: boolean, tasks?: object, dates?: object, message?: string}>}
 */
export const fetchTasks = async () => {
  try {
    const response = await axios.get('/api/tasks');
    return { 
      success: true, 
      tasks: response.data.tasks,
      dates: response.data.dates
    };
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to fetch tasks' 
    };
  }
};

/**
 * Create a new task
 * @param {object} taskData - Task data to create
 * @returns {Promise<{success: boolean, task?: object, message?: string}>}
 */
export const createTask = async (taskData) => {
  try {
    const response = await axios.post('/api/tasks', taskData);
    return { success: true, task: response.data.task };
  } catch (error) {
    console.error('Error creating task:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to create task' 
    };
  }
};

/**
 * Create a recurring task
 * @param {object} taskData - Task data for recurring task
 * @returns {Promise<{success: boolean, tasks?: array, count?: number, message?: string}>}
 */
export const createRecurringTask = async (taskData) => {
  try {
    const response = await axios.post('/api/tasks/recurring', taskData);
    return { 
      success: true, 
      tasks: response.data.tasks,
      count: response.data.count || 0
    };
  } catch (error) {
    console.error('Error creating recurring task:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to create recurring task' 
    };
  }
};

/**
 * Archive a task
 * @param {string} taskId - Task ID to archive
 * @returns {Promise<{success: boolean, task?: object, message?: string}>}
 */
export const archiveTask = async (taskId) => {
  try {
    const response = await axios.post(`/api/tasks/${taskId}/archive`);
    return { success: true, task: response.data.task };
  } catch (error) {
    console.error('Error archiving task:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to archive task' 
    };
  }
};

/**
 * Fetch archived tasks for the current user
 * @returns {Promise<{success: boolean, tasks?: array, message?: string}>}
 */
export const fetchArchivedTasks = async () => {
  try {
    const response = await axios.get('/api/tasks/archived');
    return { success: true, tasks: response.data.tasks || [] };
  } catch (error) {
    console.error('Error fetching archived tasks:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to fetch archived tasks',
      tasks: []
    };
  }
};

/**
 * Update a task
 * @param {string} taskId - Task ID to update
 * @param {object} taskData - Task data to update
 * @returns {Promise<{success: boolean, task?: object, message?: string}>}
 */
export const updateTask = async (taskId, taskData) => {
  try {
    const response = await axios.put(`/api/tasks/${taskId}`, taskData);
    return { success: true, task: response.data.task };
  } catch (error) {
    console.error('Error updating task:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to update task' 
    };
  }
};

/**
 * Delete a task
 * @param {string} taskId - Task ID to delete
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export const deleteTask = async (taskId) => {
  try {
    await axios.delete(`/api/tasks/${taskId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting task:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to delete task' 
    };
  }
};

/**
 * Restore an archived task
 * @param {string} taskId - Task ID to restore
 * @returns {Promise<{success: boolean, task?: object, message?: string}>}
 */
export const restoreTask = async (taskId) => {
  try {
    const response = await axios.post(`/api/tasks/${taskId}/restore`);
    return { success: true, task: response.data.task };
  } catch (error) {
    console.error('Error restoring task:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to restore task' 
    };
  }
};

/**
 * Get users for task sharing
 * @param {string} search - Search query for users
 * @returns {Promise<{success: boolean, users?: array, message?: string}>}
 */
export const getUsers = async (search = '') => {
  try {
    const params = search ? { params: { search } } : {};
    const response = await axios.get('/api/tasks/users', params);
    return { success: true, users: response.data.users || [] };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to fetch users',
      users: []
    };
  }
};

/**
 * Share a task with users
 * @param {string} taskId - Task ID to share
 * @param {array} userIds - Array of user IDs to share with
 * @returns {Promise<{success: boolean, task?: object, message?: string}>}
 */
export const shareTask = async (taskId, userIds) => {
  try {
    const response = await axios.post(`/api/tasks/${taskId}/share`, { userIds });
    return { success: true, task: response.data.task };
  } catch (error) {
    console.error('Error sharing task:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to share task' 
    };
  }
};

/**
 * Unshare a task from a user
 * @param {string} taskId - Task ID to unshare
 * @param {string} userId - User ID to unshare from
 * @returns {Promise<{success: boolean, task?: object, message?: string}>}
 */
export const unshareTask = async (taskId, userId) => {
  try {
    const response = await axios.delete(`/api/tasks/${taskId}/share/${userId}`);
    return { success: true, task: response.data.task };
  } catch (error) {
    console.error('Error unsharing task:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to unshare task' 
    };
  }
};

/**
 * Toggle task status between PENDING and COMPLETED
 * @param {string} taskId - Task ID to toggle
 * @param {string} currentStatus - Current task status
 * @returns {Promise<{success: boolean, task?: object, message?: string}>}
 */
export const toggleTaskStatus = async (taskId, currentStatus) => {
  const newStatus = currentStatus === TaskStatus.PENDING ? TaskStatus.COMPLETED : TaskStatus.PENDING;
  
  try {
    return await updateTask(taskId, { status: newStatus });
  } catch (error) {
    console.error('Error toggling task status:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to toggle task status' 
    };
  }
};

