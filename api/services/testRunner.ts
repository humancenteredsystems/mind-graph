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
        console.log(`[TEST_RUNNER] Last 500 chars of output:`, completeOutput.slice(-500));
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
    // Try to parse Jest JSON output first - look for complete JSON objects
    try {
      // Look for JSON output that contains the test results
      // More robust regex to find JSON objects with test results
      const jsonMatches = output.match(/\{[^{}]*"numTotalTests"\s*:\s*\d+[^{}]*\}/g) || 
                         output.match(/\{[\s\S]*?"success"\s*:\s*(true|false)[\s\S]*?\}/g);
      
      if (jsonMatches && jsonMatches.length > 0) {
        // Use the last (most complete) JSON match
        const jsonString = jsonMatches[jsonMatches.length - 1];
        const jestResults = JSON.parse(jsonString);
        
        result.summary = {
          passed: jestResults.numPassedTests || 0,
          failed: jestResults.numFailedTests || 0,
          total: jestResults.numTotalTests || 0,
          suites: jestResults.numTotalTestSuites || 0
        };
        
        console.log(`[TEST_RUNNER] Parsed JSON summary for ${result.id}:`, result.summary);
        return;
      }
    } catch (error) {
      console.log(`[TEST_RUNNER] JSON parsing failed for ${result.id}:`, error);
      // JSON parsing failed, continue with fallback
    }
    
    // Enhanced fallback: Try multiple patterns for human-readable output
    try {
      // Pattern 1: Standard Jest output format
      let testsMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
      if (!testsMatch) {
        // Pattern 2: With skipped tests
        testsMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+skipped,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
        if (testsMatch) {
          const [, failed, skipped, passed, total] = testsMatch;
          result.summary = {
            passed: parseInt(passed, 10),
            failed: parseInt(failed, 10),
            total: parseInt(total, 10),
            suites: 1
          };
          console.log(`[TEST_RUNNER] Parsed fallback summary (with skipped) for ${result.id}:`, result.summary);
          return;
        }
      } else {
        const [, failed, passed, total] = testsMatch;
        result.summary = {
          passed: parseInt(passed, 10),
          failed: parseInt(failed, 10),
          total: parseInt(total, 10),
          suites: 1
        };
        console.log(`[TEST_RUNNER] Parsed fallback summary for ${result.id}:`, result.summary);
        return;
      }
      
      // Pattern 3: Test Suites summary
      const suitesMatch = output.match(/Test Suites:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
      if (suitesMatch) {
        const [, failedSuites, passedSuites, totalSuites] = suitesMatch;
        // If we have suites info but no test info, estimate
        if (!result.summary) {
          result.summary = {
            passed: 0,
            failed: parseInt(failedSuites, 10) > 0 ? 1 : 0,
            total: 1,
            suites: parseInt(totalSuites, 10)
          };
          console.log(`[TEST_RUNNER] Parsed suites-only summary for ${result.id}:`, result.summary);
        }
      }
    } catch (error) {
      console.log(`[TEST_RUNNER] Fallback parsing failed for ${result.id}:`, error);
    }
    
    // Log for debugging if we still don't have a summary
    if (!result.summary && output.includes('Tests:')) {
      console.log(`[TEST_RUNNER] Found test output but couldn't parse for ${result.id}:`, output.slice(-500));
    }
  }
}

// Singleton instance
export const testRunner = new TestRunner();
