const mongoose = require('mongoose');

const trustMemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    default: ''
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  position: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  joiningDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const TrustMember = mongoose.model('TrustMember', trustMemberSchema);
module.exports = TrustMember;
