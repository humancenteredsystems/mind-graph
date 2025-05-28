/**
 * Style Utilities - Helper functions for consistent styling across components
 */

import { theme } from '../config';

/**
 * CSS-in-JS helper for creating style objects
 */
export const css = (styles: Record<string, any>) => styles;

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
    border: 'none',
    borderRadius: theme.components.modal.borderRadius,
    padding: `${theme.components.modal.padding / 2}px ${theme.components.modal.padding}px`,
    cursor: 'pointer',
    fontWeight: 500,
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
  padding: `${theme.components.modal.padding / 2}px`,
  border: `1px solid ${theme.colors.border.default}`,
  borderRadius: theme.components.modal.borderRadius,
  fontSize: 14,
  width: '100%',
  '&:focus': {
    outline: 'none',
    borderColor: theme.colors.border.active,
  },
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
