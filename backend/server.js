const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { startRolloverScheduler } = require('./scheduler/rolloverScheduler');

// Load environment variables
// Try to load from root directory first, then backend directory
dotenv.config({ path: '.env' });
dotenv.config({ path: './backend/.env' });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/todoapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Check Google Calendar credentials on startup
  if (process.env.GOOGLE_CALENDAR_CREDENTIALS) {
    const { checkCredentials } = require('./services/googleCalendar');
    checkCredentials();
  }
  
  // Start the rollover scheduler
  startRolloverScheduler();
});
