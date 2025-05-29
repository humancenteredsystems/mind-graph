import { Request, Response, NextFunction } from 'express';
/**
 * Middleware to set tenant context for each request
 * Resolves tenant ID to namespace and attaches to request context
 */
export declare function setTenantContext(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Middleware to ensure tenant exists, creating it if necessary
 */
export declare function ensureTenant(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Middleware to validate tenant access (placeholder for future auth)
 */
export declare function validateTenantAccess(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=tenantContext.d.ts.map