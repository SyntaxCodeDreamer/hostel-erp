const Student = require('../models/Student');
const User = require('../models/User');
const LeaderProfile = require('../models/LeaderProfile');
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const { sendWelcomeEmail, getBrevoDefaultPassword } = require('../utils/sendEmail');
const { sendPushNotification } = require('../utils/webPush');
const { isLeaveCurrentlyActive } = require('../utils/dateHelper');
const { capitalizeName } = require('../utils/formatters');

// Helper to auto-sync student status ('On Leave' vs 'Available') for a list of students in 1 SINGLE DB QUERY
const syncBulkStudentLeaveStatus = async (students) => {
  if (!Array.isArray(students) || students.length === 0) return students;
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const studentIds = students.map(s => s._id);

    // 1 single query for ALL students in the array instead of N separate queries
    const activeLeaves = await LeaveRequest.find({
      studentId: { $in: studentIds },
      status: { $in: ['Approved', 'approved'] },
      fromDate: { $lte: todayEnd },
      toDate: { $gte: todayStart }
    }).select('studentId fromDate fromTime toDate toTime status').lean();

    const now = new Date();
    const onLeaveSet = new Set();
    for (const l of activeLeaves) {
      if (isLeaveCurrentlyActive(l, now)) {
        const sId = (l.studentId?._id || l.studentId).toString();
        onLeaveSet.add(sId);
      }
    }

    const bulkOps = [];
    for (const student of students) {
      const currentStatus = (student.status || '').toLowerCase();
      if (student.suspendedFrom || student.suspendedUntil || currentStatus === 'suspended') {
        const fromDate = student.suspendedFrom ? new Date(student.suspendedFrom) : null;
        const untilDate = student.suspendedUntil ? new Date(student.suspendedUntil) : null;

        if (untilDate && now > untilDate) {
          student.status = 'Available';
          student.isManualStatus = false;
          student.suspendedFrom = null;
          student.suspendedUntil = null;
          student.suspensionReason = '';
          student.suspendedAt = null;
          bulkOps.push({
            updateOne: {
              filter: { _id: student._id },
              update: {
                $set: {
                  status: 'Available',
                  isManualStatus: false,
                  suspendedFrom: null,
                  suspendedUntil: null,
                  suspensionReason: '',
                  suspendedAt: null
                }
              }
            }
          });
        } else if (fromDate && now < fromDate) {
          // Future suspension: not started yet
          if (student.status === 'Suspended') {
            student.status = 'Available';
            bulkOps.push({
              updateOne: {
                filter: { _id: student._id },
                update: { $set: { status: 'Available' } }
              }
            });
          }
        } else if ((!fromDate || now >= fromDate) && (!untilDate || now <= untilDate)) {
          if (student.status !== 'Suspended') {
            student.status = 'Suspended';
            student.isManualStatus = true;
            bulkOps.push({
              updateOne: {
                filter: { _id: student._id },
                update: { $set: { status: 'Suspended', isManualStatus: true } }
              }
            });
          }
          continue;
        }

        if (currentStatus === 'suspended') {
          continue;
        }
      }

      if (currentStatus === 'in-active' || currentStatus === 'inactive' || currentStatus === 'left') {
        continue;
      }

      const hasActiveLeaveRequest = onLeaveSet.has(student._id.toString());

      if (hasActiveLeaveRequest) {
        // Automatically put student on leave during their approved leave request window
        if (student.status !== 'On Leave') {
          student.status = 'On Leave';
          bulkOps.push({
            updateOne: {
              filter: { _id: student._id },
              update: { $set: { status: 'On Leave' } }
            }
          });
        }
      } else {
        // No active approved leave request right now.
        // If an Admin or Leader manually set the student to 'On Leave' (or student.isManualStatus is true),
        // PRESERVE the manual status! Do NOT revert!
        if (student.isManualStatus) {
          continue;
        }

        // If the student was automatically set 'On Leave' from a past leave request that has now ended,
        // and it was NOT a manual override, return to 'Available'
        if (student.status === 'On Leave' && !student.isManualStatus) {
          student.status = 'Available';
          bulkOps.push({
            updateOne: {
              filter: { _id: student._id },
              update: { $set: { status: 'Available' } }
            }
          });
        }
      }
    }

    if (bulkOps.length > 0) {
      await Student.bulkWrite(bulkOps);
    }
  } catch (err) {
    console.error('Error syncing student leave status:', err);
  }
  return students;
};

