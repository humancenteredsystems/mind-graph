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
  compilationErrors?: {
    count: number;
    files: string[];
    hasErrors: boolean;
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
      
      // Parse compilation errors from complete output
      this.parseCompilationErrors(result, result.output.join(''));
      
      // Determine status based on actual test results, not just exit code
      if (result.summary && result.summary.total > 0) {
        // We have test results - use them to determine status
        result.status = result.summary.failed === 0 ? 'completed' : 'failed';
        console.log(`[TEST_RUNNER] Status determined by test results: ${result.status} (${result.summary.failed} failed out of ${result.summary.total} total)`);
      } else {
        // No test results available - fall back to exit code
        result.status = code === 0 ? 'completed' : 'failed';
        console.log(`[TEST_RUNNER] Status determined by exit code: ${result.status} (exit code: ${code})`);
      }
      
      console.log(`[TEST_RUNNER] Test run ${runId} completed with exit code ${code}`);
      console.log(`[TEST_RUNNER] Final summary for ${runId}:`, result.summary);
      if (result.compilationErrors?.hasErrors) {
        console.log(`[TEST_RUNNER] Compilation errors detected: ${result.compilationErrors.count} files`);
      }
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
   * Parse compilation errors from test output
   */
  private parseCompilationErrors(result: TestRunResult, output: string): void {
    const compilationErrorFiles: string[] = [];
    
    // Look for TypeScript compilation errors
    const tsErrorPattern = /([^:\s]+\.test\.ts):\d+:\d+\s+-\s+error\s+TS\d+:/g;
    let match;
    
    while ((match = tsErrorPattern.exec(output)) !== null) {
      const filePath = match[1];
      if (!compilationErrorFiles.includes(filePath)) {
        compilationErrorFiles.push(filePath);
      }
    }
    
    // Also look for "Test suite failed to run" patterns
    const failedSuitePattern = /Test suite failed to run[\s\S]*?([^:\s]+\.test\.ts)/g;
    while ((match = failedSuitePattern.exec(output)) !== null) {
      const filePath = match[1];
      if (!compilationErrorFiles.includes(filePath)) {
        compilationErrorFiles.push(filePath);
      }
    }
    
    if (compilationErrorFiles.length > 0) {
      result.compilationErrors = {
        count: compilationErrorFiles.length,
        files: compilationErrorFiles,
        hasErrors: true
      };
      console.log(`[TEST_RUNNER] Found compilation errors in ${compilationErrorFiles.length} files:`, compilationErrorFiles);
    } else {
      result.compilationErrors = {
        count: 0,
        files: [],
        hasErrors: false
      };
    }
  }

  /**
   * Parse test output to extract summary information
   */
  private parseTestOutput(result: TestRunResult, output: string): void {
    // Enhanced debugging for integration-real tests
    const isIntegrationReal = result.id.includes('integration-real');
    
    if (isIntegrationReal) {
      console.log(`[TEST_RUNNER] === INTEGRATION-REAL DEBUG START ===`);
      console.log(`[TEST_RUNNER] Test ID: ${result.id}`);
      console.log(`[TEST_RUNNER] Output length: ${output.length} characters`);
      console.log(`[TEST_RUNNER] First 500 chars:`, output.slice(0, 500));
      console.log(`[TEST_RUNNER] Last 500 chars:`, output.slice(-500));
      console.log(`[TEST_RUNNER] Contains "numTotalTests":`, output.includes('numTotalTests'));
      console.log(`[TEST_RUNNER] Contains "Tests:":`, output.includes('Tests:'));
      console.log(`[TEST_RUNNER] Contains "Test Suites:":`, output.includes('Test Suites:'));
      
      // Look for JSON patterns
      const jsonMatches = output.match(/\{[^{}]*"numTotalTests"[^{}]*\}/g);
      if (jsonMatches) {
        console.log(`[TEST_RUNNER] Found ${jsonMatches.length} potential JSON matches`);
        jsonMatches.forEach((match, index) => {
          console.log(`[TEST_RUNNER] JSON match ${index + 1}:`, match);
        });
      }
      
      // Look for text patterns
      const testPatterns = [
        /Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/,
        /Tests:\s+(\d+)\s+failed,\s+(\d+)\s+skipped,\s+(\d+)\s+passed,\s+(\d+)\s+total/,
        /Test Suites:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/
      ];
      
      testPatterns.forEach((pattern, index) => {
        const match = output.match(pattern);
        console.log(`[TEST_RUNNER] Pattern ${index + 1} match:`, match ? match[0] : 'No match');
      });
      
      console.log(`[TEST_RUNNER] === INTEGRATION-REAL DEBUG END ===`);
    }

    // Route integration-real tests to specific parser
    if (isIntegrationReal) {
      return this.parseIntegrationRealOutput(result, output);
    }

    // Try to parse Jest JSON output first - look for complete JSON objects
    try {
      // Look for the final JSON output that Jest produces with --json flag
      // Jest outputs a complete JSON object at the end, so we look for the last valid JSON
      const lines = output.split('\n');
      let jsonString = '';
      
      // Look for lines that start with { and try to parse them as JSON
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line.startsWith('{') && line.includes('numTotalTests')) {
          try {
            // Try to parse this line as JSON
            const jestResults = JSON.parse(line);
            if (jestResults.numTotalTests !== undefined) {
              result.summary = {
                passed: jestResults.numPassedTests || 0,
                failed: jestResults.numFailedTests || 0,
                total: jestResults.numTotalTests || 0,
                suites: jestResults.numTotalTestSuites || 0
              };
              
              console.log(`[TEST_RUNNER] Parsed JSON summary for ${result.id}:`, result.summary);
              return;
            }
          } catch (parseError) {
            // This line wasn't valid JSON, continue searching
            continue;
          }
        }
      }
      
      // If no single line worked, try to find a complete JSON block
      // Look for JSON that spans multiple lines
      const jsonBlockMatch = output.match(/\{[\s\S]*?"numTotalTests"\s*:\s*\d+[\s\S]*?\}/);
      if (jsonBlockMatch) {
        const jestResults = JSON.parse(jsonBlockMatch[0]);
        result.summary = {
          passed: jestResults.numPassedTests || 0,
          failed: jestResults.numFailedTests || 0,
          total: jestResults.numTotalTests || 0,
          suites: jestResults.numTotalTestSuites || 0
        };
        
        console.log(`[TEST_RUNNER] Parsed JSON block summary for ${result.id}:`, result.summary);
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

  /**
   * Parse integration-real test output with enhanced strategies
   */
  private parseIntegrationRealOutput(result: TestRunResult, output: string): void {
    console.log(`[TEST_RUNNER] Parsing integration-real output for ${result.id}`);
    
    // Strategy 1: Try Jest JSON output parsing (same as regular tests but with enhanced logging)
    try {
      // Look for the final JSON output that Jest produces with --json flag
      const lines = output.split('\n');
      
      // Look for lines that start with { and try to parse them as JSON
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (line.startsWith('{') && line.includes('numTotalTests')) {
          try {
            const jestResults = JSON.parse(line);
            if (jestResults.numTotalTests !== undefined) {
              result.summary = {
                passed: jestResults.numPassedTests || 0,
                failed: jestResults.numFailedTests || 0,
                total: jestResults.numTotalTests || 0,
                suites: jestResults.numTotalTestSuites || 0
              };
              
              console.log(`[TEST_RUNNER] Integration-real JSON parsing SUCCESS for ${result.id}:`, result.summary);
              return;
            }
          } catch (parseError) {
            console.log(`[TEST_RUNNER] Integration-real JSON line parse failed:`, parseError);
            continue;
          }
        }
      }
      
      // Try multi-line JSON block parsing
      const jsonBlockMatch = output.match(/\{[\s\S]*?"numTotalTests"\s*:\s*\d+[\s\S]*?\}/);
      if (jsonBlockMatch) {
        try {
          const jestResults = JSON.parse(jsonBlockMatch[0]);
          result.summary = {
            passed: jestResults.numPassedTests || 0,
            failed: jestResults.numFailedTests || 0,
            total: jestResults.numTotalTests || 0,
            suites: jestResults.numTotalTestSuites || 0
          };
          
          console.log(`[TEST_RUNNER] Integration-real JSON block parsing SUCCESS for ${result.id}:`, result.summary);
          return;
        } catch (parseError) {
          console.log(`[TEST_RUNNER] Integration-real JSON block parse failed:`, parseError);
        }
      }
    } catch (error) {
      console.log(`[TEST_RUNNER] Integration-real JSON parsing failed for ${result.id}:`, error);
    }
    
    // Strategy 2: Enhanced text pattern matching for integration-real
    try {
      // Pattern 1: Standard Jest output format
      let testsMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
      if (testsMatch) {
        const [, failed, passed, total] = testsMatch;
        result.summary = {
          passed: parseInt(passed, 10),
          failed: parseInt(failed, 10),
          total: parseInt(total, 10),
          suites: 1
        };
        console.log(`[TEST_RUNNER] Integration-real text pattern 1 SUCCESS for ${result.id}:`, result.summary);
        return;
      }
      
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
        console.log(`[TEST_RUNNER] Integration-real text pattern 2 SUCCESS for ${result.id}:`, result.summary);
        return;
      }
      
      // Pattern 3: Alternative formats that might be specific to integration-real
      testsMatch = output.match(/(\d+)\s+passing/);
      if (testsMatch) {
        const passed = parseInt(testsMatch[1], 10);
        const failedMatch = output.match(/(\d+)\s+failing/);
        const failed = failedMatch ? parseInt(failedMatch[1], 10) : 0;
        
        result.summary = {
          passed: passed,
          failed: failed,
          total: passed + failed,
          suites: 1
        };
        console.log(`[TEST_RUNNER] Integration-real alternative pattern SUCCESS for ${result.id}:`, result.summary);
        return;
      }
      
      // Pattern 4: Test Suites summary
      const suitesMatch = output.match(/Test Suites:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
      if (suitesMatch) {
        const [, failedSuites, passedSuites, totalSuites] = suitesMatch;
        result.summary = {
          passed: parseInt(passedSuites, 10) > 0 ? 1 : 0,
          failed: parseInt(failedSuites, 10) > 0 ? 1 : 0,
          total: parseInt(totalSuites, 10) > 0 ? parseInt(totalSuites, 10) : 1,
          suites: parseInt(totalSuites, 10)
        };
        console.log(`[TEST_RUNNER] Integration-real suites pattern SUCCESS for ${result.id}:`, result.summary);
        return;
      }
      
    } catch (error) {
      console.log(`[TEST_RUNNER] Integration-real text parsing failed for ${result.id}:`, error);
    }
    
    // Strategy 3: Last resort - if we detect test execution but can't parse results
    if (output.includes('PASS') || output.includes('FAIL') || output.includes('Test Suites:')) {
      console.log(`[TEST_RUNNER] Integration-real detected test execution but couldn't parse results for ${result.id}`);
      // Set minimal summary to indicate tests ran
      result.summary = {
        passed: output.includes('PASS') ? 1 : 0,
        failed: output.includes('FAIL') ? 1 : 0,
        total: 1,
        suites: 1
      };
      console.log(`[TEST_RUNNER] Integration-real fallback summary for ${result.id}:`, result.summary);
    } else {
      console.log(`[TEST_RUNNER] Integration-real no test execution detected for ${result.id}`);
    }
  }
}

// Singleton instance
export const testRunner = new TestRunner();
