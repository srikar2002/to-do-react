const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const dayjs = require('dayjs');
const { sendTaskCreationEmail } = require('../utils/emailService');
const { emitTaskUpdate, emitTaskDelete, emitTaskRefresh } = require('../websocket/socketServer');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Helper function to populate task with user data
const populateTask = async (task) => {
  await task.populate('userId', 'name email');
  await task.populate('sharedWith', 'name email');
  return task;
};

// Helper function to check task access (owner or shared)
const getTaskAccessQuery = (userId) => ({
  $or: [
    { userId },
    { sharedWith: userId }
  ]
});

// Get tasks for 3-day window (Today, Tomorrow, Day After Tomorrow)
router.get('/', async (req, res) => {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
    const dayAfterTomorrow = dayjs().add(2, 'day').format('YYYY-MM-DD');
    
    // Get tasks owned by user OR shared with user
    const tasks = await Task.find({
      ...getTaskAccessQuery(req.userId),
      date: { $in: [today, tomorrow, dayAfterTomorrow] },
      archived: false
    }).populate('userId', 'name email').populate('sharedWith', 'name email').sort({ date: 1, order: 1, createdAt: 1 });
    
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
    const { title, description, date, status, priority, tags } = req.body;
    
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
      tags: Array.isArray(tags) ? tags.filter(tag => tag && tag.trim()) : []
    });
    
    task.order = nextOrder;
    await task.save();
    await populateTask(task);
    
    // Emit WebSocket event for real-time sync
    emitTaskUpdate('task:created', task, [req.userId]);
    
    // Send email notification if enabled (don't block response if email fails)
    try {
      const user = await User.findById(req.userId);
      if (user && user.emailNotificationsEnabled) {
        // Send email asynchronously - don't wait for it
        sendTaskCreationEmail(
          user.email,
          user.name,
          task.title,
          task.date,
          task.description
        ).catch(err => {
          console.error('Failed to send task creation email:', err);
        });
      }
    } catch (emailError) {
      // Log error but don't fail the task creation
      console.error('Error checking notification preferences:', emailError);
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
    const { title, description, startDate, status, priority, tags, recurrencePattern, recurrenceInterval, recurrenceEndDate } = req.body;
    
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
      archived: true // Archive parent task so it doesn't appear in main view
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
        order: nextOrder
      });
      
      await task.save();
      await populateTask(task);
      createdTasks.push(task);
      taskCount++;
      
      // Emit WebSocket event for each created recurring task
      emitTaskUpdate('task:created', task, [req.userId]);
      
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
    const { title, description, date, status, priority, tags, order } = req.body;
    const taskId = req.params.id;
    
    // Find task and verify ownership or shared access
    const task = await Task.findOne({
      _id: taskId,
      ...getTaskAccessQuery(req.userId)
    });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Prevent editing completed tasks (only allow status change back to Pending via toggle)
    if (task.status === 'Completed') {
      // Only allow status change from Completed to Pending
      if (status !== undefined && status === 'Pending') {
        task.status = status;
        await task.save();
        await populateTask(task);
        
        // Emit WebSocket event for real-time sync
        emitTaskUpdate('task:updated', task, [req.userId]);
        
        return res.json({
          message: 'Task status updated successfully',
          task
        });
      }
      // Reject any other edits to completed tasks
      return res.status(400).json({ message: 'Cannot edit a completed task. Uncomplete it first to make changes.' });
    }
    
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
    
    await task.save();
    await populateTask(task);
    
    // Emit WebSocket event for real-time sync
    emitTaskUpdate('task:updated', task, [req.userId]);
    
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
    
    // Update order for all tasks (owned by user or shared with user)
    const updatePromises = taskIds.map((taskId, index) => {
      return Task.updateOne(
        { _id: taskId, ...getTaskAccessQuery(req.userId) },
        { $set: { order: index } }
      );
    });
    
    await Promise.all(updatePromises);
    
    // Emit refresh event to user for real-time sync
    emitTaskRefresh([req.userId]);
    
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
    
    // Only owner can delete tasks
    const task = await Task.findOne({ _id: taskId, userId: req.userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found or you do not have permission to delete it' });
    }
    
    // Get shared users before deletion for WebSocket notification
    const sharedUserIds = task.sharedWith ? task.sharedWith.map(id => id.toString()) : [];
    const affectedUserIds = [req.userId.toString(), ...sharedUserIds];
    
    // Delete the task
    await Task.findByIdAndDelete(taskId);
    
    // Emit WebSocket event for real-time sync
    emitTaskDelete(taskId, affectedUserIds);
    
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
    
    // Only owner can archive tasks
    const task = await Task.findOne({ _id: taskId, userId: req.userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found or you do not have permission to archive it' });
    }
    
    task.archived = true;
    await task.save();
    await populateTask(task);
    
    // Emit WebSocket event for real-time sync
    emitTaskUpdate('task:archived', task, [req.userId]);
    
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
      ...getTaskAccessQuery(req.userId),
      archived: true
    }).populate('userId', 'name email').populate('sharedWith', 'name email').sort({ date: -1, createdAt: -1 });
    
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
    
    // Only owner can restore tasks
    const task = await Task.findOne({ _id: taskId, userId: req.userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found or you do not have permission to restore it' });
    }
    
    if (!task.archived) {
      return res.status(400).json({ message: 'Task is not archived' });
    }
    
    task.archived = false;
    await task.save();
    await populateTask(task);
    
    // Emit WebSocket event for real-time sync
    emitTaskUpdate('task:restored', task, [req.userId]);
    
    res.json({
      message: 'Task restored successfully',
      task
    });
  } catch (error) {
    console.error('Restore task error:', error);
    res.status(500).json({ message: 'Server error while restoring task' });
  }
});

