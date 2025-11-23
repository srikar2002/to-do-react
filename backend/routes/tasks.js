const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const dayjs = require('dayjs');
const { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } = require('../services/googleCalendar');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get tasks for 3-day window (Today, Tomorrow, Day After Tomorrow)
router.get('/', async (req, res) => {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
    const dayAfterTomorrow = dayjs().add(2, 'day').format('YYYY-MM-DD');
    
    const tasks = await Task.find({
      userId: req.userId,
      date: { $in: [today, tomorrow, dayAfterTomorrow] },
      archived: false
    }).sort({ date: 1, order: 1, createdAt: 1 });
    
    // Group tasks by date (more efficient than filtering)
    const groupedTasks = {
      [today]: [],
      [tomorrow]: [],
      [dayAfterTomorrow]: []
    };
    
    tasks.forEach(task => {
      if (groupedTasks.hasOwnProperty(task.date)) {
        groupedTasks[task.date].push(task);
      }
    });
    
    res.json({
      tasks: groupedTasks,
      dates: {
        today,
        tomorrow,
        dayAfterTomorrow
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error while fetching tasks' });
  }
});

// Create new task
router.post('/', async (req, res) => {
  try {
    const { title, description, date, status, priority, tags, syncToGoogleCalendar } = req.body;
    
    // Validation
    if (!title || !date) {
      return res.status(400).json({ message: 'Title and date are required' });
    }
    
    // Validate date format
    if (!dayjs(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    // Validate priority
    if (priority && !['Low', 'Medium', 'High'].includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority. Must be Low, Medium, or High' });
    }
    
    // Get the highest order for this date to append new task at the end
    const maxOrderTask = await Task.findOne({
      userId: req.userId,
      date
    }).sort({ order: -1 });
    const nextOrder = maxOrderTask ? maxOrderTask.order + 1 : 0;
    
    const task = new Task({
      userId: req.userId,
      title,
      description: description || '',
      date,
      status: status || 'Pending',
      priority: priority || 'Medium',
      tags: Array.isArray(tags) ? tags.filter(tag => tag && tag.trim()) : [],
      syncToGoogleCalendar: syncToGoogleCalendar || false
    });
    
    task.order = nextOrder;
    await task.save();
    
    // Sync to Google Calendar if enabled
    if (syncToGoogleCalendar) {
      try {
        const user = await User.findById(req.userId);
        const eventId = await createCalendarEvent(task, user?.email || null);
        if (eventId) {
          task.googleCalendarEventId = eventId;
          await task.save();
        }
      } catch (calendarError) {
        console.error('Error syncing to Google Calendar:', calendarError);
        // Don't fail task creation if calendar sync fails
      }
    }
    
    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error while creating task' });
  }
});

// Create recurring task
router.post('/recurring', async (req, res) => {
  try {
    const { title, description, startDate, status, priority, tags, recurrencePattern, recurrenceInterval, recurrenceEndDate, syncToGoogleCalendar } = req.body;
    
    // Validation
    if (!title || !startDate) {
      return res.status(400).json({ message: 'Title and start date are required' });
    }
    
    if (!recurrencePattern || !['daily', 'weekly', 'custom'].includes(recurrencePattern)) {
      return res.status(400).json({ message: 'Valid recurrence pattern (daily, weekly, custom) is required' });
    }
    
    // Validate date format
    if (!dayjs(startDate, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ message: 'Invalid start date format. Use YYYY-MM-DD' });
    }
    
    if (recurrenceEndDate && !dayjs(recurrenceEndDate, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ message: 'Invalid end date format. Use YYYY-MM-DD' });
    }
    
    // Validate priority
    if (priority && !['Low', 'Medium', 'High'].includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority. Must be Low, Medium, or High' });
    }
    
    // Validate custom interval
    if (recurrencePattern === 'custom' && (!recurrenceInterval || recurrenceInterval < 1)) {
      return res.status(400).json({ message: 'Custom recurrence requires interval >= 1' });
    }
    
    const start = dayjs(startDate);
    const end = recurrenceEndDate ? dayjs(recurrenceEndDate) : dayjs().add(90, 'days'); // Default to 90 days if no end date
    const createdTasks = [];
    
    // Create parent task template (not displayed, used for reference)
    // Archive it so it doesn't show up in the main task list
    const parentTask = new Task({
      userId: req.userId,
      title,
      description: description || '',
      date: startDate,
      status: status || 'Pending',
      priority: priority || 'Medium',
      tags: Array.isArray(tags) ? tags.filter(tag => tag && tag.trim()) : [],
      isRecurring: true,
      recurrencePattern,
      recurrenceInterval: recurrencePattern === 'custom' ? recurrenceInterval : 1,
      recurrenceEndDate: recurrenceEndDate || null,
      archived: true, // Archive parent task so it doesn't appear in main view
      syncToGoogleCalendar: syncToGoogleCalendar || false
    });
    await parentTask.save();
    
    // Generate task instances
    let currentDate = start;
    let taskCount = 0;
    const maxTasks = 365; // Limit to prevent excessive task creation
    
    while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
      if (taskCount >= maxTasks) break;
      
      const taskDate = currentDate.format('YYYY-MM-DD');
      
      // Get the highest order for this date
      const maxOrderTask = await Task.findOne({
        userId: req.userId,
        date: taskDate
      }).sort({ order: -1 });
      const nextOrder = maxOrderTask ? maxOrderTask.order + 1 : 0;
      
      const task = new Task({
        userId: req.userId,
        title,
        description: description || '',
        date: taskDate,
        status: status || 'Pending',
        priority: priority || 'Medium',
        tags: Array.isArray(tags) ? tags.filter(tag => tag && tag.trim()) : [],
        isRecurring: false, // Individual instances are not marked as recurring
        parentTaskId: parentTask._id,
        order: nextOrder,
        syncToGoogleCalendar: syncToGoogleCalendar || false
      });
      
      await task.save();
      
      // Sync to Google Calendar if enabled
      if (syncToGoogleCalendar) {
        try {
          const user = await User.findById(req.userId);
          const eventId = await createCalendarEvent(task, user?.email || null);
          if (eventId) {
            task.googleCalendarEventId = eventId;
            await task.save();
          }
        } catch (calendarError) {
          console.error('Error syncing recurring task to Google Calendar:', calendarError);
          // Don't fail task creation if calendar sync fails
        }
      }
      
      createdTasks.push(task);
      taskCount++;
      
      // Calculate next occurrence date
      if (recurrencePattern === 'daily') {
        currentDate = currentDate.add(1, 'day');
      } else if (recurrencePattern === 'weekly') {
        currentDate = currentDate.add(1, 'week');
      } else if (recurrencePattern === 'custom') {
        currentDate = currentDate.add(recurrenceInterval, 'day');
      }
    }
    
    res.status(201).json({
      message: `Recurring task created successfully. Generated ${createdTasks.length} task instances.`,
      parentTask,
      tasks: createdTasks,
      count: createdTasks.length
    });
  } catch (error) {
    console.error('Create recurring task error:', error);
    res.status(500).json({ message: 'Server error while creating recurring task' });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const { title, description, date, status, priority, tags, order, syncToGoogleCalendar } = req.body;
    const taskId = req.params.id;
    
    // Find task and verify ownership
    const task = await Task.findOne({ _id: taskId, userId: req.userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Prevent editing completed tasks (only allow status change back to Pending via toggle)
    if (task.status === 'Completed') {
      // Only allow status change from Completed to Pending
      if (status !== undefined && status === 'Pending') {
        task.status = status;
        await task.save();
        return res.json({
          message: 'Task status updated successfully',
          task
        });
      }
      // Reject any other edits to completed tasks
      return res.status(400).json({ message: 'Cannot edit a completed task. Uncomplete it first to make changes.' });
    }
    
    const wasSyncingToCalendar = task.syncToGoogleCalendar;
    const hadEventId = task.googleCalendarEventId;
    
    // Update fields for non-completed tasks
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (date !== undefined) {
      if (!dayjs(date, 'YYYY-MM-DD', true).isValid()) {
        return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
      }
      task.date = date;
    }
    if (status !== undefined) task.status = status;
    if (priority !== undefined) {
      if (!['Low', 'Medium', 'High'].includes(priority)) {
        return res.status(400).json({ message: 'Invalid priority. Must be Low, Medium, or High' });
      }
      task.priority = priority;
    }
    if (tags !== undefined) {
      task.tags = Array.isArray(tags) ? tags.filter(tag => tag && tag.trim()) : [];
    }
    if (order !== undefined && typeof order === 'number') {
      task.order = order;
    }
    if (syncToGoogleCalendar !== undefined) {
      task.syncToGoogleCalendar = syncToGoogleCalendar;
    }
    
    await task.save();
    
    // Handle Google Calendar sync
    try {
      const user = await User.findById(req.userId);
      const userEmail = user?.email || null;
      
      if (task.syncToGoogleCalendar) {
        if (hadEventId) {
          // Update existing event
          await updateCalendarEvent(task.googleCalendarEventId, task, userEmail);
        } else {
          // Create new event
          const eventId = await createCalendarEvent(task, userEmail);
          if (eventId) {
            task.googleCalendarEventId = eventId;
            await task.save();
          }
        }
      } else if (wasSyncingToCalendar && hadEventId) {
        // User disabled sync, delete the event
        await deleteCalendarEvent(task.googleCalendarEventId, userEmail);
        task.googleCalendarEventId = null;
        await task.save();
      }
    } catch (calendarError) {
      console.error('Error syncing to Google Calendar:', calendarError);
      // Don't fail task update if calendar sync fails
    }
    
    res.json({
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error while updating task' });
  }
});

// Update task order (for drag-and-drop)
router.patch('/reorder', async (req, res) => {
  try {
    const { taskIds } = req.body;
    
    if (!Array.isArray(taskIds)) {
      return res.status(400).json({ message: 'taskIds must be an array' });
    }
    
    // Update order for all tasks
    const updatePromises = taskIds.map((taskId, index) => {
      return Task.updateOne(
        { _id: taskId, userId: req.userId },
        { $set: { order: index } }
      );
    });
    
    await Promise.all(updatePromises);
    
    res.json({ message: 'Task order updated successfully' });
  } catch (error) {
    console.error('Reorder tasks error:', error);
    res.status(500).json({ message: 'Server error while reordering tasks' });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    
    const task = await Task.findOne({ _id: taskId, userId: req.userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Delete from Google Calendar if synced
    if (task.syncToGoogleCalendar && task.googleCalendarEventId) {
      try {
        const user = await User.findById(req.userId);
        await deleteCalendarEvent(task.googleCalendarEventId, user?.email || null);
      } catch (calendarError) {
        console.error('Error deleting from Google Calendar:', calendarError);
        // Continue with task deletion even if calendar deletion fails
      }
    }
    
    // Delete the task
    await Task.findByIdAndDelete(taskId);
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error while deleting task' });
  }
});


// Rollover all users' tasks (for scheduled job)
router.post('/rollover-all', async (req, res) => {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
    
    // Find all pending tasks from today for all users (excluding archived)
    const tasksToRollover = await Task.find({
      date: today,
      status: 'Pending',
      archived: false
    });
    
    if (tasksToRollover.length === 0) {
      return res.json({ 
        message: 'No tasks to rollover for any user', 
        rolledOverCount: 0 
      });
    }
    
    // Update all pending tasks to tomorrow's date (excluding archived)
    const updateResult = await Task.updateMany(
      {
        date: today,
        status: 'Pending',
        archived: false
      },
      {
        $set: { date: tomorrow }
      }
    );
    
    res.json({
      message: `Successfully rolled over ${updateResult.modifiedCount} tasks to tomorrow for all users`,
      rolledOverCount: updateResult.modifiedCount
    });
  } catch (error) {
    console.error('Rollover all tasks error:', error);
    res.status(500).json({ message: 'Server error while rolling over all tasks' });
  }
});

// Archive task
router.post('/:id/archive', async (req, res) => {
  try {
    const taskId = req.params.id;
    
    const task = await Task.findOne({ _id: taskId, userId: req.userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    task.archived = true;
    await task.save();
    
    res.json({
      message: 'Task archived successfully',
      task
    });
  } catch (error) {
    console.error('Archive task error:', error);
    res.status(500).json({ message: 'Server error while archiving task' });
  }
});

// Get archived tasks
router.get('/archived', async (req, res) => {
  try {
    const tasks = await Task.find({
      userId: req.userId,
      archived: true
    }).sort({ date: -1, createdAt: -1 });
    
    res.json({
      tasks,
      count: tasks.length
    });
  } catch (error) {
    console.error('Get archived tasks error:', error);
    res.status(500).json({ message: 'Server error while fetching archived tasks' });
  }
});

// Restore archived task
router.post('/:id/restore', async (req, res) => {
  try {
    const taskId = req.params.id;
    
    const task = await Task.findOne({ _id: taskId, userId: req.userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    if (!task.archived) {
      return res.status(400).json({ message: 'Task is not archived' });
    }
    
    task.archived = false;
    await task.save();
    
    res.json({
      message: 'Task restored successfully',
      task
    });
  } catch (error) {
    console.error('Restore task error:', error);
    res.status(500).json({ message: 'Server error while restoring task' });
  }
});

module.exports = router;
