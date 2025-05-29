import { Request, Response, NextFunction } from 'express';

// Middleware to authenticate admin requests
export const authenticateAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-admin-api-key'] as string;
  // Use process.env directly to maintain compatibility with existing tests
  // that set environment variables after config module is loaded
  if (apiKey !== process.env.ADMIN_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
};
