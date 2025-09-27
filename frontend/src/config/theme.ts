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

const withCssVar = (name: string, fallback: string) => `var(${name}, ${fallback})`;

/**
 * Level color generator function
 * Generates consistent colors for hierarchy levels
 */
export const getLevelColor = (level?: number): string => {
  if (level === undefined || level < 1) return colors.legacy.nodeDefault;
  if (level === 2) return 'red'; // Special case from current implementation
  
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
      primary: withCssVar('--color-bg-primary', colors.legacy.white),
      secondary: withCssVar('--color-bg-secondary', colors.gray[50]),
      overlay: withCssVar('--color-overlay', 'rgba(0, 0, 0, 0.3)'),
      error: '#fef2f2',
      info: '#f8fafc',
    },

    border: {
      default: withCssVar('--color-border-subtle', colors.gray[300]),
      light: withCssVar('--color-border-subtle', colors.gray[200]),
      dark: withCssVar('--color-border-strong', colors.legacy.borderDefault),
      active: withCssVar('--color-accent', colors.primary[500]),
      expanded: colors.warning[700],
      error: colors.danger[500],
    },

    text: {
      primary: withCssVar('--color-text-primary', colors.legacy.textDefault),
      secondary: withCssVar('--color-text-secondary', colors.gray[600]),
      muted: withCssVar('--color-text-secondary', colors.legacy.nodeDefault),
      inverse: withCssVar('--color-text-inverse', colors.legacy.white),
      disabled: withCssVar('--color-text-disabled', colors.gray[400]),
      error: colors.danger[600],
      success: colors.success[600],
    },
    
    // Level colors for GraphView nodes
    levels: {
      1: getLevelColor(1),
      2: 'red', // Special case preserved
      3: getLevelColor(3),
      4: getLevelColor(4),
      5: getLevelColor(5),
      6: getLevelColor(6),
      7: getLevelColor(7),
      8: getLevelColor(8),
    },
    
    // Status colors for SettingsModal
    status: {
      active: colors.success[500],
      inactive: colors.danger[500],
      trial: colors.danger[600],
      licensed: colors.success[600],
      oss: colors.gray[500],
    },
    
    // AdminModal specific colors
    admin: {
      test: {
        unit: '#10b981',
        integration: '#3b82f6',
        'integration-real': '#dc2626',
        linting: '#f59e0b',
        running: '#dbeafe',
        completed: '#dcfce7',
        failed: '#fef2f2',
        runningText: '#1d4ed8',
        completedText: '#166534',
        failedText: '#dc2626',
      },
      tenant: {
        clearData: '#8b5cf6',
        clearSchema: '#f59e0b',
        pushSchema: '#06b6d4',
        seedData: '#10b981',
        reset: '#f59e0b',
        delete: '#dc2626',
        healthy: '#dcfce7',
        notAccessible: '#fef2f2',
        error: '#fef2f2',
        healthyText: '#166534',
        notAccessibleText: '#dc2626',
        errorText: '#dc2626',
        unknown: '#f3f4f6',
        unknownText: '#6b7280',
      },
      button: {
        primary: withCssVar('--color-accent', '#3b82f6'),
        secondary: 'transparent',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#dc2626',
        disabled: '#9ca3af',
      },
      error: {
        background: '#fef2f2',
        border: '#fecaca',
        text: '#dc2626',
      },
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
    
    form: {
      container: {
        marginBottom: spacing.scale(3), // 12px
      },
      field: {
        width: '100%',
        padding: spacing.scale(1), // 4px
        marginBottom: spacing.scale(3), // 12px
        border: `1px solid ${withCssVar('--color-border-subtle', colors.gray[300])}`,
        borderRadius: radius.sm,
        fontSize: fontSize.sm,
      },
      label: {
        display: 'block',
        marginBottom: spacing.scale(1), // 4px
        fontWeight: 500,
        color: withCssVar('--color-text-primary', colors.legacy.textDefault),
      },
      error: {
        color: colors.danger[600],
        fontSize: fontSize.xs,
        marginTop: spacing.scale(1), // 4px
        marginBottom: spacing.scale(3), // 12px
      },
      actions: {
        textAlign: 'right' as const,
        marginTop: spacing.scale(4), // 16px
      },
    },
    
    button: {
      base: {
        border: 'none',
        borderRadius: radius.sm,
        padding: `${spacing.scale(1)}px ${spacing.scale(2)}px`, // 4px 8px
        cursor: 'pointer',
        fontSize: fontSize.sm,
        fontWeight: 500,
      },
      secondary: {
        marginRight: spacing.scale(2), // 8px
      },
    },
    
    contextMenu: {
      background: withCssVar('--color-surface-elevated', colors.legacy.white),
      border: withCssVar('--color-border-subtle', colors.gray[300]),
      shadow: shadow.lg,
      borderRadius: radius.base,
      item: {
        padding: spacing.scale(2), // 8px
        disabledColor: withCssVar('--color-text-disabled', colors.gray[400]),
        shortcutColor: withCssVar('--color-text-secondary', colors.legacy.nodeDefault),
        fontSize: fontSize.sm,
      },
    },
    
    modal: {
      overlay: withCssVar('--color-overlay', 'rgba(0,0,0,0.3)'),
      background: withCssVar('--color-surface-elevated', colors.legacy.white),
      shadow: shadow.xl,
      borderRadius: radius.base,
      padding: spacing.scale(5), // 20px
    },
    
    // Standard modal dimensions used by SettingsModal and AdminModal
    standardModal: {
      width: 600,
      height: '70vh',
      shadow: '0 10px 25px rgba(0,0,0,0.2)',
      borderRadius: radius.lg,
    },
    
    drawer: {
      background: withCssVar('--color-surface-elevated', colors.legacy.white),
      border: withCssVar('--color-border-subtle', colors.gray[300]),
      shadow: '-2px 0 5px rgba(0,0,0,0.1)',
      borderRadius: radius.none,
      header: {
        borderBottom: withCssVar('--color-border-subtle', colors.gray[200]),
        padding: spacing.scale(3), // 12px
      },
      tab: {
        active: {
          background: withCssVar('--color-surface-active', colors.gray[100]),
          borderColor: withCssVar('--color-accent', colors.primary[500]),
        },
        inactive: {
          background: withCssVar('--color-surface-muted', colors.gray[50]),
          borderColor: withCssVar('--color-border-subtle', colors.gray[200]),
        },
      },
    },
    
    settingsIcon: {
      background: withCssVar('--color-floating-surface', 'rgba(255, 255, 255, 0.95)'),
      backgroundHover: withCssVar('--color-floating-surface-hover', 'rgba(255, 255, 255, 1)'),
      border: withCssVar('--color-border-subtle', colors.gray[300]),
      shadow: shadow.base,
      borderRadius: radius.full,
    },

    settingsModal: {
      overlay: withCssVar('--color-overlay', 'rgba(0,0,0,0.3)'),
      background: withCssVar('--color-surface-elevated', colors.legacy.white),
      shadow: shadow['2xl'],
      borderRadius: radius.lg,
      maxWidth: 800,
      header: {
        borderBottom: withCssVar('--color-border-subtle', colors.gray[200]),
        padding: spacing.scale(6), // 24px
      },
      content: {
        padding: spacing.scale(5), // 20px
      },
      section: {
        borderBottom: withCssVar('--color-border-subtle', colors.gray[200]),
        padding: spacing.scale(3), // 12px
      },
      tab: {
        active: {
          background: withCssVar('--color-surface-active', colors.gray[100]),
          borderColor: withCssVar('--color-accent', colors.primary[500]),
          fontWeight: 600,
        },
        inactive: {
          background: withCssVar('--color-surface-muted', colors.gray[50]),
          borderColor: withCssVar('--color-border-subtle', colors.gray[200]),
          fontWeight: 400,
        },
      },
    },
    
    adminModal: {
      login: {
        container: {
          padding: spacing.scale(10), // 40px
          textAlign: 'center' as const,
        },
        title: {
          margin: '0 0 20px 0',
          color: withCssVar('--color-text-primary', colors.legacy.textDefault),
        },
        subtitle: {
          margin: '0 0 30px 0',
          color: withCssVar('--color-text-secondary', colors.gray[600]),
          fontSize: fontSize.sm,
        },
        inputContainer: {
          position: 'relative' as const,
          marginBottom: spacing.scale(4), // 16px
        },
        input: {
          width: '100%',
          padding: '12px 40px 12px 16px',
          border: `1px solid ${withCssVar('--color-border-subtle', colors.gray[300])}`,
          borderRadius: radius.sm,
          fontSize: fontSize.sm,
          boxSizing: 'border-box' as const,
        },
        toggleButton: {
          position: 'absolute' as const,
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: withCssVar('--color-text-secondary', colors.gray[600]),
          fontSize: spacing.scale(4), // 16px
          padding: spacing.scale(1), // 4px
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        submitButton: {
          width: '100%',
          padding: '12px 16px',
          border: 'none',
          borderRadius: radius.sm,
          fontSize: fontSize.sm,
          fontWeight: 500,
          cursor: 'pointer',
        },
      },
      tests: {
        container: {
          padding: spacing.scale(5), // 20px
        },
        section: {
          marginBottom: spacing.scale(5), // 20px
        },
        sectionTitle: {
          margin: '0 0 12px 0',
          color: withCssVar('--color-text-primary', colors.legacy.textDefault),
        },
        buttonGroup: {
          display: 'flex',
          gap: spacing.scale(2), // 8px
          flexWrap: 'wrap' as const,
        },
        button: {
          padding: '8px 16px',
          border: 'none',
          borderRadius: radius.sm,
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
        },
        resultsList: {
          maxHeight: 300,
          overflow: 'auto' as const,
        },
        resultItem: {
          padding: spacing.scale(3), // 12px
          border: `1px solid ${withCssVar('--color-border-subtle', colors.gray[200])}`,
          borderRadius: radius.sm,
          marginBottom: spacing.scale(2), // 8px
          fontSize: fontSize.sm,
        },
        resultHeader: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.scale(1), // 4px
        },
        resultMeta: {
          color: withCssVar('--color-text-secondary', colors.gray[600]),
          fontSize: fontSize.xs,
        },
        expandButton: {
          background: 'none',
          border: `1px solid ${withCssVar('--color-border-subtle', colors.gray[300])}`,
          borderRadius: 3,
          padding: '2px 6px',
          fontSize: 11,
          cursor: 'pointer',
          color: withCssVar('--color-text-secondary', colors.gray[600]),
        },
        expandedDetails: {
          marginTop: spacing.scale(2), // 8px
          padding: spacing.scale(3), // 12px
          background: withCssVar('--color-bg-secondary', colors.gray[50]),
          border: `1px solid ${withCssVar('--color-border-subtle', colors.gray[200])}`,
          borderRadius: radius.sm,
          fontSize: fontSize.xs,
        },
      },
      tenants: {
        container: {
          padding: spacing.scale(5), // 20px
        },
        header: {
          marginBottom: spacing.scale(4), // 16px
        },
        headerRow: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.scale(2), // 8px
        },
        title: {
          margin: 0,
          color: withCssVar('--color-text-primary', colors.legacy.textDefault),
        },
        actionGroup: {
          display: 'flex',
          gap: spacing.scale(2), // 8px
        },
        modeIndicator: {
          fontSize: fontSize.xs,
          color: withCssVar('--color-text-secondary', colors.gray[600]),
          marginBottom: spacing.scale(2), // 8px
        },
        createForm: {
          marginBottom: spacing.scale(4), // 16px
          padding: spacing.scale(4), // 16px
          border: `1px solid ${withCssVar('--color-border-subtle', colors.gray[200])}`,
          borderRadius: radius.sm,
          background: withCssVar('--color-bg-secondary', colors.gray[50]),
        },
        createFormTitle: {
          margin: '0 0 12px 0',
          color: withCssVar('--color-text-primary', colors.legacy.textDefault),
          fontSize: fontSize.sm,
        },
        createFormInput: {
          width: '100%',
          padding: '8px 12px',
          border: `1px solid ${withCssVar('--color-border-subtle', colors.gray[300])}`,
          borderRadius: radius.sm,
          fontSize: fontSize.sm,
          boxSizing: 'border-box' as const,
        },
        createFormActions: {
          display: 'flex',
          gap: spacing.scale(2), // 8px
        },
        tenantsList: {
          maxHeight: 400,
          overflow: 'auto' as const,
        },
        tenantItem: {
          padding: spacing.scale(4), // 16px
          border: `1px solid ${withCssVar('--color-border-subtle', colors.gray[200])}`,
          borderRadius: radius.sm,
          marginBottom: spacing.scale(3), // 12px
        },
        tenantHeader: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.scale(2), // 8px
        },
        tenantTitle: {
          fontWeight: 500,
          fontSize: fontSize.sm,
        },
        tenantNamespace: {
          color: withCssVar('--color-text-secondary', colors.gray[600]),
          fontSize: fontSize.xs,
        },
        tenantActions: {
          display: 'flex',
          alignItems: 'center',
          gap: spacing.scale(2), // 8px
        },
        tenantInfo: {
          marginBottom: spacing.scale(2), // 8px
        },
        tenantInfoRow: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.scale(1), // 4px
        },
        tenantMeta: {
          fontSize: fontSize.xs,
          color: withCssVar('--color-text-secondary', colors.gray[600]),
        },
        actionButton: {
          padding: '4px 8px',
          border: 'none',
          borderRadius: radius.sm,
          fontSize: 11,
          cursor: 'pointer',
        },
        schemaButton: {
          padding: '2px 6px',
          background: 'transparent',
          border: `1px solid ${withCssVar('--color-border-subtle', colors.gray[300])}`,
          borderRadius: 3,
          fontSize: 11,
          cursor: 'pointer',
          color: withCssVar('--color-text-primary', colors.legacy.textDefault),
          display: 'flex',
          alignItems: 'center',
          gap: spacing.scale(1), // 4px
        },
      },
      schema: {
        overlay: withCssVar('--color-overlay', 'rgba(0,0,0,0.5)'),
        background: withCssVar('--color-surface-elevated', colors.legacy.white),
        shadow: '0 10px 25px rgba(0,0,0,0.3)',
        borderRadius: radius.lg,
        width: '80%',
        maxWidth: 800,
        height: '80%',
        header: {
          borderBottom: `1px solid ${withCssVar('--color-border-subtle', colors.gray[200])}`,
          background: withCssVar('--color-bg-secondary', colors.gray[50]),
          padding: '16px 20px',
        },
        title: {
          margin: 0,
          fontSize: 18,
          fontWeight: 600,
        },
        subtitle: {
          margin: '4px 0 0 0',
          fontSize: fontSize.sm,
          color: withCssVar('--color-text-secondary', colors.gray[600]),
        },
        headerActions: {
          display: 'flex',
          gap: spacing.scale(2), // 8px
        },
        content: {
          flex: 1,
          overflow: 'auto' as const,
          padding: spacing.scale(5), // 20px
        },
        codeBlock: {
          background: withCssVar('--color-bg-secondary', colors.gray[50]),
          border: `1px solid ${withCssVar('--color-border-subtle', colors.gray[200])}`,
          borderRadius: radius.sm,
          padding: spacing.scale(4), // 16px
          fontSize: 13,
          lineHeight: 1.5,
          overflow: 'auto' as const,
          margin: 0,
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          color: withCssVar('--color-text-primary', colors.legacy.textDefault),
          whiteSpace: 'pre-wrap' as const,
          wordBreak: 'break-word' as const,
        },
        loadingContainer: {
          textAlign: 'center' as const,
          padding: spacing.scale(10), // 40px
        },
        loadingText: {
          color: withCssVar('--color-text-secondary', colors.gray[600]),
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
