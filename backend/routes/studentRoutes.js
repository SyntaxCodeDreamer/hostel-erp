const express = require('express');
const router = express.Router();
const {
  getStudents,
  getMyStudentProfile,
  getStudentById,
  createStudent,
  updateMyStudentProfile,
  updateStudent,
  addProgressItem,
  deleteProgressItem,
  deleteStudent
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getStudents)
  .post(protect, authorize('Admin', 'admin'), createStudent);

router.route('/me')
  .get(protect, getMyStudentProfile)
  .put(protect, updateMyStudentProfile);

router.route('/me/progress')
  .post(protect, addProgressItem);

router.route('/:id/progress')
  .post(protect, addProgressItem);

router.route('/:id/progress/:itemId')
  .delete(protect, deleteProgressItem);

router.route('/:id')
  .get(protect, getStudentById)
  .put(protect, updateStudent)
  .delete(protect, authorize('Admin', 'admin', 'Leader', 'leader'), deleteStudent);

module.exports = router;
