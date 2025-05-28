/**
 * Application Constants - Non-theme values like timings and behaviors
 * These values are specific to application logic, not visual design
 */

export const INTERACTIONS = {
  /** Maximum time between clicks for double-click detection (ms) */
  DOUBLE_CLICK_DELAY: 400,
  /** Short-term debounce to prevent duplicate event firing (ms) */
  SHORT_TERM_DEBOUNCE: 50,
} as const;

export const ANIMATIONS = {
  /** Standard transition duration for UI animations (ms) */
  TRANSITION_DURATION: 200,
  /** Debounce delay for user input (ms) */
  DEBOUNCE_DELAY: 100,
} as const;

export const TEST_TIMEOUTS = {
  /** Short timeout for quick operations (ms) */
  SHORT: 100,
  /** Medium timeout for component updates (ms) */
  MEDIUM: 500,
  /** Long timeout for API calls (ms) */
  LONG: 5000,
  /** Very long timeout for complex operations (ms) */
  VERY_LONG: 15000,
} as const;

export const GRAPH_LAYOUT = {
  /** Default padding around graph elements */
  PADDING: 10,
  /** Horizontal spacing between node levels */
  NODE_HORIZONTAL_SPACING: 200,
  /** Vertical spacing between nodes in same level */
  NODE_VERTICAL_SPACING: 100,
} as const;

export const NODE_DIMENSIONS = {
  /** Default node width in pixels */
  WIDTH: 80,
  /** Default node height in pixels */
  HEIGHT: 40,
  /** Maximum text width within nodes */
  TEXT_MAX_WIDTH: 70,
} as const;

export const BORDER_WIDTHS = {
  /** Default border width for nodes and elements */
  DEFAULT: 1,
  /** Active/expanded border width */
  ACTIVE: 3,
} as const;

export const FONT_SIZE_MAPPING = {
  /** Minimum font size for node labels */
  MIN: 6,
  /** Maximum font size for node labels */
  MAX: 14,
  /** Range for label length mapping */
  LABEL_LENGTH_MIN: 0,
  /** Range for label length mapping */
  LABEL_LENGTH_MAX: 20,
} as const;

// Utility types for type safety
export type InteractionConstants = typeof INTERACTIONS;
export type AnimationConstants = typeof ANIMATIONS;
export type TestTimeoutConstants = typeof TEST_TIMEOUTS;
export type GraphLayoutConstants = typeof GRAPH_LAYOUT;
export type NodeDimensionConstants = typeof NODE_DIMENSIONS;
