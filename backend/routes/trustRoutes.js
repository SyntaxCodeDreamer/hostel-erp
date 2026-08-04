const express = require('express');
const router = express.Router();
const {
  getTrustMembers,
  createTrustMember,
  deleteTrustMember,
  getLeaders,
  createLeader,
  deleteLeader
} = require('../controllers/trustController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Trust Members
router.route('/members')
  .get(getTrustMembers)
  .post(authorize('Admin', 'admin'), createTrustMember);

router.route('/members/:id')
  .delete(authorize('Admin', 'admin'), deleteTrustMember);

// Leaders
router.route('/leaders')
  .get(getLeaders)
  .post(authorize('Admin', 'admin'), createLeader);

router.route('/leaders/:id')
  .delete(authorize('Admin', 'admin'), deleteLeader);

module.exports = router;
