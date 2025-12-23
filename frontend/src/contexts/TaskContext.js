import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useOptimistic } from 'react';
import { useAuth } from './AuthContext';
import { TaskStatus } from '../constants/enums';
import { useSocket } from '../hooks/useSocket';
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
      const result = await fetchTasksService(user.token);
      if (result.success && result.tasks && result.dates) {
        const fetchedTasks = {
          today: result.tasks[result.dates.today] || [],
          tomorrow: result.tasks[result.dates.tomorrow] || [],
          dayAfterTomorrow: result.tasks[result.dates.dayAfterTomorrow] || []
        };
        setTasks(fetchedTasks);
        setDates(result.dates);
        // Note: useOptimistic will automatically sync with the new tasks state
      } else {
        // Clear tasks on error to avoid showing stale data
        setTasks({
          today: [],
          tomorrow: [],
          dayAfterTomorrow: []
        });
      }
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
      // Only fetch main tasks, NOT archived tasks
      // The parent recurring task (archived) should NOT be added to archivedTasks
      // It will only appear if user explicitly fetches archived tasks
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
      // Filter out parent recurring tasks - they should not appear in archivedTasks
      // Parent recurring tasks are automatically archived but are not user-archived tasks
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
        // Only refresh tasks for non-archived tasks
        // Archived tasks (like parent recurring tasks) should not be added to archivedTasks
        // They will only appear when fetchArchivedTasks() is explicitly called
        // IMPORTANT: Ignore parent recurring tasks (isRecurring: true) completely
        if (task && task.isRecurring) {
          // This is a parent recurring task - ignore it completely
          return;
        }
        if (task && !task.archived) {
          refreshTasks();
        }
        // Ignore archived tasks created via WebSocket - they shouldn't appear in archivedTasks
        // unless explicitly fetched by the user
      },
      'task:updated': (task) => {
        // IMPORTANT: Ignore parent recurring tasks (isRecurring: true) completely
        if (task && task.isRecurring) {
          // This is a parent recurring task - ignore it completely
          return;
        }
        if (task.archived) {
          // Only update existing archived tasks, don't add new ones
          // New archived tasks should only be added via task:archived event
          setArchivedTasks(prev => {
            const idx = prev.findIndex(t => t._id === task._id);
            if (idx !== -1) {
              // Update existing archived task
              return prev.map((t, i) => i === idx ? task : t);
            }
            // Don't add new archived tasks here - they should only appear
            // when explicitly fetched via fetchArchivedTasks()
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
        // This event is only emitted when user explicitly archives a task via the archive button
        // It should NOT be triggered when creating recurring tasks
        // IMPORTANT: Do NOT add parent recurring tasks (isRecurring: true) to archivedTasks
        // They are automatically archived but should only appear when explicitly fetched
        if (task && task.isRecurring) {
          // This is a parent recurring task - don't add it to archivedTasks
          // It will only appear when fetchArchivedTasks() is explicitly called
          removeFromDateBuckets(task._id);
          refreshTasks();
          return;
        }
        
        removeFromDateBuckets(task._id);
        refreshTasks();
        // Add to archivedTasks only when explicitly archived by user action (and not a parent recurring task)
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
