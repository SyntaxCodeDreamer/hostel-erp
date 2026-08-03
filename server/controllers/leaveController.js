const LeaveRequest = require('../models/LeaveRequest');
const Student = require('../models/Student');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendPushNotification } = require('../utils/webPush');

// @desc    Get all leave requests (filtered by ownership for Students)
// @route   GET /api/leaves
// @access  Private
const getLeaveRequests = async (req, res) => {
  try {
    let query = {};
    const userRole = (req.user.role || '').toLowerCase();

    if (userRole === 'student') {
      const student = await Student.findOne({ userId: req.user._id });
      if (!student) return res.status(404).json({ message: 'Student profile not found' });
      query.studentId = student._id;
    }

    const leaves = await LeaveRequest.find(query)
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'name email profileImage' }
      })
      .populate('reviewedBy', 'name role')
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Submit a leave request
// @route   POST /api/leaves
// @access  Private (Student)
const createLeaveRequest = async (req, res) => {
  const { reason, fromDate, toDate, destination, emergencyContact } = req.body;

  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found. Cannot submit leave.' });
    }

    const leaveRequest = new LeaveRequest({
      studentId: student._id,
      reason,
      fromDate,
      toDate,
      destination,
      emergencyContact
    });

    const createdLeave = await leaveRequest.save();

    // Create DB notifications for all Admins and Leaders
    const adminsAndLeaders = await User.find({ role: { $in: ['Admin', 'Leader'] } });
    const adminUserIds = adminsAndLeaders.map(a => a._id);

    for (const admin of adminsAndLeaders) {
      const notif = new Notification({
        userId: admin._id,
        title: 'New Leave Request',
        message: `Student ${student.fullName || req.user.name} submitted a new leave request.`,
        type: 'Leave'
      });
      await notif.save();
      
      // Emit socket event if connected
      const socketId = req.app.locals.connectedUsers.get(admin._id.toString());
      if (socketId) {
        req.app.locals.io.to(socketId).emit('new_notification', notif);
      }
    }

    // Send Web Push Notification to Admins and Leaders
    sendPushNotification(adminUserIds, {
      title: '📋 New Leave Request',
      body: `Student ${student.fullName || req.user.name} submitted a leave request.`,
      url: '/leaves'
    });

    res.status(201).json(createdLeave);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update leave request status & auto-update student status
// @route   PUT /api/leaves/:id/status
// @access  Private (Admin/Leader)
const updateLeaveStatus = async (req, res) => {
  const { status } = req.body;

  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    leaveRequest.status = status;
    leaveRequest.reviewedBy = req.user._id;

    const updatedLeave = await leaveRequest.save();

    // Auto update student status & leave count if Approved
    if (status === 'Approved' || status === 'approved') {
      await Student.findByIdAndUpdate(leaveRequest.studentId, { 
        status: 'On Leave',
        $inc: { leaveCount: 1 }
      });
    } else if (status === 'Rejected' || status === 'rejected') {
      await Student.findByIdAndUpdate(leaveRequest.studentId, { status: 'Active' });
    }

    // Get the student's User ID to send notification
    const studentDoc = await Student.findById(leaveRequest.studentId);
    if (studentDoc && studentDoc.userId) {
      const notif = new Notification({
        userId: studentDoc.userId,
        title: 'Leave Request Updated',
        message: `Your leave request has been ${status}.`,
        type: 'Leave'
      });
      await notif.save();
      
      const socketId = req.app.locals.connectedUsers.get(studentDoc.userId.toString());
      if (socketId) {
        req.app.locals.io.to(socketId).emit('new_notification', notif);
      }

      // Send Web Push Notification to Student
      sendPushNotification(studentDoc.userId, {
        title: `Leave Request ${status}`,
        body: `Your leave request has been ${status.toLowerCase()} by admin.`,
        url: '/leaves'
      });
    }

    res.json(updatedLeave);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getLeaveRequests,
  createLeaveRequest,
  updateLeaveStatus
};
