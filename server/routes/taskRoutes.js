const express = require('express');
const router = express.Router();
const {
  getTasks,
  createTask,
  updateTaskStatus
} = require('../controllers/taskController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getTasks)
  .post(protect, authorize('Admin', 'Leader'), createTask);

router.route('/:id/status')
  .put(protect, updateTaskStatus);

module.exports = router;
