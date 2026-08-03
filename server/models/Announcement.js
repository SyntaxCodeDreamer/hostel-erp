const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['General', 'Meeting', 'Emergency', 'Maintenance', 'Event'],
    default: 'General'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPinned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Announcement = mongoose.model('Announcement', announcementSchema);
module.exports = Announcement;
