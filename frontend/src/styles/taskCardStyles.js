/**
 * TaskCard Component Styles
 * Extracted styles for the TaskCard component
 */

export const getTaskCardStyles = (theme, isArchived, isCompleted) => ({
  completedCard: {
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
  },
  completedTitleBox: {
    minWidth: 0,
    flexGrow: 1,
    overflow: 'hidden',
    mr: 1
  },
  completedTitle: {
    textDecoration: 'line-through',
    color: 'text.secondary',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.4,
    minWidth: 0
  },
  completedActionsBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    flexShrink: 0
  },
  completedIconButton: {
    padding: 0.5,
    minWidth: 32,
    width: 32,
    height: 32
  },
  deleteIconButton: {
    padding: 0.5,
    minWidth: 32,
    width: 32,
    height: 32,
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark' 
        ? 'rgba(211, 47, 47, 0.16)' 
        : 'rgba(211, 47, 47, 0.08)'
    }
  },
  accordion: {
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
  },
  accordionSummary: {
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
  },
  titleBox: {
    minWidth: 0,
    flexGrow: 1,
    overflow: 'hidden'
  },
  title: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontWeight: 500,
    fontSize: '0.95rem',
    lineHeight: 1.4,
    minWidth: 0
  },
  accordionDetails: {
    pt: 2,
    pb: 2,
    px: 2
  },
  detailsContentBox: {
    flexGrow: 1,
    minWidth: 0
  },
  description: {
    mb: 1.5,
    wordBreak: 'break-word',
    lineHeight: 1.6,
    fontSize: '0.875rem'
  },
  tagsBox: {
    display: 'flex',
    gap: 0.75,
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  chip: {
    fontSize: '0.75rem',
    height: 24
  },
  actionsBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.75,
    flexShrink: 0
  },
  iconButton: {
    width: 36,
    height: 36,
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark' 
        ? 'rgba(255, 255, 255, 0.08)' 
        : 'rgba(0, 0, 0, 0.04)'
    }
  },
  editIconButton: {
    width: 36,
    height: 36,
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark' 
        ? 'rgba(25, 118, 210, 0.16)' 
        : 'rgba(25, 118, 210, 0.08)'
    }
  },
  archiveIconButton: {
    width: 36,
    height: 36,
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark' 
        ? 'rgba(255, 255, 255, 0.08)' 
        : 'rgba(0, 0, 0, 0.04)'
    }
  },
  restoreIconButton: {
    width: 36,
    height: 36,
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark' 
        ? 'rgba(25, 118, 210, 0.16)' 
        : 'rgba(25, 118, 210, 0.08)'
    }
  },
  shareIconButton: {
    width: 36,
    height: 36,
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark' 
        ? 'rgba(25, 118, 210, 0.16)' 
        : 'rgba(25, 118, 210, 0.08)'
    }
  },
  deleteIconButtonAccordion: {
    width: 36,
    height: 36,
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark' 
        ? 'rgba(211, 47, 47, 0.16)' 
        : 'rgba(211, 47, 47, 0.08)'
    }
  },
  shareDialogSubtitle: {
    mt: 1,
    mb: 1,
    fontWeight: 600
  },
  shareDialogList: {
    pr: 6
  },
  shareDialogSelectedBox: {
    mb: 2,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 1
  },
  shareDialogSearchSubtitle: {
    mb: 1,
    fontWeight: 600
  },
  shareDialogSearchField: {
    mb: 2
  },
  shareDialogLoaderBox: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100
  },
  shareDialogEmptyText: {
    py: 2,
    align: 'center'
  },
  completedFlexBox: {
    minWidth: 0,
    overflow: 'hidden'
  },
  accordionFlexBox: {
    minWidth: 0,
    overflow: 'hidden'
  },
  chipIcon: {
    fontSize: '0.875rem !important'
  },
  divider: {
    my: 2
  }
});

