const TrustMember = require('../models/TrustMember');
const LeaderProfile = require('../models/LeaderProfile');
const Student = require('../models/Student');
const User = require('../models/User');
const { sendWelcomeEmail, getBrevoDefaultPassword } = require('../utils/sendEmail');
const { capitalizeName } = require('../utils/formatters');

// --- Trust Members ---

// @desc    Get all trust members
// @route   GET /api/trust/members
// @access  Private
const getTrustMembers = async (req, res) => {
  try {
    const members = await TrustMember.find({})
      .populate('userId', 'name email role profileImage')
      .lean();

    const formattedMembers = await Promise.all(members.map(async (m) => {
      let u = m.userId;
      if (!u && m.email) {
        u = await User.findOne({ email: m.email.trim().toLowerCase() }).select('name email role profileImage').lean();
        if (!u) {
          const defaultPass = getBrevoDefaultPassword(m.email);
          const newUser = await User.create({
            name: m.name,
            email: m.email.trim().toLowerCase(),
            password: defaultPass,
            role: 'Trustee'
          });
          u = { _id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role };
          await TrustMember.updateOne({ _id: m._id }, { $set: { userId: newUser._id } });
        } else {
          await TrustMember.updateOne({ _id: m._id }, { $set: { userId: u._id } });
        }
      }
      return {
        ...m,
        name: capitalizeName(m.name || u?.name || ''),
        userId: u ? { ...u, name: capitalizeName(u.name) } : null
      };
    }));

    res.json(formattedMembers);
  } catch (error) {
    console.error('Error fetching trust members:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a trust member
// @route   POST /api/trust/members
// @access  Private (Admin)
const createTrustMember = async (req, res) => {
  const { name, email, position, contactNumber, joiningDate, password } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ message: 'Name is required to add a trust member' });
    }

    const cleanName = capitalizeName(name);
    const cleanEmail = (email || '').trim().toLowerCase();
    const assignedRole = 'Trustee';
    const finalPassword = (password && password.trim()) ? password.trim() : (cleanEmail ? getBrevoDefaultPassword(cleanEmail) : 'trustee1993');

    let createdUser = null;
    // If email provided, create or update User account & send welcome login email
    if (cleanEmail) {
      let user = await User.findOne({ email: cleanEmail });
      if (!user) {
        user = await User.create({
          name: cleanName,
          email: cleanEmail,
          password: finalPassword,
          role: assignedRole
        });
      } else {
        user.role = assignedRole;
        if (password && password.trim()) {
          user.password = password.trim();
        }
        await user.save();
      }
      createdUser = user;

      // Send Welcome login email with password instructions
      await sendWelcomeEmail({
        name: cleanName,
        email: cleanEmail,
        role: assignedRole,
        password: finalPassword
      });
    }

    const member = await TrustMember.create({
      name: cleanName,
      email: cleanEmail,
      userId: createdUser ? createdUser._id : null,
      position,
      contactNumber,
      joiningDate
    });

    res.status(201).json({
      ...member.toObject(),
      userId: createdUser ? { _id: createdUser._id, name: createdUser.name, email: createdUser.email, role: createdUser.role } : null
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a trust member
// @route   DELETE /api/trust/members/:id
// @access  Private (Admin)
const deleteTrustMember = async (req, res) => {
  try {
    const member = await TrustMember.findById(req.params.id);
    if (member) {
      if (member.email) {
        const user = await User.findOne({ email: member.email.trim().toLowerCase() });
        if (user && user.role === 'Trustee') {
          await user.deleteOne();
        }
      }
      await member.deleteOne();
      res.json({ message: 'Trust member removed' });
    } else {
      res.status(404).json({ message: 'Trust member not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Leaders ---

// @desc    Get all leaders
// @route   GET /api/trust/leaders
// @access  Private
const getLeaders = async (req, res) => {
  try {
    const leaders = await LeaderProfile.find({})
      .populate('userId', 'name email role profileImage')
      .populate('studentId')
      .lean();

    const formattedLeaders = await Promise.all(leaders.map(async (l) => {
      let student = l.studentId;
      if (!student && l.userId) {
        const uId = l.userId._id || l.userId;
        student = await Student.findOne({ userId: uId }).lean();
      }
      return {
        ...l,
        name: capitalizeName(l.name || l.userId?.name || student?.fullName || ''),
        email: l.email || l.userId?.email || student?.email || '',
        contactNumber: l.contactNumber || student?.mobile || '',
        student: student || null
      };
    }));

    res.json(formattedLeaders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a leader profile (or appoint existing student as leader)
// @route   POST /api/trust/leaders
// @access  Private (Admin)
const createLeader = async (req, res) => {
  const { name, email, password, role, contactNumber, duration, studentId } = req.body;

  try {
    const assignedRole = role || 'Leader';
    let student = null;
    if (studentId) {
      student = await Student.findById(studentId).populate('userId');
    }

    let cleanEmail = (email || '').trim().toLowerCase();
    let leaderName = (name || '').trim();
    let contact = (contactNumber || '').trim();

    if (student) {
      if (!leaderName) leaderName = student.fullName || '';
      if (!cleanEmail) cleanEmail = (student.userId?.email || student.email || '').trim().toLowerCase();
      if (!contact) contact = student.mobile || '';
    }

    if (!cleanEmail) {
      return res.status(400).json({ message: 'Email is required to create a Leader account' });
    }

    leaderName = capitalizeName(leaderName);
    const finalPassword = (password && password.trim()) ? password.trim() : getBrevoDefaultPassword(cleanEmail);

    // Find or create user
    let user = null;
    if (student?.userId) {
      const uId = student.userId._id || student.userId;
      user = await User.findById(uId);
    }
    if (!user) {
      user = await User.findOne({ email: cleanEmail });
    }

    if (!user) {
      user = await User.create({
        name: leaderName || 'Leader',
        email: cleanEmail,
        password: finalPassword,
        role: assignedRole
      });
    } else {
      user.role = assignedRole;
      if (password && password.trim()) {
        user.password = password.trim();
      }
      await user.save();
    }

    // Link student's userId if not linked
    if (student) {
      if (!student.userId || student.userId.toString() !== user._id.toString()) {
        student.userId = user._id;
      }
      if (!student.email) student.email = cleanEmail;
      await student.save();
    } else {
      student = await Student.findOne({ userId: user._id });
      if (!student) {
        student = await Student.findOne({ email: cleanEmail });
      }
    }

    // Send Welcome login email
    await sendWelcomeEmail({
      name: leaderName || user.name,
      email: cleanEmail,
      role: assignedRole,
      password: finalPassword
    });

    let leaderProfile = await LeaderProfile.findOne({ userId: user._id });
    if (leaderProfile) {
      leaderProfile.name = leaderName || user.name;
      leaderProfile.email = cleanEmail;
      leaderProfile.role = assignedRole;
      leaderProfile.contactNumber = contact || leaderProfile.contactNumber;
      leaderProfile.duration = duration || leaderProfile.duration;
      if (student) leaderProfile.studentId = student._id;
      await leaderProfile.save();
    } else {
      leaderProfile = await LeaderProfile.create({
        userId: user._id,
        studentId: student ? student._id : undefined,
        name: leaderName || user.name || 'Leader',
        email: cleanEmail,
        role: assignedRole,
        contactNumber: contact || '',
        duration: duration || ''
      });
    }

    // If still no student profile exists, create fallback student profile
    if (!student) {
      student = await Student.create({
        userId: user._id,
        fullName: leaderName || user.name || 'Leader',
        email: cleanEmail,
        village: 'N/A',
        homeAddress: 'N/A',
        course: 'N/A',
        collegeName: 'N/A',
        joiningYear: new Date().getFullYear(),
        joiningMonth: 'August',
        mobile: contact || 'N/A',
        parentsMobile: 'N/A',
        drivingLicense: false,
        roomNumber: 'Unassigned',
        status: 'Available'
      });
      leaderProfile.studentId = student._id;
      await leaderProfile.save();
    }

    res.status(201).json(leaderProfile);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a leader profile (or assign/change student profile)
// @route   PUT /api/trust/leaders/:id
// @access  Private (Admin)
const updateLeader = async (req, res) => {
  const { name, email, role, contactNumber, duration, studentId } = req.body;
  try {
    const leader = await LeaderProfile.findById(req.params.id);
    if (!leader) {
      return res.status(404).json({ message: 'Leader not found' });
    }

    if (name) leader.name = capitalizeName(name);
    if (email) leader.email = email.trim().toLowerCase();
    if (role) leader.role = role;
    if (contactNumber !== undefined) leader.contactNumber = contactNumber;
    if (duration !== undefined) leader.duration = duration;

    // Handle assigning or changing student profile
    if (studentId) {
      const targetStudent = await Student.findById(studentId);
      if (targetStudent) {
        // If leader had an auto-created dummy student, delete it to avoid ghost records
        if (leader.userId) {
          const oldDummy = await Student.findOne({
            userId: leader.userId,
            _id: { $ne: targetStudent._id },
            roomNumber: 'Unassigned',
            village: 'N/A'
          });
          if (oldDummy) {
            await oldDummy.deleteOne().catch(() => null);
          }
        }

        leader.studentId = targetStudent._id;
        leader.name = targetStudent.fullName || leader.name;
        leader.contactNumber = targetStudent.mobile || leader.contactNumber;

        // Ensure user account role is Leader and synced
        if (targetStudent.userId) {
          const targetUser = await User.findById(targetStudent.userId);
          if (targetUser) {
            targetUser.role = leader.role || 'Leader';
            await targetUser.save();
            leader.userId = targetUser._id;
            leader.email = targetUser.email || leader.email;
          }
        } else if (leader.userId) {
          targetStudent.userId = leader.userId;
          if (!targetStudent.email && leader.email) {
            targetStudent.email = leader.email;
          }
          await targetStudent.save();
          await User.findByIdAndUpdate(leader.userId, { role: leader.role || 'Leader' });
        }
      }
    }

    await leader.save();

    // Update associated User and Student
    if (leader.userId) {
      const user = await User.findById(leader.userId);
      if (user) {
        if (leader.name) user.name = leader.name;
        if (leader.email) user.email = leader.email.trim().toLowerCase();
        if (leader.role) user.role = leader.role;
        await user.save();
      }

      const student = (leader.studentId ? await Student.findById(leader.studentId) : null) || await Student.findOne({ userId: leader.userId });
      if (student) {
        if (leader.name) student.fullName = leader.name;
        if (leader.email) student.email = leader.email.trim().toLowerCase();
        if (leader.contactNumber) student.mobile = leader.contactNumber;
        await student.save();
      }
    }

    const updatedLeader = await LeaderProfile.findById(leader._id)
      .populate('userId', 'name email role profileImage')
      .populate('studentId')
      .lean();

    res.json(updatedLeader);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a leader profile
// @route   DELETE /api/trust/leaders/:id
// @access  Private (Admin)
const deleteLeader = async (req, res) => {
  try {
    const leader = await LeaderProfile.findById(req.params.id);
    if (leader) {
      if (leader.userId) {
        // Revert user role back to Student
        await User.findByIdAndUpdate(leader.userId, { role: 'Student' }).catch(() => null);

        // Only delete the Student record if it was an auto-created dummy student with no real data
        const student = await Student.findOne({ userId: leader.userId });
        if (student && student.village === 'N/A' && student.course === 'N/A' && student.roomNumber === 'Unassigned') {
          await student.deleteOne().catch(() => null);
          await User.findByIdAndDelete(leader.userId).catch(() => null);
        }
      }
      await leader.deleteOne();
      res.json({ message: 'Leader removed successfully' });
    } else {
      res.status(404).json({ message: 'Leader not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTrustMembers,
  createTrustMember,
  deleteTrustMember,
  getLeaders,
  createLeader,
  updateLeader,
  deleteLeader
};