// @desc    Get students (filtered strictly by ownership for Students)
// @route   GET /api/students
// @access  Private
const getStudents = async (req, res) => {
  try {
    let query = {};
    const userRole = (req.user.role || '').toLowerCase();

    if (userRole === 'student') {
      // Students only see their own profile
      let student = await Student.findOne({ userId: req.user._id }).populate('userId', 'name email role profileImage').lean();
      if (!student) {
        const newStudent = new Student({
          userId: req.user._id,
          fullName: req.user.name || 'Student Resident',
          village: 'N/A',
          homeAddress: 'N/A',
          course: 'N/A',
          collegeName: 'N/A',
          joiningYear: new Date().getFullYear(),
          joiningMonth: 'August',
          mobile: 'N/A',
          parentsMobile: 'N/A',
          drivingLicense: false,
          roomNumber: 'Unassigned',
          status: 'Available'
        });
        await newStudent.save();
        student = await Student.findById(newStudent._id).populate('userId', 'name email profileImage').lean();
      }
      if (student) {
        await syncBulkStudentLeaveStatus([student]);
      }
      return res.json([student]);
    }

    if (req.query.search) {
      const s = req.query.search.trim();
      const regex = new RegExp(s, 'i');
      query.$or = [
        { fullName: regex },
        { course: regex },
        { village: regex },
        { roomNumber: regex },
        { mobile: regex }
      ];
    }

    // Support pagination parameters (page & limit) to fetch only requested page items
    if (req.query.page || req.query.limit) {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 8;
      const skip = (page - 1) * limit;

      const total = await Student.countDocuments(query);
      const students = await Student.find(query)
        .populate('userId', 'name email role profileImage')
        .skip(skip)
        .limit(limit)
        .lean();

      await syncBulkStudentLeaveStatus(students);
      return res.json({
        students,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    }

    const students = await Student.find(query).populate('userId', 'name email role profileImage').lean();
    await syncBulkStudentLeaveStatus(students);
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get logged in student profile
// @route   GET /api/students/me
// @access  Private (Student)
const getMyStudentProfile = async (req, res) => {
  try {
    let student = await Student.findOne({ userId: req.user._id }).populate('userId', 'name email role profileImage').lean();
    if (!student) {
      const userRole = (req.user.role || '').toLowerCase();
      if (userRole === 'student' || userRole === 'leader') {
        const newStudent = new Student({
          userId: req.user._id,
          fullName: req.user.name || (userRole === 'leader' ? 'Student Leader' : 'Student Resident'),
          village: 'N/A',
          homeAddress: 'N/A',
          course: 'N/A',
          collegeName: 'N/A',
          joiningYear: new Date().getFullYear(),
          joiningMonth: 'August',
          mobile: 'N/A',
          parentsMobile: 'N/A',
          drivingLicense: false,
          roomNumber: 'Unassigned',
          status: 'Available'
        });
        await newStudent.save();
        student = await Student.findById(newStudent._id).populate('userId', 'name email role profileImage').lean();
      } else {
        return res.status(404).json({ message: 'Student profile not found' });
      }
    }
    await syncBulkStudentLeaveStatus([student]);
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get student by ID (ownership checked for Students)
// @route   GET /api/students/:id
// @access  Private
const getStudentById = async (req, res) => {
  try {
    let student = await Student.findById(req.params.id).populate('userId', 'name email role profileImage').lean();
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    if (userRole === 'student' && student.userId?._id?.toString() !== req.user._id?.toString()) {
      const targetRole = (student.userId?.role || '').toLowerCase();
      const isLeader = targetRole === 'leader' || (await LeaderProfile.exists({ studentId: student._id }));
      if (!isLeader) {
        return res.status(403).json({ message: 'Not authorized to view other student profiles' });
      }
    }
    await syncBulkStudentLeaveStatus([student]);
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a student profile
// @route   POST /api/students
// @access  Private (Admin/Leader)
const createStudent = async (req, res) => {
  const {
    name, email, password,
    village, homeAddress, course, collegeName,
    otherCourseOrJob, joiningYear, joiningMonth,
    mobile, parentsMobile, drivingLicense, drivingLicenseProofUrl, roomNumber
  } = req.body;

  try {
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required to create a student account' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = capitalizeName(name);
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const finalPassword = (password && password.trim()) ? password.trim() : getBrevoDefaultPassword(cleanEmail);

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: finalPassword,
      role: 'Student'
    });

    const student = new Student({
      userId: user._id,
      fullName: cleanName,
      village, homeAddress, course, collegeName,
      otherCourseOrJob, joiningYear, joiningMonth,
      mobile, parentsMobile, drivingLicense, drivingLicenseProofUrl, roomNumber
    });

    const createdStudent = await student.save();

    // Send Welcome email with credentials via Brevo
    await sendWelcomeEmail({
      name: cleanName,
      email: cleanEmail,
      role: 'Student',
      password: finalPassword
    });

    res.status(201).json(createdStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update logged in student profile
// @route   PUT /api/students/me
// @access  Private (Student)
const updateMyStudentProfile = async (req, res) => {
  try {
    let student = await Student.findOne({ userId: req.user._id });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    if (req.body.fullName !== undefined || req.body.name !== undefined) {
      const updatedName = capitalizeName(req.body.fullName || req.body.name);
      if (updatedName) {
        student.fullName = updatedName;
        if (student.userId) {
          await User.findByIdAndUpdate(student.userId, { name: updatedName }).catch(() => null);
        }
      }
    }
    if (req.body.village !== undefined) student.village = req.body.village;
    if (req.body.homeAddress !== undefined) student.homeAddress = req.body.homeAddress;
    if (req.body.course !== undefined) student.course = req.body.course;
    if (req.body.collegeName !== undefined) student.collegeName = req.body.collegeName;
    if (req.body.otherCourseOrJob !== undefined) student.otherCourseOrJob = req.body.otherCourseOrJob;
    if (req.body.mobile !== undefined) student.mobile = req.body.mobile;
    if (req.body.parentsMobile !== undefined) student.parentsMobile = req.body.parentsMobile;
    if (req.body.drivingLicense !== undefined) student.drivingLicense = req.body.drivingLicense;
    if (req.body.drivingLicenseProofUrl !== undefined) student.drivingLicenseProofUrl = req.body.drivingLicenseProofUrl;
    if (req.body.roomNumber !== undefined) student.roomNumber = req.body.roomNumber;
    if (req.body.resultUrl !== undefined) student.resultUrl = req.body.resultUrl;
    if (req.body.resultDriveLink !== undefined) {
      student.resultDriveLink = req.body.resultDriveLink;
      student.resultUrl = req.body.resultDriveLink;
    }
    if (req.body.resultUrls !== undefined) student.resultUrls = req.body.resultUrls;

    const updatedStudent = await student.save();
    res.json(updatedStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a student
// @route   PUT /api/students/:id
// @access  Private
const updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (student) {
      const userRole = (req.user.role || '').toLowerCase();
      // Allow students to update their own profile
      if (userRole === 'student') {
        if (student.userId?.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'Not authorized to update this profile' });
        }
      }

      // Suspended students cannot have their status or suspension dates modified except by admin
      const isCurrentlySuspended = (student.status || '').toLowerCase() === 'suspended' || !!student.suspendedUntil;
      if (isCurrentlySuspended && userRole !== 'admin') {
        if (
          (req.body.status && req.body.status !== student.status) ||
          req.body.suspendedFrom !== undefined ||
          req.body.suspendedUntil !== undefined ||
          req.body.suspensionReason !== undefined
        ) {
          return res.status(403).json({
            message: 'This student is suspended and cannot be modified.'
          });
        }
      }

      if (req.body.fullName !== undefined || req.body.name !== undefined) {
        const updatedName = capitalizeName(req.body.fullName || req.body.name);
        if (updatedName) {
          student.fullName = updatedName;
          if (student.userId) {
            await User.findByIdAndUpdate(student.userId, { name: updatedName }).catch(() => null);
          }
        }
      }
      if (req.body.village !== undefined) student.village = req.body.village;
      if (req.body.homeAddress !== undefined) student.homeAddress = req.body.homeAddress;
      if (req.body.course !== undefined) student.course = req.body.course;
      if (req.body.collegeName !== undefined) student.collegeName = req.body.collegeName;
      if (req.body.otherCourseOrJob !== undefined) student.otherCourseOrJob = req.body.otherCourseOrJob;
      if (req.body.mobile !== undefined) student.mobile = req.body.mobile;
      if (req.body.parentsMobile !== undefined) student.parentsMobile = req.body.parentsMobile;
      if (req.body.drivingLicense !== undefined) student.drivingLicense = req.body.drivingLicense;
      if (req.body.drivingLicenseProofUrl !== undefined) student.drivingLicenseProofUrl = req.body.drivingLicenseProofUrl;
      if (req.body.roomNumber !== undefined) student.roomNumber = req.body.roomNumber;
      if (req.body.resultUrl !== undefined) student.resultUrl = req.body.resultUrl;
      if (req.body.resultDriveLink !== undefined) {
        student.resultDriveLink = req.body.resultDriveLink;
        student.resultUrl = req.body.resultDriveLink;
      }
      if (req.body.resultUrls !== undefined) student.resultUrls = req.body.resultUrls;
      if (req.body.progressItems !== undefined) student.progressItems = req.body.progressItems;
      if (req.body.status && userRole !== 'student') {
        student.status = req.body.status;
        student.isManualStatus = req.body.status === 'On Leave' || req.body.status === 'Suspended';
        if (req.body.status === 'Suspended') {
          if (req.body.suspendedFrom) {
            const from = new Date(req.body.suspendedFrom);
            from.setHours(0, 0, 0, 0);
            student.suspendedFrom = from;
          } else if (!student.suspendedFrom) {
            const from = new Date();
            from.setHours(0, 0, 0, 0);
            student.suspendedFrom = from;
          }
          if (req.body.suspendedUntil) {
            const until = new Date(req.body.suspendedUntil);
            until.setHours(23, 59, 59, 999);
            student.suspendedUntil = until;
          }
          if (req.body.suspensionReason !== undefined) {
            student.suspensionReason = req.body.suspensionReason;
          }
          student.suspendedAt = new Date();
        } else {
          student.suspendedFrom = null;
          student.suspendedUntil = null;
          student.suspensionReason = '';
          student.suspendedAt = null;
        }
      }
      if (req.body.suspendedFrom !== undefined && userRole !== 'student') {
        if (req.body.suspendedFrom) {
          const from = new Date(req.body.suspendedFrom);
          from.setHours(0, 0, 0, 0);
          student.suspendedFrom = from;
        } else {
          student.suspendedFrom = null;
        }
      }
      if (req.body.suspendedUntil !== undefined && userRole !== 'student') {
        if (req.body.suspendedUntil) {
          const until = new Date(req.body.suspendedUntil);
          until.setHours(23, 59, 59, 999);
          student.suspendedUntil = until;
        } else {
          student.suspendedUntil = null;
        }
      }
      if (req.body.suspensionReason !== undefined && userRole !== 'student') {
        student.suspensionReason = req.body.suspensionReason;
      }
      if (req.body.isManualStatus !== undefined && userRole !== 'student') {
        student.isManualStatus = !!req.body.isManualStatus;
      }

      const updatedStudent = await student.save();
      res.json(updatedStudent);
    } else {
      res.status(404).json({ message: 'Student not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Add progress item to student profile
// @route   POST /api/students/:id/progress
// @access  Private
const addProgressItem = async (req, res) => {
  const { category, title, description, remarks, proofLink, other } = req.body;

  try {
    let student;
    const userRole = (req.user.role || '').toLowerCase();

    if (!req.params.id || req.params.id === 'me') {
      student = await Student.findOne({ userId: req.user._id });
    } else {
      student = await Student.findById(req.params.id).catch(() => null);
      if (!student) {
        student = await Student.findOne({ userId: req.params.id }).catch(() => null);
      }
    }

    if (!student && userRole === 'student') {
      student = await Student.findOne({ userId: req.user._id });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const ownerUserId = (student.userId?._id || student.userId).toString();
    if (userRole === 'student' && ownerUserId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this profile' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required for progress record' });
    }

    if (!Array.isArray(student.progressItems)) {
      student.progressItems = [];
    }

    student.progressItems.push({
      category: category || 'Academic',
      title: title.trim(),
      description: description || '',
      remarks: remarks || '',
      proofLink: proofLink || '',
      other: other || '',
      createdAt: new Date()
    });

    await student.save();
    const updatedStudent = await Student.findById(student._id).populate('userId', 'name email profileImage');

    // Notify Admins and Leaders about student progress addition
    try {
      const studentName = updatedStudent.fullName || updatedStudent.userId?.name || req.user?.name || 'A student';
      const progressTitle = title.trim();
      const progressCategory = category || 'Academic';

      const adminsAndLeaders = await User.find({ role: { $in: ['Admin', 'Leader', 'admin', 'leader'] } });
      const adminUserIds = adminsAndLeaders.map(a => a._id);

      for (const admin of adminsAndLeaders) {
        const notif = new Notification({
          userId: admin._id,
          title: 'Student Progress Added',
          message: `Student ${studentName} added progress: "${progressTitle}" (${progressCategory})`,
          type: 'Progress'
        });
        await notif.save();

        if (req.app?.locals?.connectedUsers && req.app?.locals?.io) {
          const socketId = req.app.locals.connectedUsers.get(admin._id.toString());
          if (socketId) {
            req.app.locals.io.to(socketId).emit('new_notification', notif);
          }
        }
      }

      if (adminUserIds.length > 0) {
        sendPushNotification(adminUserIds, {
          title: '📈 New Student Progress Added',
          body: `Student ${studentName} added progress: "${progressTitle}"`,
          url: '/students'
        }).catch(err => console.error('Push notification error:', err.message));
      }
    } catch (notifError) {
      console.error('Error creating progress notifications:', notifError.message);
    }

    res.status(201).json(updatedStudent);
  } catch (error) {
    console.error('Error in addProgressItem:', error);
    res.status(400).json({ message: error.message || 'Error creating progress record' });
  }
};

// @desc    Delete progress item from student profile
// @route   DELETE /api/students/:id/progress/:itemId
// @access  Private
const deleteProgressItem = async (req, res) => {
  try {
    let student;
    const userRole = (req.user.role || '').toLowerCase();

    if (!req.params.id || req.params.id === 'me') {
      student = await Student.findOne({ userId: req.user._id });
    } else {
      student = await Student.findById(req.params.id).catch(() => null);
      if (!student) {
        student = await Student.findOne({ userId: req.params.id }).catch(() => null);
      }
    }

    if (!student && userRole === 'student') {
      student = await Student.findOne({ userId: req.user._id });
    }

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const ownerUserId = (student.userId?._id || student.userId).toString();
    if (userRole === 'student' && ownerUserId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this profile' });
    }

    if (!Array.isArray(student.progressItems)) {
      student.progressItems = [];
    }

    student.progressItems = student.progressItems.filter(
      (item) => item._id.toString() !== req.params.itemId
    );

    await student.save();
    const updatedStudent = await Student.findById(student._id).populate('userId', 'name email profileImage');
    res.json(updatedStudent);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Error deleting progress record' });
  }
};

// @desc    Delete a student
// @route   DELETE /api/students/:id
// @access  Private (Admin/Leader)
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (student) {
      if (student.userId) {
        await User.findByIdAndDelete(student.userId).catch(() => null);
      }
      await student.deleteOne();
      res.json({ message: 'Student removed successfully' });
    } else {
      res.status(404).json({ message: 'Student not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  syncBulkStudentLeaveStatus,
  getStudents,
  getMyStudentProfile,
  getStudentById,
  createStudent,
  updateMyStudentProfile,
  updateStudent,
  addProgressItem,
  deleteProgressItem,
  deleteStudent
};
