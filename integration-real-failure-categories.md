# Integration-Real Test Failure Categories

## Summary
**9 failing tests** across 2 test suites, categorized into 4 main failure types:

## 📊 Failure Categories

### 1. 🔍 **Test Data/Setup Issues** (3 failures)
**Root Cause**: Tests expecting specific seeded data that may not exist or be accessible

**Failing Tests:**
- `should create new level in existing hierarchy` - Expected `"test-hierarchy-1"` but got `undefined`
- `should create hierarchy assignment for existing node` - Expected 201 but got 500 (Internal Server Error)
- `should create node with hierarchy assignment automatically` - Expected hierarchy ID in array but got empty array `[]`

**Analysis**: These failures suggest that the test data seeding is not working correctly or the seeded data (like `test-hierarchy-1`) is not being found by the tests.

### 2. ⚠️ **Business Logic/Validation Issues** (3 failures)
**Root Cause**: API endpoints not enforcing expected business rules and validations

**Failing Tests:**
- `should validate level number uniqueness` - Expected 500 (validation error) but got 201 (success)
- `should require hierarchy header for node creation` - Expected 500 (missing header error) but got 200 (success)
- `should respect level type constraints` - Expected 500 (type constraint error) but got 200 (success)

**Analysis**: The API is allowing operations that should be rejected, indicating missing validation logic for:
- Duplicate level numbers in hierarchies
- Required hierarchy context headers
- Node type constraints at hierarchy levels

### 3. 🔧 **GraphQL Schema/Query Issues** (2 failures)
**Root Cause**: GraphQL queries failing due to schema mismatches or invalid query structure

**Failing Tests:**
- `should execute edge creation mutations` - Expected 200 but got 400 (Bad Request)
- `should handle queries with multiple filters` - Expected 200 but got 400 (Bad Request)

**Analysis**: These are GraphQL-specific failures where the queries themselves are malformed or incompatible with the current schema.

### 4. 🗄️ **Database Query/Filter Issues** (1 failure)
**Root Cause**: Complex database queries not working as expected

**Failing Tests:**
- `should query nodes by hierarchy level` - Expected 200 but got 400 (Bad Request)

**Analysis**: The hierarchical query filtering is not working correctly, likely due to complex nested filter syntax issues.

## 🔍 Detailed Analysis

### Test Data Issues (Priority: HIGH)
The most critical issue is that tests are expecting seeded data that either:
1. **Not being created** during `seedTestData()`
2. **Not accessible** due to tenant/namespace isolation issues
3. **Being cleared** between test runs

**Evidence:**
```typescript
// Test expects this to exist but gets undefined
hierarchyId: 'test-hierarchy-1'  // Expected
// But actual result is: undefined
```

### Business Logic Issues (Priority: MEDIUM)
The API is missing validation middleware that should:
1. **Validate hierarchy context** - Require `X-Hierarchy-Id` header for node creation
2. **Enforce uniqueness** - Prevent duplicate level numbers in same hierarchy
3. **Check type constraints** - Validate node types against hierarchy level allowed types

### GraphQL Issues (Priority: MEDIUM)
Two GraphQL operations are failing with 400 Bad Request:
1. **Edge creation mutation** - Likely schema mismatch in edge input format
2. **Multiple filter queries** - Complex filter syntax not supported

### Database Query Issues (Priority: LOW)
One complex hierarchical query is failing, likely due to:
1. **Nested filter syntax** - Complex hierarchy assignment filters
2. **Schema relationship** - Hierarchy-to-node relationship queries

## 🎯 Recommended Fix Priority

1. **FIRST**: Fix test data seeding - Ensure `test-hierarchy-1` and related data exists
2. **SECOND**: Add missing validation middleware for business rules
3. **THIRD**: Fix GraphQL schema/query compatibility issues
4. **FOURTH**: Debug complex hierarchical query filters

## 📋 Next Steps

1. **Investigate test data seeding** - Check if `seedTestData()` is actually creating the expected data
2. **Add debug logging** - Log what data exists in test tenant before each test
3. **Fix validation middleware** - Add missing business rule validations
4. **Review GraphQL schema** - Ensure edge creation and filter syntax compatibility
