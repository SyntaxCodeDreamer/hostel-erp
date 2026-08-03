const express = require('express');
const router = express.Router();
const {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getAnnouncements)
  .post(protect, authorize('Admin', 'Leader'), createAnnouncement);

router.route('/:id')
  .put(protect, authorize('Admin', 'Leader'), updateAnnouncement)
  .delete(protect, authorize('Admin', 'Leader'), deleteAnnouncement);

module.exports = router;
