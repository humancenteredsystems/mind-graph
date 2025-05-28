/**
 * Design Tokens - Primitive values that form the foundation of our design system
 * These are the atomic values that should not change frequently
 */

export const tokens = {
  // Base spacing unit (all spacing derived from this)
  spacing: {
    unit: 4, // 4px base unit
    scale: (multiplier: number) => multiplier * 4,
  },
  
  // Color primitives
  colors: {
    // Grayscale
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    
    // Brand colors
    primary: {
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
    },
    
    success: {
      500: '#22c55e',
      600: '#16a34a',
    },
    
    warning: {
      500: '#f59e0b',
      600: '#d97706',
      700: '#FF9800', // Current expanded color
    },
    
    danger: {
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
    
    // Special colors used in current implementation
    legacy: {
      nodeDefault: '#888',
      borderDefault: '#555',
      textDefault: '#333',
      edgeDefault: '#ccc',
      selectedRed: '#ff0000',
      selectedBackground: '#ff9999',
      white: '#fff',
      black: '#000',
    },
  },
  
  // Typography scale
  fontSize: {
    xs: 6,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
  },
  
  // Border radius scale
  radius: {
    none: 0,
    sm: 2,
    base: 4,
    lg: 8,
    xl: 12,
    full: 9999,
  },
  
  // Shadow tokens
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    base: '0 2px 4px rgba(0,0,0,0.1)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
    xl: '0 20px 25px rgba(0,0,0,0.1)',
    '2xl': '0 25px 50px rgba(0,0,0,0.25)',
  },
  
  // Animation timing
  timing: {
    fast: 150,
    base: 200,
    slow: 300,
  },
} as const;

// Utility type for extracting token values
export type Tokens = typeof tokens;
export type ColorTokens = typeof tokens.colors;
export type SpacingTokens = typeof tokens.spacing;
