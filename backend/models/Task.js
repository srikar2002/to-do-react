const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [50, 'Title cannot be more than 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot be more than 200 characters']
  },
  date: {
    type: String,
    required: [true, 'Date is required'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format']
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed'],
    default: 'Pending'
  },
  rollover: {
    type: Boolean,
    default: false
  },
  archived: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  tags: {
    type: [String],
    default: []
  },
  order: {
    type: Number,
    default: 0
  },
  // Recurring task fields
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    type: String,
    enum: ['daily', 'weekly', 'custom'],
    required: false
  },
  recurrenceInterval: {
    type: Number,
    default: 1 // For custom: number of days between occurrences
  },
  recurrenceEndDate: {
    type: String, // YYYY-MM-DD format
    default: null
  },
  parentTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null // Reference to the original recurring task template
  },
  // Google Calendar integration
  syncToGoogleCalendar: {
    type: Boolean,
    default: false
  },
  googleCalendarEventId: {
    type: String,
    default: null // Store the Google Calendar event ID for updates/deletions
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
taskSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('Task', taskSchema);
