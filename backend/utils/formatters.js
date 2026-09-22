/**
 * Helper utility for capitalizing names in Title Case:
 * "all the first name and last name first letter should be in capital"
 * e.g. "keval nagaria" -> "Keval Nagaria"
 *      "KEVAL NAGARIA" -> "Keval Nagaria"
 *      "mary-jane watson" -> "Mary-Jane Watson"
 *      "a.p.j. abdul kalam" -> "A.P.J. Abdul Kalam"
 */
const capitalizeName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|[\s\-\.\/'])([a-z0-9])/g, (_, boundary, char) => boundary + char.toUpperCase());
};

/**
 * One-time sanitization of existing records in the database on server start
 * so all legacy names have their first and last name letters capitalized.
 */
const sanitizeAllDatabaseNames = async () => {
  try {
    const User = require('../models/User');
    const Student = require('../models/Student');
    const TrustMember = require('../models/TrustMember');
    const LeaderProfile = require('../models/LeaderProfile');
    const LeaveRequest = require('../models/LeaveRequest');

    // 1. Sanitize Users
    const users = await User.find({ name: { $exists: true, $ne: '' } });
    for (const u of users) {
      const cap = capitalizeName(u.name);
      if (cap && cap !== u.name) {
        await User.updateOne({ _id: u._id }, { $set: { name: cap } });
      }
    }

    // 2. Sanitize Students
    const students = await Student.find({ fullName: { $exists: true, $ne: '' } });
    for (const s of students) {
      const cap = capitalizeName(s.fullName);
      if (cap && cap !== s.fullName) {
        await Student.updateOne({ _id: s._id }, { $set: { fullName: cap } });
      }
    }

    // 3. Sanitize Trust Members
    const members = await TrustMember.find({ name: { $exists: true, $ne: '' } });
    for (const m of members) {
      const cap = capitalizeName(m.name);
      if (cap && cap !== m.name) {
        await TrustMember.updateOne({ _id: m._id }, { $set: { name: cap } });
      }
    }

    // 4. Sanitize Leaders
    const leaders = await LeaderProfile.find({ name: { $exists: true, $ne: '' } });
    for (const l of leaders) {
      const cap = capitalizeName(l.name);
      if (cap && cap !== l.name) {
        await LeaderProfile.updateOne({ _id: l._id }, { $set: { name: cap } });
      }
    }

    // 5. Sanitize LeaveRequests
    const leaves = await LeaveRequest.find({});
    for (const lr of leaves) {
      let changed = false;
      const update = {};
      if (lr.studentName) {
        const cap = capitalizeName(lr.studentName);
        if (cap !== lr.studentName) { update.studentName = cap; changed = true; }
      }
      if (lr.reviewerName) {
        const cap = capitalizeName(lr.reviewerName);
        if (cap !== lr.reviewerName) { update.reviewerName = cap; changed = true; }
      }
      if (changed) {
        await LeaveRequest.updateOne({ _id: lr._id }, { $set: update });
      }
    }

    console.log('Database user & student names sanitized to Title Case.');
  } catch (err) {
    console.error('Error during database name sanitization:', err.message);
  }
};

module.exports = {
  capitalizeName,
  sanitizeAllDatabaseNames
};
