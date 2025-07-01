
export const login = (req, res) => {
    // Accept username only
    const { username, password } = req.body;
    console.log('Login attempt:', { username, password, body: req.body });
    // Hardcoded credentials
    const adminUsername = 'hokage';
    const adminPassword = 'admin';
    if (username === adminUsername && password === adminPassword) {
        res.json({ message: 'Login successful', user: { username: adminUsername } });
    } else {
        console.error('Invalid login attempt:', { receivedUsername: username, receivedPassword: password, expectedUsername: adminUsername, expectedPassword: adminPassword, body: req.body });
        res.status(401).json({ message: 'Invalid credentials' });
    }
};