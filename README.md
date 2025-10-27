# To-Do App

A full-stack To-Do application built with React.js frontend and Node.js/Express.js backend.

## Features

- User authentication with JWT
- CRUD operations for tasks
- Tasks organized by Today, Tomorrow, and Day After Tomorrow
- **Automatic task rollover** - Pending tasks can be set to automatically rollover to the next day
- Manual rollover button for immediate task rollover
- Responsive Material UI design
- MongoDB database integration
- Scheduled rollover at midnight (UTC)

## Tech Stack

- **Frontend**: React.js, React Router, Material UI, day.js
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Token)

## Getting Started

1. Install dependencies:
   ```bash
   npm run install-all
   ```

2. Set up environment variables:
   - Create `.env` file in the root directory
   - Add your MongoDB connection string and JWT secret

3. Run the application:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000` (frontend) and `http://localhost:5000` (backend).

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/tasks` - Fetch tasks for 3-day window
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Edit task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/rollover` - Rollover current user's pending tasks
- `POST /api/tasks/rollover-all` - Rollover all users' pending tasks (for scheduler)

## Task Rollover Feature

The app now includes automatic task rollover functionality:

1. **Enable Rollover**: When creating or editing a task, you can toggle "Auto-rollover to next day if pending"
2. **Manual Rollover**: Use the "Rollover Tasks" button in the header to immediately rollover today's pending tasks
3. **Automatic Rollover**: The system automatically runs rollover at midnight UTC every day
4. **Visual Indicator**: Tasks with rollover enabled show an "Auto-rollover" chip

Only tasks that are:
- Set to today's date
- Have status "Pending" 
- Have rollover enabled

Will be moved to tomorrow's date during rollover.
