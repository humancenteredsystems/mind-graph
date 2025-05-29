import { Request, Response, NextFunction } from 'express';
interface CreateTenantRequest extends Request {
    body: {
        tenantId: string;
    };
}
interface TenantParamsRequest extends Request {
    params: {
        tenantId: string;
    };
}
/**
 * TenantController - Universal tenant management with OSS/Enterprise compatibility
 * Provides tenant CRUD operations that adapt to available Dgraph capabilities
 */
export declare class TenantController {
    private tenantManager;
    constructor();
    createTenant(req: CreateTenantRequest, res: Response, next: NextFunction): Promise<void>;
    getTenantInfo(req: TenantParamsRequest, res: Response, next: NextFunction): Promise<void>;
    listTenants(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteTenant(req: TenantParamsRequest, res: Response, next: NextFunction): Promise<void>;
    getCapabilities(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export {};
//# sourceMappingURL=tenantController.d.ts.map