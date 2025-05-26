# Refactor 01: Test Suite Harmonization and Modernization

**Date:** 2025-01-25  
**Objective:** Harmonize the test suite with modern coding best practices, establish consistent patterns, and improve maintainability across the entire codebase.

## Current State Analysis

### Backend Testing (API)
- **Framework:** Jest
- **Location:** `api/tests/`
- **Files:** `endpoints.test.js`, `integration.test.js`
- **Coverage:** Basic endpoint testing with proper mocking
- **Issues:** Limited scope, missing service layer tests, no hierarchy testing

### Frontend Testing
- **Unit/Integration:** Vitest with React Testing Library
- **E2E:** Playwright
- **Locations:** Mixed (`src/**/*.test.tsx` and `tests/*.spec.ts`)
- **Issues:** Inconsistent naming, complex mocking, scattered organization

### Key Problems Identified
1. **Fragmented Structure:** Tests scattered across multiple locations without clear organization
2. **Inconsistent Patterns:** Different mocking strategies and test structures
3. **Coverage Gaps:** Missing tests for critical components (hierarchy management, validation services)
4. **Complex Mocking:** Overly complex mock setups (especially in `GraphView.test.tsx`)
5. **Naming Inconsistency:** Mix of `.test.` and `.spec.` conventions
6. **Modern Practices:** Not leveraging current testing patterns and utilities
7. **Legacy Test Patterns:** Critical anti-patterns that need immediate cleanup (see Legacy Analysis below)

### Legacy Test Analysis

#### Critical Legacy Issues Identified
1. **Global Window Object Abuse (Critical)** - Files: `GraphView.test.tsx`, `GraphViewMenu.test.tsx`, `App.test.tsx`
   - Tests use `(window as any).cyTrigger`, `(window as any).selectedNodeId` for test communication
   - Pollutes global namespace and creates test isolation issues

2. **Variable Capture Anti-Pattern (High Priority)** - File: `App.test.tsx`
   - Module-level variables capture function references from mocked components
   - Creates shared mutable state between tests, violates isolation principles

3. **Complex Inline Mock Duplication (High Priority)** - Files: `GraphView.test.tsx`, `GraphViewMenu.test.tsx`
   - Nearly identical 60+ line Cytoscape mocking code duplicated across files
   - Creates maintenance overhead and brittle tests

4. **Implementation-Detail Testing (Medium Priority)** - Files: `GraphViewMenu.test.tsx`, `App.test.tsx`
   - Tests focus on internal implementation rather than user behavior
   - Makes tests fragile to refactoring

5. **Inconsistent Mocking Patterns (Medium Priority)** - All test files
   - Mix of top-level `vi.mock()`, inline factory functions, no shared utilities
   - No consistent pattern for mock data

#### Files Marked for Removal/Major Refactor
- **`GraphViewMenu.test.tsx`** - Should be deleted, tests internal implementation details
- **`setupTests.ts`** - Minimal file, could be consolidated into vitest config
- **`App.test.tsx`** - Requires major refactor to focus on user behavior

## Refactoring Strategy

### Phase 1: Foundation and Structure (Priority: High)

#### 1.1 Establish Unified Test Architecture
**Goal:** Create a consistent, scalable test structure across the entire project.

**Backend Structure (Simplified):**
```
api/
├── tests/ (keep existing location)
│   ├── unit/
│   │   ├── services/
│   │   │   ├── nodeEnrichment.test.js
│   │   │   ├── validation.test.js
│   │   │   └── schemaRegistry.test.js
│   │   ├── middleware/
│   │   │   └── auth.test.js
│   │   └── utils/
│   │       ├── dgraphAdmin.test.js
│   │       └── pushSchema.test.js
│   ├── integration/
│   │   ├── endpoints.test.js (refactored from existing)
│   │   ├── hierarchy.test.js
│   │   └── graphql.test.js
│   └── helpers/
│       ├── testSetup.js
│       ├── mockData.js
│       └── apiHelpers.js
├── jest.config.js (enhanced)
└── jest.setup.js (new)
```

