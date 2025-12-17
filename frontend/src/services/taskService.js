import axios from 'axios';

/**
 * Task Service
 * Handles all task-related API calls
 */

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

