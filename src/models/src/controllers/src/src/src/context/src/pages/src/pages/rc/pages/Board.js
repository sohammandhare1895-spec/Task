import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCorners, DragOverlay } from '@dnd-kit/core';
import { FaPlus, FaUser, FaClock, FaTag } from 'react-icons/fa';
import toast from 'react-hot-toast';

const Board = () => {
  const [tasks, setTasks] = useState({ todo: [], 'in-progress': [], review: [], done: [] });
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);
  const { socket } = useSocket();
  const { user } = useAuth();

  const columns = [
    { id: 'todo', title: 'To Do', icon: '📝', color: 'blue' },
    { id: 'in-progress', title: 'In Progress', icon: '⚡', color: 'yellow' },
    { id: 'review', title: 'Review', icon: '👀', color: 'purple' },
    { id: 'done', title: 'Done', icon: '✅', color: 'green' },
  ];

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleTaskCreated = (task) => {
      setTasks(prev => ({
        ...prev,
        [task.status]: [task, ...prev[task.status]]
      }));
      toast.success(`✨ New task: ${task.title}`);
    };

    const handleTaskUpdated = (updatedTask) => {
      setTasks(prev => {
        const newTasks = { ...prev };
        Object.keys(newTasks).forEach(key => {
          newTasks[key] = newTasks[key].filter(t => t._id !== updatedTask._id);
        });
        newTasks[updatedTask.status] = [updatedTask, ...newTasks[updatedTask.status]];
        return newTasks;
      });
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);

    return () => {
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
    };
  }, [socket]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/tasks`);
      const grouped = {};
      columns.forEach(col => grouped[col.id] = []);
      data.data.forEach(task => {
        if (grouped[task.status]) grouped[task.status].push(task);
      });
      setTasks(grouped);
    } catch (error) {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const taskId = active.id;
    const newStatus = over.id;
    
    try {
      const { data } = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/tasks/${taskId}`,
        { status: newStatus }
      );
      
      socket?.emit('task:update', data.data);
      
      // Update local state
      setTasks(prev => {
        const newTasks = { ...prev };
        let taskToMove = null;
        Object.keys(newTasks).forEach(key => {
          newTasks[key] = newTasks[key].filter(t => {
            if (t._id === taskId) {
              taskToMove = t;
              return false;
            }
            return true;
          });
        });
        if (taskToMove) {
          newTasks[newStatus] = [{ ...taskToMove, status: newStatus }, ...newTasks[newStatus]];
        }
        return newTasks;
      });
      
      toast.success(`Task moved to ${columns.find(c => c.id === newStatus)?.title}`);
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Board</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Drag and drop tasks to update status</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            Total: {Object.values(tasks).flat().length}
          </span>
        </div>
      </div>

      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {columns.map((column) => (
            <motion.div
              key={column.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 min-h-[500px]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{column.icon}</span>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{column.title}</h3>
                  <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
                    {tasks[column.id]?.length || 0}
                  </span>
                </div>
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all">
                  <FaPlus className="text-gray-400 text-sm" />
                </button>
              </div>

              <div className="space-y-3">
                <AnimatePresence>
                  {tasks[column.id]?.map((task) => (
                    <motion.div
                      key={task._id}
                      id={task._id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ scale: 1.02 }}
                      className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-lg transition-all"
                    >
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          task.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          task.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {task.priority}
                        </span>
                        {task.labels?.map((label, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded-full text-xs font-medium">
                            #{label}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-3">
                          {task.assignees?.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <FaUser className="text-gray-400" />
                              <span>{task.assignees.length}</span>
                            </div>
                          )}
                          {task.dueDate && (
                            <div className="flex items-center space-x-1">
                              <FaClock className="text-gray-400" />
                              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <FaTag className="text-gray-400" />
                          <span>{task.subtasks?.filter(s => s.completed).length || 0}/{task.subtasks?.length || 0}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {tasks[column.id]?.length === 0 && (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                    <p className="text-sm">No tasks yet</p>
                    <p className="text-xs mt-1">Drop tasks here</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-2xl">
              <h4 className="font-medium">{activeTask.title}</h4>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default Board;
