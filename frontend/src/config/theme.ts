/**
 * Theme Configuration - Semantic values built from design tokens
 * This layer provides meaningful, context-specific styling values
 */

import { tokens } from './tokens';
import { 
  NODE_DIMENSIONS, 
  BORDER_WIDTHS, 
  FONT_SIZE_MAPPING, 
  GRAPH_LAYOUT 
} from './constants';

const { colors, spacing, fontSize, radius, shadow } = tokens;

/**
 * Level color generator function
 * Generates consistent colors for hierarchy levels
 */
export const getLevelColor = (level?: number): string => {
  if (level === undefined || level < 1) return colors.legacy.nodeDefault;
  if (level === 2) return 'red'; // Special case from current implementation
  
  const baseHue = 40;
  const hueStep = 40;
  const saturation = 60;
  const lightness = 60;
  
  const hue = (level * hueStep) % 360;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

/**
 * Main theme configuration
 */
export const theme = {
  // Semantic colors derived from tokens
  colors: {
    background: {
      primary: colors.legacy.white,
      secondary: colors.gray[50],
      overlay: 'rgba(0, 0, 0, 0.3)',
      error: '#fef2f2',
      info: '#f8fafc',
    },
    
    border: {
      default: colors.gray[300],
      light: colors.gray[200],
      dark: colors.legacy.borderDefault,
      active: colors.primary[500],
      expanded: colors.warning[700],
      error: colors.danger[500],
    },
    
    text: {
      primary: colors.legacy.textDefault,
      secondary: colors.gray[600],
      muted: colors.legacy.nodeDefault,
      inverse: colors.legacy.white,
      disabled: colors.gray[300],
      error: colors.danger[600],
      success: colors.success[600],
    },
    
    node: {
      default: colors.legacy.nodeDefault,
      selected: colors.legacy.selectedBackground,
      border: {
        default: colors.legacy.borderDefault,
        expanded: colors.warning[700],
        selected: colors.legacy.selectedRed,
      },
    },
    
    edge: {
      default: colors.legacy.edgeDefault,
      selected: colors.legacy.selectedRed,
      arrow: colors.legacy.edgeDefault,
    },
  },
  
  // Component-specific configurations
  components: {
    node: {
      dimensions: {
        width: NODE_DIMENSIONS.WIDTH,
        height: NODE_DIMENSIONS.HEIGHT,
      },
      border: {
        width: {
          default: BORDER_WIDTHS.DEFAULT,
          active: BORDER_WIDTHS.ACTIVE,
        },
      },
      text: {
        maxWidth: NODE_DIMENSIONS.TEXT_MAX_WIDTH,
        fontSize: {
          min: FONT_SIZE_MAPPING.MIN,
          max: FONT_SIZE_MAPPING.MAX,
          // Helper function for dynamic sizing
          calculate: (labelLength: number) => {
            const range = FONT_SIZE_MAPPING.LABEL_LENGTH_MAX - FONT_SIZE_MAPPING.LABEL_LENGTH_MIN;
            const sizeRange = FONT_SIZE_MAPPING.MAX - FONT_SIZE_MAPPING.MIN;
            const normalizedLength = Math.min(labelLength, FONT_SIZE_MAPPING.LABEL_LENGTH_MAX) / range;
            return Math.max(FONT_SIZE_MAPPING.MIN, FONT_SIZE_MAPPING.MAX - (normalizedLength * sizeRange));
          },
        },
      },
    },
    
    contextMenu: {
      background: colors.legacy.white,
      border: colors.gray[300],
      shadow: shadow.lg,
      borderRadius: radius.base,
      item: {
        padding: spacing.scale(2), // 8px
        disabledColor: colors.gray[300],
        shortcutColor: colors.legacy.nodeDefault,
        fontSize: fontSize.sm,
      },
    },
    
    modal: {
      overlay: 'rgba(0,0,0,0.3)',
      background: colors.legacy.white,
      shadow: shadow.xl,
      borderRadius: radius.base,
      padding: spacing.scale(5), // 20px
    },
    
    drawer: {
      background: colors.legacy.white,
      border: colors.gray[300],
      shadow: '-2px 0 5px rgba(0,0,0,0.1)',
      borderRadius: radius.none,
      header: {
        borderBottom: colors.gray[200],
        padding: spacing.scale(3), // 12px
      },
      tab: {
        active: {
          background: colors.gray[100],
          borderColor: colors.primary[500],
        },
        inactive: {
          background: 'transparent',
          borderColor: 'transparent',
        },
      },
    },
    
    settingsIcon: {
      background: 'rgba(255, 255, 255, 0.95)',
      backgroundHover: 'rgba(255, 255, 255, 1)',
      border: colors.gray[300],
      shadow: shadow.base,
      borderRadius: radius.full,
    },
    
    settingsModal: {
      overlay: 'rgba(0,0,0,0.3)',
      background: colors.legacy.white,
      shadow: shadow['2xl'],
      borderRadius: radius.lg,
      maxWidth: 800,
      header: {
        borderBottom: colors.gray[200],
        padding: spacing.scale(6), // 24px
      },
      content: {
        padding: spacing.scale(5), // 20px
      },
      section: {
        borderBottom: colors.gray[200],
        padding: spacing.scale(3), // 12px
      },
      tab: {
        active: {
          background: colors.gray[100],
          borderColor: colors.primary[500],
          fontWeight: 600,
        },
        inactive: {
          background: 'transparent',
          borderColor: 'transparent',
          fontWeight: 400,
        },
      },
    },
  },
  
  // Layout configuration
  layout: {
    graph: {
      nodeSpacing: {
        horizontal: GRAPH_LAYOUT.NODE_HORIZONTAL_SPACING,
        vertical: GRAPH_LAYOUT.NODE_VERTICAL_SPACING,
      },
      padding: GRAPH_LAYOUT.PADDING,
    },
  },
  
  // Z-index scale
  zIndex: {
    base: 1,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    toast: 1080,
  },
} as const;

// Type exports for better TypeScript support
export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;
export type ThemeComponents = typeof theme.components;

// Hook for future theme context (when we add theme switching)
export const useTheme = () => theme;