**Frontend Structure (Consolidated):**
```
frontend/
├── tests/
│   ├── unit/
│   │   ├── components/
│   │   │   ├── GraphView.test.tsx (refactored)
│   │   │   ├── NodeFormModal.test.tsx
│   │   │   ├── NodeDrawer.test.tsx
│   │   │   └── ContextMenu.test.tsx
│   │   ├── hooks/
│   │   │   ├── useGraphState.test.ts
│   │   │   └── useHierarchy.test.ts
│   │   ├── services/
│   │   │   └── ApiService.test.ts
│   │   ├── utils/
│   │   │   └── graphUtils.test.ts
│   │   └── context/
│   │       ├── HierarchyContext.test.tsx
│   │       └── UIContext.test.tsx
│   ├── integration/
│   │   ├── hierarchy-node-creation.test.tsx
│   │   ├── graph-expansion.test.tsx
│   │   └── context-menu-interactions.test.tsx
│   ├── e2e/ (existing Playwright tests)
│   │   ├── basic-functionality.spec.ts
│   │   ├── hierarchy-management.spec.ts
│   │   └── node-operations.spec.ts
│   └── helpers/
│       ├── testUtils.tsx
│       ├── mockData.ts
│       ├── renderHelpers.tsx
│       └── cytoscapeTestUtils.ts (new)
└── vitest.config.ts (enhanced)
```

**Migration Strategy:**
- Move existing `src/**/*.test.tsx` files to `tests/unit/` with appropriate subdirectories
- Keep existing `tests/*.spec.ts` E2E tests in `tests/e2e/`
- Maintain co-location as an option for simple utility tests

#### 1.2 Create Shared Test Utilities
**Goal:** Reduce code duplication and establish consistent testing patterns.

**Backend Utilities:**
- `testSetup.js`: Common Jest configuration and global mocks
- `mockData.js`: Standardized mock data for nodes, hierarchies, edges
- `apiHelpers.js`: Reusable functions for API testing (request builders, response validators)

**Frontend Utilities:**
- `testUtils.tsx`: Custom render functions with providers
- `mockData.ts`: TypeScript mock data matching backend structure
- `renderHelpers.tsx`: Component-specific render utilities

#### 1.3 Standardize Naming Conventions
**Goal:** Consistent file naming and test organization.

**Rules:**
- Unit tests: `*.test.{js,ts,tsx}`
- Integration tests: `*.test.{js,ts,tsx}` (in integration folders)
- E2E tests: `*.spec.ts` (Playwright only)
- Test helpers: `*Helpers.{js,ts}` or `testUtils.{js,ts}`

### Phase 2: Backend Test Enhancement (Priority: High)

#### 2.1 Service Layer Testing
**Goal:** Comprehensive testing of business logic in service modules.

**New Test Files:**
- `api/__tests__/unit/services/nodeEnrichment.test.js`
- `api/__tests__/unit/services/validation.test.js`
- `api/__tests__/unit/services/schemaRegistry.test.js`

**Coverage Areas:**
- Hierarchy assignment logic
- Node type validation
- Schema management operations
- Error handling and edge cases

#### 2.2 Enhanced Integration Testing
**Goal:** Test complete request/response cycles with proper hierarchy context.

**Enhanced Files:**
- `api/__tests__/integration/endpoints.test.js` (refactored from current)
- `api/__tests__/integration/hierarchy.test.js` (new)
- `api/__tests__/integration/graphql.test.js` (new)

**Coverage Areas:**
- Full hierarchy CRUD operations
- Node creation with hierarchy assignments
- Complex GraphQL queries and mutations
- Error scenarios and validation

#### 2.3 Middleware and Utility Testing
**Goal:** Test supporting infrastructure components.

**New Test Files:**
- `api/__tests__/unit/middleware/auth.test.js`
- `api/__tests__/unit/utils/dgraphAdmin.test.js`
- `api/__tests__/unit/utils/pushSchema.test.js`

