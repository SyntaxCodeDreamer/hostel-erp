const express = require('express');
const router = express.Router();
const {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getMonthlySummary
} = require('../controllers/expenseController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

router.get('/summary/monthly', authorize('Admin', 'Leader'), getMonthlySummary);

router.route('/')
  .get(authorize('Admin', 'Leader'), getExpenses)
  .post(authorize('Admin', 'Leader'), createExpense);

router.route('/:id')
  .put(authorize('Admin', 'Leader'), updateExpense)
  .delete(authorize('Admin', 'Leader'), deleteExpense);

module.exports = router;
