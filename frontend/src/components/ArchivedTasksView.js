import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box
} from '@mui/material';
import TaskCard from './TaskCard';
import { getDashboardStyles } from '../styles/dashboardStyles';

/**
 * ArchivedTasksView Component
 * Displays a list of archived tasks with options to restore, edit, delete, or toggle status
 * 
 * @param {Array} archivedTasks - Array of archived task objects
 * @param {Function} onEdit - Handler for editing a task
 * @param {Function} onDelete - Handler for deleting a task
 * @param {Function} onToggleStatus - Handler for toggling task status
 * @param {Function} onRestore - Handler for restoring a task
 * @param {boolean} darkMode - Dark mode theme flag
 */
const ArchivedTasksView = ({
  archivedTasks,
  onEdit,
  onDelete,
  onToggleStatus,
  onRestore,
  darkMode
}) => {
  const styles = getDashboardStyles(darkMode);

  return (
    <Card>
      <CardHeader
        title="Archived Tasks"
        subheader={`${archivedTasks.length} archived task${archivedTasks.length !== 1 ? 's' : ''}`}
        sx={styles.archivedCardHeader}
      />
      <CardContent>
        {archivedTasks.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={styles.archivedEmptyText}>
            No archived tasks
          </Typography>
        ) : (
          <Box>
            {archivedTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onEdit={() => onEdit(task)}
                onDelete={() => onDelete(task)}
                onToggleStatus={() => onToggleStatus(task._id, task.status)}
                onRestore={() => onRestore(task)}
                showArchive={false}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ArchivedTasksView;
