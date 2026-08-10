const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  endpoint: {
    type: String,
    required: true
  },
  keys: {
    p256dh: {
      type: String,
      required: true
    },
    auth: {
      type: String,
      required: true
    }
  },
  userAgent: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index endpoint for fast lookups and deduplication
pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });
pushSubscriptionSchema.index({ userId: 1 });

const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema);
module.exports = PushSubscription;
