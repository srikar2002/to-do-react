const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;

// Initialize Socket.io server
const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      const user = await User.findById(decoded.userId).select('_id name email');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = decoded.userId;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.userId})`);
    socket.join(`user:${socket.userId}`);
    
    socket.on('disconnect', (reason) => {
      // Only log unexpected disconnects (not normal page refreshes)
      // 'transport close' and 'client disconnect' are normal on page refresh
      if (reason === 'io server disconnect' || reason === 'ping timeout') {
        console.log(`User disconnected: ${socket.user.name} (${socket.userId}) - Reason: ${reason}`);
      } else {
        // Page refresh or normal client disconnect - less verbose
        console.log(`User disconnected: ${socket.user.name} (${socket.userId})`);
      }
    });
    
    socket.on('error', (error) => console.error('Socket error:', error));
  });

  return io;
};

// Helper to get all affected user IDs from a task
const getAffectedUserIds = (task, additionalIds = []) => {
  const userIds = new Set([task.userId?.toString()].filter(Boolean));
  if (task.sharedWith?.length) {
    task.sharedWith.forEach(id => userIds.add(id.toString()));
  }
  additionalIds.forEach(id => userIds.add(id.toString()));
  return Array.from(userIds);
};

// Emit task updates to relevant users
const emitTaskUpdate = (event, task, affectedUserIds = []) => {
  if (!io) return;
  getAffectedUserIds(task, affectedUserIds).forEach(userId => {
    io.to(`user:${userId}`).emit(event, task);
  });
};

// Emit task deletion to relevant users
const emitTaskDelete = (taskId, affectedUserIds = []) => {
  if (!io) return;
  affectedUserIds.forEach(userId => {
    io.to(`user:${userId}`).emit('task:deleted', { taskId });
  });
};

// Emit task list refresh to users
const emitTaskRefresh = (userIds = []) => {
  if (!io) return;
  userIds.forEach(userId => io.to(`user:${userId}`).emit('tasks:refresh'));
};

module.exports = {
  initializeSocket,
  emitTaskUpdate,
  emitTaskDelete,
  emitTaskRefresh,
  getIO: () => io
};

