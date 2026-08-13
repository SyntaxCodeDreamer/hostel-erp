const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config({ path: path.join(__dirname, '.env') });

const addAdmin = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB Atlas...');

    const email = 'rishuright14@gmail.com';
    const password = 'admin';

    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      user.role = 'Admin';
      user.password = password;
      await user.save();
      console.log(`✅ Existing user updated to Admin role for email: ${user.email}`);
    } else {
      user = await User.create({
        name: 'Rishu Admin',
        email: email.toLowerCase(),
        password: password,
        role: 'Admin'
      });
      console.log(`✅ New Admin account successfully created for email: ${user.email}`);
    }

    console.log(`\n===================================`);
    console.log(`Admin Credentials:`);
    console.log(`Email:    ${user.email}`);
    console.log(`Password: ${password}`);
    console.log(`Role:     ${user.role}`);
    console.log(`===================================\n`);

    process.exit(0);
  } catch (error) {
    console.error(`❌ Error creating/updating Admin account: ${error.message}`);
    process.exit(1);
  }
};

addAdmin();
