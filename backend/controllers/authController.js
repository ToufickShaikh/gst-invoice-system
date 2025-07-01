import User from '../models/User.js';

export const login = async (req, res) => {
    // Accept username only
    const { username, password } = req.body;
    console.log('Login attempt:', { username, password, body: req.body });

    // Hardcoded credentials
    const adminUsername = 'hokage';
    const adminPassword = 'admin';

    if (username === adminUsername && password === adminPassword) {
        return res.json({ message: 'Login successful', user: { username: adminUsername } });
    }

    // Check for user in MongoDB
    try {
        const user = await User.findOne({ username });
        if (user && user.password === password) { // Plain text password check
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