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
    
    // Spawn Jest process
    const testProcess = spawn('npm', ['test', '--', ...args], {
      cwd: process.cwd(),
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
    });

    // Handle process completion
    testProcess.on('close', (code: number | null) => {
      result.status = code === 0 ? 'completed' : 'failed';
      result.endTime = new Date();
      result.exitCode = code || 0;
      
      console.log(`[TEST_RUNNER] Test run ${runId} completed with exit code ${code}`);
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

    // Test type patterns
    switch (options.type) {
      case 'unit':
        args.push('--testPathPattern=unit');
        break;
      case 'integration':
        args.push('--testPathPattern=integration');
        args.push('--testPathIgnorePatterns=integration-real');
        break;
      case 'integration-real':
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

    return args;
  }

  /**
   * Parse test output to extract summary information
   */
  private parseTestOutput(result: TestRunResult, output: string): void {
    // Parse Jest test summary
    const summaryMatch = output.match(/Test Suites:\s*(\d+)\s*failed,\s*(\d+)\s*passed,\s*(\d+)\s*total/);
    if (summaryMatch) {
      const [, failedSuites, passedSuites, totalSuites] = summaryMatch;
      
      const testsMatch = output.match(/Tests:\s*(\d+)\s*failed,\s*(\d+)\s*passed,\s*(\d+)\s*total/);
      if (testsMatch) {
        const [, failedTests, passedTests, totalTests] = testsMatch;
        
        result.summary = {
          passed: parseInt(passedTests, 10),
          failed: parseInt(failedTests, 10),
          total: parseInt(totalTests, 10),
          suites: parseInt(totalSuites, 10)
        };
      }
    }
  }
}

// Singleton instance
export const testRunner = new TestRunner();
