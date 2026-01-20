import React from 'react';
import {
  Grid,
  Card,
  Box,
  Typography,
  IconButton,
  Button
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { TaskStatus } from '../constants/enums';
import { getTasksForDate, getTaskSummary, formatWeekRange } from '../services/dashboardService';
import { getDashboardStyles } from '../styles/dashboardStyles';

const WeeklyView = ({ weekDates, allTasks, today, weekStartDate, onPreviousWeek, onNextWeek, onTodayWeek, darkMode }) => {
  const styles = getDashboardStyles(darkMode);

  return (
    <Grid item xs={12}>
      <Card sx={styles.weeklyViewCard}>
        <Box sx={styles.weeklyHeaderBox}>
          <IconButton onClick={onPreviousWeek} size="small" sx={styles.weeklyNavButton}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" sx={styles.weeklyTitle}>
            {formatWeekRange(weekStartDate)}
          </Typography>
          <Box sx={styles.weeklyButtonBox}>
            <Button onClick={onTodayWeek} size="small" variant="outlined" sx={styles.todayButton}>
              Today
            </Button>
            <IconButton onClick={onNextWeek} size="small" sx={styles.weeklyNavButton}>
              <ChevronRightIcon />
            </IconButton>
          </Box>
        </Box>
        <Grid container spacing={1}>
          {weekDates.map(dateStr => {
            const dateTasks = getTasksForDate(allTasks, dateStr);
            const pending = dateTasks.filter(t => t.status === TaskStatus.PENDING);
            const completed = dateTasks.filter(t => t.status === TaskStatus.COMPLETED);
            const isToday = dateStr === today;
            const d = dayjs(dateStr);
            const taskSummary = getTaskSummary(dateTasks);
            return (
              <Grid item xs={12} sm={6} md={true} key={dateStr} sx={styles.weeklyGridItem}>
                <Box sx={styles.weekDayBox(isToday)}>
                  <Typography variant="caption" sx={styles.weekDayLabel}>
                    {d.format('ddd')}
                  </Typography>
                  <Box sx={styles.weeklyDayNumberBox}>
                    <Typography variant="h6" sx={styles.weekDayNumber(isToday)}>
                      {d.format('D')}
                    </Typography>
                    <Box sx={styles.weeklyStatusDotsBox}>
                      {pending.length > 0 && <Box sx={styles.weeklyStatusDot(true, darkMode)} />}
                      {completed.length > 0 && <Box sx={styles.weeklyStatusDot(false, darkMode)} />}
                    </Box>
                  </Box>
                  <Typography variant="caption" sx={styles.weekDaySummary}>
                    {taskSummary}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Card>
    </Grid>
  );
};

export default WeeklyView;
