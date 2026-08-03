const TrustMember = require('../models/TrustMember');
const LeaderProfile = require('../models/LeaderProfile');
const User = require('../models/User');
const { sendWelcomeEmail, getBrevoDefaultPassword } = require('../utils/sendEmail');

// --- Trust Members ---

// @desc    Get all trust members
// @route   GET /api/trust/members
// @access  Private
const getTrustMembers = async (req, res) => {
  try {
    const members = await TrustMember.find({});
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
    const leaders = await LeaderProfile.find({}).populate('userId', 'name email');
    res.json(leaders);
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

    const leaderProfile = await LeaderProfile.create({
      userId: user._id,
      role: assignedRole,
      contactNumber,
      duration
    });

    res.status(201).json(leaderProfile);
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
  deleteLeader
};
