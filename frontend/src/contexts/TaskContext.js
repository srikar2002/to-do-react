import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuth } from './AuthContext';
import { TaskStatus } from '../constants/enums';
import { useSocket } from '../hooks/useSocket';

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
  const socket = useSocket();
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
  
  // Keep a ref to the latest fetchTasks function to avoid stale closures
  const fetchTasksRef = useRef(null);

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
  
  // Update ref when fetchTasks changes
  useEffect(() => {
    fetchTasksRef.current = fetchTasks;
  }, [fetchTasks]);

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

  const createRecurringTask = async (taskData) => {
    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }
    
    try {
      const response = await axios.post('/api/tasks/recurring', taskData);
      await fetchTasks(); // Refresh tasks
      return { 
        success: true, 
        tasks: response.data.tasks,
        count: response.data.count || 0
      };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to create recurring task' 
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
    const newStatus = currentStatus === TaskStatus.PENDING ? TaskStatus.COMPLETED : TaskStatus.PENDING;
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
    if (!user) return { success: false, message: 'User not authenticated' };
    try {
      const response = await axios.post(`/api/tasks/${taskId}/restore`);
      await Promise.all([fetchArchivedTasks(), fetchTasks()]);
      return { success: true, task: response.data.task };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to restore task' 
      };
    }
  };

  const getUsers = async (search = '') => {
    if (!user) return { success: false, message: 'User not authenticated', users: [] };
    try {
      const params = search ? { params: { search } } : {};
      const response = await axios.get('/api/tasks/users', params);
      return { success: true, users: response.data.users || [] };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to fetch users',
        users: []
      };
    }
  };

  const shareTask = async (taskId, userIds) => {
    if (!user) return { success: false, message: 'User not authenticated' };
    try {
      const response = await axios.post(`/api/tasks/${taskId}/share`, { userIds });
      await Promise.all([fetchTasks(), fetchArchivedTasks()]);
      return { success: true, task: response.data.task };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to share task' 
      };
    }
  };

  const unshareTask = async (taskId, userId) => {
    if (!user) return { success: false, message: 'User not authenticated' };
    try {
      const response = await axios.delete(`/api/tasks/${taskId}/share/${userId}`);
      await Promise.all([fetchTasks(), fetchArchivedTasks()]);
      return { success: true, task: response.data.task };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to unshare task' 
      };
    }
  };

  // Set up WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Helper to remove task from date buckets
    const removeFromDateBuckets = (taskId) => {
      setTasks(prev => ({
        today: prev.today.filter(t => t._id !== taskId),
        tomorrow: prev.tomorrow.filter(t => t._id !== taskId),
        dayAfterTomorrow: prev.dayAfterTomorrow.filter(t => t._id !== taskId)
      }));
    };

    // Helper to refresh tasks
    const refreshTasks = () => fetchTasksRef.current?.();

    // Event handlers
    const handlers = {
      'task:created': () => refreshTasks(),
      'task:updated': (task) => {
        if (task.archived) {
          setArchivedTasks(prev => {
            const idx = prev.findIndex(t => t._id === task._id);
            return idx !== -1 ? prev.map((t, i) => i === idx ? task : t) : prev;
          });
          removeFromDateBuckets(task._id);
        } else {
          refreshTasks();
          setArchivedTasks(prev => prev.filter(t => t._id !== task._id));
        }
      },
      'task:deleted': ({ taskId }) => {
        removeFromDateBuckets(taskId);
        setArchivedTasks(prev => prev.filter(t => t._id !== taskId));
      },
      'task:archived': (task) => {
        removeFromDateBuckets(task._id);
        refreshTasks();
      },
      'task:restored': (task) => {
        setArchivedTasks(prev => prev.filter(t => t._id !== task._id));
        refreshTasks();
      },
      'task:shared': refreshTasks,
      'task:unshared': refreshTasks,
      'tasks:refresh': refreshTasks
    };

    // Register all listeners
    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    // Cleanup
    return () => {
      Object.keys(handlers).forEach(event => socket.off(event));
    };
  }, [socket]);

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
    createRecurringTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    archiveTask,
    restoreTask,
    getUsers,
    shareTask,
    unshareTask
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};
