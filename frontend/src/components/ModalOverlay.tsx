import React from 'react';
import { buildOverlayStyle } from '../utils/styleUtils';

interface ModalOverlayProps {
  isOpen: boolean;
  onClose?: () => void;
  zIndex?: number;
  children: React.ReactNode;
}

/**
 * Reusable modal overlay component
 * Provides consistent backdrop and positioning for all modals
 */
const ModalOverlay: React.FC<ModalOverlayProps> = ({
  isOpen,
  onClose,
  zIndex,
  children,
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close if clicking the overlay itself, not the modal content
    if (e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div
      style={buildOverlayStyle(zIndex)}
      onClick={handleOverlayClick}
    >
      {children}
    </div>
  );
};

export default ModalOverlay;
