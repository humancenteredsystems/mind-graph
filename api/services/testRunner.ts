import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface TestRunOptions {
  type: 'unit' | 'integration' | 'integration-real' | 'all';
  tenantId?: string;
  pattern?: string;
  coverage?: boolean;
}

export interface TestRunResult {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  startTime: Date;
  endTime?: Date;
  exitCode?: number;
  output: string[];
  summary?: {
    passed: number;
    failed: number;
    total: number;
    suites: number;
  };
}

export class TestRunner extends EventEmitter {
  private activeRuns = new Map<string, { process: ChildProcess; result: TestRunResult }>();
  private runCounter = 0;

  /**
   * Start a test run with the specified options
   */
  async startTestRun(options: TestRunOptions): Promise<string> {
    const runId = `test-run-${++this.runCounter}-${Date.now()}`;
    
    console.log(`[TEST_RUNNER] Starting test run ${runId} with options:`, options);
    
    const result: TestRunResult = {
      id: runId,
      status: 'running',
      startTime: new Date(),
      output: []
    };

    // Build Jest command arguments
    const args = this.buildJestArgs(options);
    const workingDir = process.cwd().endsWith('/api') ? process.cwd() : `${process.cwd()}/api`;
    
    console.log(`[TEST_RUNNER] Jest command: npm test -- ${args.join(' ')}`);
    
    // Spawn Jest process - ensure we're in the api directory
    const testProcess = spawn('npm', ['test', '--', ...args], {
      cwd: workingDir,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ...(options.tenantId && { TEST_TENANT_ID: options.tenantId })
      }
    });

    // Store the active run
    this.activeRuns.set(runId, { process: testProcess, result });

    // Handle process output
    testProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      result.output.push(output);
      this.emit('output', runId, output);
      
      // Parse test results from output
      this.parseTestOutput(result, output);
    });

    testProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      result.output.push(`[STDERR] ${output}`);
      this.emit('output', runId, `[STDERR] ${output}`);
      
      // Also try parsing stderr for test results
      this.parseTestOutput(result, output);
    });

    // Handle process completion
    testProcess.on('close', (code: number | null) => {
      result.status = code === 0 ? 'completed' : 'failed';
      result.endTime = new Date();
      result.exitCode = code || 0;
      
      // If we don't have a summary yet, try parsing the complete output
      if (!result.summary) {
        console.log(`[TEST_RUNNER] No summary found during streaming, parsing complete output...`);
        const completeOutput = result.output.join('');
        console.log(`[TEST_RUNNER] Complete output length: ${completeOutput.length} chars`);
        this.parseTestOutput(result, completeOutput);
      }
      
      console.log(`[TEST_RUNNER] Test run ${runId} completed with exit code ${code}`);
      console.log(`[TEST_RUNNER] Final summary for ${runId}:`, result.summary);
      this.emit('completed', runId, result);
      
      // Clean up after a delay
      setTimeout(() => {
        this.activeRuns.delete(runId);
      }, 300000); // Keep results for 5 minutes
    });

    testProcess.on('error', (error: Error) => {
      result.status = 'failed';
      result.endTime = new Date();
      result.output.push(`[ERROR] ${error.message}`);
      
      console.error(`[TEST_RUNNER] Test run ${runId} failed:`, error);
      this.emit('error', runId, error);
      
      this.activeRuns.delete(runId);
    });

    return runId;
  }

  /**
   * Stop a running test
   */
  stopTestRun(runId: string): boolean {
    const run = this.activeRuns.get(runId);
    if (!run || run.result.status !== 'running') {
      return false;
    }

    console.log(`[TEST_RUNNER] Stopping test run ${runId}`);
    
    run.process.kill('SIGTERM');
    run.result.status = 'stopped';
    run.result.endTime = new Date();
    
    this.emit('stopped', runId);
    return true;
  }

  /**
   * Get test run status and results
   */
  getTestRun(runId: string): TestRunResult | null {
    const run = this.activeRuns.get(runId);
    return run ? { ...run.result } : null;
  }

  /**
   * Get all active test runs
   */
  getActiveRuns(): TestRunResult[] {
    return Array.from(this.activeRuns.values()).map(run => ({ ...run.result }));
  }

  /**
   * Build Jest command arguments based on options
   */
  private buildJestArgs(options: TestRunOptions): string[] {
    const args: string[] = [];

    // Test type patterns and configurations
    switch (options.type) {
      case 'unit':
        args.push('--testPathPattern=unit');
        break;
      case 'integration':
        args.push('--testPathPattern=integration');
        args.push('--testPathIgnorePatterns=integration-real');
        break;
      case 'integration-real':
        // Use the specific integration-real Jest config
        args.push('--config=jest.integration-real.config.js');
        args.push('--testPathPattern=integration-real');
        break;
      case 'all':
        // Run all tests
        break;
    }

    // Custom pattern
    if (options.pattern) {
      args.push(`--testNamePattern=${options.pattern}`);
    }

    // Coverage
    if (options.coverage) {
      args.push('--coverage');
    }

    // Always run in band for better output control
    args.push('--runInBand');
    
    // Disable watch mode
    args.push('--watchAll=false');
    
    // Force exit to prevent hanging
    args.push('--forceExit');
    
    // Use JSON output for reliable parsing
    args.push('--json');

    return args;
  }

  /**
   * Parse test output to extract summary information
   */
  private parseTestOutput(result: TestRunResult, output: string): void {
    // Try to parse Jest JSON output first
    try {
      // Look for JSON output in the chunk
      const jsonMatch = output.match(/\{[\s\S]*"success":\s*(true|false)[\s\S]*\}/);
      if (jsonMatch) {
        const jestResults = JSON.parse(jsonMatch[0]);
        
        result.summary = {
          passed: jestResults.numPassedTests || 0,
          failed: jestResults.numFailedTests || 0,
          total: jestResults.numTotalTests || 0,
          suites: jestResults.numTotalTestSuites || 0
        };
        
        console.log(`[TEST_RUNNER] Parsed JSON summary:`, result.summary);
        return;
      }
    } catch (error) {
      // JSON parsing failed, continue with fallback
    }
    
    // Fallback: Look for human-readable summary (for debugging/logging)
    if (output.includes('Tests:')) {
      console.log(`[TEST_RUNNER] Found human-readable summary: ${output.trim()}`);
    }
    
    // Additional fallback: Try to parse human-readable format if JSON fails
    const testsMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+skipped,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (testsMatch) {
      const [, failed, skipped, passed, total] = testsMatch;
      result.summary = {
        passed: parseInt(passed, 10),
        failed: parseInt(failed, 10),
        total: parseInt(total, 10),
        suites: 1
      };
      console.log(`[TEST_RUNNER] Parsed fallback summary:`, result.summary);
    }
  }
}

// Singleton instance
export const testRunner = new TestRunner();
