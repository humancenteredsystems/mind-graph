"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const testRunner_1 = require("../services/testRunner");
const errorResponse_1 = require("../utils/errorResponse");
const router = express_1.default.Router();
/**
 * Start a test run
 *
 * POST /api/admin/test
 *
 * Body:
 * {
 *   "type": "unit" | "integration" | "integration-real" | "all",
 *   "tenantId"?: string,
 *   "pattern"?: string,
 *   "coverage"?: boolean
 * }
 */
router.post('/test', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const options = req.body;
        // Validate required fields
        if (!options.type || !['unit', 'integration', 'integration-real', 'all'].includes(options.type)) {
            res.status(400).json({
                error: 'Invalid test type. Must be one of: unit, integration, integration-real, all'
            });
            return;
        }
        console.log(`[ADMIN_TEST] Starting test run with options:`, options);
        const runId = await testRunner_1.testRunner.startTestRun(options);
        res.status(202).json({
            message: 'Test run started',
            runId,
            status: 'running'
        });
    }
    catch (error) {
        const err = error;
        console.error('[ADMIN_TEST] Failed to start test run:', error);
        res.status(500).json((0, errorResponse_1.createErrorResponseFromError)('Failed to start test run', err));
    }
});
/**
 * Get test run status and results
 *
 * GET /api/admin/test/:runId
 */
router.get('/test/:runId', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { runId } = req.params;
        if (!runId) {
            res.status(400).json({ error: 'Missing runId parameter' });
            return;
        }
        const result = testRunner_1.testRunner.getTestRun(runId);
        if (!result) {
            res.status(404).json({ error: 'Test run not found' });
            return;
        }
        res.json(result);
    }
    catch (error) {
        const err = error;
        console.error('[ADMIN_TEST] Failed to get test run:', error);
        res.status(500).json((0, errorResponse_1.createErrorResponseFromError)('Failed to get test run', err));
    }
});
/**
 * Stop a running test
 *
 * POST /api/admin/test/:runId/stop
 */
router.post('/test/:runId/stop', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const { runId } = req.params;
        if (!runId) {
            res.status(400).json({ error: 'Missing runId parameter' });
            return;
        }
        const stopped = testRunner_1.testRunner.stopTestRun(runId);
        if (!stopped) {
            res.status(404).json({ error: 'Test run not found or not running' });
            return;
        }
        console.log(`[ADMIN_TEST] Stopped test run ${runId}`);
        res.json({
            message: 'Test run stopped',
            runId,
            status: 'stopped'
        });
    }
    catch (error) {
        const err = error;
        console.error('[ADMIN_TEST] Failed to stop test run:', error);
        res.status(500).json((0, errorResponse_1.createErrorResponseFromError)('Failed to stop test run', err));
    }
});
/**
 * Get all active test runs
 *
 * GET /api/admin/test
 */
router.get('/test', auth_1.authenticateAdmin, async (req, res) => {
    try {
        const activeRuns = testRunner_1.testRunner.getActiveRuns();
        res.json({
            activeRuns,
            count: activeRuns.length
        });
    }
    catch (error) {
        const err = error;
        console.error('[ADMIN_TEST] Failed to get active test runs:', error);
        res.status(500).json((0, errorResponse_1.createErrorResponseFromError)('Failed to get active test runs', err));
    }
});
/**
 * Stream test output via Server-Sent Events
 *
 * GET /api/admin/test/:runId/stream?adminKey=<key>
 */
router.get('/test/:runId/stream', async (req, res) => {
    // For SSE, we need to check admin key from query params since EventSource doesn't support custom headers
    const adminKey = req.query.adminKey;
    if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
        res.status(401).json({ error: 'Unauthorized: Invalid or missing admin key' });
        return;
    }
    const { runId } = req.params;
    if (!runId) {
        res.status(400).json({ error: 'Missing runId parameter' });
        return;
    }
    // Check if test run exists
    const testRun = testRunner_1.testRunner.getTestRun(runId);
    if (!testRun) {
        res.status(404).json({ error: 'Test run not found' });
        return;
    }
    // Set up Server-Sent Events
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });
    console.log(`[ADMIN_TEST] Starting SSE stream for test run ${runId}`);
    // Send existing output
    testRun.output.forEach(line => {
        res.write(`data: ${JSON.stringify({ type: 'output', data: line })}\n\n`);
    });
    // Send current status
    res.write(`data: ${JSON.stringify({
        type: 'status',
        data: {
            status: testRun.status,
            summary: testRun.summary
        }
    })}\n\n`);
    // Listen for new output
    const onOutput = (outputRunId, data) => {
        if (outputRunId === runId) {
            res.write(`data: ${JSON.stringify({ type: 'output', data })}\n\n`);
        }
    };
    const onCompleted = (completedRunId, result) => {
        if (completedRunId === runId) {
            res.write(`data: ${JSON.stringify({
                type: 'completed',
                data: {
                    status: result.status,
                    exitCode: result.exitCode,
                    summary: result.summary
                }
            })}\n\n`);
            res.end();
        }
    };
    const onStopped = (stoppedRunId) => {
        if (stoppedRunId === runId) {
            res.write(`data: ${JSON.stringify({ type: 'stopped', data: {} })}\n\n`);
            res.end();
        }
    };
    const onError = (errorRunId, error) => {
        if (errorRunId === runId) {
            res.write(`data: ${JSON.stringify({
                type: 'error',
                data: { message: error.message }
            })}\n\n`);
            res.end();
        }
    };
    // Register event listeners
    testRunner_1.testRunner.on('output', onOutput);
    testRunner_1.testRunner.on('completed', onCompleted);
    testRunner_1.testRunner.on('stopped', onStopped);
    testRunner_1.testRunner.on('error', onError);
    // Clean up on client disconnect
    req.on('close', () => {
        console.log(`[ADMIN_TEST] Client disconnected from SSE stream for test run ${runId}`);
        testRunner_1.testRunner.removeListener('output', onOutput);
        testRunner_1.testRunner.removeListener('completed', onCompleted);
        testRunner_1.testRunner.removeListener('stopped', onStopped);
        testRunner_1.testRunner.removeListener('error', onError);
    });
    // Keep connection alive
    const keepAlive = setInterval(() => {
        res.write(': keepalive\n\n');
    }, 30000);
    req.on('close', () => {
        clearInterval(keepAlive);
    });
});
exports.default = router;
