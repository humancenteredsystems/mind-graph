---
sidebar_position: 1
---

# Frontend Development

The MakeItMakeSense.io frontend is built with React + TypeScript + Vite, providing a modern development experience with fast builds and hot module replacement.

## Tech Stack

- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe JavaScript for better development experience
- **Vite** - Fast build tool with instant hot module replacement
- **ESLint** - Code linting for consistent code quality

## Development Setup

The frontend application is located in the `frontend/` directory and uses Vite for development and building.

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Vite Configuration

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## ESLint Configuration

### Basic Configuration

The project comes with a basic ESLint configuration suitable for development.

### Production Configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

### React-Specific Rules

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

## Available Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run linting
npm run lint

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# View E2E test report
npm run test:e2e:report
```

## Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   ├── hooks/              # Custom React hooks
│   ├── context/            # React context providers
│   ├── services/           # API services
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   ├── config/             # Configuration files
│   └── assets/             # Static assets
├── tests/                  # Test files
│   ├── unit/              # Unit tests
│   ├── integration/       # Integration tests
│   └── e2e/               # End-to-end tests
└── public/                 # Public static files
```

## Testing

The frontend uses multiple testing approaches:

- **Unit Tests** - Vitest for component and utility testing
- **Integration Tests** - Vitest for testing component interactions
- **End-to-End Tests** - Playwright for full application testing

See the [Testing Guide](./testing-guide.md) for detailed testing information.

## Theme System & Styling Architecture

The frontend uses a centralized theme system to ensure consistent styling across all UI components.

### Architecture Overview

**File Structure:**
- `frontend/src/config/tokens.ts` - Base design tokens (colors, spacing, typography)
- `frontend/src/config/theme.ts` - Semantic theme configuration built from tokens
- `frontend/src/utils/styleUtils.ts` - Helper functions for component styling

### Design Tokens

Base design values that define the visual foundation:

```typescript
// Color palettes
colors: {
  primary: { 50: '#eff6ff', 500: '#3b82f6', 900: '#1e3a8a' },
  gray: { 50: '#f9fafb', 300: '#d1d5db', 600: '#4b5563' },
  // ... additional color scales
}

// Spacing scale (4px base unit)
spacing: {
  scale: (multiplier: number) => multiplier * 4,
  xs: 2, sm: 4, base: 8, lg: 16, xl: 24
}

// Typography
fontSize: { xs: '12px', sm: '14px', base: '16px', lg: '18px' }
```

### Theme Configuration

Semantic values built from tokens for specific use cases:

```typescript
// Semantic colors
colors: {
  background: { primary: 'white', overlay: 'rgba(0,0,0,0.3)' },
  text: { primary: '#374151', error: '#dc2626' },
  levels: { 1: 'hsl(40,60%,60%)', 2: 'red', 3: 'hsl(120,60%,60%)' }
}

// Component-specific configurations
components: {
  modal: { background: 'white', shadow: '0 25px 50px rgba(0,0,0,0.25)' },
  form: { field: { padding: '4px', border: '1px solid #d1d5db' } },
  button: { base: { borderRadius: '4px', padding: '4px 8px' } }
}
```

### Dynamic Level Colors

Hierarchy level colors are automatically generated using HSL color space:

```typescript
// Generates consistent colors for 8+ levels
export const getLevelColor = (level?: number): string => {
  if (level === undefined || level < 1) return colors.legacy.nodeDefault;
  if (level === 2) return 'red'; // Special case preserved
  
  const baseHue = 40;
  const hueStep = 40;
  const hue = (level * hueStep) % 360;
  return `hsl(${hue}, 60%, 60%)`;
};
```

### Style Utilities

Helper functions for consistent component styling:

