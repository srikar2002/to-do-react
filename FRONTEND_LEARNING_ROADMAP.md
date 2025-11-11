# Version 1 - MVP Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication Flow](#authentication-flow)
4. [File Structure & Functionality](#file-structure--functionality)
5. [API Endpoints](#api-endpoints)
6. [Database Schema](#database-schema)
7. [Task Management Flow](#task-management-flow)
8. [Auto Rollover Mechanism](#auto-rollover-mechanism)
9. [Frontend Components](#frontend-components)
10. [Backend Structure](#backend-structure)

---

## Overview

Version 1 is a fully functional Minimum Viable Product (MVP) of a To-Do application with the following core features:

- **User Authentication**: Register, Login, and Logout with JWT-based authentication
- **CRUD Operations**: Create, Read, Update, and Delete tasks
- **3-Day Task View**: Tasks organized into Today, Tomorrow, and Day After Tomorrow cards
- **Auto Rollover**: Automatic task rollover via backend cron job
- **Responsive Design**: 3-card layout that adapts to different screen sizes
- **Simple UI**: Minimal and clean interface for fast task management

---

## Architecture

### Technology Stack

**Backend:**
- Node.js with Express.js
- MongoDB with Mongoose ODM
- JWT for authentication
- bcryptjs for password hashing
- node-cron for scheduled tasks
- dayjs for date manipulation

**Frontend:**
- React 18 with React Router
- Material-UI (MUI) for components
- Axios for HTTP requests
- Context API for state management
- @dnd-kit for drag-and-drop functionality
- notistack for notifications

### System Flow

```
User → Frontend (React) → API Requests → Backend (Express) → MongoDB
                                    ↓
                            JWT Authentication
                                    ↓
                            Task CRUD Operations
```

---

## Authentication Flow

### Login Flow (Step-by-Step)

#### 1. **User Accesses Login Page**
   - **File**: `frontend/src/components/auth/Login.js`
   - User navigates to `/login` route
   - Login component renders with email and password fields

#### 2. **User Submits Credentials**
   - User enters email and password
   - Clicks "Sign In" button
   - `handleSubmit` function is triggered

#### 3. **Frontend Authentication Request**
   ```javascript
   // Login.js - handleSubmit
   const result = await login(formData.email, formData.password);
   ```
   - Calls `login()` function from `AuthContext`
   - **File**: `frontend/src/contexts/AuthContext.js`

#### 4. **AuthContext Processes Login**
   ```javascript
   // AuthContext.js - login function
   const response = await axios.post('/api/auth/login', { email, password });
   ```
   - Makes POST request to `/api/auth/login`
   - Axios automatically includes any existing Authorization header

#### 5. **Backend Receives Request**
   - **File**: `backend/routes/auth.js`
   - Express router handles POST `/api/auth/login`
   - Validates email and password are provided

#### 6. **User Lookup & Password Verification**
   ```javascript
   // auth.js - Login route
   const user = await User.findOne({ email });
   const isPasswordValid = await user.comparePassword(password);
   ```
   - **File**: `backend/models/User.js`
   - Finds user by email in MongoDB
   - Uses `comparePassword()` method to verify password with bcrypt

#### 7. **JWT Token Generation**
   ```javascript
   // auth.js
   const token = generateToken(user._id);
   ```
   - **File**: `backend/middleware/auth.js`
   - `generateToken()` creates JWT with user ID
   - Token expires in 7 days (configurable via `JWT_EXPIRE`)

#### 8. **Response Sent to Frontend**
   ```javascript
   res.json({
     message: 'Login successful',
     token,
     user: { id, name, email }
   });
   ```

#### 9. **Frontend Stores Token & User Data**
   ```javascript
   // AuthContext.js
   localStorage.setItem('token', token);
   localStorage.setItem('user', JSON.stringify(userData));
   axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
   setUser({ ...userData, token });
   ```
   - Token stored in localStorage
   - User data stored in localStorage
   - Authorization header set for all future requests
   - User state updated in context

#### 10. **Navigation to Dashboard**
   ```javascript
   // Login.js
   if (result.success) {
     navigate('/dashboard');
   }
   ```
   - User redirected to `/dashboard`
   - **File**: `frontend/src/components/ProtectedRoute.js` checks authentication
   - If authenticated, Dashboard component renders

#### 11. **Protected Route Verification**
   ```javascript
   // ProtectedRoute.js
   return user ? children : <Navigate to="/login" replace />;
   ```
   - Checks if user exists in AuthContext
   - If yes, renders Dashboard
   - If no, redirects to login

#### 12. **Dashboard Loads Tasks**
   - **File**: `frontend/src/contexts/TaskContext.js`
   - `useEffect` triggers `fetchTasks()` when user is authenticated
   - Makes GET request to `/api/tasks` with JWT token in header

#### 13. **Backend Validates Token**
   - **File**: `backend/middleware/auth.js`
   - `verifyToken` middleware extracts token from `Authorization` header
   - Verifies token signature and expiration
   - Attaches `userId` to `req.userId` for route handlers

#### 14. **Tasks Retrieved & Displayed**
   - Backend queries MongoDB for user's tasks
   - Returns tasks grouped by date (Today, Tomorrow, Day After Tomorrow)
   - Frontend displays tasks in 3-card layout

### Register Flow

The registration flow is similar to login, with these differences:

1. **Additional Fields**: Name, Email, Password, Confirm Password
2. **Password Validation**: 
   - Minimum 6 characters
   - Frontend checks password match
3. **User Creation**:
   - **File**: `backend/models/User.js`
   - Password hashed via `pre('save')` hook using bcrypt
   - Email uniqueness checked before creation
4. **Auto-Login**: After successful registration, user is automatically logged in

### Logout Flow

1. User clicks "Logout" button in Dashboard
2. **File**: `frontend/src/contexts/AuthContext.js`
   ```javascript
   logout() {
     localStorage.removeItem('token');
     localStorage.removeItem('user');
     delete axios.defaults.headers.common['Authorization'];
     setUser(null);
   }
   ```
3. User redirected to `/login`
4. All user data cleared from localStorage and context

---

## File Structure & Functionality

### Backend Files

#### `backend/server.js`
**Purpose**: Main entry point for the Express server

**Key Functionality**:
- Initializes Express application
- Configures CORS middleware
- Sets up JSON body parser
- Connects to MongoDB using Mongoose
- Registers route handlers:
  - `/api/auth` → authentication routes
  - `/api/tasks` → task management routes
- Error handling middleware
- Starts HTTP server on port 5000 (or from `PORT` env variable)
- Initializes rollover scheduler on server start

**Dependencies**:
- `express`: Web framework
- `mongoose`: MongoDB ODM
- `cors`: Cross-origin resource sharing
- `dotenv`: Environment variable management
- `rolloverScheduler`: Task rollover automation

#### `backend/routes/auth.js`
**Purpose**: Handles all authentication-related endpoints

**Endpoints**:
1. **POST `/api/auth/register`**
   - Validates input (name, email, password)
   - Checks password length (minimum 6 characters)
   - Verifies email uniqueness
   - Creates new user with hashed password
   - Generates JWT token
   - Returns token and user data

2. **POST `/api/auth/login`**
   - Validates email and password
   - Finds user by email
   - Verifies password using bcrypt
   - Generates JWT token
   - Returns token and user data

**Key Functions**:
- Input validation
- Password verification via User model method
- JWT token generation via `generateToken()` from auth middleware

#### `backend/routes/tasks.js`
**Purpose**: Handles all task-related CRUD operations

**Authentication**: All routes protected by `verifyToken` middleware

**Endpoints**:
1. **GET `/api/tasks`**
   - Fetches tasks for 3-day window (Today, Tomorrow, Day After Tomorrow)
   - Filters by `userId` and date range
   - Excludes archived tasks
   - Groups tasks by date
   - Returns tasks and date information

2. **POST `/api/tasks`**
   - Creates new task
   - Validates title and date
   - Sets default values (status: 'Pending', priority: 'Medium')
   - Calculates order for task positioning
   - Saves to database

3. **PUT `/api/tasks/:id`**
   - Updates existing task
   - Verifies task ownership
   - Prevents editing completed tasks (except status toggle)
   - Validates date format and priority values
   - Updates task fields

4. **DELETE `/api/tasks/:id`**
   - Deletes task
   - Verifies task ownership
   - Removes task from database

5. **PATCH `/api/tasks/reorder`**
   - Updates task order for drag-and-drop
   - Accepts array of task IDs in new order
   - Updates order field for each task

6. **POST `/api/tasks/:id/archive`**
   - Archives a task (sets `archived: true`)
   - Task no longer appears in main view

7. **GET `/api/tasks/archived`**
   - Fetches all archived tasks for user
   - Sorted by date (newest first)

8. **POST `/api/tasks/:id/restore`**
   - Restores archived task (sets `archived: false`)
   - Task reappears in main view

9. **POST `/api/tasks/rollover-all`**
   - Admin endpoint for rollover scheduler
   - Moves all pending tasks from today to tomorrow
   - Excludes archived tasks

**Key Features**:
- Date validation using dayjs
- Task ownership verification
- Order management for drag-and-drop
- Completed task protection (can't edit, only toggle status)

#### `backend/models/User.js`
**Purpose**: Mongoose schema and model for User collection

**Schema Fields**:
- `name`: String, required, max 50 characters
- `email`: String, required, unique, lowercase, email format validation
- `passwordHash`: String, required, min 6 characters
- `createdAt`: Date, auto-generated timestamp

**Pre-Save Hook**:
- Automatically hashes password before saving
- Uses bcrypt with salt rounds of 10
- Only hashes if password was modified

**Methods**:
- `comparePassword(candidatePassword)`: Compares plain password with hashed password using bcrypt

**Indexes**:
- Email field has unique index for fast lookups

#### `backend/models/Task.js`
**Purpose**: Mongoose schema and model for Task collection

**Schema Fields**:
- `userId`: ObjectId reference to User, required
- `title`: String, required, max 50 characters
- `description`: String, optional, max 200 characters
- `date`: String, required, format: YYYY-MM-DD
- `status`: Enum ['Pending', 'Completed'], default: 'Pending'
- `priority`: Enum ['Low', 'Medium', 'High'], default: 'Medium'
- `tags`: Array of strings, default: []
- `order`: Number, default: 0 (for drag-and-drop positioning)
- `rollover`: Boolean, default: false (for future rollover tracking)
- `archived`: Boolean, default: false
- `createdAt`: Date, auto-generated timestamp

**Indexes**:
- Compound index on `userId` and `date` for efficient queries

#### `backend/middleware/auth.js`
**Purpose**: JWT authentication middleware

**Functions**:

1. **`generateToken(userId)`**
   - Creates JWT token with user ID payload
   - Uses `JWT_SECRET` from environment (fallback: 'fallback_secret')
   - Expires in 7 days (configurable via `JWT_EXPIRE`)

2. **`verifyToken(req, res, next)`**
   - Extracts token from `Authorization` header
   - Format: `Bearer <token>`
   - Verifies token signature and expiration
   - Attaches `userId` to `req.userId`
   - Calls `next()` if valid, returns 401 if invalid

**Usage**:
- Applied to all task routes via `router.use(verifyToken)`
- Ensures only authenticated users can access tasks

#### `backend/scheduler/rolloverScheduler.js`
**Purpose**: Automated task rollover system

**Functionality**:
- Uses `node-cron` to schedule daily task rollover
- Runs at midnight UTC (00:00) every day
- Calls `/api/tasks/rollover-all` endpoint
- Moves all pending tasks from today to tomorrow
- Logs rollover results

**Key Functions**:
- `rolloverTasks()`: Executes the rollover operation
- `startRolloverScheduler()`: Initializes the cron job

**Cron Expression**: `'0 0 * * *'` (midnight daily)

### Frontend Files

#### `frontend/src/index.js`
**Purpose**: React application entry point

**Functionality**:
- Renders root React component
- Sets up React Router (BrowserRouter)
- Wraps app with ThemeProvider for dark/light mode
- Mounts App component to DOM

**Provider Hierarchy**:
```
BrowserRouter
  └── ThemeProvider
      └── App (contains AuthProvider and TaskProvider)
```

#### `frontend/src/App.js`
**Purpose**: Main application component with routing

**Functionality**:
- Defines application routes:
  - `/login` → Login component
  - `/register` → Register component
  - `/dashboard` → Dashboard component (protected)
  - `/` → Redirects to `/dashboard`
- Wraps routes with context providers:
  - `SnackbarProvider`: Toast notifications
  - `AuthProvider`: Authentication state
  - `TaskProvider`: Task management state

**Key Features**:
- Route protection via `ProtectedRoute` component
- Notification system setup

#### `frontend/src/contexts/AuthContext.js`
**Purpose**: Global authentication state management

**State**:
- `user`: Current user object (null if not logged in)
- `loading`: Boolean indicating if auth state is being checked

**Functions**:

1. **`login(email, password)`**
   - POST request to `/api/auth/login`
   - Stores token and user in localStorage
   - Sets axios default Authorization header
   - Updates user state
   - Returns `{ success: boolean, message?: string }`

2. **`register(name, email, password)`**
   - POST request to `/api/auth/register`
   - Stores token and user in localStorage
   - Sets axios default Authorization header
   - Updates user state
   - Returns `{ success: boolean, message?: string }`

3. **`logout()`**
   - Removes token and user from localStorage
   - Clears axios Authorization header
   - Sets user state to null

**useEffect Hook**:
- Runs on mount
- Checks localStorage for existing token and user
- Restores authentication state if valid
- Sets axios Authorization header if token exists

**Hook**: `useAuth()` - Provides access to AuthContext

#### `frontend/src/contexts/TaskContext.js`
**Purpose**: Global task management state

**State**:
- `tasks`: Object with `today`, `tomorrow`, `dayAfterTomorrow` arrays
- `dates`: Object with date strings for the 3-day window
- `archivedTasks`: Array of archived tasks
- `loading`: Boolean for loading state

**Functions**:

1. **`fetchTasks()`**
   - GET request to `/api/tasks`
   - Groups tasks by date
   - Updates tasks and dates state

2. **`createTask(taskData)`**
   - POST request to `/api/tasks`
   - Refreshes tasks after creation
   - Returns success/error result

3. **`updateTask(taskId, taskData)`**
   - PUT request to `/api/tasks/:id`
   - Refreshes tasks after update
   - Returns success/error result

4. **`deleteTask(taskId)`**
   - DELETE request to `/api/tasks/:id`
   - Refreshes tasks after deletion
   - Returns success/error result

5. **`toggleTaskStatus(taskId, currentStatus)`**
   - Toggles between 'Pending' and 'Completed'
   - Uses `updateTask` internally

6. **`archiveTask(taskId)`**
   - POST request to `/api/tasks/:id/archive`
   - Refreshes tasks after archiving

7. **`fetchArchivedTasks()`**
   - GET request to `/api/tasks/archived`
   - Updates archivedTasks state

8. **`restoreTask(taskId)`**
   - POST request to `/api/tasks/:id/restore`
   - Refreshes both main and archived tasks

**useEffect Hook**:
- Triggers `fetchTasks()` when user is authenticated
- Clears tasks when user logs out

**Hook**: `useTasks()` - Provides access to TaskContext

#### `frontend/src/contexts/ThemeContext.js`
**Purpose**: Dark/Light theme management

**State**:
- `darkMode`: Boolean indicating current theme

**Functions**:
- `toggleTheme()`: Switches between dark and light mode
- Theme preference stored in localStorage

#### `frontend/src/components/ProtectedRoute.js`
**Purpose**: Route protection component

**Functionality**:
- Checks if user is authenticated via `useAuth()`
- Shows loading spinner while checking auth state
- Renders children (protected component) if authenticated
- Redirects to `/login` if not authenticated

**Usage**:
```jsx
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

#### `frontend/src/components/auth/Login.js`
**Purpose**: User login form component

**State**:
- `formData`: { email, password }
- `loading`: Boolean for submit state

**Functionality**:
- Form validation (required fields)
- Calls `login()` from AuthContext
- Shows success/error notifications
- Navigates to dashboard on success
- Links to register page
- Theme toggle button

**UI Elements**:
- Email input field
- Password input field
- Sign In button
- Link to register page
- Theme toggle icon

#### `frontend/src/components/auth/Register.js`
**Purpose**: User registration form component

**State**:
- `formData`: { name, email, password, confirmPassword }
- `loading`: Boolean for submit state

**Functionality**:
- Form validation:
  - All fields required
  - Password minimum 6 characters
  - Password confirmation match
- Calls `register()` from AuthContext
- Shows success/error notifications
- Navigates to dashboard on success
- Links to login page
- Theme toggle button

**UI Elements**:
- Name input field
- Email input field
- Password input field
- Confirm Password input field
- Sign Up button
- Link to login page
- Theme toggle icon

#### `frontend/src/components/Dashboard.js`
**Purpose**: Main task management interface

**State**:
- `openDialog`: Boolean for task form dialog
- `editingTask`: Task object being edited (null for new task)
- `formData`: Task form data
- `tagInput`: Current tag input value
- `errors`: Form validation errors
- `deleteDialogOpen`: Boolean for delete confirmation
- `taskToDelete`: Task to be deleted
- `currentTab`: Active tab (0: Tasks, 1: Archived)
- `activeTask`: Task being dragged

**Key Features**:

1. **3-Card Layout**:
   - Today, Tomorrow, Day After Tomorrow columns
   - Each column displays tasks for that date
   - Responsive grid layout (3 columns on desktop, stacked on mobile)

2. **Drag-and-Drop**:
   - Uses `@dnd-kit` library
   - Tasks can be dragged within same column (reordering)
   - Tasks can be dragged between columns (date change)
   - Completed and archived tasks cannot be dragged

3. **Task Operations**:
   - Add new task (opens dialog)
   - Edit task (opens dialog with pre-filled data)
   - Delete task (with confirmation dialog)
   - Toggle task status (Pending ↔ Completed)
   - Archive task
   - Restore archived task

4. **Task Form Dialog**:
   - Title (required, max 50 chars)
   - Description (optional, max 200 chars)
   - Date selection (Today/Tomorrow/Day After Tomorrow)
   - Priority selection (Low/Medium/High)
   - Tags (add/remove)
   - Create/Update button

5. **Tabs**:
   - Tasks tab: Main 3-card view
   - Archived tab: List of archived tasks

6. **AppBar**:
   - App title "Taskly"
   - Welcome message with user name
   - Add task button (only on Tasks tab)
   - Theme toggle button
   - Logout button

**Drag-and-Drop Logic**:
- `handleDragStart`: Sets active task being dragged
- `handleDragEnd`: 
  - If same column: Reorders tasks
  - If different column: Updates task date
- `handleDragCancel`: Clears active task

**Form Validation**:
- Title required and max length
- Description max length
- Real-time character count feedback

#### `frontend/src/components/TaskCard.js`
**Purpose**: Individual task display component

**Props**:
- `id`: Task ID (for drag-and-drop)
- `task`: Task object
- `date`: Task date string
- `onEdit`: Edit callback
- `onDelete`: Delete callback
- `onToggleStatus`: Status toggle callback
- `onArchive`: Archive callback
- `onRestore`: Restore callback (for archived tasks)
- `showArchive`: Boolean to show/hide archive button

**Features**:

1. **Drag-and-Drop**:
   - Uses `useSortable` hook from `@dnd-kit/sortable`
   - Disabled for completed and archived tasks
   - Visual feedback during drag

2. **Task Display**:
   - Title (truncated with tooltip)
   - Description (truncated with tooltip)
   - Status chip
   - Priority chip (color-coded)
   - Tags (as chips)
   - Rollover indicator (if applicable)

3. **Action Buttons**:
   - Status toggle (checkbox icon)
   - Edit button
   - Archive/Restore button
   - Delete button

4. **Completed Task View**:
   - Renders as Accordion (collapsible)
   - Strikethrough text
   - Reduced opacity
   - Cannot be dragged
   - Can be expanded to see details

5. **Styling**:
   - Theme-aware (dark/light mode)
   - Hover effects
   - Visual feedback for interactions

---

## API Endpoints

### Authentication Endpoints

#### POST `/api/auth/register`
**Description**: Register a new user

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201)**:
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Error Responses**:
- `400`: Missing fields, password too short, or email already exists
- `500`: Server error

#### POST `/api/auth/login`
**Description**: Authenticate user and get JWT token

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200)**:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Error Responses**:
- `400`: Missing email or password
- `401`: Invalid credentials
- `500`: Server error

### Task Endpoints

All task endpoints require authentication via JWT token in `Authorization` header:
```
Authorization: Bearer <token>
```

#### GET `/api/tasks`
**Description**: Get tasks for 3-day window (Today, Tomorrow, Day After Tomorrow)

**Headers**:
```
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "tasks": {
    "2024-01-15": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "userId": "507f1f77bcf86cd799439012",
        "title": "Complete project",
        "description": "Finish the documentation",
        "date": "2024-01-15",
        "status": "Pending",
        "priority": "High",
        "tags": ["work", "urgent"],
        "order": 0,
        "archived": false,
        "createdAt": "2024-01-14T10:00:00.000Z"
      }
    ],
    "2024-01-16": [],
    "2024-01-17": []
  },
  "dates": {
    "today": "2024-01-15",
    "tomorrow": "2024-01-16",
    "dayAfterTomorrow": "2024-01-17"
  }
}
```

**Error Responses**:
- `401`: Unauthorized (no token or invalid token)
- `500`: Server error

#### POST `/api/tasks`
**Description**: Create a new task

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "title": "New Task",
  "description": "Task description",
  "date": "2024-01-15",
  "status": "Pending",
  "priority": "Medium",
  "tags": ["work"]
}
```

**Required Fields**: `title`, `date`

**Response (201)**:
```json
{
  "message": "Task created successfully",
  "task": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "title": "New Task",
    "description": "Task description",
    "date": "2024-01-15",
    "status": "Pending",
    "priority": "Medium",
    "tags": ["work"],
    "order": 0,
    "archived": false,
    "createdAt": "2024-01-14T10:00:00.000Z"
  }
}
```

**Error Responses**:
- `400`: Missing required fields, invalid date format, or invalid priority
- `401`: Unauthorized
- `500`: Server error

#### PUT `/api/tasks/:id`
**Description**: Update an existing task

**Headers**:
```
Authorization: Bearer <token>
```

**URL Parameters**:
- `id`: Task ID

**Request Body** (all fields optional):
```json
{
  "title": "Updated Task",
  "description": "Updated description",
  "date": "2024-01-16",
  "status": "Completed",
  "priority": "High",
  "tags": ["work", "urgent"],
  "order": 1
}
```

**Response (200)**:
```json
{
  "message": "Task updated successfully",
  "task": { /* updated task object */ }
}
```

**Error Responses**:
- `400`: Invalid date format, invalid priority, or trying to edit completed task
- `401`: Unauthorized
- `404`: Task not found
- `500`: Server error

**Note**: Cannot edit completed tasks (except to toggle status back to Pending)

#### DELETE `/api/tasks/:id`
**Description**: Delete a task

**Headers**:
```
Authorization: Bearer <token>
```

**URL Parameters**:
- `id`: Task ID

**Response (200)**:
```json
{
  "message": "Task deleted successfully"
}
```

**Error Responses**:
- `401`: Unauthorized
- `404`: Task not found
- `500`: Server error

#### PATCH `/api/tasks/reorder`
**Description**: Update task order (for drag-and-drop)

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "taskIds": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ]
}
```

**Response (200)**:
```json
{
  "message": "Task order updated successfully"
}
```

#### POST `/api/tasks/:id/archive`
**Description**: Archive a task

**Headers**:
```
Authorization: Bearer <token>
```

**URL Parameters**:
- `id`: Task ID

**Response (200)**:
```json
{
  "message": "Task archived successfully",
  "task": { /* task object with archived: true */ }
}
```

#### GET `/api/tasks/archived`
**Description**: Get all archived tasks for the user

**Headers**:
```
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "tasks": [ /* array of archived tasks */ ],
  "count": 5
}
```

#### POST `/api/tasks/:id/restore`
**Description**: Restore an archived task

**Headers**:
```
Authorization: Bearer <token>
```

**URL Parameters**:
- `id`: Task ID

**Response (200)**:
```json
{
  "message": "Task restored successfully",
  "task": { /* task object with archived: false */ }
}
```

#### POST `/api/tasks/rollover-all`
**Description**: Rollover all users' pending tasks from today to tomorrow (used by scheduler)

**Headers**:
```
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "message": "Successfully rolled over 5 tasks to tomorrow for all users",
  "rolledOverCount": 5
}
```

---

## Database Schema

### User Collection

**Collection Name**: `users`

**Schema**:
```javascript
{
  name: String (required, max 50 chars, trimmed),
  email: String (required, unique, lowercase, email format),
  passwordHash: String (required, min 6 chars, hashed with bcrypt),
  createdAt: Date (auto-generated)
}
```

**Indexes**:
- `email`: Unique index

**Example Document**:
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "name": "John Doe",
  "email": "john@example.com",
  "passwordHash": "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
  "createdAt": ISODate("2024-01-14T10:00:00.000Z")
}
```

### Task Collection

**Collection Name**: `tasks`

**Schema**:
```javascript
{
  userId: ObjectId (required, references User),
  title: String (required, max 50 chars, trimmed),
  description: String (optional, max 200 chars, trimmed),
  date: String (required, format: YYYY-MM-DD),
  status: String (enum: ['Pending', 'Completed'], default: 'Pending'),
  priority: String (enum: ['Low', 'Medium', 'High'], default: 'Medium'),
  tags: [String] (default: []),
  order: Number (default: 0),
  rollover: Boolean (default: false),
  archived: Boolean (default: false),
  createdAt: Date (auto-generated)
}
```

**Indexes**:
- Compound index on `userId` and `date` for efficient queries

**Example Document**:
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "userId": ObjectId("507f1f77bcf86cd799439011"),
  "title": "Complete project",
  "description": "Finish the documentation",
  "date": "2024-01-15",
  "status": "Pending",
  "priority": "High",
  "tags": ["work", "urgent"],
  "order": 0,
  "rollover": false,
  "archived": false,
  "createdAt": ISODate("2024-01-14T10:00:00.000Z")
}
```

---

## Task Management Flow

### Creating a Task

1. **User clicks "Add" button** in Dashboard
2. **Dialog opens** with empty form
3. **User fills form**:
   - Title (required)
   - Description (optional)
   - Date (Today/Tomorrow/Day After Tomorrow)
   - Priority (Low/Medium/High)
   - Tags (optional)
4. **Form validation**:
   - Title required and max 50 characters
   - Description max 200 characters
5. **User submits form**
6. **Frontend**:
   - `handleSubmit` in Dashboard.js
   - Converts date selection to actual date string
   - Calls `createTask()` from TaskContext
7. **TaskContext**:
   - POST request to `/api/tasks`
   - Includes JWT token in header
8. **Backend**:
   - Validates token
   - Validates task data
   - Calculates order (highest order + 1)
   - Creates task in database
   - Returns created task
9. **Frontend**:
   - Refreshes tasks list
   - Closes dialog
   - Shows success notification

### Editing a Task

1. **User clicks "Edit" button** on task card
2. **Validation**:
   - Cannot edit completed tasks (shows warning)
   - Cannot edit archived tasks (shows warning)
3. **Dialog opens** with pre-filled form data
4. **User modifies fields**
5. **User submits form**
6. **Frontend**:
   - Calls `updateTask()` from TaskContext
   - Sends PUT request to `/api/tasks/:id`
7. **Backend**:
   - Verifies task ownership
   - Validates updates
   - Updates task in database
8. **Frontend**:
   - Refreshes tasks list
   - Closes dialog
   - Shows success notification

### Deleting a Task

1. **User clicks "Delete" button** on task card
2. **Confirmation dialog opens**
3. **User confirms deletion**
4. **Frontend**:
   - Calls `deleteTask()` from TaskContext
   - Sends DELETE request to `/api/tasks/:id`
5. **Backend**:
   - Verifies task ownership
   - Deletes task from database
6. **Frontend**:
   - Refreshes tasks list
   - Shows success notification

### Toggling Task Status

1. **User clicks status checkbox** on task card
2. **Frontend**:
   - Calls `toggleTaskStatus()` from TaskContext
   - Determines new status (Pending ↔ Completed)
   - Calls `updateTask()` with new status
3. **Backend**:
   - Updates task status
4. **Frontend**:
   - Refreshes tasks list
   - Task card updates (completed tasks show as accordion)

### Drag-and-Drop

#### Within Same Column (Reordering)

1. **User drags task** within same date column
2. **Frontend**:
   - `handleDragEnd` detects same column
   - Calculates new order based on drop position
   - Updates order for all affected tasks
   - Sends PATCH request to `/api/tasks/reorder` with new order
3. **Backend**:
   - Updates order field for all tasks
4. **Frontend**:
   - Tasks reordered visually

#### Between Columns (Date Change)

1. **User drags task** to different date column
2. **Frontend**:
   - `handleDragEnd` detects different column
   - Calls `updateTask()` with new date
3. **Backend**:
   - Updates task date
4. **Frontend**:
   - Refreshes tasks list
   - Task appears in new column
