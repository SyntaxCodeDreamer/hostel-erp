const express = require('express');
const router = express.Router();
const { 
  login, 
  register, 
  getProfile, 
  changePassword,
  forgotPassword,
  resetPasswordWithOtp,
  adminResetPassword
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordWithOtp);
router.get('/profile', protect, getProfile);
router.put('/change-password', protect, changePassword);
router.post('/admin-reset-password', protect, authorize('Admin', 'admin'), adminResetPassword);

module.exports = router;
