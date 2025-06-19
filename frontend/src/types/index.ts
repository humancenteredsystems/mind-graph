/**
 * @fileoverview Frontend Types Module
 * 
 * This module exports TypeScript type definitions for the MakeItMakeSense.io platform.
 * Types provide compile-time safety and clear interfaces for data structures.
 * 
 * @module Types
 */

// Graph data types
export type { NodeData, EdgeData } from './graph';

// Re-export all types from modules
export * from './contextMenu';
export * from './hierarchy';
export * from './system';
