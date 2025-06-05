"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = __importDefault(require("../config"));
const auth_1 = require("../middleware/auth");
const schemaRegistry = __importStar(require("../services/schemaRegistry"));
const pushSchema_1 = require("../utils/pushSchema");
const dgraphAdmin_1 = require("../utils/dgraphAdmin");
const tenantManager_1 = require("../services/tenantManager");
const errorResponse_1 = require("../utils/errorResponse");
const child_process_1 = require("child_process");
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
const tenantManager = new tenantManager_1.TenantManager();
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Use URLs from config
const DGRAPH_ADMIN_SCHEMA_URL = config_1.default.dgraphAdminUrl;
const DGRAPH_ALTER_URL = `${config_1.default.dgraphBaseUrl.replace(/\/+$/, '')}/alter`;
// Helper function to drop all data from the configured Dgraph instance
async function dropAllData(target, namespace = null) {
    // CRITICAL SAFETY CHECK: In multi-tenant mode, namespace MUST be specified
    const isMultiTenant = config_1.default.enableMultiTenant;
    if (isMultiTenant && !namespace) {
        console.error('[DROP ALL] SAFETY VIOLATION: Attempted dropAll without namespace in multi-tenant mode!');
        return {
            success: false,
            error: 'Namespace is required for dropAll in multi-tenant mode',
            details: 'This is a safety measure to prevent accidental cluster-wide data loss'
        };
    }
    // Additional safety: Validate namespace format
    if (namespace && !namespace.match(/^0x[0-9a-f]+$/)) {
        console.error(`[DROP ALL] SAFETY VIOLATION: Invalid namespace format: ${namespace}`);
        return {
            success: false,
            error: `Invalid namespace format: ${namespace}. Expected format: 0x0, 0x1, etc.`,
            details: 'Namespace must be a valid hexadecimal format'
        };
    }
    const payload = { "drop_all": true };
    const url = DGRAPH_ALTER_URL; // Use the derived URL
    // Enhanced logging for safety audit trail
    console.log(`[DROP ALL] === NAMESPACE-SCOPED OPERATION ===`);
    console.log(`[DROP ALL] Target: ${target}`);
    console.log(`[DROP ALL] Namespace: ${namespace || 'DEFAULT (non-multi-tenant)'}`);
    console.log(`[DROP ALL] URL: ${url}${namespace ? `?namespace=${namespace}` : ''}`);
    console.log(`[DROP ALL] Multi-tenant mode: ${isMultiTenant}`);
    console.log(`[DROP ALL] ===================================`);
    const result = await (0, dgraphAdmin_1.sendDgraphAdminRequest)(url, payload, namespace);
    // Log the result for audit trail
    if (result.success) {
        console.log(`[DROP ALL] SUCCESS: Data dropped in namespace ${namespace || 'DEFAULT'}`);
    }
    else {
        console.error(`[DROP ALL] FAILED: ${result.error}`);
    }
    return result; // Return the single result object
}
// Helper function to push schema to the configured Dgraph instance
async function pushSchemaToConfiguredDgraph(schema, namespace = null) {
    const url = DGRAPH_ADMIN_SCHEMA_URL; // Use the derived URL
    const result = await (0, pushSchema_1.pushSchemaViaHttp)(schema, namespace || undefined, url);
    // Add verification step if needed
    return result;
}
// Admin Endpoints
// -------------------------------------------------------------------
// Endpoint to push schema directly or from registry
router.post('/admin/schema', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { schema, schemaId } = req.body;
        // Extract namespace from tenant context
        const namespace = req.tenantContext?.namespace;
        // Determine which schema to use
        let schemaContent;
        if (schemaId) {
            console.log(`[SCHEMA PUSH] Using schema ${schemaId} from registry`);
            schemaContent = await schemaRegistry.getSchemaContent(schemaId);
        }
        else if (schema) {
            schemaContent = schema;
        }
        else {
            res.status(400).json({ error: 'Missing required field: schema or schemaId' });
            return;
        }
        console.log(`[SCHEMA PUSH] Pushing schema to configured Dgraph instance${namespace ? ` for namespace ${namespace}` : ''}`);
        const result = await pushSchemaToConfiguredDgraph(schemaContent, namespace || null);
        if (result.success) {
            res.json({ success: true, results: result });
        }
        else {
            console.error('[SCHEMA PUSH] Push failed:', result.error);
            res.status(500).json({ success: false, message: 'Schema push encountered errors', results: result });
        }
    }
    catch (error) {
        const err = error;
        console.error('[ADMIN] Failed to push schema:', error);
        res.status(500).json({ error: 'Failed to push schema', details: err.message });
    }
});
// POST /api/admin/dropAll - Endpoint to drop all data from Dgraph instance(s)
router.post('/admin/dropAll', auth_1.authenticateAdmin, async (req, res) => {
    const { target, confirmNamespace } = req.body;
    if (!target || !['local', 'remote', 'both'].includes(target)) {
        res.status(400).json({ error: 'Missing or invalid required field: target. Must be "local", "remote", or "both".' });
        return;
    }
    try {
        // Extract namespace from tenant context
        const namespace = req.tenantContext?.namespace || undefined;
        const tenantId = req.tenantContext?.tenantId;
        const isMultiTenant = config_1.default.enableMultiTenant;
        // SAFETY CHECK: In multi-tenant mode, require explicit namespace confirmation
        if (isMultiTenant && confirmNamespace !== namespace) {
            console.error(`[DROP ALL] SAFETY CHECK FAILED: confirmNamespace (${confirmNamespace}) does not match context namespace (${namespace})`);
            res.status(400).json({
                error: 'Namespace confirmation required',
                details: `For safety, you must provide confirmNamespace: "${namespace}" in the request body to confirm the target namespace`,
                currentNamespace: namespace,
                currentTenant: tenantId
            });
            return;
        }
        console.log(`[DROP ALL] === REQUEST DETAILS ===`);
        console.log(`[DROP ALL] Tenant ID: ${tenantId}`);
        console.log(`[DROP ALL] Namespace: ${namespace}`);
        console.log(`[DROP ALL] Target: ${target}`);
        console.log(`[DROP ALL] Confirmed: ${confirmNamespace === namespace ? 'YES' : 'NO'}`);
        console.log(`[DROP ALL] ======================`);
        const result = await dropAllData(target, namespace || null);
        if (result.success) {
            const response = {
                success: true,
                message: `Drop all data operation completed successfully for configured Dgraph instance${namespace ? ` in namespace ${namespace}` : ''}`,
                namespace: namespace,
                tenantId: tenantId,
                data: result.data
            };
            res.json(response);
        }
        else {
            const response = {
                success: false,
                message: `Drop all data operation encountered errors`,
                error: result.error,
                details: result.details,
                namespace: namespace,
                tenantId: tenantId
            };
            res.status(500).json(response);
        }
    }
    catch (error) {
        const err = error;
        console.error('[ADMIN] Failed to drop all data:', error);
        res.status(500).json({ error: 'Failed to drop all data', details: err.message });
    }
});
// Enhanced Tenant Management Endpoints
// -------------------------------------------------------------------
/**
 * Seed test data in a tenant
 *
 * POST /api/admin/tenant/seed
 *
 * Body:
 * {
 *   "tenantId": string,
 *   "dataType": "sample" | "test" | "minimal",
 *   "clearFirst": boolean
 * }
 */
