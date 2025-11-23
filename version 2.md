# Version 2 Feature Documentation

## Overview

This document provides a comprehensive analysis of the advanced features implemented in Version 2 of the Task Management Application. These features enhance user experience, improve task organization, and provide better visual management capabilities.

---

## Table of Contents

1. [Task Priorities (Low, Medium, High)](#1-task-priorities-low-medium-high)
2. [Custom Tags](#2-custom-tags)
3. [Drag-and-Drop Task Ordering](#3-drag-and-drop-task-ordering)
4. [Dark/Light Mode Toggle](#4-darklight-mode-toggle)
5. [Collapse Completed Tasks](#5-collapse-completed-tasks)
6. [Soft Delete (Archive)](#6-soft-delete-archive)

---

## 1. Task Priorities (Low, Medium, High)

### Overview
Tasks can be assigned priority levels (Low, Medium, High) to help users focus on important tasks first. Priority is displayed visually with color-coded chips and is used in analytics.

### Implementation Details

#### Frontend

**Location:** `frontend/src/constants/enums.js`
```javascript
export const TaskPriority = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High'
};
```

**Location:** `frontend/src/components/Dashboard.js`
- Priority selection in task creation/editing dialog (lines 1045-1057)
- Priority is included in form data state (line 97)
- Priority is passed to API when creating/updating tasks (lines 261, 300)

**Location:** `frontend/src/components/TaskCard.js`
- Priority display with color-coded chips (lines 272-284)
- Color mapping:
  - High Priority → `error` (red)
  - Medium Priority → `warning` (orange/yellow)
  - Low Priority → `default` (gray)

**Location:** `frontend/src/components/AnalyticsDashboard.js`
- Priority-based analytics (lines 19-23)
- Groups tasks by priority for visualization

#### Backend

**Location:** `backend/models/Task.js`
```javascript
priority: {
  type: String,
  enum: ['Low', 'Medium', 'High'],
  default: 'Medium'
}
```

**Location:** `backend/routes/tasks.js`
- Priority validation on create (lines 67-69)
- Priority validation on update (lines 249-254)
- Default priority set to 'Medium' if not provided (line 84)

### Data Flow

1. **Task Creation:**
   ```
   User selects priority → FormData state → API POST /api/tasks → Task Model → Database
   ```

2. **Task Display:**
   ```
   Database → API GET /api/tasks → TaskContext → TaskCard Component → Color-coded Chip
   ```

3. **Task Update:**
   ```
   User edits priority → FormData update → API PUT /api/tasks/:id → Task Model → Database
   ```

### Code Example

**Creating a task with priority:**
```javascript
const taskData = {
  title: 'Important Meeting',
  description: 'Team sync',
  date: '2024-01-15',
  priority: TaskPriority.HIGH,  // High priority
  tags: ['work', 'meeting']
};
await createTask(taskData);
```

**Displaying priority in TaskCard:**
```javascript
{task.priority && (
  <Chip 
    label={task.priority} 
    size="small" 
    color={
      task.priority === TaskPriority.HIGH ? 'error' : 
      task.priority === TaskPriority.MEDIUM ? 'warning' : 
      'default'
    }
    variant="outlined"
  />
)}
```

---

## 2. Custom Tags

### Overview
Users can add custom tags to tasks for better categorization and filtering. Tags are stored as an array of strings and displayed as chips on task cards.

### Implementation Details

#### Frontend

**Location:** `frontend/src/components/Dashboard.js`
- Tag input field with Enter key support (lines 1058-1094)
- Tag management:
  - Add tag on Enter key or button click (lines 1065-1090)
  - Remove tag by clicking delete icon (lines 1102-1104)
  - Tags stored in formData.tags array (line 98)
- Tags displayed as chips in dialog (lines 1095-1111)
- Tags passed to API on create/update (lines 262, 301)

**Location:** `frontend/src/components/TaskCard.js`
- Tags displayed as chips (lines 304-313)
- Each tag shown as a small primary-colored chip

#### Backend

**Location:** `backend/models/Task.js`
```javascript
tags: {
  type: [String],
  default: []
}
```

**Location:** `backend/routes/tasks.js`
- Tags validation and sanitization (lines 85, 256)
- Empty tags filtered out
- Tags trimmed before saving

### Data Flow

1. **Adding Tags:**
   ```
   User types tag → Press Enter/Click Add → Added to formData.tags array → 
   Displayed as Chip → Saved to database on submit
   ```

2. **Removing Tags:**
   ```
   User clicks delete icon → Tag removed from formData.tags array → 
   Chip disappears → Updated on submit
   ```

3. **Displaying Tags:**
   ```
   Database → API → TaskContext → TaskCard → Rendered as Chips
   ```

### Code Example

**Adding a tag:**
```javascript
onKeyPress={(e) => {
  if (e.key === 'Enter' && tagInput.trim()) {
    e.preventDefault();
    const trimmedTag = tagInput.trim();
    if (!formData.tags.includes(trimmedTag)) {
      setFormData({ ...formData, tags: [...formData.tags, trimmedTag] });
    }
    setTagInput('');
  }
}}
```

**Displaying tags:**
```javascript
{task.tags && task.tags.length > 0 && task.tags.map((tag, index) => (
  <Chip
    key={index}
    label={tag}
    size="small"
    color="primary"
    variant="outlined"
  />
))}
```

---

## 3. Drag-and-Drop Task Ordering

### Overview
Tasks can be reordered within the same date column or moved between different date columns using drag-and-drop functionality. This is implemented using the `@dnd-kit` library.

### Implementation Details

#### Frontend Dependencies

**Location:** `frontend/package.json`
```json
"@dnd-kit/core": "^6.3.1",
"@dnd-kit/sortable": "^10.0.0",
"@dnd-kit/utilities": "^3.2.2"
```

#### Frontend Implementation

**Location:** `frontend/src/components/Dashboard.js`

**DnD Context Setup (lines 121-131):**
```javascript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,  // Prevents accidental drags
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);
```

**DnD Context Wrapper (lines 659-664):**
```javascript
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
  onDragCancel={handleDragCancel}
>
```

**Drag Start Handler (lines 371-378):**
- Captures the task being dragged
- Sets active task for drag overlay

**Drag End Handler (lines 380-468):**
- Handles two scenarios:
  1. **Same Column Reordering:** Updates order field for all tasks in the list
  2. **Cross-Column Move:** Updates task date and order

**Droppable Columns (lines 475-497):**
- Each date column is a droppable area
- Visual feedback when dragging over

**Sortable Task Cards (lines 677-707):**
- Each column wrapped in `SortableContext`
- Uses `verticalListSortingStrategy`
- TaskCard components are sortable items

**Location:** `frontend/src/components/TaskCard.js`

**Sortable Hook (lines 34-49):**
```javascript
const {
  attributes,
  listeners,
  setNodeRef,
  transform,
  transition,
  isDragging
} = useSortable({
  id: id || task._id,
  disabled: isCompleted || isArchived,  // Disable drag for completed/archived
  data: {
    type: 'task',
    task,
    date
  }
});
```

**Visual Feedback:**
- Opacity changes during drag (line 54)
- Cursor changes to grab/grabbing
- Drag overlay shows task preview (lines 860-882)

#### Backend

**Location:** `backend/models/Task.js`
```javascript
order: {
  type: Number,
  default: 0
}
```

**Location:** `backend/routes/tasks.js`
- Order field updated on task update (lines 258-260)
- Tasks sorted by order when fetching (line 22)
- Order calculated when creating new tasks (lines 72-76, 166-171)

### Data Flow

1. **Same Column Reordering:**
   ```
   User drags task → handleDragEnd detects same date → 
   Calculate new positions → Update all tasks' order fields → 
   API calls to update order → Database updated
   ```

2. **Cross-Column Move:**
   ```
   User drags task to different column → handleDragEnd detects date change → 
   Update task date and order → API PUT /api/tasks/:id → Database updated
   ```

3. **Task Fetching:**
   ```
   Database → Sort by date, order, createdAt → API → Frontend → 
   Displayed in correct order
   ```

### Code Example

**Handling drag end:**
```javascript
const handleDragEnd = async (event) => {
  const { active, over } = event;
  
  if (!over) return;
  
  const taskId = active.id;
  const sourceDate = active.data.current?.date;
  const targetDate = over.data.current?.date;
  
  // Same column reordering
  if (sourceDate === targetDate) {
    const taskList = tasks[dateKey];
    const oldIndex = taskList.findIndex(t => t._id === taskId);
    const newIndex = taskList.findIndex(t => t._id === over.id);
    
    const newTaskList = arrayMove(taskList, oldIndex, newIndex);
    const updatePromises = newTaskList.map((t, index) => {
      return updateTask(t._id, { order: index });
    });
    await Promise.all(updatePromises);
  }
  
  // Cross-column move
  else {
    const newOrder = targetTaskList.length;
    await updateTask(taskId, { date: targetDate, order: newOrder });
  }
};
```

**Making TaskCard sortable:**
```javascript
const TaskCard = ({ id, task, date, ... }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({
    id: id || task._id,
    disabled: isCompleted || isArchived
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  
  return (
    <Accordion
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(!isArchived && !isCompleted ? listeners : {})}
    >
      {/* Task content */}
    </Accordion>
  );
};
```

---

## 4. Dark/Light Mode Toggle

### Overview
Users can toggle between dark and light themes. The preference is saved in localStorage for persistence across sessions. **Note:** Currently, the theme preference is stored in localStorage only, not in the database. To save it to the database, additional implementation would be required.

### Implementation Details

#### Frontend

**Location:** `frontend/src/contexts/ThemeContext.js`

**Theme State Management:**
```javascript
const [darkMode, setDarkMode] = useState(() => {
  const savedTheme = localStorage.getItem('theme');
  return savedTheme === 'dark';
});
```

**Persistence:**
```javascript
useEffect(() => {
  localStorage.setItem('theme', darkMode ? 'dark' : 'light');
}, [darkMode]);
```

**Theme Creation:**
```javascript
const theme = useMemo(
  () =>
    createTheme({
      palette: {
        mode: darkMode ? 'dark' : 'light',
        primary: { main: '#1976d2' },
        secondary: { main: '#dc004e' }
      }
    }),
  [darkMode]
);
```

**Location:** `frontend/src/components/Dashboard.js`
- Toggle button in AppBar (lines 616-629)
- Icon changes based on mode (Brightness4Icon for light, Brightness7Icon for dark)
- Theme applied throughout via Material-UI ThemeProvider

**Location:** `frontend/src/components/TaskCard.js`
- Conditional styling based on theme (lines 67-85, 167-196)
- Dark mode specific colors and shadows

**Location:** `frontend/src/components/AnalyticsDashboard.js`
- Theme-aware chart colors and styling (lines 36-43, 58-64)

### Data Flow

1. **Theme Toggle:**
   ```
   User clicks toggle → toggleTheme() → setDarkMode(!darkMode) → 
   useEffect saves to localStorage → Theme recreated → UI updates
   ```

2. **Initial Load:**
   ```
   App starts → Read from localStorage → Set initial darkMode state → 
   Theme created → UI rendered with correct theme
   ```

### Code Example

**Theme Context Provider:**
```javascript
export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode((prevMode) => !prevMode);
  };

  const theme = useMemo(
    () => createTheme({
      palette: { mode: darkMode ? 'dark' : 'light' }
    }),
    [darkMode]
  );

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme, theme }}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};
```

**Using theme in components:**
```javascript
const { darkMode } = useTheme();

<Box sx={{
  backgroundColor: darkMode 
    ? 'rgba(255, 255, 255, 0.08)' 
    : 'rgba(255, 255, 255, 0.95)',
  boxShadow: darkMode 
    ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
    : '0 2px 6px rgba(0, 0, 0, 0.08)'
}}>
  {/* Content */}
</Box>
```

### Future Enhancement: Database Storage

To save theme preference to the database, you would need to:

1. **Add field to User model:**
```javascript
// backend/models/User.js
themePreference: {
  type: String,
  enum: ['light', 'dark'],
  default: 'light'
}
```

2. **Create API endpoint:**
```javascript
// backend/routes/auth.js
router.patch('/preferences/theme', verifyToken, async (req, res) => {
  const { theme } = req.body;
  const user = await User.findById(req.userId);
  user.themePreference = theme;
  await user.save();
  res.json({ message: 'Theme preference updated', user });
});
```

3. **Update ThemeContext to sync with database:**
```javascript
// On toggle, also save to database
const toggleTheme = async () => {
  const newMode = !darkMode;
  setDarkMode(newMode);
  // Save to database
  await axios.patch('/api/auth/preferences/theme', { 
    theme: newMode ? 'dark' : 'light' 
  });
};
```

---

## 5. Collapse Completed Tasks

### Overview
Completed tasks are automatically collapsed into a minimal view to reduce visual clutter and improve focus on pending tasks. The collapsed view shows only the task title with a strikethrough.

### Implementation Details

#### Frontend

**Location:** `frontend/src/components/TaskCard.js`

**Conditional Rendering (lines 58-156):**
- Completed tasks render a simplified, collapsed view
- Pending tasks render as expandable Accordions

**Completed Task View (lines 58-155):**
```javascript
if (isCompleted) {
  return (
    <Box
      sx={{
        mb: 1,
        p: 1.5,
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.06)' 
          : 'rgba(245, 245, 245, 0.9)',
        opacity: 0.7,  // Reduced opacity
        // ... styling
      }}
    >
      <Typography 
        variant="body2"
        sx={{ 
          textDecoration: 'line-through',  // Strikethrough
          color: 'text.secondary'
        }}
      >
        {task.title}
      </Typography>
      {/* Minimal action buttons */}
    </Box>
  );
}
```

**Pending Task View (lines 158-439):**
- Full Accordion with expandable details
- Shows description, tags, priority, status
- Full action buttons

**Visual Differences:**
- Completed: Reduced opacity (0.7), strikethrough text, minimal styling
- Pending: Full opacity, expandable accordion, rich details

### Data Flow

1. **Task Completion:**
   ```
   User marks task complete → Status updated to 'Completed' → 
   TaskCard re-renders → Conditional logic shows collapsed view
   ```

2. **Task Display:**
   ```
   Tasks fetched → Filtered by status → Completed tasks → Collapsed view → 
   Pending tasks → Full accordion view
   ```

### Code Example

**Conditional rendering based on status:**
```javascript
const TaskCard = ({ task, ... }) => {
  const isCompleted = task.status === TaskStatus.COMPLETED;
  
  if (isCompleted) {
    // Collapsed view for completed tasks
    return (
      <Box sx={{ opacity: 0.7, /* minimal styling */ }}>
        <Typography sx={{ textDecoration: 'line-through' }}>
          {task.title}
        </Typography>
        {/* Minimal actions */}
      </Box>
    );
  }
  
  // Full view for pending tasks
  return (
    <Accordion>
      <AccordionSummary>
        <Typography>{task.title}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {/* Full task details */}
      </AccordionDetails>
    </Accordion>
  );
};
```

---

## 6. Soft Delete (Archive)

### Overview
Tasks are not permanently deleted but archived instead. Archived tasks are hidden from the main view but can be restored later. This prevents accidental data loss and allows task history tracking.

### Implementation Details

#### Frontend

**Location:** `frontend/src/components/Dashboard.js`

**Archive Functionality:**
- Archive button in TaskCard (lines 366-388)
- Archive handler (lines 339-348)
- Archive tab in dashboard (lines 651-655, 886-917)
- Restore functionality (lines 350-361)

**Archive Tab:**
```javascript
<Tab label={`Archived (${archivedTasks.length})`} />
```

**Archive Handler:**
```javascript
const handleArchive = async (task) => {
  const result = await archiveTask(task._id);
  if (result.success) {
    enqueueSnackbar(SuccessMessages.TASK_ARCHIVED, { variant: 'warning' });
    await fetchArchivedTasks();
  }
};
```

**Location:** `frontend/src/components/TaskCard.js`
- Archive button (lines 366-388)
- Restore button for archived tasks (lines 389-411)
- Disabled drag for archived tasks (line 43)
- Visual distinction for archived tasks

**Location:** `frontend/src/contexts/TaskContext.js`

**Archive Functions:**
```javascript
const archiveTask = async (taskId) => {
  const response = await axios.post(`/api/tasks/${taskId}/archive`);
  await fetchTasks(); // Refresh main tasks
  return { success: true, task: response.data.task };
};

const fetchArchivedTasks = async () => {
  const response = await axios.get('/api/tasks/archived');
  setArchivedTasks(response.data.tasks || []);
};

const restoreTask = async (taskId) => {
  const response = await axios.post(`/api/tasks/${taskId}/restore`);
  await fetchArchivedTasks();
  await fetchTasks();
  return { success: true, task: response.data.task };
};
```

#### Backend

**Location:** `backend/models/Task.js`
```javascript
archived: {
  type: Boolean,
  default: false
}
```

**Location:** `backend/routes/tasks.js`

**Archive Endpoint (lines 360-381):**
```javascript
router.post('/:id/archive', async (req, res) => {
  const task = await Task.findOne({ _id: taskId, userId: req.userId });
  task.archived = true;
  await task.save();
  res.json({ message: 'Task archived successfully', task });
});
```

**Get Archived Tasks (lines 383-399):**
```javascript
router.get('/archived', async (req, res) => {
  const tasks = await Task.find({
    userId: req.userId,
    archived: true
  }).sort({ date: -1, createdAt: -1 });
  res.json({ tasks, count: tasks.length });
});
```

**Restore Endpoint (lines 401-426):**
```javascript
router.post('/:id/restore', async (req, res) => {
  const task = await Task.findOne({ _id: taskId, userId: req.userId });
  if (!task.archived) {
    return res.status(400).json({ message: 'Task is not archived' });
  }
  task.archived = false;
  await task.save();
  res.json({ message: 'Task restored successfully', task });
});
```

**Task Filtering:**
- Main task queries exclude archived tasks (line 21)
- Only non-archived tasks appear in main view

### Data Flow

1. **Archiving a Task:**
   ```
   User clicks archive → handleArchive() → API POST /api/tasks/:id/archive → 
   Backend sets archived=true → Database updated → Frontend refreshes → 
   Task removed from main view → Appears in Archive tab
   ```

2. **Viewing Archived Tasks:**
   ```
   User clicks Archive tab → fetchArchivedTasks() → API GET /api/tasks/archived → 
   Backend returns archived tasks → Displayed in Archive tab
   ```

3. **Restoring a Task:**
   ```
   User clicks restore → handleRestore() → API POST /api/tasks/:id/restore → 
   Backend sets archived=false → Database updated → Task appears in main view
   ```

### Code Example

**Archiving a task:**
```javascript
const handleArchive = async (task) => {
  const result = await archiveTask(task._id);
  if (result.success) {
    enqueueSnackbar('Task archived successfully', { variant: 'warning' });
    await fetchArchivedTasks(); // Update archive count
  }
};
```

**Backend archive endpoint:**
```javascript
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
    res.status(500).json({ message: 'Server error while archiving task' });
  }
});
```

**Filtering archived tasks:**
```javascript
// Main task query excludes archived
const tasks = await Task.find({
  userId: req.userId,
  date: { $in: [today, tomorrow, dayAfterTomorrow] },
  archived: false  // Only non-archived tasks
}).sort({ date: 1, order: 1 });
```

---

## Feature Interactions

### Priority + Tags
- Tasks can have both priority and tags
- Both displayed as chips on task cards
- Used together in analytics

### Drag-and-Drop + Archive
- Archived tasks cannot be dragged
- Drag disabled when `task.archived === true`

### Drag-and-Drop + Completed Tasks
- Completed tasks cannot be dragged
- Drag disabled when `task.status === 'Completed'`

### Archive + Completed Tasks
- Completed tasks can be archived
- Archived tasks can be completed/incomplete
- Both states can coexist

### Dark Mode + All Features
- All components adapt to theme
- Colors, shadows, and borders adjust
- Charts and analytics are theme-aware

---

## API Endpoints Summary

### Task Priorities
- `POST /api/tasks` - Create task with priority
- `PUT /api/tasks/:id` - Update task priority

### Custom Tags
- `POST /api/tasks` - Create task with tags array
- `PUT /api/tasks/:id` - Update task tags

### Drag-and-Drop
- `PUT /api/tasks/:id` - Update task order and/or date
- `GET /api/tasks` - Fetch tasks sorted by order

### Archive (Soft Delete)
- `POST /api/tasks/:id/archive` - Archive a task
- `GET /api/tasks/archived` - Get all archived tasks
- `POST /api/tasks/:id/restore` - Restore an archived task

### Theme (Future Enhancement)
- `PATCH /api/auth/preferences/theme` - Save theme preference (to be implemented)

---

## Database Schema

### Task Model
```javascript
{
  userId: ObjectId,
  title: String (max 50),
  description: String (max 200),
  date: String (YYYY-MM-DD),
  status: String ('Pending' | 'Completed'),
  priority: String ('Low' | 'Medium' | 'High'),
  tags: [String],
  order: Number,
  archived: Boolean,
  // ... other fields
}
```

### User Model (Current)
```javascript
{
  name: String,
  email: String,
  passwordHash: String,
  timezone: String,
  // themePreference: String (to be added)
}
```

---

## Reading References

### Official Documentation

1. **@dnd-kit Library**
   - Documentation: https://docs.dndkit.com/
   - GitHub: https://github.com/clauderic/dnd-kit
   - Core concepts: https://docs.dndkit.com/introduction/getting-started

2. **Material-UI (MUI)**
   - Documentation: https://mui.com/
   - Theming: https://mui.com/material-ui/customization/theming/
   - Dark mode: https://mui.com/material-ui/customization/dark-mode/

3. **React Context API**
   - Documentation: https://react.dev/reference/react/useContext
   - Context Provider: https://react.dev/reference/react/createContext

4. **MongoDB/Mongoose**
   - Mongoose Documentation: https://mongoosejs.com/docs/
   - Schema Types: https://mongoosejs.com/docs/schematypes.html

5. **Express.js**
   - Documentation: https://expressjs.com/
   - Routing: https://expressjs.com/en/guide/routing.html

### Tutorials and Guides

1. **Drag and Drop in React**
   - "Building a Drag and Drop Interface with @dnd-kit" - https://www.smashingmagazine.com/2021/11/complete-guide-drag-drop-react-dnd-kit/

2. **Dark Mode Implementation**
   - "Implementing Dark Mode in React with Material-UI" - https://mui.com/material-ui/customization/dark-mode/

3. **Soft Delete Pattern**
   - "Soft Delete Pattern in MongoDB" - https://www.mongodb.com/developer/products/mongodb/soft-delete-pattern-mongodb/

4. **React State Management**
   - "React Context API Tutorial" - https://react.dev/learn/passing-data-deeply-with-context

### Code Examples

1. **@dnd-kit Sortable Example**
   - https://codesandbox.io/examples/package/@dnd-kit/sortable

2. **Material-UI Theme Examples**
   - https://mui.com/material-ui/customization/theming/#theme-provider

3. **Mongoose Schema Examples**
   - https://mongoosejs.com/docs/guide.html



