// Authentication has been removed from this build. These endpoints are intentionally
// disabled but retained as stubs so any imports don't break other parts of the app.

const sendGone = (res) => res.status(410).json({ success: false, message: 'Authentication removed from this build' });

const register = async (req, res) => sendGone(res);
const login = async (req, res) => sendGone(res);

module.exports = { register, login };
