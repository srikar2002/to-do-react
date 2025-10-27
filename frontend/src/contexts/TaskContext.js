import React, { createContext, useContext, useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(false);

  const fetchTasks = async () => {
    if (!user) {
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
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const value = {
    tasks,
    dates,
    loading,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};
