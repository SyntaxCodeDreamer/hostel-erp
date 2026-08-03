const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  category: {
    type: String,
    required: true,
    enum: ['Food', 'Vegetables', 'Milk', 'Grocery', 'Electricity', 'Water', 'Gas', 'Maintenance', 'Miscellaneous']
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

const Expense = mongoose.model('Expense', expenseSchema);
module.exports = Expense;
