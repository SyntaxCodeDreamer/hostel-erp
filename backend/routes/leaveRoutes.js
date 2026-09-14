const express = require('express');
const router = express.Router();
const {
  getLeaveRequests,
  getLeaveRequestById,
  createLeaveRequest,
  updateLeaveRequest,
  updateLeaveStatus
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getLeaveRequests)
  .post(protect, authorize('Student', 'Leader'), createLeaveRequest);

router.route('/:id')
  .get(protect, getLeaveRequestById)
  .put(protect, authorize('Student', 'Leader'), updateLeaveRequest);

router.route('/:id/status')
  .put(protect, authorize('Admin', 'Leader'), updateLeaveStatus);

module.exports = router;