```typescript
// Modal styling
export const buildModalStyle = (options = {}) => css({
  background: theme.components.modal.background,
  borderRadius: theme.components.modal.borderRadius,
  boxShadow: theme.components.modal.shadow,
  // ...
});

// Button variants
export const buildButtonStyle = (variant = 'primary') => css({
  ...theme.components.button.base,
  background: variant === 'primary' ? theme.colors.border.active : theme.colors.background.secondary,
  // ...
});
```

### Usage Guidelines

**For Component Development:**

1. **Import theme values:**
   ```typescript
   import { theme } from '../config';
   ```

2. **Use style utilities:**
   ```typescript
   import { buildModalStyle, buildButtonStyle } from '../utils/styleUtils';
   ```

3. **Apply styles via CSS-in-JS:**
   ```typescript
   <div style={buildModalStyle({ maxWidth: '600px' })}>
     <button style={buildButtonStyle('primary')}>Save</button>
   </div>
   ```

4. **Avoid inline styles and hardcoded values:**
   ```typescript
   // ❌ Don't do this
   <div style={{ color: 'red', padding: '8px' }}>
   
   // ✅ Do this instead
   <div style={{ color: theme.colors.text.error, padding: theme.spacing.base }}>
   ```

### Benefits

- **Consistency:** Single source of truth for all styling values
- **Maintainability:** Easy to update colors, spacing, and other design tokens
- **Type Safety:** TypeScript integration prevents styling errors
- **Themeable:** Foundation for future dark mode and custom themes
- **Performance:** No inline style recalculations
- **Responsive Design:** Mobile-first responsive layouts

## Layout Engine Architecture

The frontend uses a simplified hierarchy-aware layout system built on Cytoscape.js with a factory pattern for maximum flexibility and maintainability.

### Layout System Overview

**Core Components:**
- `frontend/src/services/layoutEngine.ts` - Main layout engine with factory pattern
- `frontend/src/context/LayoutContext.tsx` - React context for layout state management
- `frontend/src/components/LayoutControls.tsx` - UI controls for layout switching

### Layout Factory Pattern

All layouts use a unified factory pattern that ensures hierarchy awareness:

```typescript
// Layout factory function type
type LayoutFactory = (cy: Core, config: LayoutConfig, nodes: NodeData[], edges: EdgeData[], hierarchyId: string) => LayoutOptions;

// Example factory implementation
const layoutFactories: Record<LayoutAlgorithm, LayoutFactory> = {
  hierarchical: (cy, config) => ({
    name: 'dagre',
    animate: config.animate,
    directed: true,
    rankDir: 'TB', // Top to bottom hierarchy
    nodeSep: config.nodeSpacing || 100,
    rankSep: config.levelSpacing || 200,
  }),
  
  circular: (cy, config, nodes, edges, hierarchyId) => ({
    name: 'concentric',
    animate: config.animate,
    concentric: (node: NodeSingular) => {
      const nodeData = node.data() as NodeData;
      const level = getNodeHierarchyLevel(nodeData, hierarchyId);
      return 10 - level; // Higher levels get smaller circles
    },
    levelWidth: () => 1,
    minNodeSpacing: config.nodeSpacing || 100,
  }),
  
  // ... other algorithms
};
```

### Available Layout Algorithms

1. **Tree (Default)** - Breadth-first tree layout with hierarchy awareness
2. **Hierarchical** - Uses Dagre for top-down directed tree layout
3. **Force-Directed** - Physics-based layout with hierarchy influence and live update support
4. **Circular** - Concentric circles based on hierarchy levels
5. **Grid** - Grid arrangement grouped by hierarchy levels
6. **Deterministic** - Custom positioned layout with stable hierarchy spacing

### Hierarchy-Aware Features

**All layouts respect node hierarchy levels:**
- Nodes are positioned based on their `levelNumber` in the hierarchy
- Higher-level nodes appear closer to the root/center
- Spacing and positioning algorithms consider parent-child relationships
- Visual consistency maintained across all layout types

### Universal Layout Runner

Single execution function handles all layouts with consistent behavior:

