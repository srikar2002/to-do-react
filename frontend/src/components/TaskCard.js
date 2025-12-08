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
  ListItemSecondaryAction,
  CircularProgress,
  Divider,
  TextField,
  InputAdornment
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
  People as PeopleIcon,
  PersonRemove as PersonRemoveIcon,
  Search as SearchIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskStatus, TaskPriority } from '../constants/enums';
import { useTasks } from '../contexts/TaskContext';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import { getTaskCardStyles } from '../styles/taskCardStyles';

const TaskCard = ({ id, task, date, onEdit, onDelete, onToggleStatus, onArchive, onRestore, showArchive = true }) => {
  const theme = useTheme();
  const isCompleted = task.status === TaskStatus.COMPLETED;
  const isArchived = task.archived || false;
  const [expanded, setExpanded] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]); // Store full user objects for selected users
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [unsharingUserId, setUnsharingUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const { getUsers, shareTask, unshareTask } = useTasks();
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

  const styles = getTaskCardStyles(theme, isArchived, isCompleted);

  useEffect(() => {
    if (shareDialogOpen && isOwner) {
      // Initialize - don't pre-select already shared users for adding
      // They will be shown in the "Currently Shared With" section
      setSelectedUserIds([]);
      setSelectedUsers([]);
      setUsers([]); // Clear users when dialog opens
      setSearchQuery(''); // Reset search
    }
  }, [shareDialogOpen, isOwner]);

  // Search users when query changes (with debounce)
  useEffect(() => {
    if (!shareDialogOpen || !isOwner) return;
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Only search if there's a query (at least 1 character)
    if (!searchQuery.trim()) {
      setUsers([]); // Clear users if search is empty
      setLoadingUsers(false);
      return;
    }
    
    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      loadUsers(searchQuery.trim());
    }, 300); // 300ms debounce
    
    setSearchTimeout(timeout);
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery, shareDialogOpen, isOwner]);

  const loadUsers = async (search = '') => {
    setLoadingUsers(true);
    const result = await getUsers(search);
    if (result.success) {
      setUsers(result.users);
    } else {
      enqueueSnackbar(result.message || 'Failed to load users', { variant: 'error' });
      setUsers([]);
    }
    setLoadingUsers(false);
  };

  const handleOpenShareDialog = () => {
    setShareDialogOpen(true);
  };

  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
    setSelectedUserIds([]);
    setSelectedUsers([]);
    setSearchQuery('');
  };

  const handleToggleUser = (userId) => {
    const user = users.find(u => normalizeId(u) === userId);
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        // Remove user
        setSelectedUsers(prevUsers => prevUsers.filter(u => normalizeId(u) !== userId));
        return prev.filter(id => id !== userId);
      } else {
        // Add user
        if (user) {
          setSelectedUsers(prevUsers => [...prevUsers, user]);
        }
        return [...prev, userId];
      }
    });
  };

  const handleRemoveSelectedUser = (userId) => {
    setSelectedUserIds(prev => prev.filter(id => id !== userId));
    setSelectedUsers(prevUsers => prevUsers.filter(u => normalizeId(u) !== userId));
  };

  const handleShare = async () => {
    // Filter out users that are already shared
    const alreadySharedIds = task.sharedWith?.map(normalizeId) || [];
    const newUserIds = selectedUserIds.filter(id => !alreadySharedIds.includes(id));
    
    if (newUserIds.length === 0) {
      enqueueSnackbar('Please select at least one new user to share with', { variant: 'warning' });
      return;
    }
    
    setSharing(true);
    const result = await shareTask(task._id, newUserIds);
    if (result.success) {
      enqueueSnackbar('Task shared successfully', { variant: 'success' });
      handleCloseShareDialog();
    } else {
      enqueueSnackbar(result.message || 'Failed to share task', { variant: 'error' });
    }
    setSharing(false);
  };

  const handleUnshare = async (userId) => {
    setUnsharingUserId(userId);
    const result = await unshareTask(task._id, userId);
    if (result.success) {
      enqueueSnackbar('User removed from shared task', { variant: 'success' });
      // Reload users to update the list
      await loadUsers();
    } else {
      enqueueSnackbar(result.message || 'Failed to unshare task', { variant: 'error' });
    }
    setUnsharingUserId(null);
  };

  if (isCompleted) {
    return (
      <Box
        ref={setNodeRef}
        style={style}
        {...attributes}
        sx={styles.completedCard}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" sx={styles.completedFlexBox}>
          <Box sx={styles.completedTitleBox}>
            <Tooltip title={task.title} placement="top-start">
              <Typography 
                variant="body2"
                component="h3" 
                sx={styles.completedTitle}
              >
                {task.title}
              </Typography>
            </Tooltip>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5} sx={styles.completedActionsBox}>
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
                  sx={styles.completedIconButton}
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
                  sx={styles.deleteIconButton}
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
      sx={styles.accordion}
    >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          {...(!isArchived && !isCompleted ? { ...attributes, ...listeners } : {})}
          sx={styles.accordionSummary}
        >
          <Box display="flex" alignItems="center" width="100%" pr={1} sx={styles.accordionFlexBox}>
            <Box sx={styles.titleBox}>
              <Tooltip title={task.title} placement="top-start">
                <Typography 
                  variant="subtitle1"
                  component="h3" 
                  sx={styles.title}
                >
                  {task.title}
                </Typography>
              </Tooltip>
            </Box>
          </Box>
        </AccordionSummary>
      <AccordionDetails sx={styles.accordionDetails}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2}>
          <Box 
            flexGrow={1} 
            sx={styles.detailsContentBox}
          >
            {task.description && (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={styles.description}
              >
                {task.description}
              </Typography>
            )}
            <Box display="flex" gap={0.75} flexWrap="wrap" alignItems="center" sx={styles.tagsBox}>
              <Chip 
                label={task.status} 
                size="small" 
                color="default"
                variant="outlined"
                sx={styles.chip}
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
                  sx={styles.chip}
                />
              )}
              {task.rollover && (
                <Chip 
                  label="Auto-rollover" 
                  size="small" 
                  color="info"
                  variant="outlined"
                  sx={styles.chip}
                />
              )}
              {task.parentTaskId && (
                <Chip 
                  icon={<RepeatIcon sx={styles.chipIcon} />}
                  label="Recurring" 
                  size="small" 
                  color="secondary"
                  variant="outlined"
                  sx={styles.chip}
                />
              )}
              {isShared && (
                <Chip 
                  icon={<PeopleIcon sx={styles.chipIcon} />}
                  label={`Shared (${task.sharedWith?.length || 0})`}
                  size="small" 
                  color="info"
                  variant="outlined"
                  sx={styles.chip}
                />
              )}
              {!isOwner && task.userId && (
                <Chip 
                  label={`By ${task.userId.name || 'Unknown'}`}
                  size="small" 
                  color="default"
                  variant="outlined"
                  sx={styles.chip}
                />
              )}
              {task.tags && task.tags.length > 0 && task.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={styles.chip}
                />
              ))}
            </Box>
          </Box>
          <Box display="flex" flexDirection="column" gap={0.75} sx={styles.actionsBox}>
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
                  sx={styles.iconButton}
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
                  sx={styles.editIconButton}
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
                  sx={styles.archiveIconButton}
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
                  sx={styles.restoreIconButton}
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
                  sx={styles.shareIconButton}
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
                  sx={styles.deleteIconButtonAccordion}
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
          {/* Currently Shared Users Section */}
          {isShared && task.sharedWith && task.sharedWith.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={styles.shareDialogSubtitle}>
                Currently Shared With:
              </Typography>
              <List>
                {task.sharedWith.map((sharedUser) => {
                  const sharedUserId = normalizeId(sharedUser);
                  const sharedUserData = typeof sharedUser === 'object' ? sharedUser : 
                    users.find(u => normalizeId(u) === sharedUserId) ||
                    selectedUsers.find(u => normalizeId(u) === sharedUserId);
                  const userName = sharedUserData?.name || 'Unknown User';
                  const userEmail = sharedUserData?.email || '';
                  return (
                    <ListItem key={sharedUserId} disablePadding>
                      <ListItemText 
                        primary={userName} 
                        secondary={userEmail}
                        sx={styles.shareDialogList}
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Remove sharing">
                          <IconButton
                            edge="end"
                            onClick={() => handleUnshare(sharedUserId)}
                            disabled={unsharingUserId === sharedUserId}
                            color="error"
                            size="small"
                          >
                            {unsharingUserId === sharedUserId ? (
                              <CircularProgress size={20} />
                            ) : (
                              <PersonRemoveIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  );
                })}
              </List>
              <Divider sx={styles.divider} />
            </>
          )}
          
          {/* Selected Users to Add Section */}
          {selectedUserIds.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={styles.shareDialogSubtitle}>
                Selected to Add:
              </Typography>
              <Box sx={styles.shareDialogSelectedBox}>
                {selectedUsers.map((user) => {
                  const userId = normalizeId(user);
                  // Don't show users that are already shared
                  const isAlreadyShared = task.sharedWith?.some(
                    su => normalizeId(su) === userId
                  );
                  if (isAlreadyShared) return null;
                  
                  return (
                    <Chip
                      key={userId}
                      label={`${user.name}${user.email ? ` (${user.email})` : ''}`}
                      onDelete={() => handleRemoveSelectedUser(userId)}
                      deleteIcon={<CloseIcon />}
                      color="primary"
                      variant="outlined"
                      size="small"
                    />
                  );
                })}
              </Box>
              <Divider sx={styles.divider} />
            </>
          )}
          
          {/* Search and Add Users Section */}
          <Typography variant="subtitle2" sx={styles.shareDialogSearchSubtitle}>
            {isShared ? 'Search and Add More Users:' : 'Search and Add Users:'}
          </Typography>
          <TextField
            fullWidth
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={styles.shareDialogSearchField}
            size="small"
          />
          
          {loadingUsers ? (
            <Box sx={styles.shareDialogLoaderBox}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <List>
              {users.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={styles.shareDialogEmptyText}>
                  {searchQuery.trim() 
                    ? 'No users found matching your search' 
                    : 'Type in the search box above to find users'}
                </Typography>
              ) : (
                users.map((user) => {
                  const userId = normalizeId(user);
                  const isSelected = selectedUserIds.includes(userId);
                  // Don't show users that are already shared
                  const isAlreadyShared = task.sharedWith?.some(
                    su => normalizeId(su) === userId
                  );
                  if (isAlreadyShared) return null;
                  
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
