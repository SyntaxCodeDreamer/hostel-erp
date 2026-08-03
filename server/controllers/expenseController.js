const Expense = require('../models/Expense');

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private (Admin)
const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({})
      .populate('addedBy', 'name')
      .sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create an expense
// @route   POST /api/expenses
// @access  Private (Admin)
const createExpense = async (req, res) => {
  const { date, category, description, amount } = req.body;

  try {
    const expense = new Expense({
      date: date || Date.now(),
      category,
      description,
      amount,
      addedBy: req.user._id
    });

    const createdExpense = await expense.save();
    res.status(201).json(createdExpense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update an expense
// @route   PUT /api/expenses/:id
// @access  Private (Admin)
const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (expense) {
      expense.date = req.body.date || expense.date;
      expense.category = req.body.category || expense.category;
      expense.description = req.body.description || expense.description;
      expense.amount = req.body.amount || expense.amount;

      const updatedExpense = await expense.save();
      res.json(updatedExpense);
    } else {
      res.status(404).json({ message: 'Expense not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private (Admin)
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (expense) {
      await expense.deleteOne();
      res.json({ message: 'Expense removed' });
    } else {
      res.status(404).json({ message: 'Expense not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get monthly expense summary (Aggregation)
// @route   GET /api/expenses/summary/monthly
// @access  Private (Admin/Leader)
const getMonthlySummary = async (req, res) => {
  try {
    const summary = await Expense.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            category: "$category"
          },
          totalAmount: { $sum: "$amount" }
        }
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1 }
      }
    ]);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getMonthlySummary
};