router.post('/admin/tenant/seed', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { tenantId = 'test-tenant', dataType = 'test', clearFirst = false } = req.body;
        console.log(`[ADMIN_TENANT] Seeding data for tenant ${tenantId}, type: ${dataType}, clearFirst: ${clearFirst}`);
        // Clear data first if requested
        if (clearFirst) {
            console.log(`[ADMIN_TENANT] Clearing data for tenant ${tenantId} before seeding`);
            await tenantManager.deleteTenant(tenantId);
            await tenantManager.createTenant(tenantId);
        }
        // Check if tenant exists
        const exists = await tenantManager.tenantExists(tenantId);
        if (!exists) {
            console.log(`[ADMIN_TENANT] Creating tenant ${tenantId} before seeding`);
            await tenantManager.createTenant(tenantId);
        }
        // Get tenant info
        const tenantInfo = await tenantManager.getTenantInfo(tenantId);
        // TODO: Implement actual data seeding based on dataType
        // For now, just return success with tenant info
        res.json({
            message: `Data seeding completed for tenant ${tenantId}`,
            tenantId,
            dataType,
            tenant: tenantInfo,
            seededAt: new Date()
        });
    }
    catch (error) {
        const err = error;
        console.error('[ADMIN_TENANT] Failed to seed tenant data:', error);
        res.status(500).json((0, errorResponse_1.createErrorResponseFromError)('Failed to seed tenant data', err));
    }
});
/**
 * Reset a tenant completely (delete and recreate)
 *
 * POST /api/admin/tenant/reset
 *
 * Body:
 * {
 *   "tenantId": string,
 *   "confirmTenantId": string  // Safety confirmation
 * }
 */
