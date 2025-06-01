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

## Next Steps

- Review the [System Architecture](./system-architecture.md) to understand the overall system design
- Check the [API Reference](./api-endpoints.md) for available backend endpoints
- See [Testing Guide](./testing-guide.md) for running and writing tests
- Explore [System Architecture](./system-architecture.md) for detailed React implementation patterns
- Learn about [Multi-Tenant Guide](./multi-tenant-guide.md) for tenant-aware frontend development