### Phase 3: Frontend Test Modernization (Priority: Medium)

#### 3.1 Component Test Refactoring
**Goal:** Simplify and standardize component testing patterns.

**Refactor Priority:**
1. `GraphView.test.tsx` - Simplify complex Cytoscape mocking
2. `NodeFormModal.test.tsx` - Enhance hierarchy testing
3. `App.test.tsx` - Improve integration scenarios
4. Create missing tests for `NodeDrawer`, `ContextMenu`

**Improvements:**
- Reduce mock complexity
- Use custom render utilities
- Focus on user interactions over implementation details
- Improve test readability and maintainability

#### 3.2 Hook and Service Testing
**Goal:** Comprehensive testing of custom hooks and services.

**Enhanced Files:**
- `useGraphState.test.ts` - Add hierarchy-aware scenarios
- `ApiService.test.ts` - Expand coverage for new endpoints
- Create `HierarchyContext.test.tsx` enhancements

**New Test Files:**
- `src/__tests__/unit/hooks/useNodeExpansion.test.ts` (future)
- `src/__tests__/unit/utils/hierarchyUtils.test.ts` (future)

#### 3.3 Integration Testing
**Goal:** Test component interactions and data flow.

**New Integration Tests:**
- Hierarchy selection and node creation flow
- Graph expansion and collapse operations
- Context menu interactions with different node states
- Error handling and recovery scenarios

#### 3.4 Cytoscape Mocking Strategy
**Goal:** Simplify the overly complex Cytoscape mocking in `GraphView.test.tsx` with a layered approach.

**Current Problem Analysis:**
The existing `GraphView.test.tsx` contains 85+ lines of complex mock setup that attempts to simulate the entire Cytoscape.js API. This creates maintenance overhead and brittle tests.

**Proposed Solution - Three-Layer Approach:**

**Layer 1: Minimal Mock for Basic Rendering Tests**
```typescript
// tests/helpers/cytoscapeTestUtils.ts
export const createMinimalCytoscapeMock = () => ({
  default: ({ elements, cy }: { elements: any[]; cy?: any }) => {
    // Simple mock that just renders a div with test data
    if (typeof cy === 'function') {
      cy({
        layout: vi.fn().mockReturnValue({ run: vi.fn() }),
        on: vi.fn(),
        off: vi.fn(),
        nodes: vi.fn().mockReturnValue([]),
      });
    }
    return (
      <div 
        data-testid="cytoscape-component" 
        data-elements={JSON.stringify(elements)}
        data-node-count={elements.filter(el => !el.data.source).length}
        data-edge-count={elements.filter(el => el.data.source).length}
      />
    );
  }
});
```

**Layer 2: Event-Capable Mock for Interaction Tests**
```typescript
export const createEventCapableCytoscapeMock = () => {
  const eventHandlers: Record<string, Function[]> = {};
  
  const mockCy = {
    layout: vi.fn().mockReturnValue({ run: vi.fn() }),
    on: vi.fn((event: string, selector: string, handler: Function) => {
      const key = `${event}-${selector}`;
      if (!eventHandlers[key]) eventHandlers[key] = [];
      eventHandlers[key].push(handler);
    }),
    off: vi.fn(),
    nodes: vi.fn().mockReturnValue([]),
    // Test helper to trigger events
    __triggerEvent: (event: string, selector: string, mockTarget: any) => {
      const key = `${event}-${selector}`;
      eventHandlers[key]?.forEach(handler => 
        handler({ target: mockTarget, preventDefault: vi.fn() })
      );
    }
  };

  return {
    default: ({ elements, cy }: { elements: any[]; cy?: any }) => {
      if (typeof cy === 'function') cy(mockCy);
      // Expose trigger for tests
      (window as any).__cyTrigger = mockCy.__triggerEvent;
      return <div data-testid="cytoscape-component" />;
    }
  };
};
```

**Layer 3: Full Mock for Complex Scenarios (Use Sparingly)**
```typescript
export const createFullCytoscapeMock = () => {
  // Only implement when absolutely necessary for complex integration tests
  // Focus on specific methods needed rather than full API coverage
};
```

