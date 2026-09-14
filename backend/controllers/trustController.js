const TrustMember = require('../models/TrustMember');
const LeaderProfile = require('../models/LeaderProfile');
const Student = require('../models/Student');
const User = require('../models/User');
const { sendWelcomeEmail, getBrevoDefaultPassword } = require('../utils/sendEmail');

// --- Trust Members ---

// @desc    Get all trust members
// @route   GET /api/trust/members
// @access  Private
const getTrustMembers = async (req, res) => {
  try {
    const members = await TrustMember.find({}).lean();
    res.json(members);
  } catch (error) {
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

    const cleanEmail = (email || '').trim().toLowerCase();
    const assignedRole = 'Trustee';
    const finalPassword = (password && password.trim()) ? password.trim() : (cleanEmail ? getBrevoDefaultPassword(cleanEmail) : 'trustee1993');

    // If email provided, create or update User account & send welcome login email
    if (cleanEmail) {
      let user = await User.findOne({ email: cleanEmail });
      if (!user) {
        user = await User.create({
          name,
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

      // Send Welcome login email with bank-style password instructions
      await sendWelcomeEmail({
        name,
        email: cleanEmail,
        role: assignedRole,
        password: finalPassword
      });
    }

    const member = await TrustMember.create({
      name,
      email: cleanEmail,
      position,
      contactNumber,
      joiningDate
    });

    res.status(201).json(member);
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
    const leaders = await LeaderProfile.find({}).populate('userId', 'name email').lean();
    const formattedLeaders = leaders.map(l => ({
      ...l,
      name: l.name || l.userId?.name || '',
      email: l.email || l.userId?.email || ''
    }));
    res.json(formattedLeaders);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a leader profile
// @route   POST /api/trust/leaders
// @access  Private (Admin)
const createLeader = async (req, res) => {
  const { name, email, password, role, contactNumber, duration } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required to create a Leader account' });
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const assignedRole = role || 'Leader';
    const finalPassword = (password && password.trim()) ? password.trim() : getBrevoDefaultPassword(cleanEmail);

    // Check if user exists, else create
    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = await User.create({ name, email: cleanEmail, password: finalPassword, role: assignedRole });
    } else {
      user.role = assignedRole;
      if (password && password.trim()) {
        user.password = password.trim();
      }
      await user.save();
    }

    // Send Welcome login email with bank-style password instructions
    await sendWelcomeEmail({
      name: name || user.name,
      email: cleanEmail,
      role: assignedRole,
      password: finalPassword
    });

    const leaderName = name || user.name || 'Leader';
    const leaderProfile = await LeaderProfile.create({
      userId: user._id,
      name: leaderName,
      email: cleanEmail,
      role: assignedRole,
      contactNumber: contactNumber || '',
      duration: duration || ''
    });

    // Automatically create or link a Student profile for this Leader
    let student = await Student.findOne({ userId: user._id });
    if (!student) {
      await Student.create({
        userId: user._id,
        fullName: leaderName,
        email: cleanEmail,
        village: 'N/A',
        homeAddress: 'N/A',
        course: 'N/A',
        collegeName: 'N/A',
        joiningYear: new Date().getFullYear(),
        joiningMonth: 'August',
        mobile: contactNumber || 'N/A',
        parentsMobile: 'N/A',
        drivingLicense: false,
        roomNumber: 'Unassigned',
        status: 'Available'
      });
    }

    res.status(201).json(leaderProfile);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a leader profile
// @route   PUT /api/trust/leaders/:id
// @access  Private (Admin)
const updateLeader = async (req, res) => {
  const { name, email, role, contactNumber, duration } = req.body;
  try {
    const leader = await LeaderProfile.findById(req.params.id);
    if (!leader) {
      return res.status(404).json({ message: 'Leader not found' });
    }

    if (name) leader.name = name;
    if (email) leader.email = email.trim().toLowerCase();
    if (role) leader.role = role;
    if (contactNumber !== undefined) leader.contactNumber = contactNumber;
    if (duration !== undefined) leader.duration = duration;

    await leader.save();

    // Update associated User and Student
    if (leader.userId) {
      const user = await User.findById(leader.userId);
      if (user) {
        if (name) user.name = name;
        if (email) user.email = email.trim().toLowerCase();
        if (role) user.role = role;
        await user.save();
      }

      const student = await Student.findOne({ userId: leader.userId });
      if (student) {
        if (name) student.fullName = name;
        if (email) student.email = email.trim().toLowerCase();
        if (contactNumber) student.mobile = contactNumber;
        await student.save();
      }
    }

    res.json(leader);
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
        await User.findByIdAndDelete(leader.userId).catch(() => null);
        await Student.findOneAndDelete({ userId: leader.userId }).catch(() => null);
      }
      await leader.deleteOne();
      res.json({ message: 'Leader removed' });
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
