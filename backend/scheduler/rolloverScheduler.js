const cron = require('node-cron');
const axios = require('axios');
const dayjs = require('dayjs');

// This function will be called at midnight to rollover tasks
const rolloverTasks = async () => {
  try {
    console.log('Starting automatic task rollover at', new Date().toISOString());
    
    // Call the rollover endpoint for all users
    const response = await axios.post('http://localhost:5000/api/tasks/rollover-all');
    
    if (response.data.rolledOverCount > 0) {
      console.log(`Successfully rolled over ${response.data.rolledOverCount} tasks`);
    } else {
      console.log('No tasks needed rollover');
    }
    
    console.log('Task rollover completed');
  } catch (error) {
    console.error('Error during automatic task rollover:', error);
  }
};

// Schedule the rollover to run every day at midnight
const startRolloverScheduler = () => {
  // Run at 00:00 every day
  cron.schedule('0 0 * * *', rolloverTasks, {
    scheduled: true,
    timezone: "UTC"
  });
  
  console.log('Rollover scheduler started - will run daily at midnight UTC');
};

module.exports = {
  startRolloverScheduler,
  rolloverTasks
};
