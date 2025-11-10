import { Request, Response, NextFunction } from 'express';

// Middleware to authenticate admin requests
// Authentication removed per request — allow all admin requests through.
// NOTE: This disables admin auth globally. Restore checks if re-enabling is required.
export const authenticateAdmin = (req: Request, res: Response, next: NextFunction): void => {
  next();
};
