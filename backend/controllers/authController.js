const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

const login = async (req, res) => {
	try {
		const { email, password, tenantId } = req.body;
		if (!email || !password) {
			return res.status(400).json({ success: false, message: 'Email and password required' });
		}

		// Super admin login (no tenant required)
		if (!tenantId) {
			const user = await User.findOne({ email, role: 'super_admin' });
			if (user && await bcrypt.compare(password, user.password)) {
				const token = jwt.sign(
					{ userId: user._id, role: 'super_admin' }, 
					process.env.JWT_SECRET || 'your-secret-key',
					{ expiresIn: '24h' }
				);
				return res.json({ 
					success: true, 
					token, 
					user: { role: 'super_admin', email: user.email } 
				});
			}
			return res.status(401).json({ success: false, message: 'Invalid super admin credentials' });
		}

		// Tenant user login
		const user = await User.findOne({ email, tenantId }).populate('tenantId');
		if (user && await bcrypt.compare(password, user.password)) {
			const token = jwt.sign(
				{ userId: user._id, tenantId: user.tenantId._id, role: user.role }, 
				process.env.JWT_SECRET || 'your-secret-key',
				{ expiresIn: '24h' }
			);
			return res.json({ 
				success: true, 
				token, 
				user: { 
					role: user.role, 
					tenantId: user.tenantId._id,
					tenantName: user.tenantId.name,
					email: user.email
				} 
			});
		}

		return res.status(401).json({ success: false, message: 'Invalid credentials' });
	} catch (err) {
		console.error('Login error', err);
		return res.status(500).json({ success: false, message: err.message || 'Server error' });
	}
};

const getTenantsList = async (req, res) => {
	try {
		const tenants = await Tenant.find({ isActive: true })
			.select('_id name')
			.sort('name');
		res.json({ success: true, tenants });
	} catch (error) {
		console.error('Get tenants error', error);
		res.status(500).json({ success: false, message: 'Server error' });
	}
};

module.exports = { login, getTenantsList };
