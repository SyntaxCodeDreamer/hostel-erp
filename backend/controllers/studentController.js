const Student = require('../models/Student');
const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const { sendWelcomeEmail, getBrevoDefaultPassword } = require('../utils/sendEmail');

// Helper to auto-sync student status ('On Leave' vs 'Active') based on today's date and approved leave date range
const syncStudentLeaveStatus = async (studentDoc) => {
  if (!studentDoc) return studentDoc;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const approvedLeaves = await LeaveRequest.find({
      studentId: studentDoc._id,
      status: { $in: ['Approved', 'approved'] }
    });

    let isOnLeaveToday = false;

    for (const leave of approvedLeaves) {
      if (!leave.fromDate || !leave.toDate) continue;
      const from = new Date(leave.fromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(leave.toDate);
      to.setHours(23, 59, 59, 999);

      if (today >= from && today <= to) {
        isOnLeaveToday = true;
        break;
      }
    }

    const expectedStatus = isOnLeaveToday ? 'On Leave' : 'Active';
    if (studentDoc.status !== expectedStatus) {
      studentDoc.status = expectedStatus;
      await studentDoc.save();
    }
  } catch (err) {
    console.error('Error syncing student leave status:', err);
  }
  return studentDoc;
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
      let student = await Student.findOne({ userId: req.user._id }).populate('userId', 'name email profileImage');
      if (!student) {
        student = new Student({
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
          status: 'Active'
        });
        await student.save();
        student = await Student.findById(student._id).populate('userId', 'name email profileImage');
      }
      return res.json([student]);
    }

    const students = await Student.find(query).populate('userId', 'name email profileImage');
    for (const student of students) {
      await syncStudentLeaveStatus(student);
    }
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
    let student = await Student.findOne({ userId: req.user._id }).populate('userId', 'name email profileImage');
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }
    await syncStudentLeaveStatus(student);
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
    let student = await Student.findById(req.params.id).populate('userId', 'name email profileImage');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    if (userRole === 'student' && student.userId?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view other student profiles' });
    }
    await syncStudentLeaveStatus(student);
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
    mobile, parentsMobile, drivingLicense, roomNumber
  } = req.body;

  try {
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required to create a student account' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const finalPassword = (password && password.trim()) ? password.trim() : getBrevoDefaultPassword(cleanEmail);

    const user = await User.create({
      name,
      email: cleanEmail,
      password: finalPassword,
      role: 'Student'
    });

    const student = new Student({
      userId: user._id,
      fullName: name,
      village, homeAddress, course, collegeName,
      otherCourseOrJob, joiningYear, joiningMonth,
      mobile, parentsMobile, drivingLicense, roomNumber
    });

    const createdStudent = await student.save();

    // Send Welcome email with credentials via Brevo
    await sendWelcomeEmail({
      name,
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

    if (req.body.village !== undefined) student.village = req.body.village;
    if (req.body.homeAddress !== undefined) student.homeAddress = req.body.homeAddress;
    if (req.body.course !== undefined) student.course = req.body.course;
    if (req.body.collegeName !== undefined) student.collegeName = req.body.collegeName;
    if (req.body.otherCourseOrJob !== undefined) student.otherCourseOrJob = req.body.otherCourseOrJob;
    if (req.body.mobile !== undefined) student.mobile = req.body.mobile;
    if (req.body.parentsMobile !== undefined) student.parentsMobile = req.body.parentsMobile;
    if (req.body.drivingLicense !== undefined) student.drivingLicense = req.body.drivingLicense;
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
      if (userRole === 'student' && student.userId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this profile' });
      }

      if (req.body.village !== undefined) student.village = req.body.village;
      if (req.body.homeAddress !== undefined) student.homeAddress = req.body.homeAddress;
      if (req.body.course !== undefined) student.course = req.body.course;
      if (req.body.collegeName !== undefined) student.collegeName = req.body.collegeName;
      if (req.body.otherCourseOrJob !== undefined) student.otherCourseOrJob = req.body.otherCourseOrJob;
      if (req.body.mobile !== undefined) student.mobile = req.body.mobile;
      if (req.body.parentsMobile !== undefined) student.parentsMobile = req.body.parentsMobile;
      if (req.body.drivingLicense !== undefined) student.drivingLicense = req.body.drivingLicense;
      if (req.body.roomNumber !== undefined) student.roomNumber = req.body.roomNumber;
      if (req.body.resultUrl !== undefined) student.resultUrl = req.body.resultUrl;
      if (req.body.resultDriveLink !== undefined) {
        student.resultDriveLink = req.body.resultDriveLink;
        student.resultUrl = req.body.resultDriveLink;
      }
      if (req.body.resultUrls !== undefined) student.resultUrls = req.body.resultUrls;
      if (req.body.progressItems !== undefined) student.progressItems = req.body.progressItems;
      if (req.body.status && userRole !== 'student') student.status = req.body.status;

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