router.post('/admin/tenant/reset', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { tenantId, confirmTenantId } = req.body;
        if (!tenantId) {
            res.status(400).json({ error: 'Missing required field: tenantId' });
            return;
        }
        // Safety check: require confirmation
        if (tenantId !== confirmTenantId) {
            res.status(400).json({
                error: 'Tenant ID confirmation required',
                details: 'confirmTenantId must match tenantId for safety'
            });
            return;
        }
        // Prevent resetting system tenants without explicit override
        if ((tenantId === 'default' || tenantId === 'test-tenant') && !req.body.allowSystemTenant) {
            res.status(400).json({
                error: 'Cannot reset system tenant without explicit override',
                details: 'Set allowSystemTenant: true to reset system tenants'
            });
            return;
        }
        console.log(`[ADMIN_TENANT] Resetting tenant ${tenantId}`);
        // Delete and recreate tenant
        await tenantManager.deleteTenant(tenantId);
        const namespace = await tenantManager.createTenant(tenantId);
        const tenantInfo = await tenantManager.getTenantInfo(tenantId);
        res.json({
            message: `Tenant ${tenantId} reset successfully`,
            tenantId,
            namespace,
            tenant: tenantInfo,
            resetAt: new Date()
        });
    }
    catch (error) {
        const err = error;
        console.error('[ADMIN_TENANT] Failed to reset tenant:', error);
        res.status(500).json((0, errorResponse_1.createErrorResponseFromError)('Failed to reset tenant', err));
    }
});
/**
 * Get detailed tenant status and health
 *
 * GET /api/admin/tenant/:tenantId/status
 */
router.get('/admin/tenant/:tenantId/status', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { tenantId } = req.params;
        if (!tenantId) {
            res.status(400).json({ error: 'Missing tenantId parameter' });
            return;
        }
        console.log(`[ADMIN_TENANT] Getting status for tenant ${tenantId}`);
        // Get basic tenant info
        const tenantInfo = await tenantManager.getTenantInfo(tenantId);
        // Get tenant namespace
        const namespace = await tenantManager.getTenantNamespace(tenantId);
        // Check if tenant exists and is accessible
        const exists = await tenantManager.tenantExists(tenantId);
        // TODO: Add more health checks
        // - Schema validation
        // - Data counts
        // - Connection health
        const status = {
            ...tenantInfo,
            namespace,
            exists,
            health: exists ? 'healthy' : 'not-accessible',
            checkedAt: new Date()
        };
        res.json(status);
    }
    catch (error) {
        const err = error;
        console.error('[ADMIN_TENANT] Failed to get tenant status:', error);
        res.status(500).json((0, errorResponse_1.createErrorResponseFromError)('Failed to get tenant status', err));
    }
});
/**
 * List all tenants with their status
 *
 * GET /api/admin/tenant/list
 */
