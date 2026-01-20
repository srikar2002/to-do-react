import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material';
import { TaskStatus } from '../constants/enums';
import { getDashboardStyles } from '../styles/dashboardStyles';

const DeleteTaskDialog = ({ open, task, onClose, onConfirm, darkMode }) => {
  const styles = getDashboardStyles(darkMode);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{ sx: styles.deleteDialogPaper }}
    >
      <DialogTitle>Delete Task</DialogTitle>
      <DialogContent>
        <Typography variant="body1">
          Are you sure you want to delete "{task?.title}"?
        </Typography>
        {task?.status === TaskStatus.PENDING && (
          <Typography variant="body2" color="error" sx={styles.deleteDialogWarningText}>
            This task is still Pending. Do you still want to delete it?
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} color="error" variant="contained">Delete</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteTaskDialog;
