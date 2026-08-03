const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['Leave', 'Announcement', 'Task', 'System'],
    default: 'System'
  }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
