import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useOptimistic } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuth } from './AuthContext';
import { TaskStatus } from '../constants/enums';
import { useSocket } from '../hooks/useSocket';
import { updateTask as updateTaskService, deleteTask as deleteTaskService } from '../services/taskService';

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
  
  // React 19: useOptimistic for immediate UI feedback when toggling task status
  // This provides instant visual feedback while the API call is in progress
  const [optimisticTasks, setOptimisticTaskStatus] = useOptimistic(
    tasks,
    (currentTasks, { taskId, newStatus }) => {
      // Optimistically update the task status across all date buckets
      const updateTaskInArray = (taskArray) =>
        taskArray.map(task => 
          task._id === taskId 
            ? { ...task, status: newStatus }
            : task
        );

      return {
        today: updateTaskInArray(currentTasks.today),
        tomorrow: updateTaskInArray(currentTasks.tomorrow),
        dayAfterTomorrow: updateTaskInArray(currentTasks.dayAfterTomorrow)
      };
    }
  );
  
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
      
      const fetchedTasks = {
        today: tasksData[datesData.today] || [],
        tomorrow: tasksData[datesData.tomorrow] || [],
        dayAfterTomorrow: tasksData[datesData.dayAfterTomorrow] || []
      };
      setTasks(fetchedTasks);
      setDates(datesData);
      // Note: useOptimistic will automatically sync with the new tasks state
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
    if (!user || !user.token) {
      return { success: false, message: 'User not authenticated' };
    }
    
    const result = await updateTaskService(taskId, taskData, user.token);
    if (result.success) {
      await fetchTasks(); // Refresh tasks
    }
    return result;
  };

  const deleteTask = async (taskId) => {
    if (!user || !user.token) {
      return { success: false, message: 'User not authenticated' };
    }
    
    const result = await deleteTaskService(taskId, user.token);
    if (result.success) {
      await fetchTasks(); // Refresh tasks
    }
    return result;
  };

  const toggleTaskStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === TaskStatus.PENDING ? TaskStatus.COMPLETED : TaskStatus.PENDING;
    
    // React 19: Optimistically update the UI immediately
    setOptimisticTaskStatus({ taskId, newStatus });
    
    try {
      const result = await updateTask(taskId, { status: newStatus });
      // If the update fails, fetchTasks will revert the optimistic update
      if (!result.success) {
        await fetchTasks();
      }
      return result;
    } catch (error) {
      // On error, revert by fetching the latest tasks
      await fetchTasks();
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to toggle task status' 
      };
    }
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
    tasks: optimisticTasks, // Use optimistic tasks for immediate UI updates
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
