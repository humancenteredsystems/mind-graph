import { Request, Response } from 'express';
export interface TenantContext {
    tenantId: string;
    namespace: string | null;
    isTestTenant: boolean;
    isDefaultTenant: boolean;
    exists?: boolean;
    wasCreated?: boolean;
    error?: string;
    ensureError?: string;
}
export interface UserContext {
    tenantId?: string;
    namespace?: string;
    isAdmin?: boolean;
}
declare global {
    namespace Express {
        interface Request {
            tenantContext?: TenantContext;
            userContext?: UserContext;
            hierarchyId?: string;
            user?: any;
        }
    }
}
export interface AuthenticatedRequest extends Request {
    userContext: UserContext;
}
export interface TenantRequest extends Request {
    tenantContext: TenantContext;
}
export interface HierarchyRequest extends Request {
    hierarchyId: string;
}
export interface ApiResponse<T = any> {
    data?: T;
    error?: string;
    message?: string;
    success?: boolean;
}
export interface ErrorResponse {
    error: string;
    message?: string;
    statusCode?: number;
    details?: any;
}
export interface SuccessResponse<T = any> {
    data: T;
    message?: string;
    success: true;
}
export type MiddlewareFunction = (req: Request, res: Response, next: Function) => void | Promise<void>;
export type ErrorMiddlewareFunction = (error: Error, req: Request, res: Response, next: Function) => void;
export type RouteHandler<T = any> = (req: Request, res: Response) => Promise<void> | void;
export type AuthenticatedRouteHandler<T = any> = (req: AuthenticatedRequest, res: Response) => Promise<void> | void;
export type TenantRouteHandler<T = any> = (req: TenantRequest, res: Response) => Promise<void> | void;
//# sourceMappingURL=express.d.ts.map