const express = require('express');
const Task = require('../models/Task');
const { verifyToken } = require('../middleware/auth');
const dayjs = require('dayjs');

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
    
    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error while creating task' });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const { title, description, date, status, priority, tags, order } = req.body;
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
    
    const task = await Task.findOneAndDelete({ _id: taskId, userId: req.userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
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
