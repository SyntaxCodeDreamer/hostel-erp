const Announcement = require('../models/Announcement');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendPushNotification } = require('../utils/webPush');

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private
const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({})
      .populate('createdBy', 'name role')
      .sort({ isPinned: -1, createdAt: -1 });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create an announcement
// @route   POST /api/announcements
// @access  Private (Admin/Leader)
const createAnnouncement = async (req, res) => {
  const { title, description, category, isPinned } = req.body;

  try {
    const announcement = new Announcement({
      title,
      description,
      category,
      isPinned,
      createdBy: req.user._id
    });

    const createdAnnouncement = await announcement.save();

    // Create DB notifications for ALL users so it persists in their dropdowns
    const allUsers = await User.find({ isActive: true });
    const recipientUserIds = [];

    for (const u of allUsers) {
      // Don't notify the person who created it
      if (u._id.toString() === req.user._id.toString()) continue;

      recipientUserIds.push(u._id);

      const notif = new Notification({
        userId: u._id,
        title: 'New Announcement',
        message: `${title} - ${category}`,
        type: 'Announcement'
      });
      await notif.save();

      // Emit to this specific user if connected
      const socketId = req.app.locals.connectedUsers.get(u._id.toString());
      if (socketId) {
        req.app.locals.io.to(socketId).emit('new_notification', notif);
      }
    }

    // Send Web Push Notification to all recipient users on their devices
    sendPushNotification(recipientUserIds, {
      title: '📢 New Announcement',
      body: `${title} (${category || 'General'})`,
      url: '/announcements'
    });

    res.status(201).json(createdAnnouncement);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update an announcement
// @route   PUT /api/announcements/:id
// @access  Private (Admin/Leader)
const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (announcement) {
      // Check if user is Admin, or if Leader they can only edit their own
      if (req.user.role === 'Leader' && announcement.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this announcement' });
      }

      announcement.title = req.body.title || announcement.title;
      announcement.description = req.body.description || announcement.description;
      announcement.category = req.body.category || announcement.category;
      announcement.isPinned = req.body.isPinned !== undefined ? req.body.isPinned : announcement.isPinned;

      const updatedAnnouncement = await announcement.save();
      res.json(updatedAnnouncement);
    } else {
      res.status(404).json({ message: 'Announcement not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete an announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Admin/Leader)
const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (announcement) {
      if (req.user.role === 'Leader' && announcement.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this announcement' });
      }

      await announcement.deleteOne();
      res.json({ message: 'Announcement removed' });
    } else {
      res.status(404).json({ message: 'Announcement not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
};