**Refactored Test Structure:**
```typescript
// tests/unit/components/GraphView.test.tsx
import { createMinimalCytoscapeMock, createEventCapableCytoscapeMock } from '../../helpers/cytoscapeTestUtils';

describe('GraphView Component', () => {
  describe('Rendering', () => {
    beforeEach(() => {
      vi.mock('react-cytoscapejs', createMinimalCytoscapeMock);
    });

    it('renders with correct node and edge counts', () => {
      render(<GraphView nodes={mockNodes} edges={mockEdges} />);
      const component = screen.getByTestId('cytoscape-component');
      expect(component).toHaveAttribute('data-node-count', '2');
      expect(component).toHaveAttribute('data-edge-count', '1');
    });

    it('filters dangling edges', () => {
      const nodes = [{ id: 'n1' }];
      const edges = [
        { source: 'n1', target: 'n2' }, // dangling
        { source: 'n1', target: 'n1' }  // valid
      ];
      render(<GraphView nodes={nodes} edges={edges} />);
      const component = screen.getByTestId('cytoscape-component');
      expect(component).toHaveAttribute('data-edge-count', '1');
    });
  });

  describe('Interactions', () => {
    beforeEach(() => {
      vi.mock('react-cytoscapejs', createEventCapableCytoscapeMock);
    });

    it('calls onEditNode on double tap', () => {
      const onEditNode = vi.fn();
      render(<GraphView nodes={mockNodes} edges={[]} onEditNode={onEditNode} />);
      
      // Trigger double tap event
      (window as any).__cyTrigger('doubleTap', 'node', {
        id: () => 'n1',
        data: () => mockNodes[0]
      });
      
      expect(onEditNode).toHaveBeenCalledWith(mockNodes[0]);
    });
  });
});
```

**Benefits of This Approach:**
1. **Reduced Complexity:** Each test uses only the mock complexity it needs
2. **Better Maintainability:** Centralized mock utilities that can be updated once
3. **Clearer Intent:** Test purpose is obvious from which mock layer is used
4. **Easier Debugging:** Simpler mocks are easier to understand when tests fail
5. **Reusability:** Mock utilities can be shared across multiple test files

**Migration Strategy:**
1. Create `cytoscapeTestUtils.ts` with the three mock layers
2. Refactor existing `GraphView.test.tsx` to use appropriate mock layers
3. Update other components that use Cytoscape mocking to use shared utilities
4. Remove complex inline mocks in favor of centralized utilities

**Testing Philosophy:**
- **Unit Tests:** Focus on component logic, not Cytoscape implementation details
- **Integration Tests:** Test component interactions with minimal Cytoscape simulation
- **E2E Tests:** Use real Cytoscape for full user workflow validation

### Phase 4: E2E Test Enhancement (Priority: Medium)

#### 4.1 Comprehensive User Workflows
**Goal:** Test complete user journeys with hierarchy management.

**Enhanced Test Files:**
- `basic-functionality.spec.ts` - Core graph operations
- `hierarchy-management.spec.ts` - Hierarchy switching and node creation
- `node-operations.spec.ts` - CRUD operations with validation
- `error-scenarios.spec.ts` - Error handling and recovery

#### 4.2 Cross-Browser and Performance Testing
**Goal:** Ensure compatibility and performance across environments.

**New Capabilities:**
- Multi-browser test execution
- Performance benchmarks for large graphs
- Mobile responsiveness testing
- Accessibility testing integration

### Phase 5: Test Infrastructure and CI/CD (Priority: Low)

#### 5.1 Enhanced Test Configuration
**Goal:** Optimize test execution and reporting.

**Improvements:**
- Parallel test execution
- Code coverage reporting with meaningful thresholds
- Test result visualization
- Performance regression detection

#### 5.2 Continuous Integration Enhancement
**Goal:** Integrate testing into development workflow.

