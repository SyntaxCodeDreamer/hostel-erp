const express = require('express');
const router = express.Router();
const {
  getPublicKey,
  subscribe,
  unsubscribe,
  sendTestNotification
} = require('../controllers/pushController');
const { protect } = require('../middleware/authMiddleware');

// Public route to fetch VAPID public key
router.get('/public-key', getPublicKey);

// Protected routes for managing user push subscriptions
router.post('/subscribe', protect, subscribe);
router.post('/unsubscribe', protect, unsubscribe);
router.post('/test', protect, sendTestNotification);

module.exports = router;
