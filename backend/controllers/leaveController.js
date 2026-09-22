const LeaveRequest = require('../models/LeaveRequest');
const Student = require('../models/Student');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendPushNotification } = require('../utils/webPush');
const { isLeaveCurrentlyActive } = require('../utils/dateHelper');
const { capitalizeName } = require('../utils/formatters');

// @desc    Get all leave requests (filtered by ownership for Students)
// @route   GET /api/leaves
// @access  Private
const getLeaveRequests = async (req, res) => {
  try {
    let query = {};
    const userRole = (req.user.role || '').toLowerCase();

    if (userRole === 'student') {
      const student = await Student.findOne({ userId: req.user._id }).lean();
      if (!student) return res.status(404).json({ message: 'Student profile not found' });
      query.studentId = student._id;
    }

    const leaves = await LeaveRequest.find(query)
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'name email profileImage' }
      })
      .populate('reviewedBy', 'name role')
      .sort({ createdAt: -1 })
      .lean();

    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Submit a leave request
// @route   POST /api/leaves
// @access  Private (Student)
const createLeaveRequest = async (req, res) => {
  const { reason, fromDate, fromTime, toDate, toTime, requestedDays, previousLeaveDays, destination, emergencyContact } = req.body;

  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found. Cannot submit leave.' });
    }
    if ((student.status || '').toLowerCase() === 'suspended' || student.suspendedFrom || student.suspendedUntil) {
      const now = new Date();
      const fromDate = student.suspendedFrom ? new Date(student.suspendedFrom) : null;
      const untilDate = student.suspendedUntil ? new Date(student.suspendedUntil) : null;

      if (untilDate && now > untilDate) {
        // Expired, lift suspension
        student.status = 'Available';
        student.isManualStatus = false;
        student.suspendedFrom = null;
        student.suspendedUntil = null;
        student.suspensionReason = '';
        student.suspendedAt = null;
        await student.save();
      } else if (fromDate && now < fromDate) {
        // Future suspension: not active yet
      } else if ((student.status || '').toLowerCase() === 'suspended') {
        let durationStr = '';
        if (student.suspendedFrom && student.suspendedUntil) {
          const fromStr = new Date(student.suspendedFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          const toStr = new Date(student.suspendedUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          durationStr = ` from ${fromStr} till ${toStr}`;
        } else if (student.suspendedUntil) {
          durationStr = ` until ${new Date(student.suspendedUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        }
        return res.status(403).json({ 
          message: `Your student account is suspended${durationStr}. You cannot submit leave requests.` 
        });
      }
    }

    const leaveRequest = new LeaveRequest({
      studentId: student._id,
      studentName: capitalizeName(student.fullName || req.user.name || ''),
      roomNumber: student.roomNumber || '',
      appliedDate: new Date(),
      reason,
      fromDate,
      fromTime: fromTime || '',
      toDate,
      toTime: toTime || '',
      requestedDays: (requestedDays !== undefined && requestedDays !== null && requestedDays !== '') ? Number(requestedDays) : 0,
      previousLeaveDays: previousLeaveDays !== undefined ? Number(previousLeaveDays) : 0,
      destination,
      emergencyContact
    });

    const createdLeave = await leaveRequest.save();

    // Create DB notifications for all Admins and Leaders
    const adminsAndLeaders = await User.find({ role: { $in: ['Admin', 'Leader', 'admin', 'leader'] } });
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

    if (req.app.locals.io) {
      req.app.locals.io.emit('dashboard_update', { type: 'leave_created' });
    }

    res.status(201).json(createdLeave);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update leave request status & auto-update student status
// @route   PUT /api/leaves/:id/status
// @access  Private (Admin/Leader)
const updateLeaveStatus = async (req, res) => {
  const { status, remarks } = req.body;

  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    leaveRequest.status = status;
    leaveRequest.reviewedBy = req.user._id;
    leaveRequest.reviewerName = capitalizeName(req.user.name || '');
    leaveRequest.reviewerRole = req.user.role || '';
    leaveRequest.reviewedAt = new Date();
    if (remarks !== undefined) leaveRequest.remarks = remarks;

    const updatedLeave = await leaveRequest.save();

    // Auto update student status & leave count if Approved
    if (status === 'Approved' || status === 'approved') {
      const isCurrentlyActive = isLeaveCurrentlyActive(updatedLeave, new Date());
      const newStatus = isCurrentlyActive ? 'On Leave' : 'Available';
      await Student.findByIdAndUpdate(leaveRequest.studentId, { 
        status: newStatus,
        $inc: { leaveCount: 1 }
      });
    } else if (status === 'Rejected' || status === 'rejected') {
      await Student.findByIdAndUpdate(leaveRequest.studentId, { status: 'Available' });
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

    if (req.app.locals.io) {
      req.app.locals.io.emit('dashboard_update', { type: 'leave_updated' });
    }

    res.json(updatedLeave);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get a single leave request by ID
// @route   GET /api/leaves/:id
// @access  Private
const getLeaveRequestById = async (req, res) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id)
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'name email profileImage' }
      })
      .populate('reviewedBy', 'name role')
      .lean();

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    if (userRole === 'student') {
      const student = await Student.findOne({ userId: req.user._id }).lean();
      if (!student || leave.studentId._id.toString() !== student._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to view this leave request' });
      }
    }

    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Update a leave request (Student only, while status is Pending)
// @route   PUT /api/leaves/:id
// @access  Private (Student)
const updateLeaveRequest = async (req, res) => {
  const { reason, fromDate, fromTime, toDate, toTime, requestedDays, destination, emergencyContact } = req.body;

  try {
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // Verify ownership: only the student who created the request can edit it
    if (leaveRequest.studentId.toString() !== student._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this leave request' });
    }

    // Crucial: only Pending requests can be edited. Approved or Rejected requests cannot be edited.
    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({ 
        message: `This leave request has already been ${leaveRequest.status.toLowerCase()} and cannot be edited.` 
      });
    }

    if (reason !== undefined) leaveRequest.reason = reason;
    if (fromDate !== undefined) leaveRequest.fromDate = fromDate;
    if (fromTime !== undefined) leaveRequest.fromTime = fromTime || '';
    if (toDate !== undefined) leaveRequest.toDate = toDate;
    if (toTime !== undefined) leaveRequest.toTime = toTime || '';
    if (requestedDays !== undefined) leaveRequest.requestedDays = Number(requestedDays);
    if (destination !== undefined) leaveRequest.destination = destination;
    if (emergencyContact !== undefined) leaveRequest.emergencyContact = emergencyContact;

    const updatedLeave = await leaveRequest.save();

    if (req.app.locals.io) {
      req.app.locals.io.emit('dashboard_update', { type: 'leave_updated' });
    }

    res.json(updatedLeave);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getLeaveRequests,
  getLeaveRequestById,
  createLeaveRequest,
  updateLeaveRequest,
  updateLeaveStatus
};