**Features:**
- Pre-commit test hooks
- Pull request test automation
- Test result reporting in CI
- Automated test maintenance

## Implementation Plan

### Week 1: Legacy Cleanup and Foundation (UPDATED)
**Day 1-2: Critical Legacy Removal**
1. Remove global window object patterns from `GraphView.test.tsx`, `GraphViewMenu.test.tsx`, `App.test.tsx`
2. Eliminate variable capture anti-pattern in `App.test.tsx`
3. Delete `GraphViewMenu.test.tsx` (move relevant scenarios to integration tests)

**Day 3-4: Foundation Setup**
4. Create new directory structures (`frontend/tests/` with subdirectories)
5. Create consolidated mock utilities (`cytoscapeTestUtils.ts`)
6. Implement shared test utilities and mock data

**Day 5: Migration**
7. Move existing test files to new structure
8. Standardize naming conventions

### Week 2: Backend Enhancement
1. Create service layer tests (nodeEnrichment, validation, schemaRegistry)
2. Enhance integration tests with hierarchy context
3. Add middleware and utility tests
4. Implement test helpers and mock data

### Week 3: Frontend Modernization
1. Refactor `GraphView.test.tsx` using new Cytoscape mock layers
2. Refactor `App.test.tsx` to focus on user behavior
3. Enhance hook and service tests
4. Create missing component tests (`NodeDrawer`, `ContextMenu`)
5. Implement integration test scenarios

### Week 4: E2E and Polish
1. Enhance E2E test coverage
2. Implement performance testing
3. Add accessibility testing
4. Documentation and training

### Legacy Cleanup Benefits
- **Improved Test Reliability:** Eliminates global state pollution and test isolation issues
- **Better Maintainability:** Shared utilities instead of duplicated complex mocks
- **Clearer Intent:** Behavior-focused tests are easier to understand
- **Faster Development:** Less time debugging complex mock setups

## Success Metrics

### Quantitative Goals
- **Code Coverage:** >85% for critical paths
- **Test Execution Time:** <2 minutes for full unit test suite
- **E2E Test Coverage:** All major user workflows
- **Test Maintenance:** <10% of development time spent on test maintenance

### Qualitative Goals
- **Consistency:** Uniform testing patterns across the codebase
- **Maintainability:** Easy to add new tests following established patterns
- **Reliability:** Stable tests that don't produce false positives/negatives
- **Documentation:** Clear testing guidelines and examples

## Risk Mitigation

### Technical Risks
- **Test Migration:** Implement incrementally to avoid breaking existing tests
- **Mock Complexity:** Use real implementations where possible, simple mocks otherwise
- **Performance:** Monitor test execution time and optimize as needed

### Process Risks
- **Developer Adoption:** Provide clear documentation and examples
- **Maintenance Overhead:** Establish clear ownership and review processes
- **Integration Issues:** Test changes in isolation before full integration

## Modern Best Practices Integration

### Testing Patterns
- **Arrange-Act-Assert:** Consistent test structure
- **Given-When-Then:** BDD-style test descriptions
- **Test Doubles:** Appropriate use of mocks, stubs, and fakes
- **Property-Based Testing:** For complex validation logic

### Tools and Techniques
- **Custom Matchers:** Domain-specific assertions
- **Test Factories:** Consistent test data generation
- **Snapshot Testing:** For UI component regression testing
- **Visual Regression Testing:** For graph visualization components

### Documentation
- **Test Documentation:** Clear descriptions of what each test validates
- **Testing Guidelines:** Standards for writing and maintaining tests
- **Troubleshooting Guide:** Common issues and solutions
- **Examples Repository:** Reference implementations for common scenarios

## Conclusion

This refactoring plan will transform your test suite from a collection of individual tests into a cohesive, maintainable testing infrastructure that supports your development process and ensures code quality. The phased approach allows for incremental implementation while maintaining development velocity.

The focus on modern best practices, consistent patterns, and comprehensive coverage will provide a solid foundation for future development and help prevent regressions as your codebase continues to evolve.
