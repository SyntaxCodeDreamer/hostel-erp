const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getExemptedPeriods,
  createExemptedPeriod,
  updateExemptedPeriod,
  deleteExemptedPeriod
} = require('../controllers/exemptedPeriodController');

router
  .route('/')
  .get(protect, getExemptedPeriods)
  .post(protect, authorize('Admin', 'admin'), createExemptedPeriod);

router
  .route('/:id')
  .put(protect, authorize('Admin', 'admin'), updateExemptedPeriod)
  .delete(protect, authorize('Admin', 'admin'), deleteExemptedPeriod);

module.exports = router;

