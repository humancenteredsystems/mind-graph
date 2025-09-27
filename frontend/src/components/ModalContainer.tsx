import React from 'react';
import { buildModalStyle } from '../utils/styleUtils';
import { theme } from '../config/theme';

interface ModalContainerProps {
  width?: number | string;
  height?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Reusable modal container component
 * Provides consistent styling and structure for modal content
 */
const ModalContainer: React.FC<ModalContainerProps> = ({
  width,
  height,
  maxWidth,
  maxHeight,
  children,
  className,
}) => {
  const containerStyle = {
    ...buildModalStyle({ width, maxWidth }),
    ...(height && { height }),
    ...(maxHeight && { maxHeight }),
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  };

  return (
    <div style={containerStyle} className={className}>
      {children}
    </div>
  );
};

interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose?: () => void;
  actions?: React.ReactNode;
}

/**
 * Reusable modal header component
 */
export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  subtitle,
  onClose,
  actions,
}) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px 24px',
      borderBottom: `1px solid ${theme.colors.border.light}`,
      background: theme.components.modal.background,
      color: theme.colors.text.primary,
      flexShrink: 0,
    }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: theme.colors.text.primary }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{
            margin: '4px 0 0 0',
            fontSize: 14,
            color: theme.colors.text.secondary
          }}>
            {subtitle}
          </p>
        )}
      </div>
      
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16 }}>
          {actions}
        </div>
      )}
      
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 24,
            cursor: 'pointer',
            color: theme.colors.text.secondary,
            padding: 4,
            lineHeight: 1,
            marginLeft: actions ? 12 : 16,
          }}
          aria-label="Close Modal"
        >
          ×
        </button>
      )}
    </div>
  );
};

interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

/**
 * Reusable modal content area component
 */
export const ModalContent: React.FC<ModalContentProps> = ({
  children,
  className,
  padding = true,
}) => {
  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        position: 'relative' as const,
        ...(padding && { padding: theme.components.modal.padding }),
      }}
      className={className}
    >
      {children}
    </div>
  );
};

export default ModalContainer;
