const express = require('express');
const router = express.Router();
const {
  getLeaveRequests,
  createLeaveRequest,
  updateLeaveStatus
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getLeaveRequests)
  .post(protect, authorize('Student'), createLeaveRequest);

router.route('/:id/status')
  .put(protect, authorize('Admin', 'Leader'), updateLeaveStatus);

module.exports = router;
