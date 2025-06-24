/**
 * @fileoverview Frontend Components Module
 * 
 * This module exports all React components for the MakeItMakeSense.io platform.
 * Components handle UI rendering, user interactions, and visual presentation.
 * 
 * @module Components
 */

// Main graph visualization component
export { default as GraphView } from './GraphView';

// UI interaction components
export { default as ContextMenu } from './ContextMenu';
export { default as NodeDrawer } from './NodeDrawer';
export { default as NodeFormModal } from './NodeFormModal';

// Settings and configuration components
export { default as SettingsIcon } from './SettingsIcon';
export { default as SettingsModal } from './SettingsModal';

// Admin components
export { default as AdminButton } from './AdminButton';
export { default as AdminModal } from './AdminModal';

// Shared modal components
export { default as ModalOverlay } from './ModalOverlay';
export { default as ModalContainer, ModalHeader, ModalContent } from './ModalContainer';
export { default as TabNavigation } from './TabNavigation';
export { default as StatusBadge, StatusIcon } from './StatusBadge';

// Node styling components
export { default as NodeStylePreview } from './NodeStylePreview';
export { default as NodeTypeStyleModal } from './NodeTypeStyleModal';
export { default as AddNodeTypeModal } from './AddNodeTypeModal';

// Re-export component prop types for external usage
export type { default as GraphViewProps } from './GraphView';
export type { Tab } from './TabNavigation';
export type { StatusType } from './StatusBadge';
