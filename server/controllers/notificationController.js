const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');

// @desc    Get user notifications (Auto-syncs existing announcements for new users)
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    // Sync existing announcements so newly registered users see all active/past announcements
    const announcements = await Announcement.find({}).sort({ createdAt: -1 });

    for (const ann of announcements) {
      if (ann.createdBy && ann.createdBy.toString() === req.user._id.toString()) {
        continue;
      }

      const existingNotif = await Notification.findOne({
        userId: req.user._id,
        message: `${ann.title} - ${ann.category}`
      });

      if (!existingNotif) {
        await Notification.create({
          userId: req.user._id,
          title: 'New Announcement',
          message: `${ann.title} - ${ann.category}`,
          type: 'Announcement',
          isRead: false,
          createdAt: ann.createdAt || new Date()
        });
      }
    }

    const notifications = await Notification.find({ userId: req.user._id, isRead: false })
      .sort({ createdAt: -1 })
      .limit(30);

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (notification && notification.userId.toString() === req.user._id.toString()) {
      notification.isRead = true;
      await notification.save();
      res.json(notification);
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead
};
