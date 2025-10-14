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
        const workingDir = process.cwd().endsWith('/api') ? process.cwd() : `${process.cwd()}/api`;
        console.log(`[TEST_RUNNER] Jest command: npm test -- ${args.join(' ')}`);
        // Spawn Jest process - ensure we're in the api directory
        const testProcess = (0, child_process_1.spawn)('npm', ['test', '--', ...args], {
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
            // Also try parsing stderr for test results
            this.parseTestOutput(result, output);
        });
        // Handle process completion
        testProcess.on('close', (code) => {
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
            }
            else {
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
     * Centralized Jest JSON output parser
     */
    parseJestJsonOutput(output) {
        try {
            const lines = output.split('\n');
            // Look for lines that start with { and try to parse them as JSON
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i].trim();
                if (line.startsWith('{') && line.includes('numTotalTests')) {
                    try {
                        const jestResults = JSON.parse(line);
                        if (jestResults.numTotalTests !== undefined) {
                            return {
                                passed: jestResults.numPassedTests || 0,
                                failed: jestResults.numFailedTests || 0,
                                total: jestResults.numTotalTests || 0,
                                suites: jestResults.numTotalTestSuites || 0
                            };
                        }
                    }
                    catch (parseError) {
                        continue;
                    }
                }
            }
            // Try multi-line JSON block parsing
            const jsonBlockMatch = output.match(/\{[\s\S]*?"numTotalTests"\s*:\s*\d+[\s\S]*?\}/);
            if (jsonBlockMatch) {
                const jestResults = JSON.parse(jsonBlockMatch[0]);
                return {
                    passed: jestResults.numPassedTests || 0,
                    failed: jestResults.numFailedTests || 0,
                    total: jestResults.numTotalTests || 0,
                    suites: jestResults.numTotalTestSuites || 0
                };
            }
        }
        catch (error) {
            // JSON parsing failed
        }
        return null;
    }
    /**
     * Centralized Jest text output parser using regex patterns
     */
    parseJestTextOutput(output) {
        try {
            // Pattern 1: Standard Jest output format
            let testsMatch = output.match(TestRunner.JEST_TEXT_PATTERNS.STANDARD);
            if (testsMatch) {
                const [, failed, passed, total] = testsMatch;
                return {
                    passed: parseInt(passed, 10),
                    failed: parseInt(failed, 10),
                    total: parseInt(total, 10),
                    suites: 1
                };
            }
            // Pattern 2: With skipped tests
            testsMatch = output.match(TestRunner.JEST_TEXT_PATTERNS.WITH_SKIPPED);
            if (testsMatch) {
                const [, failed, skipped, passed, total] = testsMatch;
                return {
                    passed: parseInt(passed, 10),
                    failed: parseInt(failed, 10),
                    total: parseInt(total, 10),
                    suites: 1
                };
            }
            // Pattern 3: Alternative format (passing/failing)
            const passingMatch = output.match(TestRunner.JEST_TEXT_PATTERNS.ALTERNATIVE_PASSING);
            if (passingMatch) {
                const passed = parseInt(passingMatch[1], 10);
                const failingMatch = output.match(TestRunner.JEST_TEXT_PATTERNS.ALTERNATIVE_FAILING);
                const failed = failingMatch ? parseInt(failingMatch[1], 10) : 0;
                return {
                    passed: passed,
                    failed: failed,
                    total: passed + failed,
                    suites: 1
                };
            }
            // Pattern 4: Test Suites summary
            const suitesMatch = output.match(TestRunner.JEST_TEXT_PATTERNS.SUITES_ONLY);
            if (suitesMatch) {
                const [, failedSuites, passedSuites, totalSuites] = suitesMatch;
                return {
                    passed: parseInt(passedSuites, 10) > 0 ? 1 : 0,
                    failed: parseInt(failedSuites, 10) > 0 ? 1 : 0,
                    total: parseInt(totalSuites, 10) > 0 ? parseInt(totalSuites, 10) : 1,
                    suites: parseInt(totalSuites, 10)
                };
            }
        }
        catch (error) {
            // Text parsing failed
        }
        return null;
    }
    /**
     * Create a standardized test summary object
     */
    createTestSummary(passed, failed, total, suites) {
        return {
            passed: Math.max(0, passed),
            failed: Math.max(0, failed),
            total: Math.max(0, total),
            suites: Math.max(1, suites)
        };
    }
    /**
     * Parse compilation errors from test output
     */
    parseCompilationErrors(result, output) {
        const compilationErrorFiles = [];
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
        }
        else {
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
    parseTestOutput(result, output) {
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
            // Look for text patterns using centralized patterns
            Object.entries(TestRunner.JEST_TEXT_PATTERNS).forEach(([name, pattern], index) => {
                const match = output.match(pattern);
                console.log(`[TEST_RUNNER] Pattern ${name} match:`, match ? match[0] : 'No match');
            });
            console.log(`[TEST_RUNNER] === INTEGRATION-REAL DEBUG END ===`);
        }
        // Route integration-real tests to specific parser
        if (isIntegrationReal) {
            return this.parseIntegrationRealOutput(result, output);
        }
        // Strategy 1: Try Jest JSON output parsing using centralized utility
        const jsonSummary = this.parseJestJsonOutput(output);
        if (jsonSummary) {
            result.summary = jsonSummary;
            console.log(`[TEST_RUNNER] Parsed JSON summary for ${result.id}:`, result.summary);
            return;
        }
        // Strategy 2: Try text pattern parsing using centralized utility
        const textSummary = this.parseJestTextOutput(output);
        if (textSummary) {
            result.summary = textSummary;
            console.log(`[TEST_RUNNER] Parsed text summary for ${result.id}:`, result.summary);
            return;
        }
        // Log for debugging if we still don't have a summary
        if (!result.summary && output.includes('Tests:')) {
            console.log(`[TEST_RUNNER] Found test output but couldn't parse for ${result.id}:`, output.slice(-500));
        }
    }
    /**
     * Parse integration-real test output with enhanced strategies using centralized utilities
     */
    parseIntegrationRealOutput(result, output) {
        console.log(`[TEST_RUNNER] Parsing integration-real output for ${result.id}`);
        // Strategy 1: Try Jest JSON output parsing using centralized utility
        const jsonSummary = this.parseJestJsonOutput(output);
        if (jsonSummary) {
            result.summary = jsonSummary;
            console.log(`[TEST_RUNNER] Integration-real JSON parsing SUCCESS for ${result.id}:`, result.summary);
            return;
        }
        // Strategy 2: Try text pattern parsing using centralized utility
        const textSummary = this.parseJestTextOutput(output);
        if (textSummary) {
            result.summary = textSummary;
            console.log(`[TEST_RUNNER] Integration-real text parsing SUCCESS for ${result.id}:`, result.summary);
            return;
        }
        // Strategy 3: Enhanced fallback detection for integration-real specific patterns
        try {
            // Look for Jest completion indicators that might not match standard patterns
            if (output.includes('Test Suites:') || output.includes('Tests:')) {
                // Try to extract any numbers we can find
                const passMatch = output.match(/(\d+)\s+(?:test[s]?\s+)?pass(?:ed|ing)?/i);
                const failMatch = output.match(/(\d+)\s+(?:test[s]?\s+)?fail(?:ed|ing)?/i);
                const totalMatch = output.match(/(\d+)\s+total/i);
                if (passMatch || failMatch || totalMatch) {
                    const passed = passMatch ? parseInt(passMatch[1], 10) : 0;
                    const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
                    const total = totalMatch ? parseInt(totalMatch[1], 10) : (passed + failed);
                    if (total > 0) {
                        result.summary = this.createTestSummary(passed, failed, total, 1);
                        console.log(`[TEST_RUNNER] Integration-real enhanced fallback SUCCESS for ${result.id}:`, result.summary);
                        return;
                    }
                }
            }
            // Last resort: detect test execution indicators
            if (output.includes('PASS') || output.includes('FAIL') || output.includes('✓') || output.includes('✗')) {
                console.log(`[TEST_RUNNER] Integration-real detected test execution but couldn't parse specific results for ${result.id}`);
                // Set minimal summary to indicate tests ran
                result.summary = this.createTestSummary(output.includes('PASS') || output.includes('✓') ? 1 : 0, output.includes('FAIL') || output.includes('✗') ? 1 : 0, 1, 1);
                console.log(`[TEST_RUNNER] Integration-real minimal fallback summary for ${result.id}:`, result.summary);
                return;
            }
        }
        catch (error) {
            console.log(`[TEST_RUNNER] Integration-real enhanced fallback failed for ${result.id}:`, error);
        }
        console.log(`[TEST_RUNNER] Integration-real no test execution detected for ${result.id}`);
    }
}
exports.TestRunner = TestRunner;
// Centralized regex patterns for Jest output parsing
TestRunner.JEST_TEXT_PATTERNS = {
    STANDARD: /Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/,
    WITH_SKIPPED: /Tests:\s+(\d+)\s+failed,\s+(\d+)\s+skipped,\s+(\d+)\s+passed,\s+(\d+)\s+total/,
    SUITES_ONLY: /Test Suites:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/,
    ALTERNATIVE_PASSING: /(\d+)\s+passing/,
    ALTERNATIVE_FAILING: /(\d+)\s+failing/
};
// Singleton instance
exports.testRunner = new TestRunner();
