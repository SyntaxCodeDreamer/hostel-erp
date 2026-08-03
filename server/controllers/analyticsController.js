const Student = require('../models/Student');
const LeaveRequest = require('../models/LeaveRequest');
const Expense = require('../models/Expense');
const Task = require('../models/Task');
const User = require('../models/User');

// @desc    Get dashboard analytics
// @route   GET /api/analytics
// @access  Private
const getAnalytics = async (req, res) => {
  try {
    const userRole = (req.user.role || '').toLowerCase();

    if (userRole === 'student') {
      const student = await Student.findOne({ userId: req.user._id });
      const pendingLeaves = await LeaveRequest.countDocuments({ studentId: student?._id, status: 'Pending' });
      const pendingTasks = await Task.countDocuments({ assignedTo: req.user._id, status: { $ne: 'Completed' } });
      
      const approvedLeavesDocs = await LeaveRequest.find({ studentId: student?._id, status: { $in: ['Approved', 'approved'] } });
      let totalLeaveDays = 0;
      approvedLeavesDocs.forEach(leave => {
        if (leave.fromDate && leave.toDate) {
          const from = new Date(leave.fromDate);
          const to = new Date(leave.toDate);
          if (!isNaN(from) && !isNaN(to)) {
            const diffTime = Math.abs(to - from);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            totalLeaveDays += diffDays;
          }
        }
      });
      
      const studentProgressItems = student?.progressItems || [];
      const progressMap = {};
      studentProgressItems.forEach(item => {
        const cat = item.category || 'Other';
        progressMap[cat] = (progressMap[cat] || 0) + 1;
      });
      const progressByCategory = Object.keys(progressMap).map(cat => ({
        _id: cat,
        count: progressMap[cat]
      }));

      const recentProgressItems = [...studentProgressItems]
        .map(item => {
          const obj = item.toObject ? item.toObject() : item;
          return {
            ...obj,
            studentName: student?.fullName || req.user?.name || 'Student Resident',
            roomNumber: student?.roomNumber || ''
          };
        })
        .sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()))
        .slice(0, 10);

      return res.json({
        totalStudents: 1,
        pendingLeaves,
        pendingTasks,
        monthlyExpenseTotal: approvedLeavesDocs.length, 
        totalLeaveDays,
        studentsByCourse: [],
        leavesByStatus: [],
        taskStatusBreakdown: [],
        expensesByCategory: [],
        progressByCategory,
        recentProgressItems
      });
    }

    const totalStudents = await Student.countDocuments();
    const pendingLeaves = await LeaveRequest.countDocuments({ status: 'Pending' });
    const pendingTasks = await Task.countDocuments({ status: { $ne: 'Completed' } });
    
    // Group students by course
    const studentsByCourse = await Student.aggregate([
      { $group: { _id: "$course", count: { $sum: 1 } } }
    ]);

    // Group leaves by status
    const leavesByStatus = await LeaveRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // Task status breakdown
    const taskStatusBreakdown = await Task.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // Expense breakdown by category
    const expensesByCategory = await Expense.aggregate([
      { $group: { _id: "$category", totalAmount: { $sum: "$amount" } } },
      { $sort: { totalAmount: -1 } }
    ]);

    // Group student progress items by category
    const progressByCategory = await Student.aggregate([
      { $unwind: "$progressItems" },
      { $group: { _id: "$progressItems.category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Recent student progress report items overall
    const studentsWithProgress = await Student.find({ 'progressItems.0': { $exists: true } })
      .populate('userId', 'name email')
      .lean();

    let recentProgressItems = [];
    studentsWithProgress.forEach(st => {
      if (Array.isArray(st.progressItems)) {
        st.progressItems.forEach(item => {
          recentProgressItems.push({
            ...item,
            studentName: st.fullName || st.userId?.name || 'Student Resident',
            roomNumber: st.roomNumber || ''
          });
        });
      }
    });

    recentProgressItems.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    recentProgressItems = recentProgressItems.slice(0, 5);

    // Total expenses overall
    const totalExpenseResult = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    const monthlyExpenseTotal = totalExpenseResult.length > 0 ? totalExpenseResult[0].total : 0;

    res.json({
      totalStudents,
      pendingLeaves,
      pendingTasks,
      monthlyExpenseTotal,
      studentsByCourse,
      leavesByStatus,
      taskStatusBreakdown,
      expensesByCategory,
      progressByCategory,
      recentProgressItems
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAnalytics
};
