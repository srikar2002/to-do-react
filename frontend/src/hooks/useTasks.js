import { useState, useEffect, useCallback, useOptimistic } from 'react';
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

// Constants
const EMPTY_TASKS_STATE = {
  today: [],
  tomorrow: [],
  dayAfterTomorrow: []
};

/**
 * Custom hook to manage tasks state and operations
 * Uses taskService for all API calls - no token passing needed (uses axios defaults)
 */
export const useTasks = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [tasks, setTasks] = useState(EMPTY_TASKS_STATE);
  const [dates, setDates] = useState({
    today: '',
    tomorrow: '',
    dayAfterTomorrow: ''
  });
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Helper: Update task in all date buckets
  const updateTaskInBuckets = useCallback((taskId, updater) => {
    setTasks(prev => {
      const updateTaskInArray = (taskArray) => taskArray.map(task => 
        task._id === taskId ? updater(task) : task
      );
      return {
        today: updateTaskInArray(prev.today),
        tomorrow: updateTaskInArray(prev.tomorrow),
        dayAfterTomorrow: updateTaskInArray(prev.dayAfterTomorrow)
      };
    });
  }, []);

  // Helper: Remove task from all date buckets
  const removeFromDateBuckets = useCallback((taskId) => {
    setTasks(prev => ({
      today: prev.today.filter(t => t._id !== taskId),
      tomorrow: prev.tomorrow.filter(t => t._id !== taskId),
      dayAfterTomorrow: prev.dayAfterTomorrow.filter(t => t._id !== taskId)
    }));
  }, []);

  // React 19: useOptimistic for immediate UI feedback when toggling task status
  const [optimisticTasks, setOptimisticTaskStatus] = useOptimistic(
    tasks,
    (currentTasks, { taskId, newStatus }) => {
      const updateTaskInArray = (taskArray) =>
        taskArray.map(task => 
          task._id === taskId ? { ...task, status: newStatus } : task
        );

      return {
        today: updateTaskInArray(currentTasks.today),
        tomorrow: updateTaskInArray(currentTasks.tomorrow),
        dayAfterTomorrow: updateTaskInArray(currentTasks.dayAfterTomorrow)
      };
    }
  );

  const fetchTasks = useCallback(async () => {
    if (!user?.id || !user?.token) {
      return;
    }
    
    setLoading(true);
    try {
      const result = await fetchTasksService();
      if (result.success && result.tasks && result.dates) {
        setTasks({
          today: result.tasks[result.dates.today] || [],
          tomorrow: result.tasks[result.dates.tomorrow] || [],
          dayAfterTomorrow: result.tasks[result.dates.dayAfterTomorrow] || []
        });
        setDates(result.dates);
      } else {
        setTasks(EMPTY_TASKS_STATE);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks(EMPTY_TASKS_STATE);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Task mutation functions - directly call service and refetch on success
  const createTask = useCallback(async (taskData) => {
    if (!user?.token) return { success: false, message: 'User not authenticated' };
    const result = await createTaskService(taskData);
    if (result.success) await fetchTasks();
    return result;
  }, [user, fetchTasks]);

  const createRecurringTask = useCallback(async (taskData) => {
    if (!user?.token) return { success: false, message: 'User not authenticated' };
    const result = await createRecurringTaskService(taskData);
    if (result.success) await fetchTasks();
    return result;
  }, [user, fetchTasks]);

  const updateTask = useCallback(async (taskId, taskData) => {
    if (!user?.token) return { success: false, message: 'User not authenticated' };
    const result = await updateTaskService(taskId, taskData);
    if (result.success) await fetchTasks();
    return result;
  }, [user, fetchTasks]);

  const deleteTask = useCallback(async (taskId) => {
    if (!user?.token) return { success: false, message: 'User not authenticated' };
    const result = await deleteTaskService(taskId);
    if (result.success) await fetchTasks();
    return result;
  }, [user, fetchTasks]);

  const fetchArchivedTasks = useCallback(async () => {
    if (!user?.id || !user?.token) {
      setArchivedTasks([]);
      return;
    }
    
    const result = await fetchArchivedTasksService();
    setArchivedTasks(result.success 
      ? (result.tasks || []).filter(task => !task.isRecurring)
      : []
    );
  }, [user]);

  const archiveTask = useCallback(async (taskId) => {
    if (!user?.token) return { success: false, message: 'User not authenticated' };
    const result = await archiveTaskService(taskId);
    if (result.success) {
      await Promise.all([fetchTasks(), fetchArchivedTasks()]);
    }
    return result;
  }, [user, fetchTasks, fetchArchivedTasks]);

  const toggleTaskStatus = useCallback(async (taskId, currentStatus) => {
    if (!user?.token) return { success: false, message: 'User not authenticated' };
    
    // React 19: Optimistically update the UI immediately
    const newStatus = currentStatus === TaskStatus.PENDING ? TaskStatus.COMPLETED : TaskStatus.PENDING;
    setOptimisticTaskStatus({ taskId, newStatus });
    
    try {
      const result = await toggleTaskStatusService(taskId, currentStatus);
      if (result.success && result.task) {
        updateTaskInBuckets(taskId, () => result.task);
      } else if (!result.success) {
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
  }, [user, setOptimisticTaskStatus, updateTaskInBuckets, fetchTasks]);

  const restoreTask = useCallback(async (taskId) => {
    if (!user?.token) return { success: false, message: 'User not authenticated' };
    const result = await restoreTaskService(taskId);
    if (result.success) {
      await Promise.all([fetchArchivedTasks(), fetchTasks()]);
    }
    return result;
  }, [user, fetchArchivedTasks, fetchTasks]);

  const getUsers = useCallback(async (search = '') => {
    if (!user?.token) return { success: false, message: 'User not authenticated', users: [] };
    return await getUsersService(search);
  }, [user]);

  const shareTask = useCallback(async (taskId, userIds) => {
    if (!user?.token) return { success: false, message: 'User not authenticated' };
    const result = await shareTaskService(taskId, userIds);
    if (result.success) {
      await Promise.all([fetchTasks(), fetchArchivedTasks()]);
    }
    return result;
  }, [user, fetchTasks, fetchArchivedTasks]);

  const unshareTask = useCallback(async (taskId, userId) => {
    if (!user?.token) return { success: false, message: 'User not authenticated' };
    const result = await unshareTaskService(taskId, userId);
    if (result.success) {
      await Promise.all([fetchTasks(), fetchArchivedTasks()]);
    }
    return result;
  }, [user, fetchTasks, fetchArchivedTasks]);

  // Set up WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Helper: Update archived tasks
    const updateArchivedTask = (task) => {
      setArchivedTasks(prev => {
        const idx = prev.findIndex(t => t._id === task._id);
        if (idx !== -1) {
          return prev.map((t, i) => i === idx ? task : t);
        }
        return prev;
      });
    };

    // Helper: Add task to archived if not exists
    const addToArchived = (task) => {
      setArchivedTasks(prev => {
        if (prev.findIndex(t => t._id === task._id) === -1) {
          return [...prev, task];
        }
        return prev;
      });
    };

    // Event handlers
    const handlers = {
      'task:created': (task) => {
        if (!task?.isRecurring && !task?.archived) {
          fetchTasks();
        }
      },
      'task:updated': (task) => {
        if (task?.isRecurring) return;
        
        if (task.archived) {
          updateArchivedTask(task);
          removeFromDateBuckets(task._id);
        } else {
          updateTaskInBuckets(task._id, () => task);
          setArchivedTasks(prev => prev.filter(t => t._id !== task._id));
        }
      },
      'task:deleted': ({ taskId }) => {
        removeFromDateBuckets(taskId);
        setArchivedTasks(prev => prev.filter(t => t._id !== taskId));
      },
      'task:archived': (task) => {
        removeFromDateBuckets(task._id);
        fetchTasks();
        if (task?.archived) {
          addToArchived(task);
        }
      },
      'task:restored': (task) => {
        setArchivedTasks(prev => prev.filter(t => t._id !== task._id));
        fetchTasks();
      },
      'task:shared': fetchTasks,
      'task:unshared': fetchTasks,
      'tasks:refresh': fetchTasks
    };

    // Register all listeners
    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    // Cleanup
    return () => {
      Object.keys(handlers).forEach(event => socket.off(event));
    };
  }, [socket, fetchTasks, removeFromDateBuckets, updateTaskInBuckets]);

  useEffect(() => {
    if (user?.id && user?.token) {
      fetchTasks();
    } else {
      setTasks(EMPTY_TASKS_STATE);
      setDates({ today: '', tomorrow: '', dayAfterTomorrow: '' });
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

