const Announcement = require('../models/Announcement');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendPushNotification } = require('../utils/webPush');

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private
const getAnnouncements = async (req, res) => {
  try {
    const userRole = (req.user.role || '').toLowerCase();
    let filterQuery = {};

    if (userRole === 'trust member' || userRole === 'trustee') {
      // Trust members see general announcements OR announcements they created
      filterQuery = {
        $or: [
          { targetAudience: { $nin: ['Students', 'students', 'Student', 'student'] } },
          { createdBy: req.user._id }
        ]
      };
    }

    const { page, limit } = req.query;

    if (page) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 6;
      const skip = (pageNum - 1) * limitNum;

      const totalCount = await Announcement.countDocuments(filterQuery);
      const announcements = await Announcement.find(filterQuery)
        .populate('createdBy', 'name role')
        .sort({ isPinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const totalPages = Math.ceil(totalCount / limitNum) || 1;
      const hasMore = pageNum < totalPages;

      return res.json({
        data: announcements,
        page: pageNum,
        totalPages,
        hasMore,
        totalCount
      });
    }

    const announcements = await Announcement.find(filterQuery)
      .populate('createdBy', 'name role')
      .sort({ isPinned: -1, createdAt: -1 })
      .lean();
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create an announcement
// @route   POST /api/announcements
// @access  Private (Admin/Leader)
const createAnnouncement = async (req, res) => {
  const { title, description, category, isPinned, targetAudience } = req.body;

  try {
    const userRole = (req.user.role || '').toLowerCase();
    let targetAud = (targetAudience || 'All').toString().trim();
    if (userRole === 'trust member' || userRole === 'trustee') {
      targetAud = 'All';
    }

    const announcement = new Announcement({
      title,
      description,
      category,
      isPinned,
      targetAudience: targetAud,
      createdBy: req.user._id
    });

    const createdAnnouncement = await announcement.save();

    // Determine target recipient users to notify based on targetAudience choice
    const userQuery = { isActive: true };
    if (targetAud.toLowerCase().includes('student')) {
      userQuery.role = { $in: ['Student', 'student'] };
    }

    const recipientUsers = await User.find(userQuery).select('_id').lean();
    const recipientUserIds = [];

    for (const u of recipientUsers) {
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
      const socketId = req.app?.locals?.connectedUsers?.get(u._id.toString());
      if (socketId && req.app?.locals?.io) {
        req.app.locals.io.to(socketId).emit('new_notification', notif);
      }
    }

    // Send Web Push Notification to target recipient users on their devices
    if (recipientUserIds.length > 0) {
      sendPushNotification(recipientUserIds, {
        title: '📢 New Announcement',
        body: `${title} (${category || 'General'})`,
        url: '/announcements'
      }).catch(err => console.error('Push notification error:', err.message));
    }

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
      const roleLower = (req.user.role || '').toLowerCase();
      if (roleLower !== 'admin' && announcement.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this announcement' });
      }

      announcement.title = req.body.title || announcement.title;
      announcement.description = req.body.description || announcement.description;
      announcement.category = req.body.category || announcement.category;
      announcement.isPinned = req.body.isPinned !== undefined ? req.body.isPinned : announcement.isPinned;
      announcement.targetAudience = req.body.targetAudience || announcement.targetAudience;

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
// @access  Private (Admin/Leader/Trust Member)
const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (announcement) {
      const roleLower = (req.user.role || '').toLowerCase();
      if (roleLower !== 'admin' && announcement.createdBy.toString() !== req.user._id.toString()) {
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
