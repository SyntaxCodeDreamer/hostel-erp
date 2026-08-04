const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// Initialize VAPID Keys from env or auto-generate fallback keys
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@hostelerp.com';

if (!vapidPublicKey || !vapidPrivateKey) {
  const generatedKeys = webpush.generateVAPIDKeys();
  vapidPublicKey = generatedKeys.publicKey;
  vapidPrivateKey = generatedKeys.privateKey;
  console.log('=== VAPID Keys Auto-Generated ===');
  console.log('Public Key:', vapidPublicKey);
  console.log('Private Key:', vapidPrivateKey);
  console.log('Note: To keep VAPID keys persistent across restarts, save them in backend/.env as VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY');
}

webpush.setVapidDetails(
  vapidEmail,
  vapidPublicKey,
  vapidPrivateKey
);

const getVapidPublicKey = () => vapidPublicKey;

/**
 * Send push notification to target user(s)
 * @param {string|string[]} userIds - User ID or array of User IDs
 * @param {Object} payload - Notification payload { title, body, icon, url, data }
 */
const sendPushNotification = async (userIds, payload) => {
  try {
    const targetIds = Array.isArray(userIds) ? userIds : [userIds];
    if (targetIds.length === 0) return;

    // Fetch all push subscriptions for target users
    const subscriptions = await PushSubscription.find({
      userId: { $in: targetIds }
    });

    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    const pushPayload = JSON.stringify({
      title: payload.title || 'Hostel ERP Notification',
      body: payload.body || payload.message || '',
      icon: payload.icon || '/favicon.ico',
      badge: payload.badge || '/favicon.ico',
      url: payload.url || '/',
      data: payload.data || {}
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth
        }
      };

      try {
        await webpush.sendNotification(pushConfig, pushPayload);
      } catch (err) {
        // If subscription is expired (404/410), clean up from DB
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`Cleaning up expired push subscription: ${sub._id}`);
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          console.error(`Error sending push to endpoint ${sub.endpoint}:`, err.message);
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error('Error in sendPushNotification:', error.message);
  }
};

module.exports = {
  getVapidPublicKey,
  sendPushNotification
};
