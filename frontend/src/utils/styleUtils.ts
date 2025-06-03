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
