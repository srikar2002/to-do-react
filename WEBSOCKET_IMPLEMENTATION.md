# WebSocket Real-time Sync Implementation

This document describes the WebSocket/Socket.io implementation for real-time task synchronization.

## Overview

The application now uses Socket.io to provide real-time updates when tasks are created, updated, deleted, shared, archived, or restored. This ensures that all connected clients see changes immediately without needing to refresh.

## Backend Implementation

### Files Created/Modified

1. **`backend/websocket/socketServer.js`** - Socket.io server setup
   - Handles authentication using JWT tokens
   - Manages user-specific rooms for targeted updates
   - Provides helper functions to emit events to relevant users

2. **`backend/server.js`** - Modified to integrate Socket.io
   - Changed from `app.listen()` to `http.createServer()` and `server.listen()`
   - Initializes Socket.io server

3. **`backend/routes/tasks.js`** - Added WebSocket event emissions
   - Emits events on task creation, update, deletion, sharing, archiving, and restoration
   - Events are sent to task owners and shared users

### WebSocket Events Emitted

- `task:created` - When a new task is created
- `task:updated` - When a task is updated
- `task:deleted` - When a task is deleted
- `task:archived` - When a task is archived
- `task:restored` - When a task is restored
- `task:shared` - When a task is shared with users
- `task:unshared` - When sharing is removed
- `tasks:refresh` - When task order changes (for drag-and-drop)

## Frontend Implementation

### Files Created/Modified

1. **`frontend/src/hooks/useSocket.js`** - Socket.io client hook
   - Manages Socket.io connection lifecycle
   - Handles authentication and reconnection
   - Automatically connects/disconnects based on user authentication state

2. **`frontend/src/contexts/TaskContext.js`** - Integrated WebSocket listeners
   - Listens to all task-related WebSocket events
   - Updates local state in real-time
   - Handles task updates, deletions, and state changes

### WebSocket Event Handlers

The frontend listens to all backend events and updates the UI accordingly:
- Task creation triggers a refresh to get the updated list
- Task updates refresh the task list to ensure correct date placement
- Task deletions remove tasks from the UI immediately
- Task archiving/restoration updates both main and archived task lists
- Task sharing updates reflect immediately for all affected users

## Installation

Install the required dependencies:

```bash
# Backend
npm install socket.io

# Frontend
cd frontend
npm install socket.io-client
```

## Configuration

### Environment Variables

**Backend** (`.env`):
```env
FRONTEND_URL=http://localhost:3000  # Optional, defaults to localhost:3000
```

**Frontend** (`.env`):
```env
REACT_APP_SOCKET_URL=http://localhost:5000  # Optional, defaults to localhost:5000
```

## How It Works

1. **Authentication**: When a user logs in, the Socket.io client connects with their JWT token
2. **Room Management**: Each user joins a room named `user:{userId}` for targeted updates
3. **Event Broadcasting**: When a task operation occurs:
   - The backend emits events to the task owner
   - If the task is shared, events are also sent to shared users
4. **Real-time Updates**: The frontend receives events and updates the UI immediately

## Features

- ✅ Real-time task creation
- ✅ Real-time task updates (including status changes)
- ✅ Real-time task deletion
- ✅ Real-time task archiving/restoration
- ✅ Real-time task sharing/unsharing
- ✅ Automatic reconnection on connection loss
- ✅ User-specific updates (only relevant users receive updates)
- ✅ Secure authentication via JWT tokens

## Testing

To test the real-time sync:

1. Open the application in two different browser windows/tabs
2. Log in with the same or different users
3. Create, update, or delete a task in one window
4. Observe the changes appear immediately in the other window(s)

## Notes

- The Socket.io connection automatically reconnects if the connection is lost
- Users only receive updates for tasks they own or have access to
- The implementation handles edge cases like date changes and task movements
- WebSocket events complement the REST API - the API still works normally for non-real-time operations

