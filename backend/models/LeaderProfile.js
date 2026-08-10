const mongoose = require('mongoose');

const leaderProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
    type: String, // e.g. "2023-2024"
    required: true
  }
}, {
  timestamps: true
});

const LeaderProfile = mongoose.model('LeaderProfile', leaderProfileSchema);
module.exports = LeaderProfile;
