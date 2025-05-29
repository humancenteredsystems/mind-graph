export * from './domain';
export * from './config';
export * from './graphql';
export * from './express';
export * from './tenant';
export declare class ValidationError extends Error {
    field?: string | undefined;
    constructor(message: string, field?: string | undefined);
}
export declare class NotFoundError extends Error {
    constructor(message: string);
}
export declare class UnauthorizedError extends Error {
    constructor(message: string);
}
export declare class TenantError extends Error {
    tenantId?: string | undefined;
    constructor(message: string, tenantId?: string | undefined);
}
export declare class DgraphError extends Error {
    originalError?: any | undefined;
    constructor(message: string, originalError?: any | undefined);
}
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
}[Keys];
//# sourceMappingURL=index.d.ts.map