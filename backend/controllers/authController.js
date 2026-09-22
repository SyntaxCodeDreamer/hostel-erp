const User = require('../models/User');
const LeaderProfile = require('../models/LeaderProfile');
const TrustMember = require('../models/TrustMember');
const Student = require('../models/Student');
const generateToken = require('../utils/generateToken');
const { sendWelcomeEmail, getBrevoDefaultPassword } = require('../utils/sendEmail');
const { capitalizeName } = require('../utils/formatters');

// Helper to find or auto-heal/recreate User record from directory profiles
const findOrSyncUserByEmail = async (cleanEmail) => {
  let user = await User.findOne({ email: { $regex: new RegExp('^' + cleanEmail + '$', 'i') } });
  if (user) return user;

  // Check if user exists in LeaderProfile
  const leader = await LeaderProfile.findOne({ email: { $regex: new RegExp('^' + cleanEmail + '$', 'i') } });
  if (leader) {
    const defaultPass = getBrevoDefaultPassword(leader.email);
    user = await User.create({
      name: capitalizeName(leader.name) || 'Leader',
      email: leader.email.toLowerCase().trim(),
      password: defaultPass,
      role: 'Leader'
    });
    leader.userId = user._id;
    await leader.save();
    return user;
  }

  // Check if user exists in TrustMember
  const trustee = await TrustMember.findOne({ email: { $regex: new RegExp('^' + cleanEmail + '$', 'i') } });
  if (trustee) {
    const defaultPass = getBrevoDefaultPassword(trustee.email);
    user = await User.create({
      name: capitalizeName(trustee.name) || 'Trust Member',
      email: trustee.email.toLowerCase().trim(),
      password: defaultPass,
      role: trustee.role || 'Trustee'
    });
    trustee.userId = user._id;
    await trustee.save();
    return user;
  }

  // Check if user exists in Student
  const student = await Student.findOne({ email: { $regex: new RegExp('^' + cleanEmail + '$', 'i') } });
  if (student) {
    const defaultPass = getBrevoDefaultPassword(student.email);
    user = await User.create({
      name: capitalizeName(student.fullName) || 'Student',
      email: student.email.toLowerCase().trim(),
      password: defaultPass,
      role: 'Student'
    });
    student.userId = user._id;
    await student.save();
    return user;
  }

  return null;
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password' });
    }

    const cleanEmail = email.trim();
    // Case-insensitive query with auto-healing from directory profiles
    const user = await findOrSyncUserByEmail(cleanEmail);

    if (user && (await user.matchPassword(password.trim()))) {
      // Check if student account is suspended
      if ((user.role || '').toLowerCase() === 'student') {
        const studentProfile = await Student.findOne({ userId: user._id });
        if (studentProfile) {
          const now = new Date();
          const fromDate = studentProfile.suspendedFrom ? new Date(studentProfile.suspendedFrom) : null;
          const untilDate = studentProfile.suspendedUntil ? new Date(studentProfile.suspendedUntil) : null;

          if (untilDate && now > untilDate) {
            // Suspension expired! Auto-lift it
            studentProfile.status = 'Available';
            studentProfile.isManualStatus = false;
            studentProfile.suspendedFrom = null;
            studentProfile.suspendedUntil = null;
            studentProfile.suspensionReason = '';
            studentProfile.suspendedAt = null;
            await studentProfile.save();
          } else if (fromDate && now < fromDate) {
            // Future suspension: not active yet, allow login
          } else if ((studentProfile.status || '').toLowerCase() === 'suspended') {
            let durationStr = '';
            if (studentProfile.suspendedFrom && studentProfile.suspendedUntil) {
              const fromStr = new Date(studentProfile.suspendedFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              const toStr = new Date(studentProfile.suspendedUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              durationStr = ` from ${fromStr} till ${toStr}`;
            } else if (studentProfile.suspendedUntil) {
              durationStr = ` until ${new Date(studentProfile.suspendedUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
            }
            return res.status(403).json({ 
              message: `Your student account has been suspended${durationStr} by administration. Please contact the hostel office.` 
            });
          }
        }
      }

      res.json({
        _id: user._id,
        name: capitalizeName(user.name),
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (Can be restricted to Admin later)
const register = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = capitalizeName(name);
    const userExists = await User.findOne({ email: cleanEmail });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const userRole = role || 'Student';
    const finalPassword = (password && password.trim()) ? password.trim() : getBrevoDefaultPassword(cleanEmail);

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: finalPassword,
      role: userRole
    });

    if (user) {
      // Send Welcome email via Brevo
      sendWelcomeEmail({
        name: cleanName,
        email: cleanEmail,
        role: userRole,
        password: finalPassword
      });

      res.status(201).json({
        _id: user._id,
        name: capitalizeName(user.name),
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: capitalizeName(user.name),
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user._id);

    if (user && (await user.matchPassword(currentPassword))) {
      user.password = newPassword;
      await user.save();
      res.json({ message: 'Password updated successfully' });
    } else {
      res.status(401).json({ message: 'Incorrect current password' });
    }
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Self-service password reset (Direct formula or custom password, zero emails)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  const { email, newPassword, resetToDefault = true } = req.body;

  try {
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Please enter your registered email address' });
    }

    const cleanEmail = email.trim();
    const user = await findOrSyncUserByEmail(cleanEmail);

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    let finalPassword = '';
    if (resetToDefault || !newPassword) {
      finalPassword = getBrevoDefaultPassword(user.email);
    } else {
      if (newPassword.trim().length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }
      finalPassword = newPassword.trim();
    }

    user.password = finalPassword;
    user.resetPasswordOtp = null;
    user.resetPasswordExpire = null;
    await user.save();

    res.json({ 
      message: `Password successfully updated in database! You can now log in.`,
      password: finalPassword,
      email: user.email,
      isDefaultFormula: !!(resetToDefault || !newPassword)
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to process password reset request' });
  }
};



// @desc    Reset password using 6-digit OTP code
// @route   POST /api/auth/reset-password
// @access  Public
const resetPasswordWithOtp = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, verification code, and new password are required' });
    }

    if (newPassword.trim().length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const cleanEmail = email.trim();
    const cleanOtp = otp.toString().trim();

    const user = await User.findOne({
      email: { $regex: new RegExp('^' + cleanEmail + '$', 'i') },
      resetPasswordOtp: cleanOtp,
      resetPasswordExpire: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code. Please request a new one.' });
    }

    // Update password (pre-save hook will automatically hash it with bcrypt)
    user.password = newPassword.trim();
    user.resetPasswordOtp = null;
    user.resetPasswordExpire = null;
    await user.save();

    res.json({ message: 'Password has been reset successfully! You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

// @desc    Admin reset user password (custom or default formula)
// @route   POST /api/auth/admin-reset-password
// @access  Private (Admin only)
const adminResetPassword = async (req, res) => {
  const { targetUserId, newPassword, resetToDefault, notifyUser = true } = req.body;

  try {
    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user ID is required' });
    }

    const mongoose = require('mongoose');
    let targetUser = null;
    if (mongoose.Types.ObjectId.isValid(targetUserId)) {
      targetUser = await User.findById(targetUserId);
    }
    if (!targetUser) {
      targetUser = await User.findOne({ email: { $regex: new RegExp('^' + targetUserId.toString().trim() + '$', 'i') } });
    }
    if (!targetUser && mongoose.Types.ObjectId.isValid(targetUserId)) {
      const tm = await TrustMember.findById(targetUserId);
      if (tm && tm.email) {
        targetUser = await findOrSyncUserByEmail(tm.email);
      }
    }
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user account not found' });
    }

    let finalPassword = '';
    if (resetToDefault) {
      finalPassword = getBrevoDefaultPassword(targetUser.email);
    } else {
      if (!newPassword || newPassword.trim().length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }
      finalPassword = newPassword.trim();
    }

    targetUser.password = finalPassword;
    targetUser.resetPasswordOtp = null;
    targetUser.resetPasswordExpire = null;
    await targetUser.save();

    res.json({
      message: `Password for ${targetUser.name} (${targetUser.email}) was reset successfully.`,
      email: targetUser.email,
      isDefaultFormula: !!resetToDefault,
      newPassword: finalPassword
    });
  } catch (error) {
    console.error('Admin reset password error:', error);
    res.status(500).json({ message: 'Failed to reset user password' });
  }
};

module.exports = {
  login,
  register,
  getProfile,
  changePassword,
  forgotPassword,
  resetPasswordWithOtp,
  adminResetPassword
};
