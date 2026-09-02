const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  reason: { type: String, required: true },
  fromDate: { type: Date, required: true },
  fromTime: { type: String, default: '' },
  toDate: { type: Date, required: true },
  toTime: { type: String, default: '' },
  requestedDays: { type: Number },
  previousLeaveDays: { type: Number, default: 0 },
  destination: { type: String, required: true },
  emergencyContact: { type: String, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

leaveRequestSchema.index({ studentId: 1, status: 1 });
leaveRequestSchema.index({ createdAt: -1 });

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

module.exports = LeaveRequest;
