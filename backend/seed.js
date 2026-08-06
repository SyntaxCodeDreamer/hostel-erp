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

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required in .env');
    }

    console.log(`Creating Admin user ${adminEmail}...`);
    const admin = await User.create({
      name: 'Admin User',
      email: adminEmail,
      password: adminPassword,
      role: 'Admin'
    });

    console.log('Database cleared and Admin account created successfully in MongoDB Atlas!');
    console.log(`Admin Email: ${admin.email}`);
    process.exit(0);
  } catch (error) {
    console.error(`Error resetting database: ${error}`);
    process.exit(1);
  }
};

importData();

