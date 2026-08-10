const Task = require('../models/Task');
const Notification = require('../models/Notification');

// @desc    Get all tasks (filtered by ownership for Students)
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    let query = {};
    const userRole = (req.user.role || '').toLowerCase();
    
    if (userRole === 'student') {
      // Students only see tasks assigned to them
      query.assignedTo = req.user._id;
    }

    const { page, limit } = req.query;

    if (page) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 6;
      const skip = (pageNum - 1) * limitNum;

      const totalCount = await Task.countDocuments(query);
      const tasks = await Task.find(query)
        .populate('assignedTo', 'name email role')
        .populate('createdBy', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      const totalPages = Math.ceil(totalCount / limitNum) || 1;
      const hasMore = pageNum < totalPages;

      return res.json({
        data: tasks,
        page: pageNum,
        totalPages,
        hasMore,
        totalCount
      });
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a task
// @route   POST /api/tasks
// @access  Private (Admin/Leader)
const createTask = async (req, res) => {
  const { title, description, assignedTo, priority, dueDate } = req.body;

  try {
    const task = new Task({
      title,
      description,
      assignedTo,
      priority,
      dueDate,
      createdBy: req.user._id
    });

    const createdTask = await task.save();

    if (assignedTo) {
      const notif = new Notification({
        userId: assignedTo,
        title: 'New Task Assigned',
        message: `You have been assigned a new task: ${title}`,
        type: 'Task'
      });
      await notif.save();

      const socketId = req.app.locals.connectedUsers.get(assignedTo.toString());
      if (socketId) {
        req.app.locals.io.to(socketId).emit('new_notification', notif);
      }
    }

    res.status(201).json(createdTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update task status
// @route   PUT /api/tasks/:id/status
// @access  Private
const updateTaskStatus = async (req, res) => {
  const { status } = req.body;

  try {
    const task = await Task.findById(req.params.id);

    if (task) {
      const userRole = (req.user.role || '').toLowerCase();
      // If student, they can only update their own tasks
      if (userRole === 'student' && task.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this task' });
      }

      task.status = status;
      const updatedTask = await task.save();
      res.json(updatedTask);
    } else {
      res.status(404).json({ message: 'Task not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTaskStatus
};
