const mongoose = require('mongoose');

const progressItemSchema = new mongoose.Schema({
  category: {
    type: String,
    default: 'Academic'
  },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  remarks: { type: String, default: '' },
  proofLink: { type: String, default: '' },
  other: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

const studentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fullName: { type: String },
  email: { type: String, default: '' },
  village: { type: String, required: true },
  homeAddress: { type: String, required: true },
  course: { type: String, required: true },
  collegeName: { type: String, required: true },
  otherCourseOrJob: { type: String },
  joiningYear: { type: Number, required: true },
  joiningMonth: { type: String, required: true },
  mobile: { type: String, required: true },
  parentsMobile: { type: String, required: true },
  drivingLicense: { type: Boolean, default: false },
  drivingLicenseProofUrl: { type: String, default: '' },
  roomNumber: { type: String, required: true },
  status: {
    type: String,
    enum: ['Active', 'Available', 'On Leave', 'In-Active', 'Inactive', 'Left', 'Suspended'],
    default: 'Available'
  },
  isManualStatus: {
    type: Boolean,
    default: false
  },
  suspendedFrom: {
    type: Date,
    default: null
  },
  suspendedUntil: {
    type: Date,
    default: null
  },
  suspensionReason: {
    type: String,
    default: ''
  },
  suspendedAt: {
    type: Date,
    default: null
  },
  leaveCount: {
    type: Number,
    default: 0
  },
  resultUrl: {
    type: String
  },
  resultDriveLink: {
    type: String
  },
  resultUrls: [{
    type: String
  }],
  progressItems: [progressItemSchema]
}, {
  timestamps: true
});

studentSchema.index({ userId: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ mobile: 1 });

studentSchema.pre('save', function(next) {
  if (this.isModified('fullName') && this.fullName) {
    const { capitalizeName } = require('../utils/formatters');
    this.fullName = capitalizeName(this.fullName);
  }
  if (typeof next === 'function') next();
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
