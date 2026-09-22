const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  appliedDate: {
    type: Date,
    default: Date.now
  },
  reason: { type: String, required: true },
  fromDate: { type: Date, required: true },
  fromTime: { type: String, default: '' },
  toDate: { type: Date, required: true },
  toTime: { type: String, default: '' },
  requestedDays: { type: Number },
  previousLeaveDays: { type: Number, default: 0 },
  studentName: { type: String, default: '' },
  roomNumber: { type: String, default: '' },
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
  },
  reviewerName: { type: String, default: '' },
  reviewerRole: { type: String, default: '' },
  reviewedAt: {
    type: Date
  },
  remarks: { type: String, default: '' }
}, {
  timestamps: true
});

leaveRequestSchema.index({ studentId: 1, status: 1 });
leaveRequestSchema.index({ createdAt: -1 });
leaveRequestSchema.index({ appliedDate: -1 });

leaveRequestSchema.pre('save', function(next) {
  const { capitalizeName } = require('../utils/formatters');
  if (this.isModified('studentName') && this.studentName) {
    this.studentName = capitalizeName(this.studentName);
  }
  if (this.isModified('reviewerName') && this.reviewerName) {
    this.reviewerName = capitalizeName(this.reviewerName);
  }
  if (typeof next === 'function') next();
});

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

module.exports = LeaveRequest;
