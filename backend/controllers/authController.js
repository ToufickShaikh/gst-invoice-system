// Controller for authentication logic
const User = require('../models/User.js');

// Login handler: accepts username and password, checks hardcoded admin or DB user
const login = async (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt:', { username, password, body: req.body });

    // Hardcoded admin credentials (for demo/testing)
    const adminUsername = 'hokage';
    const adminPassword = 'admin';

    // Check hardcoded admin
    if (username === adminUsername && password === adminPassword) {
        return res.json({ message: 'Login successful', user: { username: adminUsername } });
    }

    // Check for user in MongoDB
    try {
        const user = await User.findOne({ username });
        // NOTE: Passwords should be hashed in production!
        if (user && user.password === password) {
            console.log('DB user login successful for:', username);
            return res.json({ message: 'Login successful', user: { username: user.username } });
        }

        // If we reach here, neither hardcoded nor DB user matched
        console.error('Invalid login attempt:', { receivedUsername: username, receivedPassword: password, body: req.body });
        res.status(401).json({ message: 'Invalid credentials' });

    } catch (error) {
        console.error('Error during database authentication:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { login };