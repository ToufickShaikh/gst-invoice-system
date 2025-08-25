const express = require('express');
const { register, login } = require('../controllers/authController.js');

const router = express.Router();

// Auth endpoints disabled — return 410 Gone
router.post('/register', register);
router.post('/login', login);

router.post('/check-token', (req, res) => {
	return res.status(410).json({ success: false, message: 'Auth endpoints removed from this build' });
});

module.exports = router;