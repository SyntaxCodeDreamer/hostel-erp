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
  roomNumber: { type: String, required: true },
  status: {
    type: String,
    enum: ['Active', 'On Leave', 'Left'],
    default: 'Active'
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

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
