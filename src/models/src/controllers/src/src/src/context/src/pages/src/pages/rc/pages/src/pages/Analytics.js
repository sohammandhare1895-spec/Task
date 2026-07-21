import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FaTrophy, FaChartBar, FaClock, FaCheckCircle, FaCalendar } from 'react-icons/fa';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/tasks/analytics`);
      setAnalytics(data.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="loader"></div>
      </div>
    );
  }

  if (!analytics) return null;

  const lineChartData = {
    labels: Object.keys(analytics.dailyActivity).slice(-7),
    datasets: [
      {
        label: 'Tasks Created',
        data: Object.values(analytics.dailyActivity).slice(-7),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const doughnutData = {
    labels: ['Low', 'Medium', 'High', 'Urgent'],
    datasets: [
      {
        data: [
          analytics.priorityDistribution.low,
          analytics.priorityDistribution.medium,
          analytics.priorityDistribution.high,
          analytics.priorityDistribution.urgent,
        ],
        backgroundColor: [
          'rgb(52, 211, 153)',
          'rgb(251, 191, 36)',
          'rgb(251, 146, 60)',
          'rgb(239, 68, 68)',
        ],
        borderWidth: 0,
      },
    ],
  };

  const stats = [
    {
      icon: FaCheckCircle,
      label: 'Completion Rate',
      value: `${analytics.completionRate}%`,
      color: 'green',
      bg: 'bg-green-50 dark:bg-green-900/20',
      iconBg: 'bg-green-500',
    },
    {
      icon: FaTrophy,
      label: 'Tasks Done',
      value: analytics.completedTasks,
      color: 'purple',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      iconBg: 'bg-purple-500',
    },
    {
      icon: FaChartBar,
      label: 'Productivity Score',
      value: analytics.productivityScore,
      color: 'blue',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      iconBg: 'bg-blue-500',
    },
    {
      icon: FaClock,
      label: 'Avg Completion Time',
      value: `${analytics.avgCompletionTime}h`,
      color: 'orange',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      iconBg: 'bg-orange-500',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track your productivity and progress</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm font-semibold">
            🔥 Streak: {analytics.streak} days
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${stat.bg} rounded-2xl p-6 backdrop-blur-sm border border-white/20 dark:border-gray-700/30`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center text-white`}>
                <stat.icon className="text-xl" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <FaCalendar className="inline-block mr-2 text-purple-500" />
            Daily Activity (Last 7 Days)
          </h3>
          <Line 
            data={lineChartData} 
            options={{
              responsive: true,
              plugins: {
                legend: {
                  display: false,
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { stepSize: 1 },
                },
              },
            }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <FaChartBar className="inline-block mr-2 text-purple-500" />
            Priority Distribution
          </h3>
          <div className="flex items-center justify-center">
            <div className="w-64 h-64">
              <Doughnut 
                data={doughnutData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Additional Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          📊 Quick Stats
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalTasks}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">Tasks This Week</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.tasksThisWeek}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">Tasks Today</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {Object.values(analytics.dailyActivity).slice(-1)[0] || 0}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">Productivity</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {analytics.productivityScore}%
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Analytics;
