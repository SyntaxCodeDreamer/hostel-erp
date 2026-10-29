const mongoose = require('mongoose');

const exemptedPeriodSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ExemptedPeriod', exemptedPeriodSchema);

