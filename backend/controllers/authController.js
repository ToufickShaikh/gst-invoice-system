const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT is not required in this deployment; authentication will return user info only.

const register = async (req, res) => {
	try {
		const { username, email, password } = req.body;
		if (!username || !email || !password) return res.status(400).json({ success: false, message: 'username, email and password are required' });

		const existing = await User.findOne({ $or: [{ username }, { email }] });
		if (existing) return res.status(409).json({ success: false, message: 'User already exists' });

		const hashed = await bcrypt.hash(password, 10);
		const user = new User({ username, email, password: hashed });
		await user.save();

	return res.json({ success: true, user: { id: user._id, username: user.username, email: user.email } });
	} catch (err) {
		console.error('Register error', err);
		return res.status(500).json({ success: false, message: err.message || 'Server error' });
	}
};

const login = async (req, res) => {
	try {
		const { username, password } = req.body;
		if (!username || !password) return res.status(400).json({ success: false, message: 'username and password required' });

		const user = await User.findOne({ username });
		if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

		const match = await bcrypt.compare(password, user.password);
		if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

	return res.json({ success: true, user: { id: user._id, username: user.username, email: user.email } });
	} catch (err) {
		console.error('Login error', err);
		return res.status(500).json({ success: false, message: err.message || 'Server error' });
	}
};

module.exports = { register, login };