router.get('/admin/tenant/list', auth_1.authenticateAdmin, async (req, res) => {
    try {
        console.log('[ADMIN_TENANT] Listing all tenants');
        const tenants = await tenantManager.listTenants();
        // Add health status for each tenant
        const tenantsWithStatus = await Promise.all(tenants.map(async (tenant) => {
            try {
                const exists = await tenantManager.tenantExists(tenant.tenantId);
                return {
                    ...tenant,
                    health: exists ? 'healthy' : 'not-accessible'
                };
            }
            catch (error) {
                return {
                    ...tenant,
                    health: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }));
        res.json({
            tenants: tenantsWithStatus,
            count: tenantsWithStatus.length,
            checkedAt: new Date()
        });
    }
    catch (error) {
        const err = error;
        console.error('[ADMIN_TENANT] Failed to list tenants:', error);
        res.status(500).json((0, errorResponse_1.createErrorResponseFromError)('Failed to list tenants', err));
    }
});
/**
 * Get schema content for a tenant
 *
 * GET /api/admin/tenant/:tenantId/schema
 */
router.get('/admin/tenant/:tenantId/schema', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { tenantId } = req.params;
        if (!tenantId) {
            res.status(400).json({ error: 'Missing tenantId parameter' });
            return;
        }
        console.log(`[ADMIN_TENANT] Getting schema content for tenant ${tenantId}`);
        // Get schema content for the tenant
        const schemaContent = await tenantManager.getTenantSchemaContent(tenantId);
        const schemaInfo = await tenantManager.getTenantSchemaInfo(tenantId);
        res.json({
            tenantId,
            schemaInfo,
            content: schemaContent,
            retrievedAt: new Date()
        });
    }
    catch (error) {
        const err = error;
        console.error('[ADMIN_TENANT] Failed to get tenant schema:', error);
        res.status(500).json((0, errorResponse_1.createErrorResponseFromError)('Failed to get tenant schema', err));
    }
});
/**
 * Parse ESLint JSON output into structured format
 */
function parseESLintOutput(eslintOutput) {
    const files = [];
    let totalErrors = 0;
    let totalWarnings = 0;
    // Process all files, including those with no issues
    for (const fileResult of eslintOutput) {
        const issues = (fileResult.messages || []).map((msg) => ({
            line: msg.line || 0,
            column: msg.column || 0,
            rule: msg.ruleId || 'unknown',
            severity: msg.severity === 2 ? 'error' : 'warning',
            message: msg.message || 'Unknown issue'
        }));
        const errorCount = issues.filter(issue => issue.severity === 'error').length;
        const warningCount = issues.filter(issue => issue.severity === 'warning').length;
        // Include all files, even those with no issues
        files.push({
            filePath: fileResult.filePath || 'unknown',
            errorCount,
            warningCount,
            issues
        });
        totalErrors += errorCount;
        totalWarnings += warningCount;
    }
    return {
        errors: totalErrors,
        warnings: totalWarnings,
        files,
        configured: true
    };
}
/**
 * Count files that would be linted in a project
 */
async function countLintableFiles(projectPath, projectName) {
    try {
        // Get the file extensions that ESLint would check
        const extensions = projectName === 'frontend' ? 'ts,tsx' : 'ts,js';
        const command = `cd "${projectPath}" && find src -name "*.${extensions.split(',')[0]}" -o -name "*.${extensions.split(',')[1]}" 2>/dev/null | wc -l`;
        const { stdout } = await execAsync(command);
        const count = parseInt(stdout.trim()) || 0;
        console.log(`[LINT] Found ${count} lintable files in ${projectName}`);
        return count;
    }
    catch (error) {
        console.log(`[LINT] Could not count files in ${projectName}, assuming 0`);
        return 0;
    }
}
/**
 * Run linting for a specific project (frontend or backend)
 */
