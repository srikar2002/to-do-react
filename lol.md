Reviewing the current file to summarize the changes:


[1 tool called]


## Summary of Changes to TaskCard Component

### 1. **Unified Accordion for all tasks**
   - Before: Only completed tasks used `Accordion`; pending tasks used `Card`.
   - After: All tasks (completed and pending) use `Accordion` for consistent expand/collapse.

### 2. **Restructured layout — collapsed view (AccordionSummary)**
   - Completed tasks:
     - Title on the left (line-through, muted)
     - Green checkmark icon on the right (visible when collapsed)
     - Expand icon on the far right
   - Pending tasks:
     - Title only
     - Expand icon on the far right

### 3. **Restructured layout — expanded view (AccordionDetails)**
   - Before: Description and chips were always visible in the card.
   - After: Two-column layout:
     - Left column:
       - Description (if present)
       - Chips below (status, priority, tags, rollover)
     - Right column:
       - Action buttons stacked vertically:
         - Completed: Checkmark, Delete
         - Pending: Checkbox, Edit, Archive, Delete

### 4. **Event handling**
   - All action buttons use `e.stopPropagation()` to prevent expanding/collapsing when clicking buttons.
   - Drag-and-drop listeners are applied only to the content area (not action buttons).

### 5. **Visual consistency**
   - Completed tasks: muted styling with line-through text.
   - Pending tasks: normal styling.
   - Both use the same accordion structure with consistent spacing and hover effects.

### 6. **Code cleanup**
   - Removed unused `Card` and `CardContent` imports.
   - Standardized icon sizes and button styling.

### Result
- All tasks are expandable/collapsible via the expand icon.
- Collapsed view shows the title (and checkmark for completed tasks).
- Expanded view shows description and chips on the left, action buttons on the right.
- Consistent behavior across completed and pending tasks.

## Summary of Changes: Disabled Completed Button for Archived Tasks

### Problem
The completed/checkbox button was still functional for archived tasks, allowing status changes.

### Solution
Disabled the toggle status button (checkmark/checkbox) when a task is archived.

### Changes

1. Completed tasks — collapsed view (AccordionSummary)
   - Location: Lines 127-144
   - Added:
     - `disabled={isArchived}`
     - Conditional check in `onClick` to prevent execution when archived
     - Tooltip explaining why it's disabled
     - Wrapped in `<span>` (required for disabled buttons with tooltips)

2. Completed tasks — expanded view (AccordionDetails)
   - Location: Lines 206-222
   - Same changes as above

3. Pending tasks — expanded view (AccordionDetails)
   - Location: Lines 369-385
   - Same changes as above

### Technical Details

**Before:**
```javascript
<IconButton 
  onClick={(e) => {
    e.stopPropagation();
    onToggleStatus();
  }}
>
```

**After:**
```javascript
<Tooltip title={isArchived ? "Cannot change status of archived tasks" : ""}>
  <span>
    <IconButton 
      onClick={(e) => {
        e.stopPropagation();
        if (!isArchived) {
          onToggleStatus();
        }
      }}
      disabled={isArchived}
    >
```

### Result
- Archived tasks: the completed/checkbox button is disabled, grayed out, non-clickable, and shows a tooltip explaining why.
- Non-archived tasks: the button works normally.

This prevents status changes for archived tasks while keeping the UI clear.