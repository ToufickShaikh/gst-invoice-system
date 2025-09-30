const express = require('express');
const { login, getTenantsList } = require('../controllers/authController.js');

const router = express.Router();

router.post('/login', login);
router.get('/tenants', getTenantsList);

module.exports = router;