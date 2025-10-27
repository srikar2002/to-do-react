import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Chip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon
} from '@mui/icons-material';

const TaskCard = ({ task, onEdit, onDelete, onToggleStatus }) => {
  const isCompleted = task.status === 'Completed';

  return (
    <Card 
      sx={{ 
        mb: 2, 
        opacity: isCompleted ? 0.7 : 1,
        backgroundColor: isCompleted ? '#f5f5f5' : 'white'
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box flexGrow={1} mr={1}>
            <Typography 
              variant="h6" 
              component="h3" 
              sx={{ 
                textDecoration: isCompleted ? 'line-through' : 'none',
                color: isCompleted ? 'text.secondary' : 'text.primary'
              }}
            >
              {task.title}
            </Typography>
            {task.description && (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  mt: 1,
                  textDecoration: isCompleted ? 'line-through' : 'none'
                }}
              >
                {task.description}
              </Typography>
            )}
            <Box mt={1} display="flex" gap={1} flexWrap="wrap">
              <Chip 
                label={task.status} 
                size="small" 
                color={isCompleted ? 'success' : 'default'}
                variant={isCompleted ? 'filled' : 'outlined'}
              />
              {task.rollover && (
                <Chip 
                  label="Auto-rollover" 
                  size="small" 
                  color="info"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
          <Box display="flex" flexDirection="column" gap={0.5}>
            <IconButton 
              size="small" 
              onClick={onToggleStatus}
              color={isCompleted ? 'success' : 'default'}
            >
              {isCompleted ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
            </IconButton>
            <IconButton size="small" onClick={onEdit} color="primary">
              <EditIcon />
            </IconButton>
            <IconButton size="small" onClick={onDelete} color="error">
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TaskCard;
