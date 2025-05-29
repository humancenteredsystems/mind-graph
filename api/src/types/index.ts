// Type definitions index

// Domain types
export * from './domain';

// Configuration types
export * from './config';

// GraphQL types
export * from './graphql';

// Express types
export * from './express';

// Tenant types
export * from './tenant';

// Error types
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class TenantError extends Error {
  constructor(message: string, public tenantId?: string) {
    super(message);
    this.name = 'TenantError';
  }
}

export class DgraphError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'DgraphError';
  }
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
}[Keys];
