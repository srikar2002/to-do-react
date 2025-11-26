import React, { useState, useEffect } from 'react';
import {
  Typography,
  IconButton,
  Box,
  Chip,
  Tooltip,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  ExpandMore as ExpandMoreIcon,
  Repeat as RepeatIcon,
  Share as ShareIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskStatus, TaskPriority } from '../constants/enums';
import { useTasks } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';

const TaskCard = ({ id, task, date, onEdit, onDelete, onToggleStatus, onArchive, onRestore, showArchive = true }) => {
  const theme = useTheme();
  const isCompleted = task.status === TaskStatus.COMPLETED;
  const isArchived = task.archived || false;
  const [expanded, setExpanded] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sharing, setSharing] = useState(false);
  const { getUsers, shareTask } = useTasks();
  const { user: currentUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  // Helper to normalize ID to string
  const normalizeId = (id) => (id?._id || id)?.toString();
  
  // Check if current user is the owner
  const currentUserId = normalizeId(currentUser?.id || currentUser?._id);
  const taskUserId = normalizeId(task.userId);
  const isOwner = taskUserId === currentUserId;
  // Check if task is shared
  const isShared = task.sharedWith?.length > 0;
  
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

  useEffect(() => {
    if (shareDialogOpen && isOwner) {
      loadUsers();
    }
  }, [shareDialogOpen, isOwner]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    const result = await getUsers();
    if (result.success) {
      setUsers(result.users);
      // Pre-select already shared users
      setSelectedUserIds(task.sharedWith?.map(normalizeId) || []);
    } else {
      enqueueSnackbar(result.message || 'Failed to load users', { variant: 'error' });
    }
    setLoadingUsers(false);
  };

  const handleOpenShareDialog = () => {
    setShareDialogOpen(true);
  };

  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
    setSelectedUserIds([]);
  };

  const handleToggleUser = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleShare = async () => {
    if (selectedUserIds.length === 0) {
      enqueueSnackbar('Please select at least one user to share with', { variant: 'warning' });
      return;
    }
    
    setSharing(true);
    const result = await shareTask(task._id, selectedUserIds);
    if (result.success) {
      enqueueSnackbar('Task shared successfully', { variant: 'success' });
      handleCloseShareDialog();
    } else {
      enqueueSnackbar(result.message || 'Failed to share task', { variant: 'error' });
    }
    setSharing(false);
  };

  if (isCompleted) {
    return (
      <Box
        ref={setNodeRef}
        style={style}
        {...attributes}
        sx={{
          mb: 1,
          p: 1.5,
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.06)' 
            : 'rgba(245, 245, 245, 0.9)',
          boxShadow: theme.palette.mode === 'dark' 
            ? '0 1px 4px rgba(0, 0, 0, 0.2)' 
            : '0 1px 3px rgba(0, 0, 0, 0.08)',
          border: theme.palette.mode === 'dark' 
            ? '1px solid rgba(255, 255, 255, 0.08)' 
            : '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: 2,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.08)' 
              : 'rgba(245, 245, 245, 1)',
            boxShadow: theme.palette.mode === 'dark' 
              ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
              : '0 2px 6px rgba(0, 0, 0, 0.1)'
          }
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" sx={{ minWidth: 0, overflow: 'hidden' }}>
          <Box sx={{ minWidth: 0, flexGrow: 1, overflow: 'hidden', mr: 1 }}>
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
                  fontSize: '0.875rem',
                  fontWeight: 400,
                  lineHeight: 1.4,
                  minWidth: 0
                }}
              >
                {task.title}
              </Typography>
            </Tooltip>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5} sx={{ flexShrink: 0 }}>
            <Tooltip title={isArchived ? "Cannot change status of archived tasks" : "Mark as incomplete"}>
              <span>
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isArchived) {
                      onToggleStatus();
                    }
                  }}
                  color="success"
                  disabled={isArchived}
                  sx={{ padding: 0.5, minWidth: 32, width: 32, height: 32 }}
                >
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={isOwner ? "Delete task" : "Only task owner can delete"}>
              <span>
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isOwner) {
                      onDelete();
                    }
                  }}
                  color="error"
                  disabled={!isOwner}
                  sx={{ 
                    padding: 0.5,
                    minWidth: 32,
                    width: 32,
                    height: 32,
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(211, 47, 47, 0.16)' 
                        : 'rgba(211, 47, 47, 0.08)'
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Accordion
      ref={setNodeRef}
      style={style}
      {...attributes}
      expanded={expanded}
      onChange={() => setExpanded(!expanded)}
      sx={{
        mb: 2,
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.08)' 
          : 'rgba(255, 255, 255, 0.95)',
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
          : '0 2px 6px rgba(0, 0, 0, 0.08)',
        border: theme.palette.mode === 'dark' 
          ? '1px solid rgba(255, 255, 255, 0.1)' 
          : '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: 2,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.12)' 
            : 'rgba(255, 255, 255, 1)',
          boxShadow: isArchived 
            ? (theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 6px rgba(0, 0, 0, 0.08)')
            : (theme.palette.mode === 'dark' ? '0 4px 16px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.12)'),
          transform: isArchived ? 'none' : 'translateY(-2px)',
          border: theme.palette.mode === 'dark' 
            ? '1px solid rgba(255, 255, 255, 0.15)' 
            : '1px solid rgba(0, 0, 0, 0.15)'
        },
        '&:before': {
          display: 'none'
        },
        '&.Mui-expanded': {
          margin: '0 0 16px 0'
        }
      }}
    >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          {...(!isArchived && !isCompleted ? { ...attributes, ...listeners } : {})}
          sx={{
            minHeight: 56,
            py: 1,
            cursor: isCompleted || isArchived ? 'default' : 'grab',
            '&:active': {
              cursor: isCompleted || isArchived ? 'default' : 'grabbing'
            },
            '&.Mui-expanded': {
              minHeight: 56
            },
            '& .MuiAccordionSummary-content': {
              margin: '12px 0',
              alignItems: 'center',
              minWidth: 0,
              overflow: 'hidden',
              '&.Mui-expanded': {
                margin: '12px 0'
              }
            }
          }}
        >
          <Box display="flex" alignItems="center" width="100%" pr={1} sx={{ minWidth: 0, overflow: 'hidden' }}>
            <Box sx={{ minWidth: 0, flexGrow: 1, overflow: 'hidden' }}>
              <Tooltip title={task.title} placement="top-start">
                <Typography 
                  variant="subtitle1"
                  component="h3" 
                  sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                    fontSize: '0.95rem',
                    lineHeight: 1.4,
                    minWidth: 0
                  }}
                >
                  {task.title}
                </Typography>
              </Tooltip>
            </Box>
          </Box>
        </AccordionSummary>
      <AccordionDetails sx={{ pt: 2, pb: 2, px: 2 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2}>
          <Box 
            flexGrow={1} 
            sx={{ minWidth: 0 }}
          >
            {task.description && (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  mb: 1.5,
                  wordBreak: 'break-word',
                  lineHeight: 1.6,
                  fontSize: '0.875rem'
                }}
              >
                {task.description}
              </Typography>
            )}
            <Box display="flex" gap={0.75} flexWrap="wrap" alignItems="center">
              <Chip 
                label={task.status} 
                size="small" 
                color="default"
                variant="outlined"
                sx={{ fontSize: '0.75rem', height: 24 }}
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
                  sx={{ fontSize: '0.75rem', height: 24 }}
                />
              )}
              {task.rollover && (
                <Chip 
                  label="Auto-rollover" 
                  size="small" 
                  color="info"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem', height: 24 }}
                />
              )}
              {task.parentTaskId && (
                <Chip 
                  icon={<RepeatIcon sx={{ fontSize: '0.875rem !important' }} />}
                  label="Recurring" 
                  size="small" 
                  color="secondary"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem', height: 24 }}
                />
              )}
              {isShared && (
                <Chip 
                  icon={<PeopleIcon sx={{ fontSize: '0.875rem !important' }} />}
                  label={`Shared (${task.sharedWith?.length || 0})`}
                  size="small" 
                  color="info"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem', height: 24 }}
                />
              )}
              {!isOwner && task.userId && (
                <Chip 
                  label={`By ${task.userId.name || 'Unknown'}`}
                  size="small" 
                  color="default"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem', height: 24 }}
                />
              )}
              {task.tags && task.tags.length > 0 && task.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem', height: 24 }}
                />
              ))}
            </Box>
          </Box>
          <Box display="flex" flexDirection="column" gap={0.75} sx={{ flexShrink: 0 }}>
            <Tooltip title={isArchived ? "Cannot change status of archived tasks" : "Mark as completed"}>
              <span>
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isArchived) {
                      onToggleStatus();
                    }
                  }}
                  color="default"
                  disabled={isArchived}
                  sx={{ 
                    width: 36, 
                    height: 36,
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.08)' 
                        : 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                >
                  <RadioButtonUncheckedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Edit task">
              <span>
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }} 
                  color="primary"
                  sx={{ 
                    width: 36, 
                    height: 36,
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(25, 118, 210, 0.16)' 
                        : 'rgba(25, 118, 210, 0.08)'
                    }
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            {showArchive && !isArchived && (
              <Tooltip title="Archive task">
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive();
                  }} 
                  color="default"
                  sx={{ 
                    width: 36, 
                    height: 36,
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.08)' 
                        : 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                >
                  <ArchiveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {isArchived && onRestore && (
              <Tooltip title="Restore task">
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore();
                  }} 
                  color="primary"
                  sx={{ 
                    width: 36, 
                    height: 36,
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(25, 118, 210, 0.16)' 
                        : 'rgba(25, 118, 210, 0.08)'
                    }
                  }}
                >
                  <UnarchiveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {isOwner && !isArchived && (
              <Tooltip title="Share task">
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenShareDialog();
                  }} 
                  color="primary"
                  sx={{ 
                    width: 36, 
                    height: 36,
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(25, 118, 210, 0.16)' 
                        : 'rgba(25, 118, 210, 0.08)'
                    }
                  }}
                >
                  <ShareIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {!isArchived && (
              <Tooltip title="Delete task">
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  color="error"
                  disabled={!isOwner}
                  sx={{ 
                    width: 36, 
                    height: 36,
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark' 
                        ? 'rgba(211, 47, 47, 0.16)' 
                        : 'rgba(211, 47, 47, 0.08)'
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </AccordionDetails>
      
      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={handleCloseShareDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Share Task: {task.title}</DialogTitle>
        <DialogContent>
          {loadingUsers ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {users.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                  No other users available to share with
                </Typography>
              ) : (
                users.map((user) => {
                  const userId = normalizeId(user);
                  const isSelected = selectedUserIds.includes(userId);
                  return (
                    <ListItem key={userId} disablePadding>
                      <ListItemButton onClick={() => handleToggleUser(userId)}>
                        <Checkbox checked={isSelected} />
                        <ListItemText primary={user.name} secondary={user.email} />
                      </ListItemButton>
                    </ListItem>
                  );
                })
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseShareDialog}>Cancel</Button>
          <Button 
            onClick={handleShare} 
            variant="contained" 
            disabled={sharing || selectedUserIds.length === 0}
          >
            {sharing ? <CircularProgress size={20} /> : 'Share'}
          </Button>
        </DialogActions>
      </Dialog>
    </Accordion>
  );
};

export default TaskCard;
