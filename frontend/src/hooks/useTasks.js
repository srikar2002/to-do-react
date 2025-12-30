import { useState, useEffect, useCallback, useRef, useOptimistic } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TaskStatus } from '../constants/enums';
import { useSocket } from './useSocket';
import { 
  fetchTasks as fetchTasksService,
  createTask as createTaskService,
  createRecurringTask as createRecurringTaskService,
  archiveTask as archiveTaskService,
  fetchArchivedTasks as fetchArchivedTasksService,
  updateTask as updateTaskService, 
  deleteTask as deleteTaskService,
  restoreTask as restoreTaskService,
  getUsers as getUsersService,
  shareTask as shareTaskService,
  unshareTask as unshareTaskService,
  toggleTaskStatus as toggleTaskStatusService
} from '../services/taskService';

/**
 * Custom hook to manage tasks state and operations
 * Replaces TaskContext functionality
 */
export const useTasks = () => {
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
  const [optimisticTasks, setOptimisticTaskStatus] = useOptimistic(
    tasks,
    (currentTasks, { taskId, newStatus }) => {
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
      const result = await fetchTasksService(user.token);
      if (result.success && result.tasks && result.dates) {
        const fetchedTasks = {
          today: result.tasks[result.dates.today] || [],
          tomorrow: result.tasks[result.dates.tomorrow] || [],
          dayAfterTomorrow: result.tasks[result.dates.dayAfterTomorrow] || []
        };
        setTasks(fetchedTasks);
        setDates(result.dates);
      } else {
        setTasks({
          today: [],
          tomorrow: [],
          dayAfterTomorrow: []
        });
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks({
        today: [],
        tomorrow: [],
        dayAfterTomorrow: []
      });
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  // Update ref when fetchTasks changes
  useEffect(() => {
    fetchTasksRef.current = fetchTasks;
  }, [fetchTasks]);

  const createTask = async (taskData) => {
    if (!user || !user.token) {
      return { success: false, message: 'User not authenticated' };
    }
    
    const result = await createTaskService(taskData, user.token);
    if (result.success) {
      await fetchTasks();
    }
    return result;
  };

  const createRecurringTask = async (taskData) => {
    if (!user || !user.token) {
      return { success: false, message: 'User not authenticated' };
    }
    
    const result = await createRecurringTaskService(taskData, user.token);
    if (result.success) {
      await fetchTasks();
    }
    return result;
  };

  const updateTask = async (taskId, taskData) => {
    if (!user || !user.token) {
      return { success: false, message: 'User not authenticated' };
    }
    
    const result = await updateTaskService(taskId, taskData, user.token);
    if (result.success) {
      await fetchTasks();
    }
    return result;
  };

  const deleteTask = async (taskId) => {
    if (!user || !user.token) {
      return { success: false, message: 'User not authenticated' };
    }
    
    const result = await deleteTaskService(taskId, user.token);
    if (result.success) {
      await fetchTasks();
    }
    return result;
  };

  const toggleTaskStatus = async (taskId, currentStatus) => {
    if (!user || !user.token) {
      return { success: false, message: 'User not authenticated' };
    }
    
    // React 19: Optimistically update the UI immediately
    const newStatus = currentStatus === TaskStatus.PENDING ? TaskStatus.COMPLETED : TaskStatus.PENDING;
    setOptimisticTaskStatus({ taskId, newStatus });
    
    try {
      const result = await toggleTaskStatusService(taskId, currentStatus, user.token);
      if (!result.success) {
        await fetchTasks();
      }
      return result;
    } catch (error) {
      await fetchTasks();
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to toggle task status' 
      };
    }
  };

  const archiveTask = async (taskId) => {
    if (!user || !user.token) {
      return { success: false, message: 'User not authenticated' };
    }
    
    const result = await archiveTaskService(taskId, user.token);
    if (result.success) {
      await fetchTasks();
    }
    return result;
  };

  const fetchArchivedTasks = useCallback(async () => {
    if (!user || !user.id || !user.token) {
      setArchivedTasks([]);
      return;
    }
    
    const result = await fetchArchivedTasksService(user.token);
    if (result.success) {
      const filteredTasks = (result.tasks || []).filter(task => !task.isRecurring);
      setArchivedTasks(filteredTasks);
    } else {
      setArchivedTasks([]);
    }
  }, [user]);

  const restoreTask = async (taskId) => {
    if (!user || !user.token) {
      return { success: false, message: 'User not authenticated' };
    }
    
    const result = await restoreTaskService(taskId, user.token);
    if (result.success) {
      await Promise.all([fetchArchivedTasks(), fetchTasks()]);
    }
    return result;
  };

  const getUsers = async (search = '') => {
    if (!user || !user.token) {
      return { success: false, message: 'User not authenticated', users: [] };
    }
    
    return await getUsersService(search, user.token);
  };

  const shareTask = async (taskId, userIds) => {
    if (!user || !user.token) {
      return { success: false, message: 'User not authenticated' };
    }
    
    const result = await shareTaskService(taskId, userIds, user.token);
    if (result.success) {
      await Promise.all([fetchTasks(), fetchArchivedTasks()]);
    }
    return result;
  };

  const unshareTask = async (taskId, userId) => {
    if (!user || !user.token) {
      return { success: false, message: 'User not authenticated' };
    }
    
    const result = await unshareTaskService(taskId, userId, user.token);
    if (result.success) {
      await Promise.all([fetchTasks(), fetchArchivedTasks()]);
    }
    return result;
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
      'task:created': (task) => {
        if (task && task.isRecurring) {
          return;
        }
        if (task && !task.archived) {
          refreshTasks();
        }
      },
      'task:updated': (task) => {
        if (task && task.isRecurring) {
          return;
        }
        if (task.archived) {
          setArchivedTasks(prev => {
            const idx = prev.findIndex(t => t._id === task._id);
            if (idx !== -1) {
              return prev.map((t, i) => i === idx ? task : t);
            }
            return prev;
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
        if (task && task.isRecurring) {
          removeFromDateBuckets(task._id);
          refreshTasks();
          return;
        }
        
        removeFromDateBuckets(task._id);
        refreshTasks();
        if (task && task.archived) {
          setArchivedTasks(prev => {
            const idx = prev.findIndex(t => t._id === task._id);
            if (idx === -1) {
              return [...prev, task];
            }
            return prev;
          });
        }
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
      setArchivedTasks([]);
    }
  }, [user, fetchTasks]);

  return {
    tasks: optimisticTasks,
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
};

