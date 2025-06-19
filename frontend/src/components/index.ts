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

// Re-export component prop types for external usage
export type { default as GraphViewProps } from './GraphView';
