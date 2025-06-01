# Testing Guide

## Test Commands

### Basic Testing
- `npm test` - Run all tests with minimal output (default)
- `npm run test:verbose` - Run all tests with full verbose output
- `npm run test:watch` - Run tests in watch mode with minimal output
- `npm run test:watch:verbose` - Run tests in watch mode with verbose output

### Specific Test Types
- `npm run test:unit` - Run only unit tests
- `npm run test:integration` - Run only integration tests (mocked)
- `npm run test:integration-real` - Run only real database integration tests

### Utility Commands
- `npm run test:failed` - Re-run only failed tests
- `npm run test:coverage` - Run tests with coverage report

## Output Modes

### Default Mode (Minimal)
- Shows only test file results (PASS/FAIL)
- Suppresses console.log/warn/error output
- Shows brief summary at the end
- For failed tests, shows console output and error details

### Verbose Mode
- Shows detailed test descriptions
- Shows all console output in real-time
- Shows full test execution details
- Use when debugging or investigating issues

## Examples

```bash
# Quick test run with minimal output
npm test

# Debug a specific failing test with full output
npm run test:verbose -- --testNamePattern="should create node"

# Run only unit tests in watch mode
npm run test:unit -- --watch

# Run integration tests with coverage
npm run test:integration -- --coverage
```

## Environment Variables

- `VERBOSE_TESTS=true` - Enable verbose output (used internally by test:verbose)

## Tips

1. Use default `npm test` for daily development - it's fast and clean
2. Use `npm run test:verbose` when debugging issues or investigating failures
3. Use `npm run test:watch` during active development
4. Console output is automatically shown for failed tests even in minimal mode
