const PermissionRequest = require('../models/PermissionRequest');
const Student = require('../models/Student');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendPushNotification } = require('../utils/webPush');
const { capitalizeName } = require('../utils/formatters');

// @desc    Get all permissions (filtered by student for students, all for staff/admin)
// @route   GET /api/permissions
// @access  Private
const getPermissions = async (req, res) => {
  try {
    const userRole = (req.user.role || '').toLowerCase();
    let query = {};

    if (userRole === 'student') {
      const student = await Student.findOne({ userId: req.user._id });
      if (!student) {
        return res.json([]);
      }
      query.studentId = student._id;
    }

    if (req.query.status && req.query.status !== 'All') {
      query.status = new RegExp(`^${req.query.status}$`, 'i');
    }

    if (req.query.search) {
      const s = req.query.search.trim();
      const regex = new RegExp(s, 'i');
      query.$or = [
        { studentName: regex },
        { roomNumber: regex },
        { reason: regex },
        { otherPersonPhone: regex },
        { tillTime: regex }
      ];
    }

    const permissions = await PermissionRequest.find(query)
      .populate({
        path: 'studentId',
        select: 'fullName roomNumber mobile village course userId'
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ message: error.message || 'Server error fetching permissions' });
  }
};

// @desc    Get single permission by ID
// @route   GET /api/permissions/:id
// @access  Private
const getPermissionById = async (req, res) => {
  try {
    const permission = await PermissionRequest.findById(req.params.id)
      .populate('studentId', 'fullName roomNumber mobile village course userId')
      .populate('reviewedBy', 'name role email');

    if (!permission) {
      return res.status(404).json({ message: 'Permission request not found' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    if (userRole === 'student') {
      const student = await Student.findOne({ userId: req.user._id });
      if (!student || permission.studentId._id.toString() !== student._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this permission' });
      }
    }

    res.json(permission);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Create new permission request
// @route   POST /api/permissions
const createPermissionRequest = async (req, res) => {
  const { tillTime, tillDate, reason, otherPersonPhone, studentId } = req.body;

  if (!tillTime || !reason || !otherPersonPhone) {
    return res.status(400).json({
      message: 'Please provide till which time, reason, and other person phone number.'
    });
  }

  try {
    const userRole = (req.user.role || '').toLowerCase();
    let student = null;

    // 1. Only Admin can submit on behalf of an explicit studentId
    if (userRole === 'admin' && studentId) {
      student = await Student.findById(studentId);
    }

    // 2. For Students and Leaders, always use their own profile
    if (!student) {
      student = await Student.findOne({ userId: req.user._id });
    }

    // 3. If Leader without direct userId link, check LeaderProfile
    if (!student && userRole === 'leader') {
      const LeaderProfile = require('../models/LeaderProfile');
      const leader = await LeaderProfile.findOne({ userId: req.user._id });
      if (leader?.studentId) {
        student = await Student.findById(leader.studentId);
      }
    }

    // 4. If Admin testing without choosing a student, fallback to any active student
    if (!student && (userRole === 'admin' || userRole === 'trustee')) {
      student = await Student.findOne({ status: { $ne: 'Suspended' } });
      if (!student) {
        student = await Student.findOne({});
      }
    }

    if (!student) {
      return res.status(404).json({ message: 'No student resident profile found.' });
    }

    // Check if student is suspended
    if ((student.status || '').toLowerCase() === 'suspended' || student.suspendedFrom || student.suspendedUntil) {
      const now = new Date();
      const untilDate = student.suspendedUntil ? new Date(student.suspendedUntil) : null;
      if (!untilDate || now <= untilDate) {
        return res.status(403).json({
          message: `${student.fullName || 'Student'} account is currently suspended. Cannot submit permission requests.`
        });
      }
    }

    const permission = new PermissionRequest({
      studentId: student._id,
      studentName: capitalizeName(student.fullName || req.user.name || 'Student Resident'),
      roomNumber: student.roomNumber || '',
      appliedDate: new Date(),
      tillDate: tillDate ? new Date(tillDate) : new Date(),
      tillTime: tillTime.trim(),
      reason: reason.trim(),
      otherPersonPhone: otherPersonPhone.trim(),
      status: 'Pending'
    });

    const createdPermission = await permission.save();

    // Create notifications for Admins and Leaders
    const adminsAndLeaders = await User.find({ role: { $in: ['Admin', 'Leader', 'admin', 'leader'] } });
    const adminUserIds = adminsAndLeaders.map(a => a._id);

    const sName = capitalizeName(student.fullName || req.user.name);
    for (const admin of adminsAndLeaders) {
      const notif = new Notification({
        userId: admin._id,
        title: 'New Permission Request',
        message: `${sName} requested permission till ${tillTime}.`,
        type: 'Permission'
      });
      await notif.save();

      const socketId = req.app?.locals?.connectedUsers?.get(admin._id.toString());
      if (socketId && req.app?.locals?.io) {
        req.app.locals.io.to(socketId).emit('new_notification', notif);
      }
    }

    // Send Web Push to Admins and Leaders
    sendPushNotification(adminUserIds, {
      title: '🕒 New Permission Request',
      body: `${sName} requested permission till ${tillTime}.`,
      url: '/permissions'
    });

    if (req.app?.locals?.io) {
      req.app.locals.io.emit('dashboard_update', { type: 'permission_created' });
    }

    res.status(201).json(createdPermission);
  } catch (error) {
    console.error('Error creating permission:', error);
    res.status(400).json({ message: error.message || 'Error submitting permission request' });
  }
};

// @desc    Update permission status (Approve / Reject)
// @route   PUT /api/permissions/:id/status
// @access  Private (Admin, Leader)
const updatePermissionStatus = async (req, res) => {
  const { status, remarks } = req.body;

  if (!status || !['Approved', 'approved', 'Rejected', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status. Must be Approved or Rejected.' });
  }

  const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  try {
    const permission = await PermissionRequest.findById(req.params.id);

    if (!permission) {
      return res.status(404).json({ message: 'Permission request not found' });
    }

    permission.status = formattedStatus;
    permission.reviewedBy = req.user._id;
    permission.reviewerName = capitalizeName(req.user.name || '');
    permission.reviewerRole = req.user.role || '';
    permission.reviewedAt = new Date();
    if (remarks !== undefined) {
      permission.remarks = remarks;
    }

    const updatedPermission = await permission.save();

    // Notify the student
    const student = await Student.findById(permission.studentId);
    if (student && student.userId) {
      const notif = new Notification({
        userId: student.userId,
        title: `Permission ${formattedStatus}`,
        message: `Your permission request till ${permission.tillTime} was ${formattedStatus.toLowerCase()} by ${permission.reviewerName || 'Staff'}.`,
        type: 'Permission'
      });
      await notif.save();

      const socketId = req.app?.locals?.connectedUsers?.get(student.userId.toString());
      if (socketId && req.app?.locals?.io) {
        req.app.locals.io.to(socketId).emit('new_notification', notif);
      }

      // Web Push Notification to student
      sendPushNotification(student.userId, {
        title: `🕒 Permission Request ${formattedStatus}`,
        body: `Your permission request till ${permission.tillTime} has been ${formattedStatus.toLowerCase()}.`,
        url: '/permissions'
      });
    }

    if (req.app?.locals?.io) {
      req.app.locals.io.emit('dashboard_update', { type: 'permission_updated' });
    }

    res.json(updatedPermission);
  } catch (error) {
    console.error('Error updating permission status:', error);
    res.status(400).json({ message: error.message || 'Error updating status' });
  }
};

// @desc    Delete permission request (if pending by student, or by admin)
// @route   DELETE /api/permissions/:id
// @access  Private
const deletePermission = async (req, res) => {
  try {
    const permission = await PermissionRequest.findById(req.params.id);
    if (!permission) {
      return res.status(404).json({ message: 'Permission request not found' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    if (userRole === 'student') {
      const student = await Student.findOne({ userId: req.user._id });
      if (!student || permission.studentId.toString() !== student._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this permission' });
      }
      if (permission.status !== 'Pending') {
        return res.status(400).json({ message: 'Cannot delete an already reviewed permission request' });
      }
    }

    await PermissionRequest.findByIdAndDelete(req.params.id);

    if (req.app?.locals?.io) {
      req.app.locals.io.emit('dashboard_update', { type: 'permission_deleted' });
    }

    res.json({ message: 'Permission request deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error deleting permission' });
  }
};

module.exports = {
  getPermissions,
  getPermissionById,
  createPermissionRequest,
  updatePermissionStatus,
  deletePermission
};
