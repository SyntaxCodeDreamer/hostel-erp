const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Student = require('./models/Student');
const Announcement = require('./models/Announcement');
const Expense = require('./models/Expense');
const LeaderProfile = require('./models/LeaderProfile');
const LeaveRequest = require('./models/LeaveRequest');
const Notification = require('./models/Notification');
const PushSubscription = require('./models/PushSubscription');
const Task = require('./models/Task');
const TrustMember = require('./models/TrustMember');
const connectDB = require('./config/db');

dotenv.config();

const resetData = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB Atlas...');

    console.log('Deleting all Students...');
    await Student.deleteMany({});

    console.log('Deleting all Leave Requests...');
    await LeaveRequest.deleteMany({});

    console.log('Deleting all Tasks...');
    await Task.deleteMany({});

    console.log('Deleting all Announcements...');
    await Announcement.deleteMany({});

    console.log('Deleting all Trust Members...');
    await TrustMember.deleteMany({});

    console.log('Deleting all Leaders...');
    await LeaderProfile.deleteMany({});

    console.log('Deleting all Notifications...');
    await Notification.deleteMany({});

    console.log('Deleting all Expenses...');
    await Expense.deleteMany({});

    console.log('Deleting all Non-Admin Users (Students, Leaders, Trust Members)...');
    await User.deleteMany({ role: { $in: ['Student', 'student', 'Leader', 'leader', 'Trust Member', 'trust member', 'Trustee', 'trustee'] } });

    const adminCount = await User.countDocuments({ role: { $in: ['Admin', 'admin'] } });
    console.log(`Remaining Admin Accounts: ${adminCount}`);

    console.log('\n✅ Successfully removed all students, leave requests, tasks, announcements, trust members, and leaders from the database!');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error clearing database: ${error.message}`);
    process.exit(1);
  }
};

resetData();
