/**
 * Style Utilities - Helper functions for consistent styling across components
 */

import { theme } from '../config';

/**
 * CSS-in-JS helper for creating style objects
 */
export const css = (styles: React.CSSProperties) => styles;

/**
 * Common shadow styles
 */
export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  base: '0 2px 4px rgba(0,0,0,0.1)',
  md: '0 4px 6px rgba(0,0,0,0.1)',
  lg: '0 10px 15px rgba(0,0,0,0.1)',
  xl: '0 20px 25px rgba(0,0,0,0.1)',
  '2xl': '0 25px 50px rgba(0,0,0,0.25)',
} as const;

/**
 * Builds overlay styles for modals and dropdowns
 */
export const buildOverlayStyle = (zIndex?: number) => css({
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: theme.colors.background.overlay,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: zIndex || theme.zIndex.modalBackdrop,
});

/**
 * Builds modal content styles
 */
export const buildModalStyle = (options: {
  width?: number | string;
  maxWidth?: number | string;
  zIndex?: number;
} = {}) => css({
  background: theme.components.modal.background,
  borderRadius: theme.components.modal.borderRadius,
  boxShadow: theme.components.modal.shadow,
  padding: theme.components.modal.padding,
  width: options.width || 'auto',
  maxWidth: options.maxWidth || '90vw',
  zIndex: options.zIndex || theme.zIndex.modal,
});

/**
 * Builds button styles with theme colors
 */
export const buildButtonStyle = (variant: 'primary' | 'secondary' | 'danger' = 'primary') => {
  const baseStyle = {
    ...theme.components.button.base,
  };

  switch (variant) {
    case 'primary':
      return css({
        ...baseStyle,
        background: theme.colors.border.active,
        color: theme.colors.text.inverse,
      });
    case 'secondary':
      return css({
        ...baseStyle,
        background: theme.colors.background.secondary,
        color: theme.colors.text.primary,
        border: `1px solid ${theme.colors.border.default}`,
        ...theme.components.button.secondary,
      });
    case 'danger':
      return css({
        ...baseStyle,
        background: theme.colors.border.error,
        color: theme.colors.text.inverse,
      });
    default:
      return baseStyle;
  }
};

/**
 * Builds input styles
 */
export const buildInputStyle = () => css({
  ...theme.components.form.field,
});

/**
 * Builds form field container styles
 */
export const buildFormFieldStyle = () => css({
  ...theme.components.form.container,
});

/**
 * Builds form label styles
 */
export const buildFormLabelStyle = () => css({
  ...theme.components.form.label,
});

/**
 * Builds form error message styles
 */
export const buildFormErrorStyle = () => css({
  ...theme.components.form.error,
});

/**
 * Builds form actions container styles
 */
export const buildFormActionsStyle = () => css({
  ...theme.components.form.actions,
});

/**
 * Builds drawer styles
 */
export const buildDrawerStyle = () => css({
  position: 'fixed' as const,
  top: 0,
  right: 0,
  bottom: 0,
  width: 300,
  background: theme.components.drawer.background,
  borderLeft: `1px solid ${theme.components.drawer.border}`,
  boxShadow: theme.components.drawer.shadow,
  zIndex: theme.zIndex.modal,
});

/**
 * Builds drawer header styles
 */
export const buildDrawerHeaderStyle = () => css({
  padding: theme.components.drawer.header.padding,
  borderBottom: `1px solid ${theme.components.drawer.header.borderBottom}`,
});

/**
 * Builds drawer tab styles
 */
export const buildDrawerTabStyle = (isActive: boolean) => css({
  flex: 1,
  padding: `${theme.components.drawer.header.padding}px`,
  border: 'none',
  background: isActive 
    ? theme.components.drawer.tab.active.background 
    : theme.components.drawer.tab.inactive.background,
  cursor: 'pointer',
  borderBottom: `2px solid ${isActive 
    ? theme.components.drawer.tab.active.borderColor 
    : theme.components.drawer.tab.inactive.borderColor}`,
});

/**
 * Builds tab styles
 */
export const buildTabStyle = (isActive: boolean) => css({
  padding: '8px 16px',
  border: 'none',
  background: isActive 
    ? theme.components.settingsModal.tab.active.background 
    : theme.components.settingsModal.tab.inactive.background,
  cursor: 'pointer',
  fontWeight: isActive 
    ? theme.components.settingsModal.tab.active.fontWeight 
    : theme.components.settingsModal.tab.inactive.fontWeight,
  borderBottom: `2px solid ${isActive 
    ? theme.components.settingsModal.tab.active.borderColor 
    : theme.components.settingsModal.tab.inactive.borderColor}`,
});

