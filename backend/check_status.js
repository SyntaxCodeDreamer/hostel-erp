require('dotenv').config({ path: 'e:/hostel-erp-main/backend/.env' });
const connectDB = require('./backend/config/db');

async function run() {
  await connectDB();
  const Student = require('./backend/models/Student');
  const Leave = require('./backend/models/LeaveRequest');
  
  const leaves = await Leave.find({ status: { $in: ['Approved', 'approved'] } }).sort({ createdAt: -1 }).lean();
  console.log('Total approved leaves:', leaves.length);
  for (const l of leaves.slice(0, 10)) {
    const s = await Student.findById(l.studentId).lean();
    console.log(`${l.studentName} | From: ${l.fromDate?.toISOString()?.slice(0,10)} | To: ${l.toDate?.toISOString()?.slice(0,10)} | Student Status: ${s?.status}`);
  }
  process.exit(0);
}

run();
