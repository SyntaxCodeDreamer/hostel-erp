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

const importData = async () => {
  try {
    await connectDB();

    console.log('Clearing all collections...');
    await User.deleteMany();
    await Student.deleteMany();
    await Announcement.deleteMany();
    await Expense.deleteMany();
    await LeaderProfile.deleteMany();
    await LeaveRequest.deleteMany();
    await Notification.deleteMany();
    await PushSubscription.deleteMany();
    await Task.deleteMany();
    await TrustMember.deleteMany();

    const email = process.argv[2] || process.env.ADMIN_EMAIL;
    const password = process.argv[3] || process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      console.error('\nUsage: node seed.js <admin_email> <admin_password>');
      console.error('Example: node seed.js admin@domain.com mySecurePassword123\n');
      process.exit(1);
    }

    console.log(`Creating Admin account in MongoDB Atlas for: ${email}`);
    const admin = await User.create({
      name: 'Admin',
      email: email,
      password: password,
      role: 'Admin'
    });

    console.log('Database cleared and Admin account successfully created in MongoDB!');
    console.log(`Stored Admin Email in MongoDB: ${admin.email}`);
    process.exit(0);
  } catch (error) {
    console.error(`Error resetting database: ${error}`);
    process.exit(1);
  }
};

importData();

