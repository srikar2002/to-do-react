import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuth } from './AuthContext';

const TaskContext = createContext();

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};

export const TaskProvider = ({ children }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState({
    today: [],
    tomorrow: [],
    dayAfterTomorrow: []
  });
  const [dates, setDates] = useState({
    today: '',
    tomorrow: '',
    dayAfterTomorrow: ''
  });
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!user || !user.id || !user.token) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get('/api/tasks');
      const { tasks: tasksData, dates: datesData } = response.data;
      
      setTasks({
        today: tasksData[datesData.today] || [],
        tomorrow: tasksData[datesData.tomorrow] || [],
        dayAfterTomorrow: tasksData[datesData.dayAfterTomorrow] || []
      });
      setDates(datesData);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      // Clear tasks on error to avoid showing stale data
      setTasks({
        today: [],
        tomorrow: [],
        dayAfterTomorrow: []
      });
    } finally {
      setLoading(false);
    }
  }, [user]); // Trigger when user object changes

  const createTask = async (taskData) => {
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }
    
    try {
      const response = await axios.post('/api/tasks', taskData);
      await fetchTasks(); // Refresh tasks
      return { success: true, task: response.data.task };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to create task' 
      };
    }
  };


  const updateTask = async (taskId, taskData) => {
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }
    
    try {
      const response = await axios.put(`/api/tasks/${taskId}`, taskData);
      await fetchTasks(); // Refresh tasks
      return { success: true, task: response.data.task };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to update task' 
      };
    }
  };

  const deleteTask = async (taskId) => {
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }
    
    try {
      await axios.delete(`/api/tasks/${taskId}`);
      await fetchTasks(); // Refresh tasks
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to delete task' 
      };
    }
  };

  const toggleTaskStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'Pending' ? 'Completed' : 'Pending';
    return await updateTask(taskId, { status: newStatus });
  };

  const archiveTask = async (taskId) => {
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }
    
    try {
      const response = await axios.post(`/api/tasks/${taskId}/archive`);
      await fetchTasks(); // Refresh main tasks
      return { success: true, task: response.data.task };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to archive task' 
      };
    }
  };

  const fetchArchivedTasks = useCallback(async () => {
    if (!user || !user.id || !user.token) {
      setArchivedTasks([]);
      return;
    }
    
    try {
      const response = await axios.get('/api/tasks/archived');
      setArchivedTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Error fetching archived tasks:', error);
      setArchivedTasks([]);
    }
  }, [user]);

  const restoreTask = async (taskId) => {
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }
    
    try {
      const response = await axios.post(`/api/tasks/${taskId}/restore`);
      await fetchArchivedTasks(); // Refresh archived tasks
      await fetchTasks(); // Refresh main tasks
      return { success: true, task: response.data.task };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to restore task' 
      };
    }
  };

  useEffect(() => {
    if (user && user.id && user.token) {
      fetchTasks();
    } else {
      // Clear tasks when user logs out
      setTasks({
        today: [],
        tomorrow: [],
        dayAfterTomorrow: []
      });
      setDates({
        today: '',
        tomorrow: '',
        dayAfterTomorrow: ''
      });
      setArchivedTasks([]); // Also clear archived tasks
    }
  }, [user, fetchTasks]); // Trigger when user object or fetchTasks changes

  const value = {
    tasks,
    dates,
    archivedTasks,
    loading,
    fetchTasks,
    fetchArchivedTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    archiveTask,
    restoreTask
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};
