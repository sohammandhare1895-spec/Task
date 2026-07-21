import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';
import { 
  FaTasks, FaChartLine, FaSignOutAlt, FaUser, 
  FaSun, FaMoon, FaPlus, FaBell, FaSearch,
  FaThLarge, FaList 
} from 'react-icons/fa';
import { useState } from 'react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [view, setView] = useState('board');

  const navItems = [
    { icon: FaTasks, label: 'Board', path: '/board' },
    { icon: FaChartLine, label: 'Analytics', path: '/analytics' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-20 bg-white dark:bg-gray-800 shadow-2xl flex flex-col items-center py-6 z-50">
        <div className="mb-8">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
            TF
          </div>
        </div>

        <nav className="flex-1 space-y-4">
          {navItems.map((item, index) => (
            <motion.button
              key={item.path}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(item.path)}
              className="w-12 h-12 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-gray-700 transition-all relative group"
            >
              <item.icon className="text-xl" />
              <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.label}
              </span>
            </motion.button>
          ))}
        </nav>

        <div className="space-y-4">
          <button
            onClick={toggleTheme}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-gray-700 transition-all"
          >
            {theme === 'light' ? <FaMoon className="text-xl" /> : <FaSun className="text-xl" />}
          </button>
          
          <button
            onClick={logout}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <FaSignOutAlt className="text-xl" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-20">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold gradient-text">TaskFlow</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                isConnected 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {isConnected ? '● Online' : '● Offline'}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all w-64"
                />
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>

              <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all relative">
                <FaBell className="text-gray-600 dark:text-gray-400 text-xl" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <button
                onClick={() => navigate('/task/new')}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center space-x-2"
              >
                <FaPlus />
                <span>New Task</span>
              </button>

              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center text-white font-semibold">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
