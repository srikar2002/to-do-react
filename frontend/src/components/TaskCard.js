import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Chip,
  Tooltip,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskStatus, TaskPriority } from '../constants/enums';

const TaskCard = ({ id, task, date, onEdit, onDelete, onToggleStatus, onArchive, onRestore, showArchive = true }) => {
  const theme = useTheme();
  const isCompleted = task.status === TaskStatus.COMPLETED;
  const isArchived = task.archived || false;
  const [expanded, setExpanded] = useState(false);
  
  // Make task draggable only if not completed or archived
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: id || task._id,
    disabled: isCompleted || isArchived,
    data: {
      type: 'task',
      task,
      date
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : (isCompleted ? 0.7 : 1),
    cursor: isCompleted || isArchived ? 'default' : 'grab'
  };

  if (isCompleted) {
    return (
      <Accordion
        ref={setNodeRef}
        style={style}
        {...attributes}
        expanded={expanded}
        onChange={() => setExpanded(!expanded)}
        sx={{
          mb: 1,
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.06)' 
            : 'rgba(245, 245, 245, 0.8)',
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 1px 4px rgba(0, 0, 0, 0.2)' 
            : '0 1px 2px rgba(0, 0, 0, 0.08)',
          border: theme.palette.mode === 'dark' 
            ? '1px solid rgba(255, 255, 255, 0.08)' 
            : '1px solid rgba(0, 0, 0, 0.06)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.08)' 
              : 'rgba(245, 245, 245, 1)',
            boxShadow: theme.palette.mode === 'dark' 
              ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
              : '0 2px 4px rgba(0, 0, 0, 0.12)'
          },
          '&:before': {
            display: 'none'
          },
          '&.Mui-expanded': {
            margin: '0 0 8px 0'
          }
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            minHeight: 48,
            '&.Mui-expanded': {
              minHeight: 48
            },
            '& .MuiAccordionSummary-content': {
              margin: '8px 0',
              '&.Mui-expanded': {
                margin: '8px 0'
              }
            }
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" pr={1}>
            <Tooltip title={task.title} placement="top-start">
              <Typography 
                variant="body2"
                component="h3" 
                sx={{ 
                  textDecoration: 'line-through',
                  color: 'text.secondary',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '0.8rem',
                  fontWeight: 400,
                  flexGrow: 1
                }}
              >
                {task.title}
              </Typography>
            </Tooltip>
            <Box display="flex" gap={0.25} ml={1}>
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStatus();
                }}
                color="success"
                sx={{ padding: 0.25, minWidth: 28, width: 28, height: 28 }}
              >
                <CheckCircleIcon fontSize="small" />
              </IconButton>
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                color="error"
                sx={{ padding: 0.25, minWidth: 28, width: 28, height: 28 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, pb: 1 }}>
          {task.description && (
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                textDecoration: 'line-through',
                mb: 1
              }}
            >
              {task.description}
            </Typography>
          )}
          <Box display="flex" gap={0.5} flexWrap="wrap" alignItems="center">
            <Chip 
              label={task.status} 
              size="small" 
              color="success"
              variant="filled"
            />
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
            {task.rollover && (
              <Chip 
                label="Auto-rollover" 
                size="small" 
                color="info"
                variant="outlined"
              />
            )}
            {task.tags && task.tags.length > 0 && task.tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  }

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      {...attributes}
      sx={{ 
        mb: 2,
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.08)' 
          : 'rgba(255, 255, 255, 0.9)',
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
          : '0 2px 4px rgba(0, 0, 0, 0.1)',
        border: theme.palette.mode === 'dark' 
          ? '1px solid rgba(255, 255, 255, 0.1)' 
          : '1px solid rgba(0, 0, 0, 0.08)',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.12)' 
            : 'rgba(255, 255, 255, 1)',
          boxShadow: isArchived 
            ? (theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)')
            : (theme.palette.mode === 'dark' ? '0 4px 16px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.15)'),
          transform: isArchived ? 'none' : 'translateY(-2px)',
          border: theme.palette.mode === 'dark' 
            ? '1px solid rgba(255, 255, 255, 0.15)' 
            : '1px solid rgba(0, 0, 0, 0.12)'
        }
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box 
            flexGrow={1} 
            mr={1} 
            sx={{ minWidth: 0 }}
            {...(!isArchived ? listeners : {})}
          >
            <Tooltip title={task.title} placement="top-start">
              <Typography 
                variant="h6"
                component="h3" 
                sx={{ 
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: 600
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
            <Box mt={1} display="flex" gap={1} flexWrap="wrap" alignItems="center">
              <Chip 
                label={task.status} 
                size="small" 
                color="default"
                variant="outlined"
              />
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
              {task.rollover && (
                <Chip 
                  label="Auto-rollover" 
                  size="small" 
                  color="info"
                  variant="outlined"
                />
              )}
              {task.tags && task.tags.length > 0 && task.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
          <Box display="flex" flexDirection="column" gap={0.5}>
            <IconButton 
              size="small" 
              onClick={onToggleStatus}
              color="default"
            >
              <RadioButtonUncheckedIcon />
            </IconButton>
            <Tooltip title="Edit task">
              <span>
                <IconButton 
                  size="small" 
                  onClick={onEdit} 
                  color="primary"
                >
                  <EditIcon />
                </IconButton>
              </span>
            </Tooltip>
            {showArchive && !isArchived && (
              <Tooltip title="Archive task">
                <IconButton size="small" onClick={onArchive} color="default">
                  <ArchiveIcon />
                </IconButton>
              </Tooltip>
            )}
            {isArchived && onRestore && (
              <Tooltip title="Restore task">
                <IconButton size="small" onClick={onRestore} color="primary">
                  <UnarchiveIcon />
                </IconButton>
              </Tooltip>
            )}
            {!isArchived && (
              <IconButton 
                size="small" 
                onClick={onDelete} 
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TaskCard;
