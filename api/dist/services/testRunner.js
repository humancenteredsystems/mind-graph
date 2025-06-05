"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testRunner = exports.TestRunner = void 0;
const child_process_1 = require("child_process");
const events_1 = require("events");
class TestRunner extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.activeRuns = new Map();
        this.runCounter = 0;
    }
    /**
     * Start a test run with the specified options
     */
    async startTestRun(options) {
        const runId = `test-run-${++this.runCounter}-${Date.now()}`;
        console.log(`[TEST_RUNNER] Starting test run ${runId} with options:`, options);
        const result = {
            id: runId,
            status: 'running',
            startTime: new Date(),
            output: []
        };
        // Build Jest command arguments
        const args = this.buildJestArgs(options);
        // Spawn Jest process
        const testProcess = (0, child_process_1.spawn)('npm', ['test', '--', ...args], {
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
        testProcess.stdout?.on('data', (data) => {
            const output = data.toString();
            result.output.push(output);
            this.emit('output', runId, output);
            // Parse test results from output
            this.parseTestOutput(result, output);
        });
        testProcess.stderr?.on('data', (data) => {
            const output = data.toString();
            result.output.push(`[STDERR] ${output}`);
            this.emit('output', runId, `[STDERR] ${output}`);
        });
        // Handle process completion
        testProcess.on('close', (code) => {
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
        testProcess.on('error', (error) => {
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
    stopTestRun(runId) {
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
    getTestRun(runId) {
        const run = this.activeRuns.get(runId);
        return run ? { ...run.result } : null;
    }
    /**
     * Get all active test runs
     */
    getActiveRuns() {
        return Array.from(this.activeRuns.values()).map(run => ({ ...run.result }));
    }
    /**
     * Build Jest command arguments based on options
     */
    buildJestArgs(options) {
        const args = [];
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
    parseTestOutput(result, output) {
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
exports.TestRunner = TestRunner;
// Singleton instance
exports.testRunner = new TestRunner();