/**
 * Builds context menu styles
 */
export const buildContextMenuStyle = (position: { x: number; y: number }) => css({
  position: 'fixed' as const,
  left: position.x,
  top: position.y,
  background: theme.components.contextMenu.background,
  border: `1px solid ${theme.components.contextMenu.border}`,
  borderRadius: theme.components.contextMenu.borderRadius,
  boxShadow: theme.components.contextMenu.shadow,
  zIndex: theme.zIndex.popover,
});

/**
 * Builds context menu item styles
 */
export const buildContextMenuItemStyle = (disabled?: boolean) => css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.components.contextMenu.item.padding,
  cursor: disabled ? 'default' : 'pointer',
  fontSize: theme.components.contextMenu.item.fontSize,
  color: disabled ? theme.components.contextMenu.item.disabledColor : theme.colors.text.primary,
});

/**
 * Builds context menu shortcut text styles
 */
export const buildContextMenuShortcutStyle = () => css({
  marginLeft: 8,
  fontSize: theme.components.contextMenu.item.fontSize,
  color: theme.components.contextMenu.item.shortcutColor,
});

/**
 * AdminModal specific style utilities
 */

/**
 * Builds test button styles with type-specific colors
 */
export const buildTestButtonStyle = (
  type: 'unit' | 'integration' | 'integration-real' | 'linting',
  isRunning: boolean = false
) => css({
  ...theme.components.adminModal.tests.button,
  background: theme.colors.admin.test[type],
  color: theme.colors.text.inverse,
  opacity: isRunning ? 0.6 : 1,
  cursor: isRunning ? 'not-allowed' : 'pointer',
});

/**
 * Builds data tools button styles for graph tools panel
 */
export const buildDataToolsButtonStyle = (disabled: boolean = false) => css({
  padding: '8px 12px',
  border: `1px solid ${theme.colors.border.default}`,
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 500,
  backgroundColor: disabled ? theme.colors.background.secondary : theme.colors.border.active,
  color: disabled ? theme.colors.text.secondary : theme.colors.text.inverse,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  width: '100%',
  justifyContent: 'center',
  opacity: disabled ? 0.6 : 1,
});

/**
 * Builds graph tools section styles
 */
export const buildGraphToolsSectionStyle = () => css({
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
});

/**
 * Builds tenant action button styles
 */
export const buildTenantActionButtonStyle = (
  variant: 'clearData' | 'clearSchema' | 'pushSchema' | 'seedData' | 'reset' | 'delete',
  disabled: boolean = false
) => css({
  ...theme.components.adminModal.tenants.actionButton,
  background: disabled 
    ? theme.colors.admin.button.disabled 
    : theme.colors.admin.tenant[variant],
  color: theme.colors.text.inverse,
  opacity: disabled ? 0.6 : 1,
  cursor: disabled ? 'not-allowed' : 'pointer',
});

/**
 * Builds status badge styles for test results and tenant health
 */
export const buildStatusBadgeStyle = (
  status: 'running' | 'completed' | 'failed' | 'healthy' | 'not-accessible' | 'error' | 'unknown'
) => {
  const getStatusColors = (status: string) => {
    switch (status) {
      case 'running':
        return {
          background: theme.colors.admin.test.running,
          color: theme.colors.admin.test.runningText,
        };
      case 'completed':
        return {
          background: theme.colors.admin.test.completed,
          color: theme.colors.admin.test.completedText,
        };
      case 'failed':
        return {
          background: theme.colors.admin.test.failed,
          color: theme.colors.admin.test.failedText,
        };
      case 'healthy':
        return {
          background: theme.colors.admin.tenant.healthy,
          color: theme.colors.admin.tenant.healthyText,
        };
      case 'not-accessible':
      case 'error':
        return {
          background: theme.colors.admin.tenant.notAccessible,
          color: theme.colors.admin.tenant.notAccessibleText,
        };
      case 'unknown':
      default:
        return {
          background: theme.colors.admin.tenant.unknown,
          color: theme.colors.admin.tenant.unknownText,
        };
    }
  };

  const colors = getStatusColors(status);
  
  return css({
    padding: '2px 8px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 500,
    background: colors.background,
    color: colors.color,
  });
};

/**
 * Builds error message styles for AdminModal
 */
export const buildAdminErrorStyle = () => css({
  marginBottom: 16,
  padding: 12,
  background: theme.colors.admin.error.background,
  border: `1px solid ${theme.colors.admin.error.border}`,
  borderRadius: 4,
  color: theme.colors.admin.error.text,
  fontSize: 14,
});

/**
 * Builds AdminModal login form styles
 */
