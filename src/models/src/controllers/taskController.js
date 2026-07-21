const Task = require('../models/Task');
const User = require('../models/User');

// Get tasks with advanced filtering
const getTasks = async (req, res) => {
  try {
    const { 
      status, priority, labels, search, 
      dueDate, assignee, sortBy = 'createdAt',
      order = 'desc', page = 1, limit = 10 
    } = req.query;

    const query = { createdBy: req.user.id };
    
    // Advanced filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (labels) query.labels = { $in: labels.split(',') };
    if (assignee) query.assignees = assignee;
    if (dueDate) {
      const date = new Date(dueDate);
      query.dueDate = { $lte: date };
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = order === 'desc' ? -1 : 1;

    const tasks = await Task.find(query)
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(query);

    // Get statistics
    const stats = {
      total: total,
      todo: await Task.countDocuments({ ...query, status: 'todo' }),
      inProgress: await Task.countDocuments({ ...query, status: 'in-progress' }),
      review: await Task.countDocuments({ ...query, status: 'review' }),
      done: await Task.countDocuments({ ...query, status: 'done' }),
      overdue: await Task.countDocuments({ 
        ...query, 
        dueDate: { $lt: new Date() },
        status: { $ne: 'done' }
      })
    };

    res.status(200).json({
      success: true,
      data: tasks,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create task with activity log
const createTask = async (req, res) => {
  try {
    req.body.createdBy = req.user.id;
    
    // Validate assignees
    if (req.body.assignees && req.body.assignees.length > 0) {
      const users = await User.find({ _id: { $in: req.body.assignees } });
      if (users.length !== req.body.assignees.length) {
        return res.status(404).json({
          success: false,
          message: 'Some assignees not found'
        });
      }
    }

    const task = await Task.create(req.body);
    
    // Update user stats
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { 'stats.totalTasks': 1 }
    });

    // Add activity log
    task.activityLog.push({
      user: req.user.id,
      action: 'created task'
    });
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar');

    res.status(201).json({
      success: true,
      data: populatedTask
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update task with progress tracking
const updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Track status change for stats
    if (req.body.status && req.body.status !== task.status) {
      if (req.body.status === 'done') {
        await User.findByIdAndUpdate(req.user.id, {
          $inc: { 'stats.tasksCompleted': 1 }
        });
      }
    }

    // Calculate actual time if status is done
    if (req.body.status === 'done' && task.status !== 'done') {
      req.body.actualTime = req.body.actualTime || 
        Math.round((Date.now() - task.createdAt) / (1000 * 60 * 60));
    }

    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Add activity log
    task.activityLog.push({
      user: req.user.id,
      action: 'updated task'
    });
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignees', 'name email avatar')
      .populate('createdBy', 'name email avatar')
      .populate('comments.user', 'name email avatar');

    res.status(200).json({
      success: true,
      data: populatedTask
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add subtask
const addSubtask = async (req, res) => {
  try {
    const { title } = req.body;
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.subtasks.push({ title });
    await task.save();

    res.status(200).json({
      success: true,
      data: task.subtasks
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle subtask completion
const toggleSubtask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) {
      return res.status(404).json({ success: false, message: 'Subtask not found' });
    }

    subtask.completed = !subtask.completed;
    await task.save();

    res.status(200).json({
      success: true,
      data: task.subtasks
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get task analytics
const getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all tasks for user
    const tasks = await Task.find({ createdBy: userId });
    
    // Time-based analytics
    const now = new Date();
    const lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const completedTasks = tasks.filter(t => t.status === 'done');
    const completedLastWeek = completedTasks.filter(t => 
      new Date(t.updatedAt) > lastWeek
    );

    // Priority distribution
    const priorityDistribution = {
      low: tasks.filter(t => t.priority === 'low').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      high: tasks.filter(t => t.priority === 'high').length,
      urgent: tasks.filter(t => t.priority === 'urgent').length
    };

    // Daily activity for heatmap
    const dailyActivity = {};
    tasks.forEach(task => {
      const date = task.createdAt.toISOString().split('T')[0];
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    });

    // Average completion time
    const completionTimes = completedTasks.map(task => 
      (new Date(task.updatedAt) - new Date(task.createdAt)) / (1000 * 60 * 60)
    );
    
    const avgCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

    // User stats
    const user = await User.findById(userId);
    
    res.status(200).json({
      success: true,
      data: {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        completionRate: tasks.length > 0 
          ? (completedTasks.length / tasks.length * 100).toFixed(1)
          : 0,
        tasksThisWeek: completedLastWeek.length,
        priorityDistribution,
        dailyActivity,
        avgCompletionTime: Math.round(avgCompletionTime),
        streak: user?.stats?.streak || 0,
        productivityScore: tasks.length > 0 
          ? Math.round((completedTasks.length / tasks.length) * 100)
          : 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  addSubtask,
  toggleSubtask,
  getAnalytics
};
