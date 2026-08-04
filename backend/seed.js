const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Student = require('./models/Student');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const importData = async () => {
  try {
    await User.deleteMany();
    await Student.deleteMany();

    // Accounts for both @example.com, @test.com, and @hostel.com
    const admin1 = await User.create({ name: 'Admin User', email: 'admin@example.com', password: 'password123', role: 'Admin' });
    const admin2 = await User.create({ name: 'Admin Test', email: 'admin@test.com', password: 'password123', role: 'Admin' });
    const admin3 = await User.create({ name: 'Admin Hostel', email: 'admin@hostel.com', password: 'password123', role: 'Admin' });

    const leader1 = await User.create({ name: 'Leader User', email: 'leader@example.com', password: 'password123', role: 'Leader' });
    const leader2 = await User.create({ name: 'Leader Hostel', email: 'leader@hostel.com', password: 'password123', role: 'Leader' });

    const student1 = await User.create({ name: 'Student One', email: 'student1@example.com', password: 'password123', role: 'Student' });
    const student2 = await User.create({ name: 'Student Two', email: 'student2@example.com', password: 'password123', role: 'Student' });
    const student3 = await User.create({ name: 'Student Hostel', email: 'student@hostel.com', password: 'password123', role: 'Student' });

    await Student.insertMany([
      {
        userId: student1._id,
        village: 'Palampur',
        homeAddress: 'Palampur, HP',
        course: 'B.Tech Computer Science',
        collegeName: 'Government Engineering College',
        joiningYear: 2024,
        joiningMonth: 'July',
        mobile: '9876543210',
        parentsMobile: '9876543211',
        roomNumber: '101'
      },
      {
        userId: student2._id,
        village: 'Solan',
        homeAddress: 'Solan, HP',
        course: 'MCA Applications',
        collegeName: 'State Institute of Technology',
        joiningYear: 2023,
        joiningMonth: 'August',
        mobile: '8765432109',
        parentsMobile: '8765432108',
        roomNumber: '102'
      },
      {
        userId: student3._id,
        village: 'Palampur',
        homeAddress: 'Palampur Main Market',
        course: 'B.Tech Computer Science',
        collegeName: 'Government Engineering College',
        joiningYear: 2024,
        joiningMonth: 'August',
        mobile: '7654321098',
        parentsMobile: '7654321097',
        roomNumber: '103'
      }
    ]);

    console.log('Database seeded with all admin, leader, and student accounts!');
    process.exit();
  } catch (error) {
    console.error(`Error seeding database: ${error}`);
    process.exit(1);
  }
};

importData();
