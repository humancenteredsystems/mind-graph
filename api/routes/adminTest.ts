import express, { Request, Response } from 'express';
import { authenticateAdmin } from '../middleware/auth';
import { testRunner, TestRunOptions } from '../services/testRunner';
import { createErrorResponseFromError } from '../utils/errorResponse';

const router = express.Router();

// All admin test routes require admin authentication
router.use(authenticateAdmin);

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
router.post('/test', async (req: Request, res: Response): Promise<void> => {
  try {
    const options: TestRunOptions = req.body;
    
    // Validate required fields
    if (!options.type || !['unit', 'integration', 'integration-real', 'all'].includes(options.type)) {
      res.status(400).json({ 
        error: 'Invalid test type. Must be one of: unit, integration, integration-real, all' 
      });
      return;
    }

    console.log(`[ADMIN_TEST] Starting test run with options:`, options);
    
    const runId = await testRunner.startTestRun(options);
    
    res.status(202).json({
      message: 'Test run started',
      runId,
      status: 'running'
    });
  } catch (error) {
    const err = error as Error;
    console.error('[ADMIN_TEST] Failed to start test run:', error);
    res.status(500).json(createErrorResponseFromError('Failed to start test run', err));
  }
});

/**
 * Get test run status and results
 * 
 * GET /api/admin/test/:runId
 */
router.get('/test/:runId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { runId } = req.params;
    
    if (!runId) {
      res.status(400).json({ error: 'Missing runId parameter' });
      return;
    }

    const result = testRunner.getTestRun(runId);
    
    if (!result) {
      res.status(404).json({ error: 'Test run not found' });
      return;
    }

    res.json(result);
  } catch (error) {
    const err = error as Error;
    console.error('[ADMIN_TEST] Failed to get test run:', error);
    res.status(500).json(createErrorResponseFromError('Failed to get test run', err));
  }
});

/**
 * Stop a running test
 * 
 * POST /api/admin/test/:runId/stop
 */
router.post('/test/:runId/stop', async (req: Request, res: Response): Promise<void> => {
  try {
    const { runId } = req.params;
    
    if (!runId) {
      res.status(400).json({ error: 'Missing runId parameter' });
      return;
    }

    const stopped = testRunner.stopTestRun(runId);
    
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
  } catch (error) {
    const err = error as Error;
    console.error('[ADMIN_TEST] Failed to stop test run:', error);
    res.status(500).json(createErrorResponseFromError('Failed to stop test run', err));
  }
});

/**
 * Get all active test runs
 * 
 * GET /api/admin/test
 */
router.get('/test', async (req: Request, res: Response): Promise<void> => {
  try {
    const activeRuns = testRunner.getActiveRuns();
    
    res.json({
      activeRuns,
      count: activeRuns.length
    });
  } catch (error) {
    const err = error as Error;
    console.error('[ADMIN_TEST] Failed to get active test runs:', error);
    res.status(500).json(createErrorResponseFromError('Failed to get active test runs', err));
  }
});

/**
 * Stream test output via Server-Sent Events
 * 
 * GET /api/admin/test/:runId/stream
 */
router.get('/test/:runId/stream', async (req: Request, res: Response): Promise<void> => {
  const { runId } = req.params;
  
  if (!runId) {
    res.status(400).json({ error: 'Missing runId parameter' });
    return;
  }

  // Check if test run exists
  const testRun = testRunner.getTestRun(runId);
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
  const onOutput = (outputRunId: string, data: string) => {
    if (outputRunId === runId) {
      res.write(`data: ${JSON.stringify({ type: 'output', data })}\n\n`);
    }
  };

  const onCompleted = (completedRunId: string, result: any) => {
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

  const onStopped = (stoppedRunId: string) => {
    if (stoppedRunId === runId) {
      res.write(`data: ${JSON.stringify({ type: 'stopped', data: {} })}\n\n`);
      res.end();
    }
  };

  const onError = (errorRunId: string, error: Error) => {
    if (errorRunId === runId) {
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        data: { message: error.message } 
      })}\n\n`);
      res.end();
    }
  };

  // Register event listeners
  testRunner.on('output', onOutput);
  testRunner.on('completed', onCompleted);
  testRunner.on('stopped', onStopped);
  testRunner.on('error', onError);

  // Clean up on client disconnect
  req.on('close', () => {
    console.log(`[ADMIN_TEST] Client disconnected from SSE stream for test run ${runId}`);
    testRunner.removeListener('output', onOutput);
    testRunner.removeListener('completed', onCompleted);
    testRunner.removeListener('stopped', onStopped);
    testRunner.removeListener('error', onError);
  });

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

export default router;