```typescript
async function runHierarchyAwareLayout(
  cy: Core,
  algorithm: LayoutAlgorithm,
  config: LayoutConfig,
  nodes: NodeData[],
  edges: EdgeData[],
  hierarchyId: string
): Promise<void>
```

**Features:**
- Timeout protection (5 seconds default)
- Error handling with fallback centering
- Consistent center and fit behavior
- Promise-based async execution

### Adding New Layout Algorithms

To add a new layout algorithm:

1. **Add to type definition:**
   ```typescript
   export type LayoutAlgorithm = 
     | 'hierarchical'
     | 'your-new-algorithm'
     // ... existing algorithms
   ```

2. **Create factory function:**
   ```typescript
   'your-new-algorithm': (cy, config, nodes, edges, hierarchyId) => ({
     name: 'cytoscape-plugin-name',
     animate: config.animate,
     // ... algorithm-specific options
     // Use hierarchyId and nodes to make it hierarchy-aware
   })
   ```

3. **Add default configuration:**
   ```typescript
   const DEFAULT_CONFIGS: Record<LayoutAlgorithm, Partial<LayoutConfig>> = {
     'your-new-algorithm': {
       algorithm: 'your-new-algorithm',
       animate: true,
       // ... default settings
     },
     // ... existing configs
   }
   ```

4. **Update display name:**
   ```typescript
   const ALGORITHM_NAMES: Record<LayoutAlgorithm, string> = {
     'your-new-algorithm': 'Your Algorithm Name',
     // ... existing names
   }
   ```

### Live Force-Directed Layout

The force-directed layout supports real-time continuous simulation during node dragging for enhanced interactivity.

**How It Works:**
- When a node is grabbed (dragged) in force-directed mode, the layout engine automatically switches to live update mode
- Neighbor nodes continuously reposition themselves in real-time as the dragged node moves
- When the node is released, the live simulation stops and a final layout pass settles the positions

**Implementation Details:**
```typescript
// LayoutConfig interface includes liveUpdate flag
interface LayoutConfig {
  // ... other properties
  liveUpdate?: boolean; // Enable continuous simulation
}

// Force-directed factory respects liveUpdate flag
'force-directed': (cy, config, nodes, edges, hierarchyId) => ({
  name: 'cose-bilkent',
  // ... other options
  maxSimulationTime: config.liveUpdate ? Infinity : 2000,
  liveUpdate: config.liveUpdate || false,
})

// GraphView handles drag events
cy.on('grab', 'node', () => {
  if (currentAlgorithm === 'force-directed') {
    applyLayout(undefined, { liveUpdate: true });
  }
});

cy.on('free', 'node', () => {
  if (currentAlgorithm === 'force-directed') {
    applyLayout(); // Stop live update and settle
  }
});
```

**Benefits:**
- **Interactive:** Real-time visual feedback during node manipulation
- **Intuitive:** Natural physics-based neighbor repositioning
- **Performance:** Only active during drag operations
- **Seamless:** Automatic activation/deactivation based on user interaction

### Benefits of This Architecture

- **KISS Principle:** Simple factory pattern eliminates complex switch statements
- **DRY Principle:** Single execution function handles all layouts consistently
- **Hierarchy-Aware:** Every layout respects node hierarchy by design
- **Extensible:** Adding new algorithms requires minimal code changes
- **Maintainable:** Clear separation of concerns and consistent patterns
- **Reliable:** Universal error handling and timeout protection

## Next Steps

- Review the [System Architecture](./system-architecture.md) to understand the overall system design
- Check the [API Reference](./api-endpoints.md) for available backend endpoints
- See [Testing Guide](./testing-guide.md) for running and writing tests
- Explore [System Architecture](./system-architecture.md) for detailed React implementation patterns
- Learn about [Multi-Tenant Guide](./multi-tenant-guide.md) for tenant-aware frontend development
