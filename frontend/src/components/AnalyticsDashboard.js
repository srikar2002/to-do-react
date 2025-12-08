import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography, Grid, useTheme } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { useTasks } from '../contexts/TaskContext';
import { useTheme as useThemeContext } from '../contexts/ThemeContext';
import { TaskStatus, TaskPriority } from '../constants/enums';
import { getAnalyticsStyles } from '../styles/analyticsStyles';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const AnalyticsDashboard = () => {
  const { tasks } = useTasks();
  const { darkMode } = useThemeContext();
  const theme = useTheme();
  const styles = getAnalyticsStyles(darkMode, theme);

  const stats = useMemo(() => {
    const allTasks = [...tasks.today, ...tasks.tomorrow, ...tasks.dayAfterTomorrow];
    return {
      byPriority: [TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW].map(p => ({
        name: p,
        completed: allTasks.filter(t => t.priority === p && t.status === TaskStatus.COMPLETED).length,
        pending: allTasks.filter(t => t.priority === p && t.status === TaskStatus.PENDING).length
      })),
      byDate: [
        { name: 'Today', tasks: tasks.today },
        { name: 'Tomorrow', tasks: tasks.tomorrow },
        { name: 'Day After', tasks: tasks.dayAfterTomorrow }
      ].map(item => ({
        name: item.name,
        completed: item.tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
        pending: item.tasks.filter(t => t.status === TaskStatus.PENDING).length
      }))
    };
  }, [tasks]);

  const getChartData = (data) => ({
    labels: data.map(item => item.name),
    datasets: [
      { label: 'Completed', data: data.map(item => item.completed), backgroundColor: theme.palette.success.main, borderRadius: 8 },
      { label: 'Pending', data: data.map(item => item.pending), backgroundColor: theme.palette.error.main, borderRadius: 8 }
    ]
  });

  const ChartCard = ({ title, data }) => (
    <Card sx={styles.chartCard}>
      <CardContent sx={styles.chartCardContent}>
        <Typography variant="h5" sx={styles.chartTitle}>{title}</Typography>
        <Box sx={styles.chartBox}>
          <Bar data={getChartData(data)} options={styles.chartOptions} />
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={styles.mainBox}>
      <Box sx={styles.headerBox}>
        <Typography variant="h3" sx={styles.title}>
          Task Analytics
        </Typography>
        <Typography variant="body1" sx={styles.subtitle}>
          Comprehensive overview of your task performance and completion rates
        </Typography>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}><ChartCard title="Status by Priority" data={stats.byPriority} /></Grid>
        <Grid item xs={12} lg={6}><ChartCard title="Status by Date" data={stats.byDate} /></Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;
