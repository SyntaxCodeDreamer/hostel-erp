const express = require('express');
const router = express.Router();
const {
  getPermissions,
  getPermissionById,
  createPermissionRequest,
  updatePermissionStatus,
  deletePermission
} = require('../controllers/permissionController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getPermissions)
  .post(protect, authorize('Student', 'Leader', 'Admin'), createPermissionRequest);

router.route('/:id')
  .get(protect, getPermissionById)
  .delete(protect, deletePermission);

router.route('/:id/status')
  .put(protect, authorize('Admin', 'Leader'), updatePermissionStatus);

module.exports = router;
