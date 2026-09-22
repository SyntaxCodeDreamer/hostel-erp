const mongoose = require('mongoose');

const leaderProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  name: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

leaderProfileSchema.pre('save', function(next) {
  if (this.isModified('name') && this.name) {
    const { capitalizeName } = require('../utils/formatters');
    this.name = capitalizeName(this.name);
  }
  if (typeof next === 'function') next();
});

const LeaderProfile = mongoose.model('LeaderProfile', leaderProfileSchema);
module.exports = LeaderProfile;
