/**
 * Configuration System Index
 * Central export point for all configuration values
 */

// Export design tokens
export { tokens } from './tokens';
export type { Tokens, ColorTokens, SpacingTokens } from './tokens';

// Export theme configuration
export { theme, getLevelColor, useTheme } from './theme';
export type { Theme, ThemeColors, ThemeComponents } from './theme';

// Import and re-export constants
import {
  INTERACTIONS,
  ANIMATIONS,
  TEST_TIMEOUTS,
  GRAPH_LAYOUT,
  NODE_DIMENSIONS,
  BORDER_WIDTHS,
  FONT_SIZE_MAPPING,
} from './constants';

export {
  INTERACTIONS,
  ANIMATIONS,
  TEST_TIMEOUTS,
  GRAPH_LAYOUT,
  NODE_DIMENSIONS,
  BORDER_WIDTHS,
  FONT_SIZE_MAPPING,
};

export type {
  InteractionConstants,
  AnimationConstants,
  TestTimeoutConstants,
  GraphLayoutConstants,
  NodeDimensionConstants,
} from './constants';

// Re-export commonly used values for convenience
export const config = {
  // Interaction timings
  doubleClickDelay: INTERACTIONS.DOUBLE_CLICK_DELAY,
  shortTermDebounce: INTERACTIONS.SHORT_TERM_DEBOUNCE,
  
  // Node configuration
  nodeWidth: NODE_DIMENSIONS.WIDTH,
  nodeHeight: NODE_DIMENSIONS.HEIGHT,
  nodeTextMaxWidth: NODE_DIMENSIONS.TEXT_MAX_WIDTH,
  
  // Layout configuration
  nodeHorizontalSpacing: GRAPH_LAYOUT.NODE_HORIZONTAL_SPACING,
  nodeVerticalSpacing: GRAPH_LAYOUT.NODE_VERTICAL_SPACING,
  graphPadding: GRAPH_LAYOUT.PADDING,
  
  // Border widths
  defaultBorderWidth: BORDER_WIDTHS.DEFAULT,
  activeBorderWidth: BORDER_WIDTHS.ACTIVE,
  
  // Font sizing
  minFontSize: FONT_SIZE_MAPPING.MIN,
  maxFontSize: FONT_SIZE_MAPPING.MAX,
  labelLengthMin: FONT_SIZE_MAPPING.LABEL_LENGTH_MIN,
  labelLengthMax: FONT_SIZE_MAPPING.LABEL_LENGTH_MAX,
} as const;

// For backwards compatibility and easier migration
export const CONFIG = config;
