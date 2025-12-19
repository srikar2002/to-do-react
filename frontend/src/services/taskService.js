import axios from 'axios';

/**
 * Task Service
 * Handles all task-related API calls
 */

/**
 * Fetch tasks for the current user
 * @param {string} token - User authentication token
 * @returns {Promise<{success: boolean, tasks?: object, dates?: object, message?: string}>}
 */
export const fetchTasks = async (token) => {
  if (!token) {
    return { success: false, message: 'No authentication token provided' };
  }

  try {
    const response = await axios.get('/api/tasks', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
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
 * @param {string} token - User authentication token
 * @returns {Promise<{success: boolean, task?: object, message?: string}>}
 */
export const createTask = async (taskData, token) => {
  if (!token) {
    return { success: false, message: 'No authentication token provided' };
  }

  try {
    const response = await axios.post('/api/tasks', taskData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
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
 * @param {string} token - User authentication token
 * @returns {Promise<{success: boolean, tasks?: array, count?: number, message?: string}>}
 */
export const createRecurringTask = async (taskData, token) => {
  if (!token) {
    return { success: false, message: 'No authentication token provided' };
  }

  try {
    const response = await axios.post('/api/tasks/recurring', taskData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
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
 * @param {string} token - User authentication token
 * @returns {Promise<{success: boolean, task?: object, message?: string}>}
 */
export const archiveTask = async (taskId, token) => {
  if (!token) {
    return { success: false, message: 'No authentication token provided' };
  }

  try {
    const response = await axios.post(`/api/tasks/${taskId}/archive`, {}, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
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
 * @param {string} token - User authentication token
 * @returns {Promise<{success: boolean, tasks?: array, message?: string}>}
 */
export const fetchArchivedTasks = async (token) => {
  if (!token) {
    return { success: false, message: 'No authentication token provided', tasks: [] };
  }

  try {
    const response = await axios.get('/api/tasks/archived', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
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
 * @param {string} token - User authentication token
 * @returns {Promise<{success: boolean, task?: object, message?: string}>}
 */
export const updateTask = async (taskId, taskData, token) => {
  if (!token) {
    return { success: false, message: 'No authentication token provided' };
  }

  try {
    const response = await axios.put(`/api/tasks/${taskId}`, taskData, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
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
 * @param {string} token - User authentication token
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export const deleteTask = async (taskId, token) => {
  if (!token) {
    return { success: false, message: 'No authentication token provided' };
  }

  try {
    await axios.delete(`/api/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting task:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || 'Failed to delete task' 
    };
  }
};

