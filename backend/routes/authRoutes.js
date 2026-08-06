const express = require('express');
const router = express.Router();
const { login, register, getProfile, changePassword } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/register', protect, authorize('Admin', 'admin'), register);
router.post('/login', login);
router.get('/profile', protect, getProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;
