const PushSubscription = require('../models/PushSubscription');
const { getVapidPublicKey, sendPushNotification } = require('../utils/webPush');

// @desc    Get VAPID public key
// @route   GET /api/push/public-key
// @access  Public / Private
const getPublicKey = (req, res) => {
  try {
    const publicKey = getVapidPublicKey();
    res.json({ publicKey });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving VAPID public key' });
  }
};

// @desc    Subscribe to web push notifications
// @route   POST /api/push/subscribe
// @access  Private
const subscribe = async (req, res) => {
  const { endpoint, keys } = req.body;

  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    return res.status(400).json({ message: 'Invalid subscription payload' });
  }

  try {
    const userAgent = req.headers['user-agent'] || '';

    // Upsert subscription based on endpoint
    const subscription = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId: req.user._id,
        endpoint,
        keys,
        userAgent
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ message: 'Push subscription saved successfully', subscription });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ message: 'Failed to save push subscription' });
  }
};

// @desc    Unsubscribe from web push notifications
// @route   POST /api/push/unsubscribe
// @access  Private
const unsubscribe = async (req, res) => {
  const { endpoint } = req.body;

  try {
    if (endpoint) {
      await PushSubscription.deleteOne({ endpoint, userId: req.user._id });
    } else {
      await PushSubscription.deleteMany({ userId: req.user._id });
    }

    res.json({ message: 'Push subscription removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove push subscription' });
  }
};

// @desc    Send a test push notification to logged in user
// @route   POST /api/push/test
// @access  Private
const sendTestNotification = async (req, res) => {
  try {
    await sendPushNotification(req.user._id, {
      title: 'Hostel ERP Test Notification 🔔',
      body: 'Web push notifications are working perfectly on your device!',
      url: '/'
    });

    res.json({ message: 'Test push notification sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send test push notification' });
  }
};

module.exports = {
  getPublicKey,
  subscribe,
  unsubscribe,
  sendTestNotification
};
