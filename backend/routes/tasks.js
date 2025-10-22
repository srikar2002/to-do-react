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
      date: { $in: [today, tomorrow, dayAfterTomorrow] }
    }).sort({ date: 1, createdAt: 1 });
    
    // Group tasks by date
    const groupedTasks = {
      [today]: tasks.filter(task => task.date === today),
      [tomorrow]: tasks.filter(task => task.date === tomorrow),
      [dayAfterTomorrow]: tasks.filter(task => task.date === dayAfterTomorrow)
    };
    
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
    const { title, description, date, status } = req.body;
    
    // Validation
    if (!title || !date) {
      return res.status(400).json({ message: 'Title and date are required' });
    }
    
    // Validate date format
    if (!dayjs(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    const task = new Task({
      userId: req.userId,
      title,
      description: description || '',
      date,
      status: status || 'Pending'
    });
    
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
    const { title, description, date, status } = req.body;
    const taskId = req.params.id;
    
    // Find task and verify ownership
    const task = await Task.findOne({ _id: taskId, userId: req.userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Update fields
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (date !== undefined) {
      if (!dayjs(date, 'YYYY-MM-DD', true).isValid()) {
        return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
      }
      task.date = date;
    }
    if (status !== undefined) task.status = status;
    
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

module.exports = router;
