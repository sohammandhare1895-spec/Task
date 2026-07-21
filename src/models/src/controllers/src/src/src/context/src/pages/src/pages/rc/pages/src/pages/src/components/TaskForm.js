import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { motion } from 'framer-motion';
import { FaTimes, FaPlus, FaUserPlus } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Select from 'react-select';

const TaskForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: '',
    estimatedTime: '',
    assignees: [],
    labels: [],
    subtasks: [{ title: '' }],
    recurrence: 'none'
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/users`);
        setUsers(data.data.map(u => ({ value: u._id, label: u.name })));
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();

    if (id) {
      fetchTask();
    }
  }, [id]);

  const fetchTask = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/tasks/${id}`);
      const task = data.data;
      setFormData({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        estimatedTime: task.estimatedTime || '',
        assignees: task.assignees?.map(a => ({ value: a._id, label: a.name })) || [],
        labels: task.labels || [],
        subtasks: task.subtasks?.length ? task.subtasks : [{ title: '' }],
        recurrence: task.recurrence || 'none'
      });
    } catch (error) {
      toast.error('Failed to load task');
      navigate('/board');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubtaskChange = (index, value) => {
    const newSubtasks = [...formData.subtasks];
    newSubtasks[index].title = value;
    setFormData({ ...formData, subtasks: newSubtasks });
  };

  const addSubtask = () => {
    setFormData({
      ...formData,
      subtasks: [...formData.subtasks, { title: '' }]
    });
  };

  const removeSubtask = (index) => {
    const newSubtasks = formData.subtasks.filter((_, i) => i !== index);
    setFormData({ ...formData, subtasks: newSubtasks });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const taskData = {
        ...formData,
        assignees: formData.assignees.map(a => a.value),
        subtasks: formData.subtasks.filter(s => s.title.trim()),
        estimatedTime: parseFloat(formData.estimatedTime) || 0,
        dueDate: formData.dueDate || undefined
      };

      let response;
      if (id) {
        response = await axios.put(`${process.env.REACT_APP_API_URL}/api/tasks/${id}`, taskData);
        socket?.emit('task:update', response.data.data);
        toast.success('✨ Task updated successfully!');
      } else {
        response = await axios.post(`${process.env.REACT_APP_API_URL}/api/tasks`, taskData);
        socket?.emit('task:create', response.data.data);
        toast.success('🎉 Task created successfully!');
      }

      navigate('/board');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save task');
    } finally {
      setSaving(false);
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-6">
          <h2 className="text-2xl font-bold text-white">
            {id ? '✏️ Edit Task' : '✨ Create New Task'}
          </h2>
          <p className="text-purple-100 mt-1">
            {id ? 'Update your task details' : 'Add a new task to your board'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="Enter task title"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              rows="4"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="Enter task description"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              >
                <option value="todo">📝 To Do</option>
                <option value="in-progress">⚡ In Progress</option>
                <option value="review">👀 Review</option>
                <option value="done">✅ Done</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🟠 High</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Due Date
              </label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Estimated Time (hours)
              </label>
              <input
                type="number"
                name="estimatedTime"
                value={formData.estimatedTime}
                onChange={handleChange}
                min="0"
                step="0.5"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="e.g., 2.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Assignees
            </label>
            <Select
              isMulti
              options={users}
              value={formData.assignees}
              onChange={(selected) => setFormData({ ...formData, assignees: selected || [] })}
              className="react-select-container"
              classNamePrefix="react-select"
              placeholder="Search and select team members..."
              styles={{
                control: (base) => ({
                  ...base,
                  background: 'rgb(249 250 251)',
                  borderColor: 'rgb(229 231 235)',
                  borderRadius: '0.75rem',
                  padding: '0.25rem',
                  '&:hover': {
                    borderColor: 'rgb(139 92 246)',
                  },
                }),
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Labels
            </label>
            <input
              type="text"
              value={formData.labels.join(', ')}
              onChange={(e) => {
                const labels = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                setFormData({ ...formData, labels });
              }}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="Enter labels separated by commas (e.g., design, frontend, bug)"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Subtasks
            </label>
            <div className="space-y-3">
              {formData.subtasks.map((subtask, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={subtask.title}
                    onChange={(e) => handleSubtaskChange(index, e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder={`Subtask ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeSubtask(index)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                  >
                    <FaTimes />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSubtask}
                className="inline-flex items-center px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-all"
              >
                <FaPlus className="mr-2" />
                Add Subtask
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Recurrence
            </label>
            <select
              name="recurrence"
              value={formData.recurrence}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            >
              <option value="none">No recurrence</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/board')}
              className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-300 disabled:opacity-50"
            >
              {saving ? 'Saving...' : (id ? 'Update Task' : 'Create Task')}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default TaskForm;
