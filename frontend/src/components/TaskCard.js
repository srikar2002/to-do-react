import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Chip,
  Tooltip
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
          <Box flexGrow={1} mr={1} sx={{ minWidth: 0 }}>
            <Tooltip title={task.title} placement="top-start">
              <Typography 
                variant="h6" 
                component="h3" 
                sx={{ 
                  textDecoration: isCompleted ? 'line-through' : 'none',
                  color: isCompleted ? 'text.secondary' : 'text.primary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {task.title}
              </Typography>
            </Tooltip>
            {task.description && (
              <Tooltip title={task.description} placement="top-start">
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mt: 1,
                    textDecoration: isCompleted ? 'line-through' : 'none',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-word'
                  }}
                >
                  {task.description}
                </Typography>
              </Tooltip>
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
            <Tooltip title={isCompleted ? 'Cannot edit completed tasks' : 'Edit task'}>
              <span>
                <IconButton 
                  size="small" 
                  onClick={onEdit} 
                  color="primary"
                  disabled={isCompleted}
                >
                  <EditIcon />
                </IconButton>
              </span>
            </Tooltip>
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
