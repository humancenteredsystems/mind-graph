// Middleware to authenticate admin requests
const authenticateAdmin = (req, res, next) => {
  const apiKey = req.headers['x-admin-api-key'];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

module.exports = { authenticateAdmin };
