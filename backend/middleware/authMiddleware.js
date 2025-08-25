// Authentication removed by user request — provide no-op protect middleware
const protect = async (req, res, next) => {
    req.user = null;
    return next();
};

module.exports = { protect };