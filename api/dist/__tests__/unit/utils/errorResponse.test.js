"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errorResponse_1 = require("../../../utils/errorResponse");
describe('Enterprise Error Handling - Issue #18', () => {
    describe('Enterprise Error Classes', () => {
        it('should create EnterpriseFeatureNotAvailableError with correct message and context', () => {
            const error = new errorResponse_1.EnterpriseFeatureNotAvailableError('Multi-tenant operations', {
                operation: 'tenant creation',
                currentMode: 'oss-single-tenant'
            });
            expect(error.message).toBe('Multi-tenant operations requires Dgraph Enterprise with valid license');
            expect(error.name).toBe('EnterpriseFeatureNotAvailableError');
            expect(error.context).toEqual(expect.objectContaining({
                operation: 'tenant creation',
                currentMode: 'oss-single-tenant',
                requiredMode: 'enterprise-multi-tenant',
                suggestion: 'Please upgrade to Dgraph Enterprise',
                upgradeInfo: 'https://dgraph.io/enterprise'
            }));
        });
        it('should create NamespaceNotSupportedError with namespace-specific context', () => {
            const error = new errorResponse_1.NamespaceNotSupportedError('GraphQL execution', '0x1', 'Custom suggestion');
            expect(error.message).toBe('Namespace operations (GraphQL execution in namespace \'0x1\') requires Dgraph Enterprise with valid license');
            expect(error.name).toBe('NamespaceNotSupportedError');
            expect(error.context).toEqual(expect.objectContaining({
                operation: 'GraphQL execution',
                namespace: '0x1',
                suggestion: 'Custom suggestion'
            }));
        });
        it('should create MultiTenantNotSupportedError with multi-tenant context', () => {
            const error = new errorResponse_1.MultiTenantNotSupportedError('tenant creation');
            expect(error.message).toBe('Multi-tenant operations (tenant creation) requires Dgraph Enterprise with valid license');
            expect(error.name).toBe('MultiTenantNotSupportedError');
            expect(error.context).toEqual(expect.objectContaining({
                operation: 'tenant creation',
                suggestion: 'Multi-tenant support requires Dgraph Enterprise with namespace isolation'
            }));
        });
    });
    describe('Error Response Builders', () => {
        it('should create consistent Enterprise error response format', () => {
            const response = (0, errorResponse_1.createEnterpriseErrorResponse)('Multi-tenant operations', 'tenant creation', { namespacesSupported: false, enterpriseDetected: false });
            expect(response).toEqual({
                error: errorResponse_1.ErrorType.ENTERPRISE_FEATURE_NOT_AVAILABLE,
                message: 'Multi-tenant operations requires Dgraph Enterprise with valid license',
                details: {
                    operation: 'tenant creation',
                    currentMode: 'oss-single-tenant',
                    requiredMode: 'enterprise-multi-tenant',
                    suggestion: 'Upgrade to Dgraph Enterprise or use default namespace',
                    upgradeInfo: 'https://dgraph.io/enterprise'
                }
            });
        });
        it('should create namespace-specific error response', () => {
            const response = (0, errorResponse_1.createNamespaceErrorResponse)('Schema fetch', '0x2', { namespacesSupported: false, enterpriseDetected: true });
            expect(response).toEqual({
                error: errorResponse_1.ErrorType.NAMESPACE_NOT_SUPPORTED,
                message: 'Namespace operations (Schema fetch in namespace \'0x2\') require Dgraph Enterprise with valid license',
                details: {
                    operation: 'Schema fetch',
                    namespace: '0x2',
                    currentMode: 'enterprise-single-tenant',
                    requiredMode: 'enterprise-multi-tenant',
                    suggestion: 'Upgrade to Dgraph Enterprise or use default namespace',
                    upgradeInfo: 'https://dgraph.io/enterprise'
                }
            });
        });
        it('should create multi-tenant error response', () => {
            const response = (0, errorResponse_1.createMultiTenantErrorResponse)('tenant deletion');
            expect(response).toEqual({
                error: errorResponse_1.ErrorType.MULTI_TENANT_NOT_AVAILABLE,
                message: 'Multi-tenant operations (tenant deletion) require Dgraph Enterprise with valid license',
                details: {
                    operation: 'tenant deletion',
                    currentMode: 'oss-single-tenant',
                    requiredMode: 'enterprise-multi-tenant',
                    suggestion: 'Multi-tenant support requires Dgraph Enterprise with namespace isolation',
                    upgradeInfo: 'https://dgraph.io/enterprise'
                }
            });
        });
        it('should detect different deployment modes correctly', () => {
            // OSS mode
            const ossResponse = (0, errorResponse_1.createEnterpriseErrorResponse)('test', 'test', {
                namespacesSupported: false,
                enterpriseDetected: false
            });
            expect(ossResponse.details.currentMode).toBe('oss-single-tenant');
            // Enterprise single-tenant mode
            const enterpriseResponse = (0, errorResponse_1.createEnterpriseErrorResponse)('test', 'test', {
                namespacesSupported: false,
                enterpriseDetected: true
            });
            expect(enterpriseResponse.details.currentMode).toBe('enterprise-single-tenant');
            // Enterprise multi-tenant mode
            const multiTenantResponse = (0, errorResponse_1.createEnterpriseErrorResponse)('test', 'test', {
                namespacesSupported: true,
                enterpriseDetected: true
            });
            expect(multiTenantResponse.details.currentMode).toBe('enterprise-multi-tenant');
        });
    });
    describe('Fallback Behavior Consistency', () => {
        it('should define correct fallback behavior for operation types', () => {
            expect((0, errorResponse_1.getFallbackBehavior)('CREATE')).toBe(errorResponse_1.FallbackBehavior.FAIL_HARD);
            expect((0, errorResponse_1.getFallbackBehavior)('READ')).toBe(errorResponse_1.FallbackBehavior.DEGRADE_GRACEFULLY);
            expect((0, errorResponse_1.getFallbackBehavior)('ADMIN')).toBe(errorResponse_1.FallbackBehavior.FAIL_WITH_CONTEXT);
        });
        it('should have consistent fallback behavior values', () => {
            expect(errorResponse_1.FallbackBehavior.FAIL_HARD).toBe('FAIL_HARD');
            expect(errorResponse_1.FallbackBehavior.DEGRADE_GRACEFULLY).toBe('DEGRADE_GRACEFULLY');
            expect(errorResponse_1.FallbackBehavior.FAIL_WITH_CONTEXT).toBe('FAIL_WITH_CONTEXT');
        });
    });
    describe('Error Type Constants', () => {
        it('should have correct Enterprise error type values', () => {
            expect(errorResponse_1.ErrorType.ENTERPRISE_FEATURE_NOT_AVAILABLE).toBe('ENTERPRISE_FEATURE_NOT_AVAILABLE');
            expect(errorResponse_1.ErrorType.NAMESPACE_NOT_SUPPORTED).toBe('NAMESPACE_NOT_SUPPORTED');
            expect(errorResponse_1.ErrorType.MULTI_TENANT_NOT_AVAILABLE).toBe('MULTI_TENANT_NOT_AVAILABLE');
        });
    });
});
