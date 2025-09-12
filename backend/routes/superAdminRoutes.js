const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/superAdminMiddleware');
const {
  createTenant,
  getAllTenants,
  deleteTenant,
  getDashboardStats
} = require('../controllers/superAdminController');

// All routes require super admin access
router.use(protect);
router.use(requireSuperAdmin);

router.get('/dashboard', getDashboardStats);
router.get('/tenants', getAllTenants);
router.post('/tenants', createTenant);
router.delete('/tenants/:id', deleteTenant);

module.exports = router;