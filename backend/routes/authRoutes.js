const express = require('express');
const { register, login } = require('../controllers/authController.js');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

// Development helper: verify a token and return decoded payload or error
router.post('/check-token', (req, res) => {
	if (process.env.NODE_ENV === 'production' && !req.get('x-debug-token')) {
		return res.status(403).json({ message: 'Forbidden' });
	}
	const jwt = require('jsonwebtoken');
	const token = req.body?.token || req.get('authorization')?.split(' ')[1];
	if (!token) return res.status(400).json({ message: 'Token required in body.token or Authorization header' });
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		return res.json({ success: true, decoded });
	} catch (e) {
		return res.status(400).json({ success: false, error: e.message });
	}
});

module.exports = router;