const mongoose = require('mongoose');

const permissionRequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentName: {
    type: String,
    default: ''
  },
  roomNumber: {
    type: String,
    default: ''
  },
  appliedDate: {
    type: Date,
    default: Date.now
  },
  tillDate: {
    type: Date,
    default: Date.now
  },
  tillTime: {
    type: String,
    required: [true, 'Please specify till which time you need permission']
  },
  reason: {
    type: String,
    required: [true, 'Please provide a reason for permission']
  },
  otherPersonPhone: {
    type: String,
    required: [true, 'Please provide other person phone number']
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewerName: {
    type: String,
    default: ''
  },
  reviewerRole: {
    type: String,
    default: ''
  },
  reviewedAt: {
    type: Date
  },
  remarks: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

permissionRequestSchema.index({ studentId: 1, status: 1 });
permissionRequestSchema.index({ createdAt: -1 });
permissionRequestSchema.index({ appliedDate: -1 });

permissionRequestSchema.pre('save', function(next) {
  const { capitalizeName } = require('../utils/formatters');
  if (this.isModified('studentName') && this.studentName) {
    this.studentName = capitalizeName(this.studentName);
  }
  if (this.isModified('reviewerName') && this.reviewerName) {
    this.reviewerName = capitalizeName(this.reviewerName);
  }
  if (typeof next === 'function') next();
});

const PermissionRequest = mongoose.model('PermissionRequest', permissionRequestSchema);

module.exports = PermissionRequest;
