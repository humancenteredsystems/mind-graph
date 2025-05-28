// Middleware to authenticate admin requests
const authenticateAdmin = (req, res, next) => {
  const apiKey = req.headers['x-admin-api-key'];
  // Use process.env directly to maintain compatibility with existing tests
  // that set environment variables after config module is loaded
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

module.exports = { authenticateAdmin };