// Get list of users for sharing (excluding current user)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } })
      .select('_id name email')
      .sort({ name: 1 });
    
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

// Share task with users
router.post('/:id/share', async (req, res) => {
  try {
    const taskId = req.params.id;
    const { userIds } = req.body;
    
    // Validation
    if (!Array.isArray(userIds)) {
      return res.status(400).json({ message: 'userIds must be an array' });
    }
    
    // Find task and verify ownership (only owner can share)
    const task = await Task.findOne({ _id: taskId, userId: req.userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found or you do not have permission to share it' });
    }
    
    // Validate that all userIds exist
    const validUsers = await User.find({ _id: { $in: userIds } });
    if (validUsers.length !== userIds.length) {
      return res.status(400).json({ message: 'One or more user IDs are invalid' });
    }
    
    // Don't allow sharing with task owner
    const filteredUserIds = userIds.filter(id => id.toString() !== req.userId.toString());
    
    // Update sharedWith array (add new users, avoid duplicates)
    const currentSharedWith = task.sharedWith.map(id => id.toString());
    const newUserIds = filteredUserIds.filter(id => !currentSharedWith.includes(id.toString()));
    
    if (newUserIds.length > 0) {
      // Mongoose will automatically convert string IDs to ObjectIds
      task.sharedWith = [...task.sharedWith, ...newUserIds];
      await task.save();
    }
    
    await populateTask(task);
    
    // Emit WebSocket event to owner and newly shared users
    const affectedUserIds = [req.userId.toString(), ...newUserIds.map(id => id.toString())];
    emitTaskUpdate('task:shared', task, affectedUserIds);
    
    res.json({
      message: 'Task shared successfully',
      task
    });
  } catch (error) {
    console.error('Share task error:', error);
    res.status(500).json({ message: 'Server error while sharing task' });
  }
});

// Remove user from shared task
router.delete('/:id/share/:userId', async (req, res) => {
  try {
    const taskId = req.params.id;
    const userIdToRemove = req.params.userId;
    
    // Find task and verify ownership (only owner can remove sharing)
    const task = await Task.findOne({ _id: taskId, userId: req.userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found or you do not have permission to modify sharing' });
    }
    
    // Remove user from sharedWith array
    task.sharedWith = task.sharedWith.filter(id => id.toString() !== userIdToRemove);
    await task.save();
    
    await populateTask(task);
    
    // Emit WebSocket event to owner and removed user
    emitTaskUpdate('task:unshared', task, [req.userId.toString(), userIdToRemove]);
    
    res.json({
      message: 'User removed from shared task',
      task
    });
  } catch (error) {
    console.error('Remove share error:', error);
    res.status(500).json({ message: 'Server error while removing share' });
  }
});

module.exports = router;