async function runProjectLinting(projectPath, projectName) {
    try {
        console.log(`[LINT] Running linting for ${projectName} in ${projectPath}`);
        // Check if the project has a lint script
        const packageJsonPath = path_1.default.join(projectPath, 'package.json');
        let hasLintScript = false;
        try {
            const { stdout: packageContent } = await execAsync(`cat "${packageJsonPath}"`);
            const packageJson = JSON.parse(packageContent);
            hasLintScript = packageJson.scripts && packageJson.scripts.lint;
        }
        catch (error) {
            console.log(`[LINT] No package.json found for ${projectName}, skipping`);
            return { errors: 0, warnings: 0, files: [], configured: false };
        }
        if (!hasLintScript) {
            console.log(`[LINT] No lint script found for ${projectName}, skipping`);
            return { errors: 0, warnings: 0, files: [], configured: false };
        }
        // Count the files that would be linted
        const fileCount = await countLintableFiles(projectPath, projectName);
        // Run linting with JSON output
        const command = `cd "${projectPath}" && npm run lint -- --format json`;
        try {
            // If linting passes, there will be no output issues but we still have files
            await execAsync(command);
            console.log(`[LINT] ${projectName} linting passed with no issues across ${fileCount} files`);
            // Create placeholder file entries for clean files
            const cleanFiles = Array.from({ length: fileCount }, (_, index) => ({
                filePath: `${projectName}-file-${index + 1}`,
                errorCount: 0,
                warningCount: 0,
                issues: []
            }));
            return { errors: 0, warnings: 0, files: cleanFiles, configured: true };
        }
        catch (error) {
            // ESLint exits with non-zero code when there are issues
            // Parse the JSON output from stdout
            try {
                const eslintOutput = JSON.parse(error.stdout || '[]');
                const result = parseESLintOutput(eslintOutput);
                // If we have fewer files with issues than total files, add clean file placeholders
                const issueFileCount = result.files.length;
                if (fileCount > issueFileCount) {
                    const cleanFileCount = fileCount - issueFileCount;
                    const cleanFiles = Array.from({ length: cleanFileCount }, (_, index) => ({
                        filePath: `${projectName}-clean-file-${index + 1}`,
                        errorCount: 0,
                        warningCount: 0,
                        issues: []
                    }));
                    result.files.push(...cleanFiles);
                }
                console.log(`[LINT] ${projectName} linting completed: ${result.errors} errors, ${result.warnings} warnings across ${fileCount} files`);
                return result;
            }
            catch (parseError) {
                console.error(`[LINT] Failed to parse ESLint output for ${projectName}:`, parseError);
                console.error(`[LINT] Raw output:`, error.stdout);
                console.error(`[LINT] Raw stderr:`, error.stderr);
                // Return a generic error result
                return {
                    errors: 1,
                    warnings: 0,
                    files: [{
                            filePath: 'linting-error',
                            errorCount: 1,
                            warningCount: 0,
                            issues: [{
                                    line: 0,
                                    column: 0,
                                    rule: 'lint-execution',
                                    severity: 'error',
                                    message: `Failed to execute linting: ${error.message}`
                                }]
                        }],
                    configured: true
                };
            }
        }
    }
    catch (error) {
        console.error(`[LINT] Error running linting for ${projectName}:`, error);
        return {
            errors: 1,
            warnings: 0,
            files: [{
                    filePath: 'execution-error',
                    errorCount: 1,
                    warningCount: 0,
                    issues: [{
                            line: 0,
                            column: 0,
                            rule: 'execution-error',
                            severity: 'error',
                            message: `Failed to run linting: ${error instanceof Error ? error.message : 'Unknown error'}`
                        }]
                }],
            configured: false
        };
    }
}
/**
 * Run linting on frontend and backend code
 *
 * POST /api/admin/test/lint
 */
router.post('/admin/test/lint', auth_1.authenticateAdmin, async (req, res) => {
    try {
        console.log('[LINT] Starting linting operation');
        // Get project root directory (assuming we're in api/ subdirectory)
        const projectRoot = path_1.default.resolve(__dirname, '../..');
        const frontendPath = path_1.default.join(projectRoot, 'frontend');
        const backendPath = path_1.default.join(projectRoot, 'api');
        console.log(`[LINT] Project root: ${projectRoot}`);
        console.log(`[LINT] Frontend path: ${frontendPath}`);
        console.log(`[LINT] Backend path: ${backendPath}`);
        // Run linting for both projects in parallel
        const [frontendResult, backendResult] = await Promise.all([
            runProjectLinting(frontendPath, 'frontend'),
            runProjectLinting(backendPath, 'backend')
        ]);
        // Calculate summary
        const summary = {
            totalErrors: frontendResult.errors + backendResult.errors,
            totalWarnings: frontendResult.warnings + backendResult.warnings,
            totalFiles: frontendResult.files.length + backendResult.files.length
        };
        console.log(`[LINT] Linting completed - Total: ${summary.totalErrors} errors, ${summary.totalWarnings} warnings across ${summary.totalFiles} files`);
        res.json({
            success: true,
            results: {
                frontend: frontendResult,
                backend: backendResult,
                summary
            },
            executedAt: new Date().toISOString()
        });
    }
    catch (error) {
        const err = error;
        console.error('[LINT] Failed to run linting:', error);
        res.status(500).json((0, errorResponse_1.createErrorResponseFromError)('Failed to run linting', err));
    }
});
exports.default = router;