export const buildAdminLoginContainerStyle = () => css({
  ...theme.components.adminModal.login.container,
});

export const buildAdminLoginInputStyle = (disabled: boolean = false) => css({
  ...theme.components.adminModal.login.input,
  opacity: disabled ? 0.6 : 1,
});

export const buildAdminLoginSubmitStyle = (disabled: boolean = false) => css({
  ...theme.components.adminModal.login.submitButton,
  background: disabled 
    ? theme.colors.admin.button.disabled 
    : theme.colors.admin.button.primary,
  color: theme.colors.text.inverse,
  opacity: disabled ? 0.6 : 1,
  cursor: disabled ? 'not-allowed' : 'pointer',
});

/**
 * Builds schema modal styles
 */
export const buildSchemaModalOverlayStyle = () => css({
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: theme.components.adminModal.schema.overlay,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 3000,
});

export const buildSchemaModalContentStyle = () => css({
  background: theme.components.adminModal.schema.background,
  borderRadius: theme.components.adminModal.schema.borderRadius,
  width: theme.components.adminModal.schema.width,
  maxWidth: theme.components.adminModal.schema.maxWidth,
  height: theme.components.adminModal.schema.height,
  overflow: 'hidden',
  boxShadow: theme.components.adminModal.schema.shadow,
  display: 'flex',
  flexDirection: 'column' as const,
});

export const buildSchemaModalHeaderStyle = () => css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.components.adminModal.schema.header.padding,
  borderBottom: theme.components.adminModal.schema.header.borderBottom,
  background: theme.components.adminModal.schema.header.background,
});

export const buildSchemaCodeBlockStyle = () => css({
  ...theme.components.adminModal.schema.codeBlock,
});

/**
 * Node Style Preview Utilities
 */

/**
 * Generates CSS clip-path for complex node shapes
 */
export const getClipPathForShape = (shape: string): string => {
  switch (shape) {
    case 'diamond': return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
    case 'hexagon': return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
    case 'triangle': return 'polygon(50% 0%, 0% 100%, 100% 100%)';
    case 'star': return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
    case 'octagon': return 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';
    default: return 'none';
  }
};

/**
 * Builds complete node preview style object
 */
export const buildNodePreviewStyle = (
  style: any, // NodeTypeStyle - avoiding import to prevent circular dependency
  size: { width: number; height: number },
  fontSize?: number
) => css({
  width: `${size.width}px`,
  height: `${size.height}px`,
  backgroundColor: style.backgroundColor,
  color: style.textColor,
  border: `${style.borderWidth}px ${style.borderStyle} ${style.borderColor}`,
  borderRadius: style.shape === 'ellipse' ? '50%' : 
               style.shape === 'round-rectangle' ? '8px' : '0px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: style.textAlign,
  fontSize: `${fontSize || 12}px`,
  fontWeight: 500,
  padding: '4px 8px',
  clipPath: getClipPathForShape(style.shape),
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap' as const,
});

/**
 * Shared utilities for standard modal patterns
 */

/**
 * Builds standard modal styles used by SettingsModal and AdminModal
 */
export const buildStandardModalStyle = () => css({
  background: theme.components.modal.background,
  borderRadius: theme.components.standardModal.borderRadius,
  width: theme.components.standardModal.width,
  height: theme.components.standardModal.height,
  overflow: 'hidden',
  boxShadow: theme.components.standardModal.shadow,
  display: 'flex',
  flexDirection: 'column' as const,
});

/**
 * Builds scrollbar styles for modal content areas
 * Returns both the className and the CSS string for <style> tags
 */
export const buildScrollbarStyle = (className: string = 'modal-content') => {
  const styles = {
    scrollbarWidth: 'thin' as const,
    scrollbarColor: '#9ca3af #f3f4f6',
  };

  const cssString = `
    .${className} {
      /* Webkit browsers (Chrome, Safari, Edge) */
      scrollbar-width: thin;
      scrollbar-color: #9ca3af #f3f4f6;
    }
    
    .${className}::-webkit-scrollbar {
      width: 8px;
    }
    
    .${className}::-webkit-scrollbar-track {
      background: #f3f4f6;
      border-radius: 4px;
    }
    
    .${className}::-webkit-scrollbar-thumb {
      background: #9ca3af;
      border-radius: 4px;
      transition: background 0.2s ease;
    }
    
    .${className}::-webkit-scrollbar-thumb:hover {
      background: #6b7280;
    }
    
    /* Firefox */
    .${className} {
      scrollbar-width: thin;
      scrollbar-color: #9ca3af #f3f4f6;
    }
  `;

  return {
    styles,
    cssString,
    className,
  };
};
