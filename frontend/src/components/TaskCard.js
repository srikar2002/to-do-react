import React, { useState, useEffect, useMemo } from 'react';
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
import { useTasks } from '../hooks/useTasks';
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
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [unsharingUserId, setUnsharingUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { getUsers, shareTask, unshareTask } = useTasks();
  const { user: currentUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  // Helper to normalize ID to string
  const normalizeId = (id) => (id?._id || id)?.toString();
  
  // Memoize computed values
  const currentUserId = useMemo(() => normalizeId(currentUser?.id || currentUser?._id), [currentUser]);
  const taskUserId = useMemo(() => normalizeId(task.userId), [task.userId]);
  const isOwner = taskUserId === currentUserId;
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
      setSelectedUserIds([]);
      setUsers([]);
      setSearchQuery('');
    }
  }, [shareDialogOpen, isOwner]);

  // Search users when query changes (with debounce)
  useEffect(() => {
    if (!shareDialogOpen || !isOwner) return;
    
    if (!searchQuery.trim()) {
      setUsers([]);
      setLoadingUsers(false);
      return;
    }
    
    const timeout = setTimeout(() => loadUsers(searchQuery.trim()), 300);
    return () => clearTimeout(timeout);
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

  const handleCloseShareDialog = () => {
    setShareDialogOpen(false);
    setSelectedUserIds([]);
    setSearchQuery('');
  };

  const handleToggleUser = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Helper: Get user data by ID
  const getUserData = (userId) => {
    return users.find(u => normalizeId(u) === userId) || 
           task.sharedWith?.find(su => normalizeId(su) === userId);
  };

  // Helper: Check if user is already shared
  const isAlreadyShared = (userId) => {
    return task.sharedWith?.some(su => normalizeId(su) === userId) || false;
  };

  // Get selected users from selectedUserIds
  const selectedUsers = useMemo(() => 
    selectedUserIds.map(id => users.find(u => normalizeId(u) === id)).filter(Boolean),
    [selectedUserIds, users]
  );

  const handleShare = async () => {
    const newUserIds = selectedUserIds.filter(id => !isAlreadyShared(id));
    if (newUserIds.length === 0) {
      enqueueSnackbar('Please select at least one new user to share with', { variant: 'warning' });
      return;
    }
    setSharing(true);
    const result = await shareTask(task._id, newUserIds);
    enqueueSnackbar(
      result.success ? 'Task shared successfully' : (result.message || 'Failed to share task'),
      { variant: result.success ? 'success' : 'error' }
    );
    if (result.success) handleCloseShareDialog();
    setSharing(false);
  };

  const handleUnshare = async (userId) => {
    setUnsharingUserId(userId);
    const result = await unshareTask(task._id, userId);
    enqueueSnackbar(
      result.success ? 'User removed from shared task' : (result.message || 'Failed to unshare task'),
      { variant: result.success ? 'success' : 'error' }
    );
    setUnsharingUserId(null);
  };

  // Helper: Action button component
  const ActionButton = ({ icon: Icon, onClick, tooltip, disabled, color, sx }) => (
    <Tooltip title={tooltip}>
      <span>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onClick(); }} 
          color={color} disabled={disabled} sx={sx}>
          <Icon fontSize="small" />
        </IconButton>
      </span>
    </Tooltip>
  );

  // Helper: Render chips
  const renderChips = () => {
    const chips = [
      { label: task.status, color: 'default' },
      task.priority && { 
        label: task.priority, 
        color: task.priority === TaskPriority.HIGH ? 'error' : task.priority === TaskPriority.MEDIUM ? 'warning' : 'default' 
      },
      task.rollover && { label: 'Auto-rollover', color: 'info' },
      task.parentTaskId && { label: 'Recurring', icon: RepeatIcon, color: 'secondary' },
      isShared && { label: `Shared (${task.sharedWith?.length || 0})`, icon: PeopleIcon, color: 'info' },
      !isOwner && task.userId && { label: `By ${task.userId.name || 'Unknown'}`, color: 'default' },
      ...(task.tags || []).map(tag => ({ label: tag, color: 'primary' }))
    ].filter(Boolean);

    return chips.map((chip, idx) => (
      <Chip
        key={idx}
        label={chip.label}
        icon={chip.icon ? <chip.icon sx={styles.chipIcon} /> : undefined}
        size="small"
        color={chip.color}
        variant="outlined"
        sx={styles.chip}
      />
    ));
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
            <ActionButton
              icon={CheckCircleIcon}
              onClick={() => !isArchived && onToggleStatus()}
              tooltip={isArchived ? "Cannot change status of archived tasks" : "Mark as incomplete"}
              disabled={isArchived}
              color="success"
              sx={styles.completedIconButton}
            />
            <ActionButton
              icon={DeleteIcon}
              onClick={() => isOwner && onDelete()}
              tooltip={isOwner ? "Delete task" : "Only task owner can delete"}
              disabled={!isOwner}
              color="error"
              sx={styles.deleteIconButton}
            />
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
          {...(!isArchived && !isCompleted ? { ...listeners } : {})}
          sx={{
            ...styles.accordionSummary,
            ...(!isArchived && !isCompleted ? { cursor: 'grab', '&:active': { cursor: 'grabbing' } } : {})
          }}
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
              {renderChips()}
            </Box>
          </Box>
          <Box display="flex" flexDirection="column" gap={0.75} sx={styles.actionsBox}>
            <ActionButton
              icon={RadioButtonUncheckedIcon}
              onClick={() => !isArchived && onToggleStatus()}
              tooltip={isArchived ? "Cannot change status of archived tasks" : "Mark as completed"}
              disabled={isArchived}
              color="default"
              sx={styles.iconButton}
            />
            <ActionButton
              icon={EditIcon}
              onClick={onEdit}
              tooltip="Edit task"
              color="primary"
              sx={styles.editIconButton}
            />
            {showArchive && !isArchived && (
              <ActionButton
                icon={ArchiveIcon}
                onClick={onArchive}
                tooltip="Archive task"
                color="default"
                sx={styles.archiveIconButton}
              />
            )}
            {isArchived && onRestore && (
              <ActionButton
                icon={UnarchiveIcon}
                onClick={onRestore}
                tooltip="Restore task"
                color="primary"
                sx={styles.restoreIconButton}
              />
            )}
            {isOwner && !isArchived && (
              <ActionButton
                icon={ShareIcon}
                onClick={() => setShareDialogOpen(true)}
                tooltip="Share task"
                color="primary"
                sx={styles.shareIconButton}
              />
            )}
            {!isArchived && (
              <ActionButton
                icon={DeleteIcon}
                onClick={onDelete}
                tooltip="Delete task"
                disabled={!isOwner}
                color="error"
                sx={styles.deleteIconButtonAccordion}
              />
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
                  const sharedUserData = typeof sharedUser === 'object' ? sharedUser : getUserData(sharedUserId);
                  const isUnsharing = unsharingUserId === sharedUserId;
                  return (
                    <ListItem key={sharedUserId} disablePadding>
                      <ListItemText 
                        primary={sharedUserData?.name || 'Unknown User'} 
                        secondary={sharedUserData?.email || ''}
                        sx={styles.shareDialogList}
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Remove sharing">
                          <IconButton
                            edge="end"
                            onClick={() => handleUnshare(sharedUserId)}
                            disabled={isUnsharing}
                            color="error"
                            size="small"
                          >
                            {isUnsharing ? <CircularProgress size={20} /> : <PersonRemoveIcon fontSize="small" />}
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
                {selectedUsers
                  .filter((user, index, self) => {
                    const userId = normalizeId(user);
                    return index === self.findIndex(u => normalizeId(u) === userId) && !isAlreadyShared(userId);
                  })
                  .map((user) => {
                    const userId = normalizeId(user);
                    return (
                      <Chip
                        key={userId}
                        label={`${user.name}${user.email ? ` (${user.email})` : ''}`}
                        onDelete={() => setSelectedUserIds(prev => prev.filter(id => id !== userId))}
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
                  {searchQuery.trim() ? 'No users found matching your search' : 'Type in the search box above to find users'}
                </Typography>
              ) : (
                users
                  .filter(user => !isAlreadyShared(normalizeId(user)))
                  .map((user) => {
                    const userId = normalizeId(user);
                    return (
                      <ListItem key={userId} disablePadding>
                        <ListItemButton onClick={() => handleToggleUser(userId)}>
                          <Checkbox checked={selectedUserIds.includes(userId)} />
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
