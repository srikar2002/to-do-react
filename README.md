# To-Do App

A full-stack To-Do application built with React.js frontend and Node.js/Express.js backend.

## Features

- User authentication with JWT
- CRUD operations for tasks
- Tasks organized by Today, Tomorrow, and Day After Tomorrow
- Auto rollover for date changes
- Responsive Material UI design
- MongoDB database integration

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
