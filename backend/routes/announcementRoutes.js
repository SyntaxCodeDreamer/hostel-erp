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
  .post(protect, authorize('Admin', 'Leader', 'Trust Member', 'Trustee'), createAnnouncement);

router.route('/:id')
  .put(protect, authorize('Admin', 'Leader', 'Trust Member', 'Trustee'), updateAnnouncement)
  .delete(protect, authorize('Admin', 'Leader', 'Trust Member', 'Trustee'), deleteAnnouncement);

module.exports = router;
