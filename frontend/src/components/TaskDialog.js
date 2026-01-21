import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  IconButton,
  InputAdornment,
  Box,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import {
  TaskPriority,
  DateOption,
  ValidationLimits,
  DayLabels,
  ValidationMessages
} from '../constants/enums';
import { getDashboardStyles } from '../styles/dashboardStyles';

const TaskDialog = ({
  open,
  editingTask,
  formData,
  setFormData,
  tagInput,
  setTagInput,
  errors,
  setErrors,
  onClose,
  onSubmit,
  darkMode
}) => {
  const styles = getDashboardStyles(darkMode);

  const handleTitleChange = (e) => {
    const next = e.target.value || '';
    const capped = next.length > ValidationLimits.TITLE_MAX_LENGTH ? next.slice(0, ValidationLimits.TITLE_MAX_LENGTH) : next;
    setFormData(prev => ({ ...prev, title: capped }));
    if (errors.title && capped.trim().length > 0 && capped.trim().length <= ValidationLimits.TITLE_MAX_LENGTH) {
      setErrors(prev => ({ ...prev, title: '' }));
    }
  };

  const handleDescriptionChange = (e) => {
    const next = e.target.value || '';
    const capped = next.length > ValidationLimits.DESCRIPTION_MAX_LENGTH ? next.slice(0, ValidationLimits.DESCRIPTION_MAX_LENGTH) : next;
    setFormData(prev => ({ ...prev, description: capped }));
  };

  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const trimmedTag = tagInput.trim();
      if (!formData.tags.includes(trimmedTag)) {
        setFormData(prev => ({ ...prev, tags: [...prev.tags, trimmedTag] }));
      }
      setTagInput('');
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, trimmedTag] }));
    }
    setTagInput('');
  };

  const handleRemoveTag = (index) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter((_, i) => i !== index) }));
  };

  const handleRecurrenceIntervalChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    setFormData(prev => ({ ...prev, recurrenceInterval: Math.max(1, value) }));
    if (errors.recurrenceInterval && value >= 1) {
      setErrors(prev => ({ ...prev, recurrenceInterval: '' }));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editingTask ? 'Edit Task' : formData.isRecurring ? 'Create Recurring Task' : 'Add New Task'}
      </DialogTitle>
      <form onSubmit={onSubmit} noValidate>
        <DialogContent>
          {!editingTask && (
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isRecurring}
                  onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                  color="primary"
                />
              }
              label="Make this a recurring task"
              sx={styles.dialogFormControlLabel}
            />
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Task Title"
            fullWidth
            variant="outlined"
            value={formData.title}
            onChange={handleTitleChange}
            error={Boolean(errors.title) || (formData.title.length >= ValidationLimits.TITLE_MAX_LENGTH && formData.title.length > 0)}
            helperText={errors.title || (formData.title.length >= ValidationLimits.TITLE_MAX_LENGTH && formData.title.length > 0 ? ValidationMessages.TITLE_MAX_REACHED : '')}
            sx={styles.dialogTextField}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formData.description}
            onChange={handleDescriptionChange}
            error={formData.description.length >= ValidationLimits.DESCRIPTION_MAX_LENGTH && formData.description.length > 0}
            helperText={formData.description.length >= ValidationLimits.DESCRIPTION_MAX_LENGTH && formData.description.length > 0 ? ValidationMessages.DESCRIPTION_MAX_REACHED : ''}
            sx={styles.dialogTextField}
          />
          <FormControl fullWidth sx={styles.dialogFormControl}>
            <InputLabel id="date-select-label">{formData.isRecurring ? 'Start Date' : 'Date'}</InputLabel>
            <Select
              labelId="date-select-label"
              value={formData.date}
              label={formData.isRecurring ? 'Start Date' : 'Date'}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            >
              <MenuItem value={DateOption.TODAY}>{DayLabels.TODAY}</MenuItem>
              <MenuItem value={DateOption.TOMORROW}>{DayLabels.TOMORROW}</MenuItem>
              <MenuItem value={DateOption.DAY_AFTER_TOMORROW}>{DayLabels.DAY_AFTER_TOMORROW}</MenuItem>
            </Select>
          </FormControl>
          {formData.isRecurring && !editingTask && (
            <>
              <FormControl fullWidth sx={styles.dialogFormControl}>
                <InputLabel id="recurrence-pattern-select-label">Recurrence Pattern</InputLabel>
                <Select
                  labelId="recurrence-pattern-select-label"
                  value={formData.recurrencePattern}
                  label="Recurrence Pattern"
                  onChange={(e) => setFormData(prev => ({ ...prev, recurrencePattern: e.target.value }))}
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="custom">Custom Interval</MenuItem>
                </Select>
              </FormControl>
              {formData.recurrencePattern === 'custom' && (
                <TextField
                  margin="dense"
                  label="Interval (days)"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={formData.recurrenceInterval}
                  onChange={handleRecurrenceIntervalChange}
                  error={Boolean(errors.recurrenceInterval)}
                  helperText={errors.recurrenceInterval || 'Number of days between occurrences'}
                  sx={styles.dialogTextField}
                  inputProps={{ min: 1 }}
                />
              )}
              <TextField
                margin="dense"
                label="End Date (Optional)"
                type="date"
                fullWidth
                variant="outlined"
                value={formData.recurrenceEndDate}
                onChange={(e) => setFormData(prev => ({ ...prev, recurrenceEndDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                helperText="Leave empty to generate tasks for 90 days"
                sx={styles.dialogTextField}
              />
            </>
          )}
          <FormControl fullWidth sx={styles.dialogFormControl}>
            <InputLabel id="priority-select-label">Priority</InputLabel>
            <Select
              labelId="priority-select-label"
              value={formData.priority}
              label="Priority"
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
            >
              <MenuItem value={TaskPriority.LOW}>{TaskPriority.LOW}</MenuItem>
              <MenuItem value={TaskPriority.MEDIUM}>{TaskPriority.MEDIUM}</MenuItem>
              <MenuItem value={TaskPriority.HIGH}>{TaskPriority.HIGH}</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Add Tag"
            fullWidth
            variant="outlined"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={handleTagKeyPress}
            InputProps={{
              endAdornment: tagInput && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={handleAddTag}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={styles.dialogTagTextField}
          />
          {formData.tags.length > 0 && (
            <Box sx={styles.dialogTagsBox}>
              {formData.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  onDelete={() => handleRemoveTag(index)}
                  deleteIcon={<CloseIcon />}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={
              formData.title.trim().length === 0 ||
              formData.title.length >= ValidationLimits.TITLE_MAX_LENGTH ||
              formData.description.length >= ValidationLimits.DESCRIPTION_MAX_LENGTH ||
              (formData.isRecurring && formData.recurrencePattern === 'custom' && (!formData.recurrenceInterval || formData.recurrenceInterval < 1))
            }
          >
            {editingTask ? 'Update' : formData.isRecurring ? 'Create Recurring Task' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TaskDialog;
