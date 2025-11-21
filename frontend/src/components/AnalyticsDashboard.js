import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography, Grid, useTheme } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { useTasks } from '../contexts/TaskContext';
import { useTheme as useThemeContext } from '../contexts/ThemeContext';
import { TaskStatus, TaskPriority } from '../constants/enums';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const AnalyticsDashboard = () => {
  const { tasks } = useTasks();
  const { darkMode } = useThemeContext();
  const theme = useTheme();

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

  const cardStyle = {
    bgcolor: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)',
    border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
    borderRadius: 3,
    boxShadow: darkMode ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.08)',
    transition: 'all 0.3s ease',
    '&:hover': { boxShadow: darkMode ? '0 8px 30px rgba(0,0,0,0.4)' : '0 8px 30px rgba(0,0,0,0.12)' }
  };

  const getChartData = (data) => ({
    labels: data.map(item => item.name),
    datasets: [
      { label: 'Completed', data: data.map(item => item.completed), backgroundColor: theme.palette.success.main, borderRadius: 8 },
      { label: 'Pending', data: data.map(item => item.pending), backgroundColor: theme.palette.error.main, borderRadius: 8 }
    ]
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, color: theme.palette.text.primary, font: { size: 12 } } },
      tooltip: { backgroundColor: darkMode ? '#1e1e1e' : '#fff', titleColor: theme.palette.text.primary, bodyColor: theme.palette.text.secondary, borderColor: theme.palette.divider, borderWidth: 1, padding: 12, cornerRadius: 8 }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: theme.palette.text.secondary, font: { size: 12 } }, border: { color: theme.palette.divider } },
      y: { grid: { color: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', drawBorder: false }, ticks: { color: theme.palette.text.secondary, font: { size: 12 } }, border: { color: theme.palette.divider } }
    }
  };

  const ChartCard = ({ title, data }) => (
    <Card sx={{ height: '100%', ...cardStyle }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>{title}</Typography>
        <Box sx={{ height: 320 }}><Bar data={getChartData(data)} options={chartOptions} /></Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 800, mb: 1, background: darkMode ? 'linear-gradient(135deg, #fff 0%, #e0e0e0 100%)' : 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          Task Analytics
        </Typography>
        <Typography variant="body1" color="text.secondary">Comprehensive overview of your task performance and completion rates</Typography>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}><ChartCard title="Status by Priority" data={stats.byPriority} /></Grid>
        <Grid item xs={12} lg={6}><ChartCard title="Status by Date" data={stats.byDate} /></Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;
